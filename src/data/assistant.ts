import {
  getAssistantBlogPosts,
  getBlogAssistantTags,
} from './blogCuration'
import { getProjectAssistantSummary, getProjectAssistantTags, projects } from './portfolio'

export type AssistantVisibility = 'public' | 'internal'
export type AssistantMemberRole = 'MEMBER' | 'ADMIN'

export const ASSISTANT_STORAGE_KEYS = {
  memberToken: 'biau-assistant-member-token',
  member: 'biau-assistant-member',
  sessionId: 'biau-assistant-session-id',
  adminToken: 'biau-assistant-admin-token',
} as const

export interface AssistantKnowledgeItem {
  id: string
  title: string
  summary: string
  href: string
  tags: string[]
  visibility: AssistantVisibility
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  citations?: AssistantKnowledgeItem[]
}

export interface AssistantSessionPreview {
  id: string
  title: string
  updatedAt: string
  preview: string
}

export interface AssistantSuggestion {
  id: string
  label: string
  prompt: string
}

export interface AssistantMemberProfile {
  id: string
  name: string
  role: AssistantMemberRole
  dailyQuota: number
}

export const publicAssistantSuggestions: AssistantSuggestion[] = [
  {
    id: 'portfolio-overview',
    label: '站点能做什么',
    prompt: '请介绍一下这个站点里主要展示了哪些能力和项目方向。',
  },
  {
    id: 'rag-projects',
    label: '找 RAG 项目',
    prompt: '这个站里有哪些和 RAG、知识库或者合同审查相关的项目或文章？',
  },
  {
    id: 'game-showcase',
    label: '看游戏项目',
    prompt: '帮我快速看看这个站点里的互动体验和游戏项目有什么特色。',
  },
]

export const internalAssistantSuggestions: AssistantSuggestion[] = [
  {
    id: 'architecture',
    label: '做架构梳理',
    prompt: '根据当前站点公开内容，帮我整理一个新的 AI 应用项目展示页结构。',
  },
  {
    id: 'content-plan',
    label: '出内容提纲',
    prompt: '基于现有博客内容，给我生成一篇关于多模型路由策略的文章提纲。',
  },
  {
    id: 'delivery-check',
    label: '交付检查',
    prompt: '如果我要交付一个内部 AI 助手 MVP，这个站里的哪些文章最值得先读？',
  },
]

const SEARCH_KEYWORDS = [
  '站点',
  '公开内容',
  '项目方向',
  '能力',
  'ai',
  'rag',
  '知识库',
  '合同审查',
  '合同',
  '法律',
  '引用',
  '游戏',
  '互动体验',
  'godot',
  '试玩',
  '部署',
  'playlab',
  'biau',
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
]

const SEARCH_ALIASES = [
  {
    triggers: ['rag', '知识库', '合同审查', '合同', '法律'],
    terms: ['legal rag', '引用溯源', '合同审查', '风险审查'],
  },
  {
    triggers: ['游戏', '互动体验', '试玩', 'godot', 'playlab'],
    terms: ['biau playlab', 'godot web', 'web 试玩', '互动体验'],
  },
  {
    triggers: ['pet', '桌宠', '宠物'],
    terms: ['pet-workspace', 'ai 桌宠', '生成管线', '质量门禁'],
  },
  {
    triggers: ['ozon', 'erp', '电商'],
    terms: ['ozon erp', '业务系统', '运营后台', '浏览器插件'],
  },
  {
    triggers: ['寻球', 'xunqiu', '足球', 'android', '移动端'],
    terms: ['xunqiu', '寻球', 'android 64', 'spring boot'],
  },
  {
    triggers: ['ai', '人工智能'],
    terms: ['ai 应用', 'legal rag', 'ai 桌宠'],
  },
]

const projectKnowledge: AssistantKnowledgeItem[] = projects.map((project) => ({
  id: `project:${project.id}`,
  title: project.title,
  summary: getProjectAssistantSummary(project),
  href: `/projects/${project.id}`,
  tags: getProjectAssistantTags(project),
  visibility: 'public',
}))

const blogKnowledge: AssistantKnowledgeItem[] = getAssistantBlogPosts().map((post) => ({
  id: `blog:${post.slug}`,
  title: post.title,
  summary: post.detail,
  href: `/blog/${post.slug}`,
  tags: getBlogAssistantTags(post),
  visibility: 'public',
}))

export const publicKnowledgeBase: AssistantKnowledgeItem[] = [
  {
    id: 'site:intro',
    title: 'BIAU Port 站点简介',
    summary:
      'BIAU Port 泊岸是一个围绕 AI 应用、业务系统、互动体验、移动端案例与知识内容组织的展示站，强调可演示、可筛选、可落地的项目表达。',
    href: '/',
    tags: ['BIAU Port', '项目展示', '知识库', '公开站点'],
    visibility: 'public',
  },
  ...projectKnowledge,
  ...blogKnowledge,
]

