import { createHash } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { env } from './env.js'
import { publicKnowledgeV2, retrieveKnowledge } from './knowledge.js'
import {
  embedText,
  embedTexts,
  EmbeddingDimensionMismatchError,
  EmbeddingProviderError,
  formatVector,
  type RagEmbeddingResult,
} from './ragEmbeddings.js'
import type { AssistantScope, Citation, RagChunkCitation, RagHealthResponse, RagRetrievePayload, RagRetrieveResponse, RagSyncResponse } from './types.js'

interface CandidateRow {
  chunk_id: string
  document_id: string
  section: string
  text: string
  score: number | string
  reason: string
  title: string
  summary: string
  href: string
  tags: string[]
  visibility: AssistantScope
}

interface EntityRow {
  id: string
  metadata: Record<string, unknown>
}

interface RelationRow {
  evidence_document_ids: string[]
}

const SERVICE_NAME = 'biau-rag-orchestrator'
const POSTGRES_STORE_NAME = 'supabase-pgvector'
const POSTGRES_EMBEDDING_DIMENSION = 4096
let ragPool: Pool | null = null

export function isPostgresRagStoreConfigured() {
  return env.ragStoreProvider.toLowerCase() === 'supabase' && Boolean(env.ragDatabaseUrl)
}

export async function closeRagPostgresPool() {
  if (!ragPool) return
  await ragPool.end()
  ragPool = null
}

export async function getPostgresRagHealth(): Promise<RagHealthResponse> {
  const pool = getRagPool()
  if (!pool) return emptyPostgresHealth()

  try {
    const result = await pool.query<{
      document_count: string
      chunk_count: string
      entity_count: string
      relation_count: string
      embedded_chunk_count: string
      last_sync_at: string | null
    }>(`
      select
        (select count(*) from rag_documents) as document_count,
        (select count(*) from rag_chunks) as chunk_count,
        (select count(*) from rag_entities) as entity_count,
        (select count(*) from rag_relations) as relation_count,
        (select count(*) from rag_chunks where embedding is not null) as embedded_chunk_count,
        (select max(finished_at) from rag_sync_runs where status = 'completed') as last_sync_at
    `)
    const row = result.rows[0]
    const chunkCount = readCount(row?.chunk_count)
    const embeddedChunkCount = readCount(row?.embedded_chunk_count)
    return {
      ok: true,
      service: SERVICE_NAME,
      store: POSTGRES_STORE_NAME,
      vectorReady: embeddedChunkCount > 0,
      keywordReady: chunkCount > 0,
      rerankerReady: true,
      lastSyncAt: row?.last_sync_at ?? null,
      documentCount: readCount(row?.document_count),
      chunkCount,
      entityCount: readCount(row?.entity_count),
      relationCount: readCount(row?.relation_count),
    }
  } catch {
    return emptyPostgresHealth()
  }
}

export async function retrievePostgresRagContext(
  payload: Required<Pick<RagRetrievePayload, 'query' | 'scope'>> & Omit<RagRetrievePayload, 'query' | 'scope'>,
): Promise<RagRetrieveResponse | null> {
  const pool = getRagPool()
  if (!pool) return null

  const limit = normalizeRetrieveLimit(payload.limit)
  const localSignal = retrieveKnowledge(payload.query, limit)
  if (localSignal.intent === 'private-credential') {
    return buildEmptyResponse(localSignal.intent, 'private-credential')
  }

  const visibility: AssistantScope[] = ['public']
  const terms = uniqueTerms([payload.query, ...localSignal.terms]).slice(0, 16)
  const patterns = terms.map((term) => `%${escapeLike(term)}%`)
  const candidateLimit = Math.max(8, limit * 6)
  const modelCalls = { count: 0 }

  const [keywordRows, vectorRows, entityRows] = await Promise.all([
    fetchKeywordCandidates(pool, visibility, patterns, candidateLimit),
    fetchVectorCandidates(pool, visibility, payload.query, candidateLimit, modelCalls),
    fetchEntityCandidates(pool, visibility, patterns, candidateLimit),
  ])

  const candidates = mergeCandidates([...keywordRows, ...vectorRows, ...entityRows])
  const citations = buildCitations(candidates, limit)
  const citationIds = new Set(citations.map((citation) => citation.id))
  const chunks = candidates
    .filter((candidate) => citationIds.has(candidate.documentId))
    .map((candidate): RagChunkCitation => ({
      id: candidate.id,
      documentId: candidate.documentId,
      text: candidate.text,
      section: candidate.section,
      score: candidate.score,
      reason: candidate.reason,
    }))
    .slice(0, Math.max(1, limit))

  const sufficiency = citations.length === 0 ? 'none' : citations.length >= 2 || chunks.length >= 2 ? 'enough' : 'weak'
  return {
    intent: localSignal.intent,
    citations,
    chunks,
    meta: {
      retrievalMode: 'agentic-hybrid-pgvector',
      store: POSTGRES_STORE_NAME,
      candidateCount: candidates.length,
      reranked: true,
      sufficient: sufficiency === 'enough',
      sufficiency,
      fallbackReason: sufficiency === 'none' ? 'no_public_context' : null,
      citationCount: citations.length,
      expandedEntityCount: entityRows.length,
      modelCalls: modelCalls.count,
    },
  }
}

