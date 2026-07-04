import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { KnowledgeItem } from './types.js'

type SourceType = 'site' | 'project' | 'blog' | 'status'
type RetrievalIntent =
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

interface PublicKnowledgeV2 {
  public_documents: Array<KnowledgeItem & { sourceType: SourceType; projectId?: string }>
  entities: KnowledgeEntity[]
  relations: KnowledgeRelation[]
  fallback_bundle: {
    searchKeywords: string[]
    searchAliases: SearchAliasGroup[]
    defaultLimit: number
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const knowledgePath = path.resolve(__dirname, '../data/public-knowledge.json')
const knowledgeV2Path = path.resolve(__dirname, '../data/public-knowledge-v2.json')

const INTENT_TERMS: Record<RetrievalIntent, string[]> = {
  'site-overview': ['站点', '网站', '当前网站', '泊岸', 'biau', '能做什么', '主要展示', '关于当前'],
  'project-experience': ['项目', '案例', '作品', '展示', '体验', '看什么'],
  'demo-access': ['演示', '入口', 'demo', '试用', '登录', '注册', '凭据', '密码', '试玩', '下载'],
  'reliability-status': ['状态', '可靠性', '健康检查', '监控', '外链', '是否正常', '可用性'],
  'technology-architecture': ['技术', '技术栈', '架构', '实现', 'react', 'vite', 'semi', 'typescript', 'express', 'prisma', 'pgvector'],
  'blog-knowledge': ['文章', '博客', '知识', '总结', '资源', '日报', '手记'],
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
const publicKnowledgeV2 = loadKnowledgeV2()

export function searchKnowledge(query: string, limit = publicKnowledgeV2?.fallback_bundle.defaultLimit ?? 4) {
  const normalized = normalizeText(query)
  if (!normalized) return publicKnowledge.slice(0, limit)

  const intent = classifyIntent(query)
  if (intent === 'private-credential') return []
  const terms = extractQueryTerms(query, publicKnowledgeV2)
  const expanded = publicKnowledgeV2 ? expandEntities(publicKnowledgeV2, normalized, terms) : createEmptyExpansion()

  return publicKnowledge
    .map((item) => ({
      item,
      score: scoreKnowledgeItem(item, normalized, terms, intent, expanded.documentIds.has(item.id)),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'zh-CN'))
    .slice(0, limit)
    .map((entry) => entry.item)
}

function classifyIntent(query: string): RetrievalIntent {
  const normalized = normalizeText(query)
  if (isPrivateCredentialRequest(normalized)) return 'private-credential'

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

function uniqueTerms(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)))
}