export const demoInternalSessions: AssistantSessionPreview[] = [
  {
    id: 'session-site-planning',
    title: '示例：站点能力整理',
    updatedAt: '示例',
    preview: '总结当前主站已经公开的 AI、ERP、游戏与移动端内容。',
  },
  {
    id: 'session-rag-outline',
    title: '示例：RAG 工具页草案',
    updatedAt: '示例',
    preview: '把公开文章整理成一个更像工作台的知识入口。',
  },
  {
    id: 'session-release-check',
    title: '示例：发布前检查',
    updatedAt: '示例',
    preview: '梳理部署、SEO、资源和交互验证项。',
  },
]

export const demoInternalMessages: AssistantMessage[] = [
  {
    id: 'assistant-1',
    role: 'assistant',
    content:
      '这里是内部助手的示例开场。第一版适合整理项目资料、生成提纲、串联公开知识点和复盘交付路线；它还不是完整历史记录或私有知识库。',
    timestamp: '09:30',
    citations: publicKnowledgeBase.filter((item) =>
      ['site:intro', 'blog:ai-app-deployment-layers', 'blog:ai-tool-permission-audit'].includes(item.id),
    ),
  },
]

export function searchPublicKnowledge(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return publicKnowledgeBase.slice(0, 4)
  const terms = extractQueryTerms(query)

  const scored = publicKnowledgeBase
    .map((item) => {
      return { item, score: scoreKnowledgeItem(item, normalized, terms) }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, 4).map((entry) => entry.item)
}

function uniqueTerms(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)))
}

function extractQueryTerms(query: string) {
  const normalized = query.trim().toLowerCase()
  const asciiTerms = normalized.match(/[a-z0-9+#.]+/g) ?? []
  const explicitTerms = SEARCH_KEYWORDS.filter((term) => normalized.includes(term))
  const aliasTerms = SEARCH_ALIASES.flatMap((group) =>
    group.triggers.some((trigger) => normalized.includes(trigger)) ? group.terms : [],
  )

  return uniqueTerms([...asciiTerms, ...explicitTerms, ...aliasTerms])
}

function scoreKnowledgeItem(item: AssistantKnowledgeItem, normalized: string, terms: string[]) {
  const id = item.id.toLowerCase()
  const title = item.title.toLowerCase()
  const summary = item.summary.toLowerCase()
  const tags = item.tags.map((tag) => tag.toLowerCase())
  const asksForProject = normalized.includes('项目') || normalized.includes('案例') || normalized.includes('作品')
  const asksForArticle = normalized.includes('文章') || normalized.includes('博客')
  const asksForSiteOverview =
    normalized.includes('站点') || normalized.includes('主要展示') || normalized.includes('能做什么')

  let score = 0
  if (title.includes(normalized)) score += 8
  if (summary.includes(normalized)) score += 5
  if (tags.some((tag) => tag.includes(normalized))) score += 4

  for (const term of terms) {
    if (id.includes(term)) score += 4
    if (title.includes(term)) score += 5
    if (tags.some((tag) => tag.includes(term))) score += 3
    if (summary.includes(term)) score += 2
  }

  if (score > 0 && asksForProject && id.startsWith('project:')) score += 8
  if (score > 0 && asksForArticle && id.startsWith('blog:')) score += 4
  if (score > 0 && id.startsWith('blog:') && tags.includes('精选知识')) score += 2
  if (score > 0 && asksForSiteOverview && id === 'site:intro') score += 12

  return score
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAssistantVisibility(value: unknown): value is AssistantVisibility {
  return value === 'public' || value === 'internal'
}

function isAssistantMemberRole(value: unknown): value is AssistantMemberRole {
  return value === 'MEMBER' || value === 'ADMIN'
}

export function normalizeAssistantKnowledgeItem(value: unknown): AssistantKnowledgeItem | null {
  if (!isRecord(value)) return null
  const { id, title, summary, href, tags, visibility } = value
  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof summary !== 'string' ||
    typeof href !== 'string' ||
    !isAssistantVisibility(visibility)
  ) {
    return null
  }

  return {
    id,
    title,
    summary,
    href,
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [],
    visibility,
  }
}

export function normalizeAssistantCitations(value: unknown): AssistantKnowledgeItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantKnowledgeItem(item))
    .filter((item): item is AssistantKnowledgeItem => item !== null)
}

export function normalizeAssistantMember(value: unknown): AssistantMemberProfile | null {
  if (!isRecord(value)) return null
  const { id, name, role, dailyQuota } = value
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    !isAssistantMemberRole(role) ||
    typeof dailyQuota !== 'number' ||
    !Number.isFinite(dailyQuota)
  ) {
    return null
  }

  return { id, name, role, dailyQuota }
}