export async function syncPostgresRagStore(): Promise<RagSyncResponse | null> {
  const pool = getRagPool()
  if (!pool || !publicKnowledgeV2) return null

  const sourceName = 'server/data/public-knowledge-v2.json'
  const sourceChecksum = hashJson(publicKnowledgeV2)
  let embeddings: RagEmbeddingResult[]
  try {
    embeddings = await embedTexts(
      publicKnowledgeV2.knowledge_chunks.map((chunk) => [chunk.section, chunk.text, ...chunk.metadata.tags].join('\n')),
      { expectedDimensions: POSTGRES_EMBEDDING_DIMENSION },
    )
    if (embeddings.length !== publicKnowledgeV2.knowledge_chunks.length) {
      return postgresSyncFailure(sourceName, sourceChecksum, 'embedding_result_count_mismatch', 'embedding', 'invalid_response')
    }
  } catch (error) {
    return normalizePostgresSyncFailure(error, sourceName, sourceChecksum, 'embedding')
  }

  let client: PoolClient | null = null
  try {
    client = await pool.connect()
    await client.query('begin')
    const syncRun = await client.query<{ id: string }>(
      `
        insert into rag_sync_runs (status, source_name, source_checksum, document_count, chunk_count, entity_count, relation_count, issue_count)
        values ('running', $1, $2, $3, $4, $5, $6, 0)
        returning id
      `,
      [
        sourceName,
        sourceChecksum,
        publicKnowledgeV2.public_documents.length,
        publicKnowledgeV2.knowledge_chunks.length,
        publicKnowledgeV2.entities.length,
        publicKnowledgeV2.relations.length,
      ],
    )

    await syncDocuments(client)
    await syncChunks(client, embeddings)
    await syncEntities(client)
    await syncRelations(client)
    await client.query(`update rag_sync_runs set status = 'completed', finished_at = now() where id = $1`, [syncRun.rows[0]?.id])
    await client.query('commit')
  } catch (error) {
    await client?.query('rollback').catch(() => undefined)
    return normalizePostgresSyncFailure(error, sourceName, sourceChecksum, 'postgres_transaction')
  } finally {
    client?.release()
  }

  return {
    ok: true,
    mode: 'postgres',
    accepted: true,
    scope: 'public',
    health: await getPostgresRagHealth(),
    diagnostics: {
      sourceName,
      sourceChecksum,
      documentCount: publicKnowledgeV2.public_documents.length,
      chunkCount: publicKnowledgeV2.knowledge_chunks.length,
      entityCount: publicKnowledgeV2.entities.length,
      relationCount: publicKnowledgeV2.relations.length,
      issueCount: 0,
    },
  }
}

async function syncDocuments(client: PoolClient) {
  if (!publicKnowledgeV2) return
  const documentIds = publicKnowledgeV2.public_documents.map((document) => document.id)
  for (const document of publicKnowledgeV2.public_documents) {
    await client.query(
      `
        insert into rag_documents (id, source_type, project_id, title, summary, href, tags, visibility, metadata, content_hash, updated_at)
        values ($1, $2, $3, $4, $5, $6, $7, 'public', $8, $9, now())
        on conflict (id) do update set
          source_type = excluded.source_type,
          project_id = excluded.project_id,
          title = excluded.title,
          summary = excluded.summary,
          href = excluded.href,
          tags = excluded.tags,
          visibility = excluded.visibility,
          metadata = excluded.metadata,
          content_hash = excluded.content_hash,
          updated_at = now()
      `,
      [
        document.id,
        document.sourceType,
        document.projectId ?? null,
        document.title,
        document.summary,
        document.href,
        document.tags,
        JSON.stringify({ source: 'public-knowledge-v2', visibility: 'public' }),
        hashJson(document),
      ],
    )
  }
  await client.query(`delete from rag_documents where visibility = 'public' and not (id = any($1::text[]))`, [documentIds])
}

