import { blogPosts } from './blog'
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

const projectKnowledge: AssistantKnowledgeItem[] = projects.map((project) => ({
  id: `project:${project.id}`,
  title: project.title,
  summary: getProjectAssistantSummary(project),
  href: `/projects/${project.id}`,
  tags: getProjectAssistantTags(project),
  visibility: 'public',
}))

const blogKnowledge: AssistantKnowledgeItem[] = blogPosts.map((post) => ({
  id: `blog:${post.slug}`,
  title: post.title,
  summary: post.detail,
  href: `/blog/${post.slug}`,
  tags: [post.tag, post.category, post.series ?? '', ...(post.knowledgePoints ?? [])].filter(Boolean),
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

  const scored = publicKnowledgeBase
    .map((item) => {
      const haystack = [item.title, item.summary, ...item.tags].join(' ').toLowerCase()
      let score = 0
      if (item.title.toLowerCase().includes(normalized)) score += 5
      if (item.summary.toLowerCase().includes(normalized)) score += 3
      if (item.tags.some((tag) => tag.toLowerCase().includes(normalized))) score += 2
      normalized
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => {
          if (haystack.includes(token)) score += 1
        })
      return { item, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, 4).map((entry) => entry.item)
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
