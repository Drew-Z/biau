import type { Project } from './portfolio'

export type AssistantKnowledgeSourceType = 'site' | 'project' | 'blog' | 'status'
export type AssistantKnowledgeEntityType =
  | 'site'
  | 'project'
  | 'tech'
  | 'feature'
  | 'demo'
  | 'status-check'
  | 'blog-post'
  | 'roadmap'
  | 'limitation'
export type AssistantKnowledgeRelationType =
  | 'contains'
  | 'uses'
  | 'implements'
  | 'hasDemo'
  | 'monitoredBy'
  | 'documentedBy'
  | 'hasRoadmap'
  | 'hasLimitation'
  | 'relatedTo'
export type AssistantRetrievalIntent =
  | 'site-overview'
  | 'project-experience'
  | 'demo-access'
  | 'reliability-status'
  | 'technology-architecture'
  | 'blog-knowledge'
  | 'private-credential'
  | 'broad-unknown'

export interface AssistantKnowledgeItemLike {
  id: string
  title: string
  summary: string
  href: string
  tags: string[]
  visibility: 'public' | 'internal'
}

export interface AssistantKnowledgeDocument extends AssistantKnowledgeItemLike {
  visibility: 'public'
  sourceType: AssistantKnowledgeSourceType
  projectId?: string
}

export interface AssistantKnowledgeChunk {
  id: string
  documentId: string
  text: string
  section: string
  metadata: {
    sourceType: AssistantKnowledgeSourceType
    projectId?: string
    tags: string[]
  }
}

export interface AssistantKnowledgeEntity {
  id: string
  type: AssistantKnowledgeEntityType
  name: string
  aliases: string[]
  metadata: Record<string, string | string[] | number | boolean>
}

export interface AssistantKnowledgeRelation {
  id: string
  fromEntityId: string
  toEntityId: string
  type: AssistantKnowledgeRelationType
  weight: number
  evidenceDocumentIds: string[]
}

export interface AssistantSearchAliasGroup {
  triggers: string[]
  terms: string[]
}

export interface PublicKnowledgeV2 {
  schemaVersion: 'public-assistant-knowledge-v2'
  public_documents: AssistantKnowledgeDocument[]
  knowledge_chunks: AssistantKnowledgeChunk[]
  entities: AssistantKnowledgeEntity[]
  relations: AssistantKnowledgeRelation[]
  fallback_bundle: {
    searchKeywords: string[]
    searchAliases: AssistantSearchAliasGroup[]
    defaultLimit: number
  }
}

export interface AssistantRetrievalResult<T extends AssistantKnowledgeItemLike = AssistantKnowledgeItemLike> {
  citations: T[]
  intent: AssistantRetrievalIntent
  terms: string[]
  expandedEntityIds: string[]
  sufficiency: 'enough' | 'weak' | 'none'
}

export const ASSISTANT_SEARCH_KEYWORDS = [
  '站点',
  '网站',
  '当前网站',
  '公开内容',
  '项目方向',
  '能力',
  'ai',
  'rag',
  '知识库',
  '可靠性',
  '状态',
  '状态页',
  '健康检查',
  '外链',
  '合同审查',
  '合同',
  '法律',
  '引用',
  '游戏',
  '互动体验',
  'godot',
  '试玩',
  '部署',
  '入口',
  '演示',
  '登录',
  '注册',
  'operator',
  '密码',
  '凭据',
  'playlab',
  'biau',
  '泊岸',
  'pet',
  '桌宠',
  '完成',
  'wip',
  'ozon',
  'erp',
  '电商',
  '架构',
  '实现',
  '技术栈',
  '寻球',
  'xunqiu',
  '足球',
  'android',
  '后端',
  '优化',
  '后续',
  '路线',
  '生成管线',
  '人审',
  '社区',
  '移动端',
  'react',
  'vite',
  'semi',
  'semi design',
  'typescript',
  'express',
  'prisma',
  'postgresql',
  'pgvector',
] as const

