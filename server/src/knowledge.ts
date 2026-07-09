import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { KnowledgeItem } from './types.js'

type SourceType = 'site' | 'project' | 'blog' | 'status'
export type RetrievalIntent =
  | 'site-overview'
  | 'project-experience'
  | 'demo-access'
  | 'reliability-status'
  | 'technology-architecture'
  | 'blog-knowledge'
  | 'private-credential'
  | 'broad-unknown'

interface SearchAliasGroup {
  triggers: string[]
  terms: string[]
}

interface KnowledgeEntity {
  id: string
  name: string
  aliases: string[]
  metadata: Record<string, unknown>
}

interface KnowledgeRelation {
  fromEntityId: string
  toEntityId: string
  evidenceDocumentIds: string[]
}

interface KnowledgeChunk {
  id: string
  documentId: string
  text: string
  section: string
  metadata: {
    sourceType: SourceType
    projectId?: string
    tags: string[]
  }
}

interface PublicKnowledgeV2 {
  public_documents: Array<KnowledgeItem & { sourceType: SourceType; projectId?: string }>
  knowledge_chunks: KnowledgeChunk[]
  entities: KnowledgeEntity[]
  relations: KnowledgeRelation[]
  fallback_bundle: {
    searchKeywords: string[]
    searchAliases: SearchAliasGroup[]
    defaultLimit: number
  }
}

export interface KnowledgeChunkResult {
  id: string
  documentId: string
  text: string
  section: string
  score: number
  reason: string
}

