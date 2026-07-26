import {
  getAssistantBlogPosts,
  getBlogAssistantTags,
} from './blogCuration'
import {
  buildPublicKnowledgeFallbackAnswer,
  buildPublicKnowledgeV2,
  searchAssistantKnowledge,
  type PublicKnowledgeV2,
} from './assistantKnowledge'
import { getProjectAssistantSummary, getProjectAssistantTags, projects } from './portfolio'

export type AssistantVisibility = 'public'

export interface AssistantKnowledgeItem {
  id: string
  title: string
  summary: string
  href: string
  tags: string[]
  visibility: AssistantVisibility
}

export interface AssistantSuggestion {
  id: string
  label: string
  prompt: string
}

export const publicAssistantSuggestions: AssistantSuggestion[] = [
  {
    id: 'demo-ready-projects',
    label: '哪些项目可演示',
    prompt: '现在站点里哪些项目有公开演示入口？每个项目适合看什么？',
  },
  {
    id: 'legal-rag-entry',
    label: 'Legal RAG 怎么体验',
    prompt: 'Legal RAG 法律机器人现在能展示哪些能力？我应该从哪个入口开始看？',
  },
  {
    id: 'status-overview',
    label: '查看可靠性状态',
    prompt: '项目可靠性观察页能告诉我哪些入口是否正常？',
  },
  {
    id: 'manual-gates',
    label: '人工 gate 怎么处理',
    prompt: '状态页里的人工 gate 和后续接入应该怎么处理？哪些信息不能公开？',
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
  {
    id: 'site:status',
    title: '项目可靠性观察',
    summary:
      '状态页汇总主站、Legal RAG、Ozon ERP、寻球、Pet 和 BIAU Playlab 等公开入口与可靠性检查，区分 online、degraded、offline、unchecked 与 planned。当前人工队列先备份并退役旧 Operator-only PostgreSQL 数据，随后运行 AI Daily 首个真实版次、完成 Studio 审核与 Publish Export；之后处理 Legal RAG 低权限 demo、ERP 生产注册策略、Xunqiu / Pet 正式 release 等需要凭据或发布证据的 gate。公开助手、匿名持久化、公开 RAG 与同源 SSE 已有低敏验收记录。公开侧只记录成功状态、检查命令、HTTP 状态、计数、时间和错误类别，不记录 token、密码、数据库 URL、模型渠道密钥、模型 base URL、签名材料、私有后台或生产敏感指标。',
    href: '/status',
    tags: ['状态页', '可靠性观察', '人工 gate', '低敏证据', '公开入口', 'health check', 'synthetic', 'public-only RAG', '数据库退役', 'release gate'],
    visibility: 'public',
  },
  {
    id: 'site:resources',
    title: '资源分享栏目发布状态',
    summary:
      '资源分享 / Resources 是博客里的人工精选栏目，用来记录真实使用后的工具、文章、仓库、模型、课程或素材判断。它不会自动批量生成无筛选的链接清单；每条资源都需要补足适用场景、筛选理由、使用边界、公开来源和安全检查。当前公开列表可能还没有资源分享文章，因为内容仍需先进入 Studio 草稿和人工审核流程，通过 Publish Export、静态导出、Git diff 审查和博客质量检查后才会展示给访客。',
    href: '/blog',
    tags: ['资源分享', 'Resources', '博客栏目', '人工精选', '链接清单', '工具推荐', '使用边界', '公开来源', 'Studio 草稿', '人工审核', 'Publish Export', '静态导出', 'Git diff 审查'],
    visibility: 'public',
  },
  {
    id: 'site:ai-daily',
    title: 'AI 日报栏目发布状态',
    summary:
      'AI 日报 / AI Daily 是博客里的独立栏目，用来记录 AI 模型、工具、行业案例和工程实践的高频动态。当前公开列表可能还没有 AI 日报文章，因为首期内容必须先在 Studio-first 内部流程中完成来源池、日报 issue、hidden / review-needed 草稿、人工审核、Publish Export、静态导出、Git diff 审查和博客质量检查。未审核草稿不会展示给访客，也不会进入公开助手索引；只有通过人工 review 和导出检查后的内容才会出现在公开博客页。',
    href: '/blog',
    tags: ['AI 日报', 'AI Daily', '博客栏目', 'Studio-first', '来源池', '日报 issue', 'hidden', 'review-needed', 'Publish Export', '人工审核', '静态导出', 'Git diff 审查'],
    visibility: 'public',
  },
  ...projectKnowledge,
  ...blogKnowledge,
]

export const publicKnowledgeV2: PublicKnowledgeV2 = buildPublicKnowledgeV2(publicKnowledgeBase, { projects })

export function searchPublicKnowledge(query: string) {
  return searchAssistantKnowledge(publicKnowledgeBase, query, { knowledge: publicKnowledgeV2 }).citations
}

export { buildPublicKnowledgeFallbackAnswer, searchAssistantKnowledge }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAssistantVisibility(value: unknown): value is AssistantVisibility {
  return value === 'public'
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