async function syncChunks(client: PoolClient, embeddings: RagEmbeddingResult[]) {
  if (!publicKnowledgeV2) return
  const chunkIds = publicKnowledgeV2.knowledge_chunks.map((chunk) => chunk.id)
  for (const [index, chunk] of publicKnowledgeV2.knowledge_chunks.entries()) {
    const embedding = embeddings[index]
    if (!embedding) throw new Error('missing-prepared-embedding')
    await client.query(
      `
        insert into rag_chunks (
          id, document_id, section, text, metadata, token_count, content_hash,
          embedding, embedding_model, embedding_dimension, embedded_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::extensions.vector(4096), $9, $10, now(), now())
        on conflict (id) do update set
          document_id = excluded.document_id,
          section = excluded.section,
          text = excluded.text,
          metadata = excluded.metadata,
          token_count = excluded.token_count,
          content_hash = excluded.content_hash,
          embedding = excluded.embedding,
          embedding_model = excluded.embedding_model,
          embedding_dimension = excluded.embedding_dimension,
          embedded_at = excluded.embedded_at,
          updated_at = now()
      `,
      [
        chunk.id,
        chunk.documentId,
        chunk.section,
        chunk.text,
        JSON.stringify({ ...chunk.metadata, visibility: 'public' }),
        estimateTokenCount(chunk.text),
        hashJson(chunk),
        formatVector(embedding.vector),
        embedding.model,
        embedding.dimensions,
      ],
    )
  }
  await client.query(`delete from rag_chunks where metadata->>'visibility' = 'public' and not (id = any($1::text[]))`, [chunkIds])
}

async function syncEntities(client: PoolClient) {
  if (!publicKnowledgeV2) return
  const entityIds = publicKnowledgeV2.entities.map((entity) => entity.id)
  for (const entity of publicKnowledgeV2.entities) {
    await client.query(
      `
        insert into rag_entities (id, name, aliases, metadata, updated_at)
        values ($1, $2, $3, $4, now())
        on conflict (id) do update set
          name = excluded.name,
          aliases = excluded.aliases,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [entity.id, entity.name, entity.aliases, JSON.stringify({ ...entity.metadata, visibility: 'public' })],
    )
  }
  await client.query(`delete from rag_entities where metadata->>'visibility' = 'public' and not (id = any($1::text[]))`, [entityIds])
}

async function syncRelations(client: PoolClient) {
  if (!publicKnowledgeV2) return
  await client.query(`delete from rag_relations where metadata->>'visibility' = 'public'`)
  for (const relation of publicKnowledgeV2.relations) {
    await client.query(
      `
        insert into rag_relations (from_entity_id, to_entity_id, relation_type, evidence_document_ids, metadata, updated_at)
        values ($1, $2, 'related', $3, $4, now())
        on conflict (from_entity_id, to_entity_id, relation_type) do update set
          evidence_document_ids = excluded.evidence_document_ids,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        relation.fromEntityId,
        relation.toEntityId,
        relation.evidenceDocumentIds,
        JSON.stringify({ visibility: 'public', source: 'public-knowledge-v2' }),
      ],
    )
  }
}

async function fetchKeywordCandidates(pool: Pool, visibility: AssistantScope[], patterns: string[], limit: number) {
  if (patterns.length === 0) return []
  const result = await pool.query<CandidateRow>(
    `
      select
        c.id as chunk_id,
        c.document_id,
        c.section,
        c.text,
        (
          case when lower(d.title) like any($2::text[]) then 0.42 else 0 end +
          case when lower(d.summary) like any($2::text[]) then 0.28 else 0 end +
          case when lower(c.text) like any($2::text[]) then 0.30 else 0 end +
          case when exists (select 1 from unnest(d.tags) tag where lower(tag) like any($2::text[])) then 0.18 else 0 end
        ) as score,
        'keyword+metadata' as reason,
        d.title,
        d.summary,
        d.href,
        d.tags,
        d.visibility
      from rag_chunks c
      join rag_documents d on d.id = c.document_id
      where d.visibility = any($1::text[])
        and (
          lower(d.title) like any($2::text[])
          or lower(d.summary) like any($2::text[])
          or lower(c.text) like any($2::text[])
          or lower(c.section) like any($2::text[])
          or exists (select 1 from unnest(d.tags) tag where lower(tag) like any($2::text[]))
        )
      order by score desc, d.title asc
      limit $3
    `,
    [visibility, patterns, limit],
  )
  return result.rows
}