export interface KnowledgeRetrievalResult {
  citations: KnowledgeItem[]
  chunks: KnowledgeChunkResult[]
  intent: RetrievalIntent
  terms: string[]
  expandedEntityIds: string[]
  sufficiency: 'enough' | 'weak' | 'none'
  candidateCount: number
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const knowledgePath = path.resolve(__dirname, '../data/public-knowledge.json')
const knowledgeV2Path = path.resolve(__dirname, '../data/public-knowledge-v2.json')

const INTENT_TERMS: Record<RetrievalIntent, string[]> = {
  'site-overview': ['站点', '网站', '当前网站', '泊岸', 'biau', '能做什么', '主要展示', '关于当前'],
  'project-experience': ['项目', '案例', '作品', '展示', '体验', '看什么'],
  'demo-access': ['演示', '入口', 'demo', '试用', '登录', '注册', '凭据', '密码', '试玩', '下载'],
  'reliability-status': ['状态', '可靠性', '健康检查', '监控', '外链', '是否正常', '可用性', '人工 gate', '后续接入', '低敏证据'],
  'technology-architecture': ['技术', '技术栈', '架构', '实现', 'react', 'vite', 'semi', 'typescript', 'express', 'prisma', 'pgvector'],
  'blog-knowledge': ['文章', '博客', '知识', '总结', '资源', '日报', 'ai daily', '首发', 'publish export', 'hidden', 'review-needed', '手记'],
  'private-credential': ['后台密码', '管理员密码', 'api key', 'apikey', '模型 key', 'token', '密钥', '数据库 url', 'database url'],
  'broad-unknown': [],
}

function loadKnowledge(): KnowledgeItem[] {
  try {
    const raw = fs.readFileSync(knowledgePath, 'utf8')
    return JSON.parse(raw) as KnowledgeItem[]
  } catch {
    return [
      {
        id: 'site:intro',
        title: 'BIAU Port 站点简介',
        summary: 'BIAU Port 泊岸用于组织 AI 应用、业务系统、互动体验、移动端案例和技术知识库。',
        href: '/',
        tags: ['BIAU Port', '项目展示', '知识库'],
        visibility: 'public',
      },
    ]
  }
}

function loadKnowledgeV2(): PublicKnowledgeV2 | null {
  try {
    const raw = fs.readFileSync(knowledgeV2Path, 'utf8')
    return JSON.parse(raw) as PublicKnowledgeV2
  } catch {
    return null
  }
}

export const publicKnowledge = loadKnowledge()
export const publicKnowledgeV2 = loadKnowledgeV2()

export function searchKnowledge(query: string, limit = publicKnowledgeV2?.fallback_bundle.defaultLimit ?? 4) {
  return retrieveKnowledge(query, limit).citations
}

export function retrieveKnowledge(query: string, limit = publicKnowledgeV2?.fallback_bundle.defaultLimit ?? 4): KnowledgeRetrievalResult {
  const normalized = normalizeText(query)
  const intent = classifyIntent(query)
  const normalizedLimit = normalizeLimit(limit)
  if (intent === 'private-credential') return emptyRetrieval(intent)
  if (!normalized) {
    const citations = publicKnowledge.slice(0, normalizedLimit)
    return {
      citations,
      chunks: buildChunkResults(citations, new Map(), new Set(), 1),
      intent,
      terms: [],
      expandedEntityIds: [],
      sufficiency: citations.length > 0 ? 'weak' : 'none',
      candidateCount: publicKnowledge.length,
    }
  }

  const terms = extractQueryTerms(query, publicKnowledgeV2)
  const expanded = publicKnowledgeV2 ? expandEntities(publicKnowledgeV2, normalized, terms) : createEmptyExpansion()

  const scored = publicKnowledge
    .map((item) => ({
      item,
      score: scoreKnowledgeItem(item, normalized, terms, intent, expanded.documentIds.has(item.id)),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'zh-CN'))

  const citations = selectCitationsForIntent(scored, normalizedLimit, intent).map((entry) => entry.item)
  const diversity = new Set(citations.map((item) => inferSourceType(item))).size
  const sufficiency = citations.length === 0 ? 'none' : citations.length >= 2 || diversity >= 2 ? 'enough' : 'weak'
  const scoreByDocument = new Map(scored.map((entry) => [entry.item.id, entry.score]))
  const topScore = scored[0]?.score ?? 1

  return {
    citations,
    chunks: buildChunkResults(citations, scoreByDocument, expanded.documentIds, topScore),
    intent,
    terms,
    expandedEntityIds: Array.from(expanded.entityIds),
    sufficiency,
    candidateCount: scored.length,
  }
}

function classifyIntent(query: string): RetrievalIntent {
  const normalized = normalizeText(query)
  if (isPrivateCredentialRequest(normalized)) return 'private-credential'
  if (isAiDailyKnowledgeRequest(normalized)) return 'blog-knowledge'

  const order: RetrievalIntent[] = [
    'reliability-status',
    'demo-access',
    'technology-architecture',
    'blog-knowledge',
    'site-overview',
    'project-experience',
  ]

  for (const intent of order) {
    if (INTENT_TERMS[intent].some((term) => normalized.includes(normalizeText(term)))) return intent
  }

  return 'broad-unknown'
}

function extractQueryTerms(query: string, knowledge: PublicKnowledgeV2 | null) {
  const normalized = normalizeText(query)
  const asciiTerms = normalized.match(/[a-z0-9+#.]+/g) ?? []
  const keywords = knowledge?.fallback_bundle.searchKeywords ?? []
  const aliases = knowledge?.fallback_bundle.searchAliases ?? []
  const explicitTerms = keywords.filter((term) => normalized.includes(normalizeText(term)))
  const aliasTerms = aliases.flatMap((group) =>
    group.triggers.some((trigger) => normalized.includes(normalizeText(trigger))) ? group.terms : [],
  )
  const intentTerms = INTENT_TERMS[classifyIntent(query)]

  return uniqueTerms([...asciiTerms, ...explicitTerms, ...aliasTerms, ...intentTerms])
}

function expandEntities(knowledge: PublicKnowledgeV2, normalized: string, terms: string[]) {
  const entityIds = new Set<string>()
  const documentIds = new Set<string>()

  for (const entity of knowledge.entities) {
    const aliases = [entity.name, ...entity.aliases].map(normalizeText)
    if (aliases.some((alias) => alias && (normalized.includes(alias) || terms.some((term) => alias.includes(term) || term.includes(alias))))) {
      entityIds.add(entity.id)
      const documentId = entity.metadata.documentId
      if (typeof documentId === 'string') documentIds.add(documentId)
    }
  }

  for (const relation of knowledge.relations) {
    if (!entityIds.has(relation.fromEntityId) && !entityIds.has(relation.toEntityId)) continue
    relation.evidenceDocumentIds.forEach((documentId) => documentIds.add(documentId))
    entityIds.add(relation.fromEntityId)
    entityIds.add(relation.toEntityId)
  }

  return { entityIds, documentIds }
}

function createEmptyExpansion() {
  return { entityIds: new Set<string>(), documentIds: new Set<string>() }
}

function emptyRetrieval(intent: RetrievalIntent): KnowledgeRetrievalResult {
  return {
    citations: [],
    chunks: [],
    intent,
    terms: [],
    expandedEntityIds: [],
    sufficiency: 'none',
    candidateCount: 0,
  }
}

function selectCitationsForIntent(
  scored: Array<{ item: KnowledgeItem; score: number }>,
  limit: number,
  intent: RetrievalIntent,
) {
  const selected = scored.slice(0, limit)
  if (intent !== 'demo-access' || selected.length < limit) return selected

  const minimumProjectCitations = Math.min(2, limit)
  let projectCount = selected.filter((entry) => inferSourceType(entry.item) === 'project').length
  if (projectCount >= minimumProjectCitations) return selected

  const selectedIds = new Set(selected.map((entry) => entry.item.id))
  const adjusted = [...selected]
  const projectBackfills = scored.filter((entry) => !selectedIds.has(entry.item.id) && inferSourceType(entry.item) === 'project')

  for (const projectBackfill of projectBackfills) {
    if (projectCount >= minimumProjectCitations) break

    let replaceIndex = -1
    for (let index = adjusted.length - 1; index >= 0; index -= 1) {
      if (inferSourceType(adjusted[index].item) !== 'project') {
        replaceIndex = index
        break
      }
    }
    if (replaceIndex === -1) break

    adjusted[replaceIndex] = projectBackfill
    selectedIds.add(projectBackfill.item.id)
    projectCount += 1
  }

  return adjusted
}

function buildChunkResults(
  citations: KnowledgeItem[],
  scoreByDocument: Map<string, number>,
  expandedDocumentIds: Set<string>,
  topScore: number,
) {
  if (!publicKnowledgeV2) return []
  const citationIds = new Set(citations.map((citation) => citation.id))
  return publicKnowledgeV2.knowledge_chunks
    .filter((chunk) => citationIds.has(chunk.documentId))
    .map((chunk): KnowledgeChunkResult => {
      const documentScore = scoreByDocument.get(chunk.documentId) ?? 1
      const normalizedScore = Math.max(0.001, Math.min(1, documentScore / Math.max(1, topScore)))
      const reason = expandedDocumentIds.has(chunk.documentId) ? 'keyword+metadata+entity' : 'keyword+metadata'
      return {
        id: chunk.id,
        documentId: chunk.documentId,
        text: chunk.text,
        section: chunk.section,
        score: Number(normalizedScore.toFixed(3)),
        reason,
      }
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'zh-CN'))
    .slice(0, Math.max(1, citations.length))
}

function scoreKnowledgeItem(
  item: KnowledgeItem,
  normalized: string,
  terms: string[],
  intent: RetrievalIntent,
  expandedByEntity: boolean,
) {
  const id = normalizeText(item.id)
  const title = normalizeText(item.title)
  const summary = normalizeText(item.summary)
  const tags = item.tags.map(normalizeText)
  const sourceType = inferSourceType(item)

  let score = expandedByEntity ? 8 : 0
  if (title.includes(normalized)) score += 10
  if (summary.includes(normalized)) score += 6
  if (tags.some((tag) => tag.includes(normalized))) score += 5

  for (const term of terms) {
    if (id.includes(term)) score += 5
    if (title.includes(term)) score += 6
    if (tags.some((tag) => tag.includes(term))) score += 4
    if (summary.includes(term)) score += 2
  }

  if (intent === 'site-overview' && item.id === 'site:intro') score += 16
  if (intent === 'reliability-status' && (item.id === 'site:status' || item.href === '/status')) score += 14
  if (intent === 'blog-knowledge' && item.id === 'site:ai-daily') score += 16
  if (intent === 'project-experience' && sourceType === 'project') score += 9
  if (intent === 'demo-access' && sourceType === 'project') score += 8
  if (intent === 'technology-architecture' && sourceType === 'project') score += 6
  if (intent === 'blog-knowledge' && sourceType === 'blog') score += 8
  if (sourceType === 'blog' && tags.includes('精选知识')) score += 2

  return score
}

function inferSourceType(item: Pick<KnowledgeItem, 'id' | 'href'>): SourceType {
  if (item.id === 'site:status' || item.href === '/status') return 'status'
  if (item.id.startsWith('project:')) return 'project'
  if (item.id.startsWith('blog:')) return 'blog'
  return 'site'
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function normalizeLimit(value: number) {
  if (!Number.isFinite(value)) return publicKnowledgeV2?.fallback_bundle.defaultLimit ?? 4
  return Math.min(8, Math.max(1, Math.trunc(value)))
}

function isPrivateCredentialRequest(normalized: string) {
  const credentialTerms = [
    'api key',
    'apikey',
    'secret key',
    'access token',
    'bearer token',
    'model key',
    '模型 key',
    '密钥',
    'token',
    '数据库 url',
    'database url',
    '连接串',
    '后台密码',
    '管理员密码',
    'admin password',
  ]
  return credentialTerms.some((term) => normalized.includes(term))
}

function isAiDailyKnowledgeRequest(normalized: string) {
  return ['ai daily', 'ai日报', 'ai 日报', '日报'].some((term) => normalized.includes(term))
}

function uniqueTerms(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)))
}