export const ASSISTANT_SEARCH_ALIASES: AssistantSearchAliasGroup[] = [
  {
    triggers: ['rag', '知识库', '合同审查', '合同', '法律'],
    terms: ['legal rag', '引用溯源', '合同审查', '风险审查', 'hybrid retrieval', 'pgvector'],
  },
  {
    triggers: ['登录', '密码', '凭据', '演示', '入口', 'demo', 'login'],
    terms: ['legal rag', '登录门禁', '公开演示凭据', '受控演示', 'demo 凭据', '公开入口'],
  },
  {
    triggers: ['状态', '状态页', '可靠性', '健康检查', '外链'],
    terms: ['项目可靠性观察', '状态页', 'health', 'synthetic', '公开入口', '监控'],
  },
  {
    triggers: ['游戏', '互动体验', '试玩', 'godot', 'playlab'],
    terms: ['biau playlab', 'godot web', 'web 试玩', '互动体验'],
  },
  {
    triggers: ['pet', '桌宠', '宠物'],
    terms: ['pet-workspace', 'ai 桌宠', '生成管线', '质量门禁', 'apk'],
  },
  {
    triggers: ['ozon', 'erp', '电商', '注册', 'operator'],
    terms: ['ozon erp', '业务系统', '运营后台', '浏览器插件', '注册策略', '受控登录', 'operator'],
  },
  {
    triggers: ['寻球', 'xunqiu', '足球', 'android', '移动端'],
    terms: ['xunqiu', '寻球', 'android 64', 'spring boot'],
  },
  {
    triggers: ['ai', '人工智能'],
    terms: ['ai 应用', 'legal rag', 'ai 桌宠', '公开助手'],
  },
  {
    triggers: ['react', 'vite', 'semi', 'semi design', 'typescript', '技术栈', '架构', '实现'],
    terms: ['react 19', 'vite', 'semi design', 'typescript', 'express', 'prisma', '架构'],
  },
]

const INTENT_TERMS: Record<AssistantRetrievalIntent, string[]> = {
  'site-overview': ['站点', '网站', '当前网站', '泊岸', 'biau', '能做什么', '主要展示', '关于当前'],
  'project-experience': ['项目', '案例', '作品', '展示', '体验', '看什么'],
  'demo-access': ['演示', '入口', 'demo', '试用', '登录', '注册', '凭据', '密码', '试玩', '下载'],
  'reliability-status': ['状态', '可靠性', '健康检查', '监控', '外链', '是否正常', '可用性'],
  'technology-architecture': ['技术', '技术栈', '架构', '实现', 'react', 'vite', 'semi', 'typescript', 'express', 'prisma', 'pgvector'],
  'blog-knowledge': ['文章', '博客', '知识', '总结', '资源', '日报', '手记'],
  'private-credential': ['后台密码', '管理员密码', 'api key', 'apikey', '模型 key', 'token', '密钥', '数据库 url', 'database url'],
  'broad-unknown': [],
}

export function buildPublicKnowledgeV2(
  items: AssistantKnowledgeItemLike[],
  options: { projects?: Project[] } = {},
): PublicKnowledgeV2 {
  const publicItems = items.filter((item): item is AssistantKnowledgeItemLike & { visibility: 'public' } => item.visibility === 'public')
  const projectById = new Map((options.projects ?? []).map((project) => [project.id, project]))
  const public_documents = publicItems.map((item): AssistantKnowledgeDocument => {
    const projectId = getProjectIdFromKnowledgeId(item.id)
    return {
      ...item,
      sourceType: inferSourceType(item),
      ...(projectId ? { projectId } : {}),
    }
  })

  const knowledge_chunks = public_documents.flatMap((document) => createDocumentChunks(document))
  const { entities, relations } = createEntitiesAndRelations(public_documents, projectById)

  return {
    schemaVersion: 'public-assistant-knowledge-v2',
    public_documents,
    knowledge_chunks,
    entities,
    relations,
    fallback_bundle: {
      searchKeywords: [...ASSISTANT_SEARCH_KEYWORDS],
      searchAliases: ASSISTANT_SEARCH_ALIASES,
      defaultLimit: 4,
    },
  }
}

