import { env } from './env.js'
import { retrieveKnowledge } from './knowledge.js'
import type {
  AssistantRetrievalMeta,
  Citation,
  RagAdapterDiagnostic,
  RagAdapterDiagnosticKind,
  RagChunkCitation,
  RagRetrieveResponse,
} from './types.js'

interface PublicAssistantContext {
  citations: Citation[]
  chunks: RagChunkCitation[]
  retrieval: AssistantRetrievalMeta
}

interface RagAttempt {
  response: Response | null
  diagnostic: RagAdapterDiagnostic
}

export async function retrievePublicAssistantContext(query: string, limit = 4): Promise<PublicAssistantContext> {
  const endpoints = getRagRetrieveEndpoints(env.assistantRagApiBaseUrl)
  if (endpoints.length === 0) return retrieveLocalContext(query, limit, 'not_configured')

  let diagnostic: RagAdapterDiagnostic | undefined
  let attemptedEndpoints = 0
  for (const endpoint of endpoints) {
    attemptedEndpoints += 1
    const attempt = await requestRagRetrieve(endpoint, {
      query,
      scope: 'public',
      limit,
      locale: 'zh-CN',
    })
    diagnostic = { ...attempt.diagnostic, attemptedEndpoints }

    if (!attempt.response?.ok) {
      if (attempt.response && [404, 405].includes(attempt.response.status)) continue
      return retrieveLocalContext(query, limit, diagnostic.kind, diagnostic)
    }

    const payload = (await attempt.response.json().catch(() => null)) as unknown
    const parsed = readRagRetrieveResponse(payload)
    if (!parsed) {
      return retrieveLocalContext(query, limit, 'invalid_response', {
        kind: 'invalid_response',
        attemptedEndpoints,
        timeoutMs: env.assistantRagTimeoutMs,
      })
    }

    return {
      citations: parsed.citations,
      chunks: parsed.chunks,
      retrieval: {
        source: 'orchestrator',
        retrievalMode: parsed.meta.retrievalMode,
        store: parsed.meta.store,
        candidateCount: parsed.meta.candidateCount,
        citationCount: parsed.citations.length,
        sufficient: parsed.meta.sufficient,
        sufficiency: parsed.meta.sufficiency,
        fallbackReason: parsed.meta.fallbackReason,
        expandedEntityCount: parsed.meta.expandedEntityCount,
        modelCalls: parsed.meta.modelCalls,
      },
    }
  }

  return retrieveLocalContext(query, limit, diagnostic?.kind ?? 'http_status', diagnostic)
}

function retrieveLocalContext(
  query: string,
  limit: number,
  fallbackReason?: AssistantRetrievalMeta['fallbackReason'],
  diagnostic?: RagAdapterDiagnostic,
): PublicAssistantContext {
  const retrieval = retrieveKnowledge(query, limit)
  return {
    citations: retrieval.citations,
    chunks: retrieval.chunks,
    retrieval: {
      source: 'local',
      retrievalMode: 'local-agentic-hybrid',
      store: 'local',
      candidateCount: retrieval.candidateCount,
      citationCount: retrieval.citations.length,
      sufficient: retrieval.sufficiency === 'enough',
      sufficiency: retrieval.sufficiency,
      fallbackReason: fallbackReason ?? inferLocalFallbackReason(retrieval.sufficiency, retrieval.intent),
      expandedEntityCount: retrieval.expandedEntityIds.length,
      modelCalls: 0,
      diagnostic,
    },
  }
}

function inferLocalFallbackReason(sufficiency: 'enough' | 'weak' | 'none', intent: string) {
  if (sufficiency !== 'none') return null
  return intent === 'private-credential' ? 'private-credential' : 'no_public_context'
}

function getRagRetrieveEndpoints(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  if (!normalized) return []
  if (normalized.endsWith('/v1/retrieve')) return [normalized]
  if (normalized.endsWith('/v1')) return [`${normalized}/retrieve`]
  if (normalized.endsWith('/rag')) return [`${normalized}/v1/retrieve`]
  if (normalized.endsWith('/rag/v1')) return [`${normalized}/retrieve`]
  return Array.from(new Set([`${normalized}/v1/retrieve`, `${normalized}/rag/v1/retrieve`]))
}

async function requestRagRetrieve(endpoint: string, body: unknown): Promise<RagAttempt> {
  const abort = new AbortController()
  let diagnosticKind: RagAdapterDiagnosticKind = 'network_error'
  const timeout = setTimeout(() => {
    diagnosticKind = 'timeout'
    abort.abort()
  }, env.assistantRagTimeoutMs)

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (env.assistantRagApiKey) headers.Authorization = `Bearer ${env.assistantRagApiKey}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: abort.signal,
      body: JSON.stringify(body),
    })
    return {
      response,
      diagnostic: {
        kind: 'http_status',
        httpStatusClass: toStatusClass(response.status),
        attemptedEndpoints: 0,
        timeoutMs: env.assistantRagTimeoutMs,
      },
    }
  } catch {
    return {
      response: null,
      diagnostic: {
        kind: diagnosticKind,
        attemptedEndpoints: 0,
        timeoutMs: env.assistantRagTimeoutMs,
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

function readRagRetrieveResponse(value: unknown): RagRetrieveResponse | null {
  if (!isRecord(value) || !Array.isArray(value.citations) || !Array.isArray(value.chunks) || !isRecord(value.meta)) return null
  const citations = value.citations.map(readCitation).filter((item): item is Citation => Boolean(item))
  if (citations.length !== value.citations.length) return null
  const chunks = value.chunks.map(readChunk).filter((item): item is RagChunkCitation => Boolean(item))
  if (chunks.length !== value.chunks.length) return null
  const sufficiency = readSufficiency(value.meta.sufficiency)
  if (!sufficiency) return null

  return {
    intent: typeof value.intent === 'string' ? value.intent : 'broad-unknown',
    citations,
    chunks,
    meta: {
      retrievalMode: typeof value.meta.retrievalMode === 'string' ? value.meta.retrievalMode : 'hybrid',
      store: typeof value.meta.store === 'string' ? value.meta.store : 'local',
      candidateCount: readNumber(value.meta.candidateCount, citations.length),
      reranked: value.meta.reranked === true,
      sufficient: value.meta.sufficient === true,
      sufficiency,
      fallbackReason: readRagFallbackReason(value.meta.fallbackReason),
      citationCount: readNumber(value.meta.citationCount, citations.length),
      expandedEntityCount: readNumber(value.meta.expandedEntityCount, 0),
      modelCalls: 0,
    },
  }
}

function readCitation(value: unknown): Citation | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.summary !== 'string' || typeof value.href !== 'string') {
    return null
  }
  return {
    id: value.id,
    title: value.title,
    summary: value.summary,
    href: value.href,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    visibility: value.visibility === 'internal' ? 'internal' : 'public',
  }
}

function readChunk(value: unknown): RagChunkCitation | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.documentId !== 'string' ||
    typeof value.text !== 'string' ||
    typeof value.section !== 'string' ||
    typeof value.reason !== 'string'
  ) {
    return null
  }
  return {
    id: value.id,
    documentId: value.documentId,
    text: value.text,
    section: value.section,
    score: readNumber(value.score, 0),
    reason: value.reason,
  }
}

function readSufficiency(value: unknown) {
  return value === 'enough' || value === 'weak' || value === 'none' ? value : null
}

function readRagFallbackReason(value: unknown) {
  return value === 'private-credential' || value === 'no_public_context' ? value : null
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toStatusClass(status: number): `${number}xx` {
  return `${Math.trunc(status / 100)}xx`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