async function fetchVectorCandidates(pool: Pool, visibility: AssistantScope[], query: string, limit: number, modelCalls: { count: number }) {
  const embedding = await embedText(query, { expectedDimensions: POSTGRES_EMBEDDING_DIMENSION }).catch(() => null)
  if (!embedding) return []
  modelCalls.count += embedding.modelCalls
  try {
    const result = await pool.query<CandidateRow>(
      `
        select
          c.id as chunk_id,
          c.document_id,
          c.section,
          c.text,
          greatest(0, 1 - (c.embedding <=> $2::extensions.vector(4096))) as score,
          'vector+pgvector' as reason,
          d.title,
          d.summary,
          d.href,
          d.tags,
          d.visibility
        from rag_chunks c
        join rag_documents d on d.id = c.document_id
        where d.visibility = any($1::text[])
          and c.embedding is not null
          and c.embedding_model = $3
        order by c.embedding <=> $2::extensions.vector(4096) asc
        limit $4
      `,
      [visibility, formatVector(embedding.vector), embedding.model, limit],
    )
    return result.rows
  } catch {
    return []
  }
}

async function fetchEntityCandidates(pool: Pool, visibility: AssistantScope[], patterns: string[], limit: number) {
  if (patterns.length === 0) return []
  const entityResult = await pool.query<EntityRow>(
    `
      select id, metadata
      from rag_entities
      where lower(name) like any($1::text[])
        or exists (select 1 from unnest(aliases) alias where lower(alias) like any($1::text[]))
      limit 12
    `,
    [patterns],
  )
  const documentIds = new Set<string>()
  const entityIds = entityResult.rows.map((row) => row.id)
  for (const row of entityResult.rows) {
    const documentId = row.metadata?.documentId
    if (typeof documentId === 'string') documentIds.add(documentId)
  }
  if (entityIds.length > 0) {
    const relationResult = await pool.query<RelationRow>(
      `
        select evidence_document_ids
        from rag_relations
        where from_entity_id = any($1::text[])
          or to_entity_id = any($1::text[])
      `,
      [entityIds],
    )
    for (const relation of relationResult.rows) {
      relation.evidence_document_ids.forEach((documentId) => documentIds.add(documentId))
    }
  }
  if (documentIds.size === 0) return []
  const result = await pool.query<CandidateRow>(
    `
      select
        c.id as chunk_id,
        c.document_id,
        c.section,
        c.text,
        0.64 as score,
        'entity+relation' as reason,
        d.title,
        d.summary,
        d.href,
        d.tags,
        d.visibility
      from rag_chunks c
      join rag_documents d on d.id = c.document_id
      where d.visibility = any($1::text[])
        and d.id = any($2::text[])
      order by d.title asc, c.id asc
      limit $3
    `,
    [visibility, Array.from(documentIds), limit],
  )
  return result.rows
}

function mergeCandidates(rows: CandidateRow[]) {
  const byChunk = new Map<
    string,
    {
      id: string
      documentId: string
      section: string
      text: string
      score: number
      reason: string
      citation: Citation
    }
  >()
  for (const row of rows) {
    const score = normalizeScore(row.score)
    const existing = byChunk.get(row.chunk_id)
    const reason = existing && !existing.reason.includes(row.reason) ? `${existing.reason}+${row.reason}` : row.reason
    if (!existing || score > existing.score) {
      byChunk.set(row.chunk_id, {
        id: row.chunk_id,
        documentId: row.document_id,
        section: row.section,
        text: row.text,
        score,
        reason,
        citation: {
          id: row.document_id,
          title: row.title,
          summary: row.summary,
          href: row.href,
          tags: row.tags,
          visibility: row.visibility,
        },
      })
    } else {
      existing.reason = reason
    }
  }
  return Array.from(byChunk.values()).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'zh-CN'))
}