export function searchAssistantKnowledge<T extends AssistantKnowledgeItemLike>(
  items: T[],
  query: string,
  options: { limit?: number; knowledge?: PublicKnowledgeV2 } = {},
): AssistantRetrievalResult<T> {
  const limit = options.limit ?? options.knowledge?.fallback_bundle.defaultLimit ?? 4
  const normalized = normalizeText(query)
  const intent = classifyAssistantIntent(query)
  if (intent === 'private-credential') {
    return {
      citations: [],
      intent,
      terms: [],
      expandedEntityIds: [],
      sufficiency: 'none',
    }
  }
  if (!normalized) {
    return {
      citations: items.slice(0, limit),
      intent,
      terms: [],
      expandedEntityIds: [],
      sufficiency: items.length > 0 ? 'weak' : 'none',
    }
  }

  const terms = extractAssistantQueryTerms(query, options.knowledge)
  const expanded = options.knowledge ? expandEntities(options.knowledge, normalized, terms) : createEmptyExpansion()

  const scored = items
    .map((item) => ({
      item,
      score: scoreKnowledgeItem(item, normalized, terms, intent, expanded.documentIds.has(item.id)),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'zh-CN'))

  const citations = selectCitationsForIntent(scored, limit, intent).map((entry) => entry.item)
  const diversity = new Set(citations.map((item) => inferSourceType(item))).size
  const sufficiency = citations.length === 0 ? 'none' : citations.length >= 2 || diversity >= 2 ? 'enough' : 'weak'

  return {
    citations,
    intent,
    terms,
    expandedEntityIds: Array.from(expanded.entityIds),
    sufficiency,
  }
}

function selectCitationsForIntent<T extends AssistantKnowledgeItemLike>(
  scored: Array<{ item: T; score: number }>,
  limit: number,
  intent: AssistantRetrievalIntent,
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

export function buildPublicKnowledgeFallbackAnswer(
  question: string,
  citations: AssistantKnowledgeItemLike[],
  options: { reason?: string; maxLength?: number; intent?: AssistantRetrievalIntent } = {},
) {
  const intent = options.intent ?? classifyAssistantIntent(question)
  const maxLength = options.maxLength ?? 420
  if (intent === 'private-credential') {
    return compactAnswer(
      '我不能提供后台密码、API key、token、数据库连接或模型中转配置。公开助手只能说明公开演示入口、可公开的 demo 边界和状态页信息；如果需要配置密钥，请在部署平台的私有环境变量里处理。',
      maxLength,
    )
  }
  if (citations.length === 0) {
    return compactAnswer(
      `这个问题暂时没有命中足够的公开资料。我不会补造结论；可以换成项目名、技术栈、演示入口，或先查看项目页与状态页。`,
      maxLength,
    )
  }

  const titleList = citations
    .slice(0, 3)
    .map((item) => item.title.replace(/｜.*$/, '').trim())
    .join('、')
  const intro = getFallbackIntro(options.reason)
  const body = buildIntentAnswerBody(intent, titleList)
  return compactAnswer(`${intro}${body}详情和路径放在下方来源卡片里，建议从 ${titleList} 开始看。`, maxLength)
}

export function classifyAssistantIntent(query: string): AssistantRetrievalIntent {
  const normalized = normalizeText(query)
  if (isPrivateCredentialRequest(normalized)) return 'private-credential'

  const order: AssistantRetrievalIntent[] = [
    'reliability-status',
    'demo-access',
    'technology-architecture',
    'blog-knowledge',
    'site-overview',
    'project-experience',
  ]

  for (const intent of order) {
    if (INTENT_TERMS[intent].some((term) => normalized.includes(term))) return intent
  }

  return 'broad-unknown'
}

export function extractAssistantQueryTerms(query: string, knowledge?: PublicKnowledgeV2) {
  const normalized = normalizeText(query)
  const keywords = knowledge?.fallback_bundle.searchKeywords ?? [...ASSISTANT_SEARCH_KEYWORDS]
  const aliases = knowledge?.fallback_bundle.searchAliases ?? ASSISTANT_SEARCH_ALIASES
  const asciiTerms = normalized.match(/[a-z0-9+#.]+/g) ?? []
  const explicitTerms = keywords.filter((term) => normalized.includes(normalizeText(term)))
  const aliasTerms = aliases.flatMap((group) =>
    group.triggers.some((trigger) => normalized.includes(normalizeText(trigger))) ? group.terms : [],
  )
  const intentTerms = INTENT_TERMS[classifyAssistantIntent(query)]

  return uniqueTerms([...asciiTerms, ...explicitTerms, ...aliasTerms, ...intentTerms])
}

function createEntitiesAndRelations(
  documents: AssistantKnowledgeDocument[],
  projectById: Map<string, Project>,
) {
  const entities = new Map<string, AssistantKnowledgeEntity>()
  const relations = new Map<string, AssistantKnowledgeRelation>()

  addEntity(entities, {
    id: 'site:biau-port',
    type: 'site',
    name: 'BIAU Port 泊岸',
    aliases: ['泊岸', 'biau port', 'biau', '主站', '当前网站'],
    metadata: { documentId: 'site:intro', href: '/' },
  })

  for (const document of documents) {
    if (document.id === 'site:status') {
      addEntity(entities, {
        id: 'status:site-status',
        type: 'status-check',
        name: '项目可靠性观察',
        aliases: ['状态页', '可靠性观察', 'health check', 'synthetic'],
        metadata: { documentId: document.id, href: document.href },
      })
      addRelation(relations, 'site:biau-port', 'status:site-status', 'contains', [document.id], 0.9)
      continue
    }

    if (document.sourceType === 'project' && document.projectId) {
      const project = projectById.get(document.projectId)
      const projectEntityId = `project:${document.projectId}`
      addEntity(entities, {
        id: projectEntityId,
        type: 'project',
        name: document.title,
        aliases: uniqueTerms([document.title, document.projectId, ...document.tags]),
        metadata: {
          documentId: document.id,
          href: document.href,
          category: project?.category ?? '',
          status: project?.status ?? '',
        },
      })
      addRelation(relations, 'site:biau-port', projectEntityId, 'contains', [document.id], 1)

      const statusEntityId = `status:${document.projectId}`
      addEntity(entities, {
        id: statusEntityId,
        type: 'status-check',
        name: `${document.title.replace(/｜.*$/, '')} 状态检查`,
        aliases: uniqueTerms([document.title, document.projectId, '状态', '可靠性', 'health']),
        metadata: { documentId: 'site:status', projectId: document.projectId, href: '/status' },
      })
      addRelation(relations, projectEntityId, statusEntityId, 'monitoredBy', [document.id, 'site:status'], 0.8)

      if (project) {
        for (const tech of project.stack) {
          const techEntityId = `tech:${slugifyId(tech)}`
          addEntity(entities, {
            id: techEntityId,
            type: 'tech',
            name: tech,
            aliases: uniqueTerms([tech, tech.replace(/\s+/g, ''), tech.toLowerCase()]),
            metadata: {},
          })
          addRelation(relations, projectEntityId, techEntityId, 'uses', [document.id], 0.9)
        }

        for (const feature of project.highlights) {
          const featureEntityId = `feature:${document.projectId}:${slugifyId(feature)}`
          addEntity(entities, {
            id: featureEntityId,
            type: 'feature',
            name: feature,
            aliases: uniqueTerms([feature]),
            metadata: { projectId: document.projectId },
          })
          addRelation(relations, projectEntityId, featureEntityId, 'implements', [document.id], 0.7)
        }

        if (project.links.length > 0) {
          const demoEntityId = `demo:${document.projectId}`
          addEntity(entities, {
            id: demoEntityId,
            type: 'demo',
            name: `${document.title.replace(/｜.*$/, '')} 演示入口`,
            aliases: uniqueTerms(['演示', '入口', 'demo', ...project.links.map((link) => link.label)]),
            metadata: { projectId: document.projectId, href: document.href },
          })
          addRelation(relations, projectEntityId, demoEntityId, 'hasDemo', [document.id], 0.9)
        }

        if (project.detailContent?.roadmap?.length) {
          const roadmapEntityId = `roadmap:${document.projectId}`
          addEntity(entities, {
            id: roadmapEntityId,
            type: 'roadmap',
            name: `${document.title.replace(/｜.*$/, '')} 后续优化`,
            aliases: uniqueTerms(['后续', '路线', 'roadmap', ...project.detailContent.roadmap.map((section) => section.title)]),
            metadata: { projectId: document.projectId, documentId: document.id },
          })
          addRelation(relations, projectEntityId, roadmapEntityId, 'hasRoadmap', [document.id], 0.65)
        }

        if (project.detailContent?.limitations?.length) {
          const limitationEntityId = `limitation:${document.projectId}`
          addEntity(entities, {
            id: limitationEntityId,
            type: 'limitation',
            name: `${document.title.replace(/｜.*$/, '')} 当前边界`,
            aliases: uniqueTerms(['边界', '限制', '风险', ...project.detailContent.limitations.map((section) => section.title)]),
            metadata: { projectId: document.projectId, documentId: document.id },
          })
          addRelation(relations, projectEntityId, limitationEntityId, 'hasLimitation', [document.id], 0.65)
        }
      }
      continue
    }

    if (document.sourceType === 'blog') {
      const blogEntityId = `blog:${document.id.replace(/^blog:/, '')}`
      addEntity(entities, {
        id: blogEntityId,
        type: 'blog-post',
        name: document.title,
        aliases: uniqueTerms([document.title, ...document.tags]),
        metadata: { documentId: document.id, href: document.href },
      })
      addRelation(relations, 'site:biau-port', blogEntityId, 'documentedBy', [document.id], 0.6)

      for (const projectDocument of documents.filter((item) => item.sourceType === 'project' && item.projectId)) {
        const haystack = normalizeText([document.title, document.summary, ...document.tags].join(' '))
        const project = projectById.get(projectDocument.projectId ?? '')
        const projectTerms = [projectDocument.projectId ?? '', projectDocument.title, project?.title ?? ''].filter(Boolean)
        if (projectTerms.some((term) => haystack.includes(normalizeText(term)))) {
          addRelation(relations, `project:${projectDocument.projectId}`, blogEntityId, 'documentedBy', [document.id], 0.75)
        }
      }
    }
  }

  const projectDocuments = documents.filter((document) => document.sourceType === 'project' && document.projectId)
  for (const project of projectDocuments) {
    for (const other of projectDocuments) {
      if (project.id >= other.id) continue
      const sharedTags = project.tags.filter((tag) => other.tags.includes(tag))
      if (sharedTags.length >= 2) {
        addRelation(relations, `project:${project.projectId}`, `project:${other.projectId}`, 'relatedTo', [project.id, other.id], 0.45)
      }
    }
  }

  return {
    entities: Array.from(entities.values()).sort((a, b) => a.id.localeCompare(b.id)),
    relations: Array.from(relations.values()).sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function createDocumentChunks(document: AssistantKnowledgeDocument): AssistantKnowledgeChunk[] {
  const sentences = splitSummary(document.summary)
  return sentences.map((text, index) => ({
    id: `chunk:${slugifyId(document.id)}:${index + 1}`,
    documentId: document.id,
    text,
    section: index === 0 ? 'summary' : `summary-${index + 1}`,
    metadata: {
      sourceType: document.sourceType,
      ...(document.projectId ? { projectId: document.projectId } : {}),
      tags: document.tags,
    },
  }))
}

function splitSummary(summary: string) {
  const normalized = summary.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const parts = normalized
    .split(/(?<=[。！？.!?])\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return [normalized]

  const chunks: string[] = []
  let current = ''
  for (const part of parts) {
    const next = current ? `${current} ${part}` : part
    if (next.length > 320 && current) {
      chunks.push(current)
      current = part
    } else {
      current = next
    }
  }
  if (current) chunks.push(current)
  return chunks
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
  item: AssistantKnowledgeItemLike,
  normalized: string,
  terms: string[],
  intent: AssistantRetrievalIntent,
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

function inferSourceType(item: Pick<AssistantKnowledgeItemLike, 'id' | 'href'>): AssistantKnowledgeSourceType {
  if (item.id === 'site:status' || item.href === '/status') return 'status'
  if (item.id.startsWith('project:')) return 'project'
  if (item.id.startsWith('blog:')) return 'blog'
  return 'site'
}

function getProjectIdFromKnowledgeId(id: string) {
  return id.startsWith('project:') ? id.slice('project:'.length) : undefined
}

function addEntity(entities: Map<string, AssistantKnowledgeEntity>, entity: AssistantKnowledgeEntity) {
  if (entities.has(entity.id)) return
  entities.set(entity.id, {
    ...entity,
    aliases: uniqueTerms(entity.aliases),
  })
}

function addRelation(
  relations: Map<string, AssistantKnowledgeRelation>,
  fromEntityId: string,
  toEntityId: string,
  type: AssistantKnowledgeRelationType,
  evidenceDocumentIds: string[],
  weight: number,
) {
  const id = `${type}:${fromEntityId}->${toEntityId}`
  if (relations.has(id)) return
  relations.set(id, {
    id,
    fromEntityId,
    toEntityId,
    type,
    weight,
    evidenceDocumentIds: uniqueTerms(evidenceDocumentIds),
  })
}

function getFallbackIntro(reason?: string) {
  if (reason === 'provider_error') return '模型通道暂时失败，我先用站内公开资料回答：'
  if (reason === 'empty_response') return '模型没有返回有效内容，我先用站内公开资料回答：'
  if (reason === 'self_check_failed') return '模型回答没有通过公开范围自检，我先用站内公开资料回答：'
  if (reason === 'request_error') return '公开助手 API 暂时不可用，我先用本地公开知识回答：'
  if (reason === 'no_public_context') return '这个问题暂时没有命中公开资料。'
  return '我先按站内公开资料回答：'
}

function buildIntentAnswerBody(intent: AssistantRetrievalIntent, titleList: string) {
  if (intent === 'site-overview') {
    return '泊岸是一个把 AI 应用、业务系统、移动端、互动体验和知识内容组织成可演示案例的站点。你可以先看项目集了解主线项目，再用状态页确认入口和演示边界。'
  }
  if (intent === 'demo-access') {
    return '适合先看有公开入口或受控演示路径的项目；如果入口需要登录，就以页面显示的公开 demo 凭据和状态页说明为准。'
  }
  if (intent === 'reliability-status') {
    return '状态页会区分入口可达、登录门禁、synthetic 检查、指标和人工 gate，适合判断“能不能演示”以及还有哪些验证没完成。'
  }
  if (intent === 'technology-architecture') {
    return '可以按技术栈反查相关项目，再进入项目详情看实现、架构、质量验证和后续优化。'
  }
  if (intent === 'blog-knowledge') {
    return '知识文章更适合看方法、复盘和构建过程；项目稳定事实仍以项目详情页和状态页为准。'
  }
  if (intent === 'private-credential') {
    return '我不能提供后台密码、API key、token、数据库连接或模型中转配置；只能说明公开演示入口和安全配置边界。'
  }
  if (intent === 'project-experience') {
    return `可以把 ${titleList} 当作入口，先看它们分别解决什么问题、当前边界是什么，再决定是否打开演示或状态详情。`
  }
  return '我会优先基于项目页、状态页和精选文章里的公开事实回答；资料不足时不会补造结论。'
}

function compactAnswer(answer: string, maxLength: number) {
  const normalized = answer.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trim()}…`
}

function slugifyId(value: string) {
  return normalizeText(value)
    .replace(/[^\w+#.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    || 'item'
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