function buildCitations(candidates: ReturnType<typeof mergeCandidates>, limit: number) {
  const citations: Citation[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (seen.has(candidate.citation.id)) continue
    seen.add(candidate.citation.id)
    citations.push(candidate.citation)
    if (citations.length >= limit) break
  }
  return citations
}

function getRagPool() {
  if (!env.ragDatabaseUrl) return null
  ragPool ??= new Pool({
    connectionString: env.ragDatabaseUrl,
    ssl: /sslmode=disable/i.test(env.ragDatabaseUrl) ? undefined : { rejectUnauthorized: false },
  })
  return ragPool
}

function emptyPostgresHealth(): RagHealthResponse {
  return {
    ok: true,
    service: SERVICE_NAME,
    store: POSTGRES_STORE_NAME,
    vectorReady: false,
    keywordReady: false,
    rerankerReady: false,
    lastSyncAt: null,
    documentCount: 0,
    chunkCount: 0,
    entityCount: 0,
    relationCount: 0,
  }
}

function normalizePostgresSyncFailure(
  error: unknown,
  sourceName: string,
  sourceChecksum: string,
  providerStep: 'embedding' | 'postgres_transaction',
) {
  if (error instanceof EmbeddingDimensionMismatchError) {
    return postgresSyncFailure(sourceName, sourceChecksum, 'embedding_dimension_mismatch', providerStep, 'dimension_mismatch', {
      expectedDimension: error.expectedDimensions,
      actualDimension: error.actualDimensions,
    })
  }
  if (error instanceof EmbeddingProviderError) {
    return postgresSyncFailure(sourceName, sourceChecksum, error.reason, providerStep, classifyEmbeddingError(error), {
      httpStatus: error.httpStatus,
      attemptedEndpoints: error.attemptedEndpoints,
      timeoutMs: error.timeoutMs,
    })
  }
  return postgresSyncFailure(sourceName, sourceChecksum, 'postgres_sync_failed', providerStep, 'database_error')
}

function postgresSyncFailure(
  sourceName: string,
  sourceChecksum: string,
  reason: string,
  providerStep: string,
  errorKind: string,
  details: {
    httpStatus?: number
    expectedDimension?: number
    actualDimension?: number
    attemptedEndpoints?: number
    timeoutMs?: number
  } = {},
): RagSyncResponse {
  return {
    ok: true,
    mode: 'postgres',
    accepted: false,
    scope: 'public',
    health: emptyPostgresHealth(),
    diagnostics: {
      mode: POSTGRES_STORE_NAME,
      scope: 'public',
      reason,
      providerStep,
      errorKind,
      sourceName,
      sourceChecksum,
      documentCount: publicKnowledgeV2?.public_documents.length ?? 0,
      chunkCount: publicKnowledgeV2?.knowledge_chunks.length ?? 0,
      ...details,
    },
  }
}

function classifyEmbeddingError(error: EmbeddingProviderError) {
  if (error.reason.includes('timeout')) return 'timeout'
  if (error.reason.includes('network')) return 'network_error'
  if (error.reason.includes('empty')) return 'invalid_response'
  return typeof error.httpStatus === 'number' ? 'http_status' : 'provider_error'
}

function buildEmptyResponse(intent: string, fallbackReason: 'private-credential' | 'no_public_context'): RagRetrieveResponse {
  return {
    intent,
    citations: [],
    chunks: [],
    meta: {
      retrievalMode: 'agentic-hybrid-pgvector',
      store: POSTGRES_STORE_NAME,
      candidateCount: 0,
      reranked: true,
      sufficient: false,
      sufficiency: 'none',
      fallbackReason,
      citationCount: 0,
      expandedEntityCount: 0,
      modelCalls: 0,
    },
  }
}

function normalizeRetrieveLimit(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return publicKnowledgeV2?.fallback_bundle.defaultLimit ?? 4
  return Math.min(8, Math.max(1, Math.trunc(value)))
}

function normalizeScore(value: number | string) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Number(Math.max(0.001, Math.min(1, numeric)).toFixed(3))
}

function readCount(value: string | undefined) {
  const count = Number(value)
  return Number.isFinite(count) ? count : 0
}

function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4))
}

function hashJson(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function escapeLike(value: string) {
  return value.trim().toLowerCase().replace(/[\\%_]/g, (match) => `\\${match}`)
}

function uniqueTerms(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)))
}
