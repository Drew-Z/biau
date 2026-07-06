import { Prisma } from '@prisma/client'
import { publicKnowledge } from './knowledge.js'
import { containsSensitiveText } from './agentGuardrails.js'
import type { AgentStudioDraftArtifact } from './types.js'

type AgentStudioDraftColumn = 'knowledge' | 'project-notes' | 'resources' | 'ai-daily' | 'build-log'

interface AgentStudioDraftInput {
  question: string
  memberId: string
}

interface ProjectMatch {
  id: string
  title: string
  summary: string
  tags: string[]
}

interface StudioContentBlock {
  type: 'paragraph' | 'heading' | 'list' | 'flow'
  text?: string
  level?: number
  items?: string[]
  mermaid?: string
  caption?: string
}

export interface AgentStudioDraftPlan {
  explicitDraftRequest: boolean
  column: AgentStudioDraftColumn
  draftKind: string
  title: string
  slug: string
  summary: string
  planBlocks: string[]
  data?: Prisma.ContentDraftCreateInput
  blockedReason?: 'not-explicit-draft-request' | 'sensitive-content-detected'
}

const columnLabels: Record<AgentStudioDraftColumn, { tag: string; kind: string }> = {
  knowledge: { tag: '知识积累', kind: '知识积累草稿' },
  'project-notes': { tag: '项目总结', kind: '项目总结草稿' },
  resources: { tag: '资源分享', kind: '资源分享草稿' },
  'ai-daily': { tag: 'AI 日报', kind: 'AI 日报草稿' },
  'build-log': { tag: '构建手记', kind: '状态 / 构建手记草稿' },
}

export function buildAgentStudioDraft(input: AgentStudioDraftInput): AgentStudioDraftPlan {
  const question = compactText(input.question, 500)
  const explicitDraftRequest = isExplicitDraftRequest(question)
  const column = inferDraftColumn(question)
  const project = inferProjectMatch(question)
  const topic = inferDraftTopic(question, project)
  const title = buildDraftTitle(column, topic)
  const slug = buildDraftSlug(column, topic.slugSeed)
  const planBlocks = buildPlanBlocks(column, title, project)
  const summary = `已准备 ${columnLabels[column].kind}：${title}。草稿会保持 hidden + review-needed，发布、审核和导出仍需人工处理。`

  if (!explicitDraftRequest) {
    return {
      explicitDraftRequest,
      column,
      draftKind: columnLabels[column].kind,
      title,
      slug,
      summary,
      planBlocks,
      blockedReason: 'not-explicit-draft-request',
    }
  }

  if (hasSensitiveDraftRequest(question)) {
    return {
      explicitDraftRequest,
      column,
      draftKind: columnLabels[column].kind,
      title,
      slug,
      summary: '草稿请求触发敏感内容保护，已停止写入 Studio。请去掉密钥、密码、连接串、私有地址或后台凭据后重试。',
      planBlocks,
      blockedReason: 'sensitive-content-detected',
    }
  }

  const data = buildCreateData({
    column,
    title,
    slug,
    topic: topic.label,
    project,
    memberId: input.memberId,
  })
  if (containsSensitiveText(JSON.stringify(data))) {
    return {
      explicitDraftRequest,
      column,
      draftKind: columnLabels[column].kind,
      title,
      slug,
      summary: '草稿内容触发敏感内容保护，已停止写入 Studio。请去掉密钥、密码、连接串、私有地址或后台凭据后重试。',
      planBlocks,
      blockedReason: 'sensitive-content-detected',
    }
  }

  return {
    explicitDraftRequest,
    column,
    draftKind: columnLabels[column].kind,
    title,
    slug,
    summary,
    planBlocks,
    data,
  }
}

export function buildStudioDraftArtifact(input: {
  id: string
  slug: string
  title: string
  column: string
}): AgentStudioDraftArtifact {
  return {
    kind: 'studio-draft',
    id: input.id,
    slug: input.slug,
    title: input.title,
    column: input.column,
    status: 'review-needed',
    visibility: 'hidden',
    reviewRequired: true,
    href: '/studio',
  }
}

export function isDuplicateSlugError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function withSlugSuffix(slug: string, attemptIndex: number) {
  if (attemptIndex === 0) return slug
  const suffix = `-${attemptIndex + 1}`
  return `${slug.slice(0, 96 - suffix.length).replace(/-+$/u, '')}${suffix}`
}

function buildCreateData(input: {
  column: AgentStudioDraftColumn
  title: string
  slug: string
  topic: string
  project: ProjectMatch | null
  memberId: string
}): Prisma.ContentDraftCreateInput {
  const label = columnLabels[input.column]
  return {
    slug: input.slug,
    title: input.title,
    column: input.column,
    tag: label.tag,
    detail: buildDraftDetail(input.column, input.topic, input.project),
    readTime: input.column === 'ai-daily' ? '6 min' : input.column === 'project-notes' ? '10 min' : '8 min',
    bodyJson: toBodyJson(buildDraftBody(input.column, input.topic, input.project)),
    knowledgePoints: buildKnowledgePoints(input.column, input.topic, input.project) as Prisma.InputJsonValue,
    projectIds: (input.project ? [input.project.id] : []) as Prisma.InputJsonValue,
    status: 'REVIEW_NEEDED',
    visibility: 'HIDDEN',
    aiAssistance: 'agentic-workspace',
    createdBy: `assistant:${sanitizeMemberId(input.memberId)}`,
    updatedBy: `assistant:${sanitizeMemberId(input.memberId)}`,
  }
}

function buildDraftDetail(column: AgentStudioDraftColumn, topic: string, project: ProjectMatch | null) {
  if (column === 'project-notes' && project) {
    return `围绕 ${project.title} 生成访客可读的项目总结草稿，覆盖实现、架构、验证边界和后续优化方向。`
  }
  if (column === 'build-log') {
    return `围绕 ${topic} 生成状态说明或构建手记草稿，重点区分已验证事实、人工 gate 和后续观察计划。`
  }
  if (column === 'resources') {
    return `围绕 ${topic} 生成资源分享草稿，保留个人判断、使用边界和公开证据，不发布未经筛选的链接清单。`
  }
  if (column === 'ai-daily') {
    return '生成 AI 日报草稿骨架，等待补充公开来源、日期、来源卡片、影响判断和人工核查记录。'
  }
  return `围绕 ${topic} 生成知识积累草稿，重点补充定义、背景、工程实践、判断边界和可复用清单。`
}

function buildDraftBody(column: AgentStudioDraftColumn, topic: string, project: ProjectMatch | null): StudioContentBlock[] {
  if (column === 'project-notes') return buildProjectDraftBody(topic, project)
  if (column === 'build-log') return buildBuildLogDraftBody(topic, project)
  if (column === 'resources') return buildResourceDraftBody(topic)
  if (column === 'ai-daily') return buildAiDailyDraftBody()
  return buildKnowledgeDraftBody(topic)
}

function buildProjectDraftBody(topic: string, project: ProjectMatch | null): StudioContentBlock[] {
  const projectIntro = project
    ? `${project.title} 当前公开摘要：${project.summary}`
    : `本草稿用于整理 ${topic} 的项目总结。请先补充项目事实、公开入口、截图或流程图证据。`
  return [
    heading('项目定位 / Positioning'),
    paragraph(projectIntro),
    heading('访客路径 / Visitor Journey'),
    list([
      '入口：说明访客从主站、项目卡片或演示链接进入后的第一步。',
      '核心动作：列出最能体现产品价值的 3-5 个动作。',
      '结果证据：说明访客能看到的输出、状态、截图或质量面板。',
    ]),
    flow('项目访问流程草稿'),
    heading('实现与架构 / Implementation'),
    list([
      '前端：页面、状态、交互、移动端或展示容器。',
      '后端：API、权限、任务、数据库、队列或外部集成边界。',
      '数据 / AI：检索、生成、审核、质量控制或同步链路。',
    ]),
    heading('质量与边界 / Quality & Limits'),
    list([
      '列出已经能验证的 lint、build、smoke、synthetic 或人工验收路径。',
      '明确不能公开的账号、密码、私有地址、模型渠道和后台凭据。',
      '把未完成能力写成 planned / gated / unchecked，不写成已上线事实。',
    ]),
    heading('后续版本 / Roadmap'),
    list([
      '补充更真实的正文配图、流程图或架构图。',
      '把当前最影响演示体验的缺口拆成可验证任务。',
      '将可观测性、状态页和公开助手知识同步到同一事实来源。',
    ]),
  ]
}

function buildBuildLogDraftBody(topic: string, project: ProjectMatch | null): StudioContentBlock[] {
  return [
    heading('状态说明 / Status Note'),
    paragraph(`这个草稿用于整理 ${project?.title ?? topic} 的状态说明或构建手记。所有状态表达都需要和实际验证结果、人工 gate 或计划项对齐。`),
    heading('已验证事实 / Verified Facts'),
    list([
      '列出已通过的本地命令、线上 health、synthetic、截图或人工验收证据。',
      '每条事实都要能追溯到公开安全的证据，不写私有 dashboard 或凭据。',
    ]),
    heading('人工 Gate / Manual Gates'),
    list([
      '需要账号、密码、模型调用、APK 发布、云平台配置或生产数据的事项保持人工 gate。',
      '页面只公开 gate 状态和下一步，不公开凭据本身。',
    ]),
    heading('后续观察 / Next Checks'),
    list([
      '补充可以自动化的低敏检查。',
      '将结果同步到状态页或可靠性汇总。',
      '失败时只记录低敏错误类别、HTTP 状态或门禁状态。',
    ]),
  ]
}

function buildResourceDraftBody(topic: string): StudioContentBlock[] {
  return [
    heading('资源定位 / Resource Fit'),
    paragraph(`这个草稿用于整理 ${topic} 的资源分享。发布前需要补足公开链接、来源可信度、个人判断和适用边界。`),
    heading('适用场景 / Use Cases'),
    list([
      '适合谁：说明读者画像、项目阶段或技术背景。',
      '解决什么问题：说明它进入工作流的位置。',
      '不适合什么：说明成本、门槛、替代方案或风险。',
    ]),
    heading('判断依据 / Evidence'),
    list([
      '优先使用官方文档、README、发布记录、论文、真实使用截图或个人试用记录。',
      '移除链接里的查询参数、追踪参数或私有 token。',
      '没有亲自验证的能力只写待验证。',
    ]),
    heading('关键收获 / Takeaways'),
    list([
      '资源分享的价值在筛选理由和适用边界，不在堆链接。',
      '发布前补充一张工作流示意图或使用截图。',
    ]),
  ]
}

function buildAiDailyDraftBody(): StudioContentBlock[] {
  return [
    heading('今日摘要 / Daily Brief'),
    paragraph('本期 AI 日报草稿等待补充日期、公开来源和人工核查结果。不要在没有来源的情况下写“最新、最强、首个、颠覆”等判断。'),
    heading('来源速览 / Source Cards'),
    list([
      '补充官方公告、论文、产品文档、可信聚合或社区线索。',
      '为每条来源记录发布时间、原文链接、摘要和待核查点。',
    ]),
    heading('影响判断 / Why It Matters'),
    list([
      '模型 / 工具 / 研究 / 工程实践分别带来什么变化。',
      '哪些判断有直接来源支撑，哪些只是待验证信号。',
    ]),
    heading('发布 Gate / Review Gate'),
    list([
      '逐条打开来源复核日期和上下文。',
      '确认摘要为转述，不复制来源长段原文。',
      '人工审核通过后再创建公开导出记录。',
    ]),
  ]
}

function buildKnowledgeDraftBody(topic: string): StudioContentBlock[] {
  return [
    heading('问题定义 / Definition'),
    paragraph(`这个草稿用于解释 ${topic}。先写清楚它解决的问题、适用场景和常见误区，再补充来源与工程实践。`),
    heading('背景与脉络 / Background'),
    list([
      '概念从哪里来，和相邻技术有什么区别。',
      '为什么这个主题最近值得关注。',
      '哪些说法容易过度营销，需要谨慎表达。',
    ]),
    heading('工程实践 / Practice'),
    list([
      '最小落地路径是什么。',
      '需要哪些输入、依赖、数据、评估或回滚机制。',
      '如何衡量效果是否真的变好。',
    ]),
    heading('检查清单 / Checklist'),
    list([
      '补充至少 2-3 个可靠来源或项目证据。',
      '列出适用边界、失败场景和替代方案。',
      '发布前检查敏感信息、事实来源和代码/命令是否准确。',
    ]),
  ]
}

function buildKnowledgePoints(column: AgentStudioDraftColumn, topic: string, project: ProjectMatch | null) {
  const base: Record<AgentStudioDraftColumn, string[]> = {
    knowledge: ['知识积累', '技术总结', '工程实践'],
    'project-notes': ['项目总结', '技术案例页', '架构说明'],
    resources: ['资源分享', '使用笔记', '筛选标准'],
    'ai-daily': ['AI 日报', '来源核查', '趋势观察'],
    'build-log': ['构建手记', '状态页', '可靠性观察'],
  }
  return dedupeStrings([...base[column], topic, ...(project?.tags ?? [])]).slice(0, 10)
}

function buildPlanBlocks(column: AgentStudioDraftColumn, title: string, project: ProjectMatch | null) {
  return [
    `草稿类型：${columnLabels[column].kind}`,
    `拟定标题：${title}`,
    project ? `关联项目：${project.title}` : '关联项目：待编辑确认',
    '写入边界：只允许创建 hidden + review-needed 的 Studio 草稿；不会发布、导出、审核或改公开数据文件。',
    '发布前：进入 Studio 审核，必要时再走静态导出和验证命令。',
  ]
}

function buildDraftTitle(column: AgentStudioDraftColumn, topic: { label: string }) {
  if (column === 'ai-daily') return 'AI 日报草稿：待补充日期与来源'
  return `${columnLabels[column].kind.replace('草稿', '')}：${topic.label}`.slice(0, 120)
}

function buildDraftSlug(column: AgentStudioDraftColumn, slugSeed: string) {
  return `${column}-${slugSeed}-${dateStamp()}`
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/-{2,}/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 96)
}

function inferDraftColumn(question: string): AgentStudioDraftColumn {
  const normalized = normalizeText(question)
  if (normalized.includes('日报') || normalized.includes('ai daily')) return 'ai-daily'
  if (includesAny(normalized, ['状态', '可靠性', '监控', 'health', 'synthetic', '构建手记'])) return 'build-log'
  if (includesAny(normalized, ['资源', '分享', 'resource', '链接', '工具推荐'])) return 'resources'
  if (includesAny(normalized, ['项目', '案例', '详情页', 'project', 'legal', 'rag', 'erp', 'pet', 'xunqiu', '寻球', 'playlab', 'game'])) {
    return 'project-notes'
  }
  return 'knowledge'
}

function inferProjectMatch(question: string): ProjectMatch | null {
  const normalized = normalizeText(question)
  const candidates = publicKnowledge
    .filter((item) => item.id.startsWith('project:'))
    .map((item) => {
      const projectId = item.id.replace(/^project:/u, '')
      const haystack = normalizeText([projectId, item.title, item.summary, ...(item.tags ?? [])].join(' '))
      const score =
        (normalized.includes(projectId) ? 10 : 0) +
        (normalized.includes(normalizeText(item.title)) ? 8 : 0) +
        (item.tags ?? []).reduce((total, tag) => total + (normalized.includes(normalizeText(tag)) ? 3 : 0), 0) +
        extractAsciiTerms(question).reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0)
      return {
        id: projectId,
        title: item.title,
        summary: item.summary,
        tags: item.tags ?? [],
        score,
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-CN'))

  const match = candidates[0]
  return match ? { id: match.id, title: match.title, summary: match.summary, tags: match.tags } : null
}

function inferDraftTopic(question: string, project: ProjectMatch | null) {
  if (project) return { label: project.title, slugSeed: project.id }
  const stripped = question
    .replace(/帮我|请|生成|创建|写一篇|写一下|写|整理|草稿|文章|项目总结|状态说明|资源分享|日报|关于/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  const label = compactText(stripped || '待编辑主题', 32)
  const asciiSeed = extractAsciiTerms(stripped).filter((term) => !commonSlugTerms.has(term)).slice(0, 5).join('-')
  return { label, slugSeed: asciiSeed || 'draft' }
}

const commonSlugTerms = new Set(['write', 'draft', 'article', 'project', 'status', 'resource', 'daily', 'blog'])

function isExplicitDraftRequest(question: string) {
  const normalized = normalizeText(question)
  return includesAny(normalized, [
    '草稿',
    '写',
    '撰写',
    '生成',
    '创建',
    '整理成',
    '文章',
    '日报',
    '项目总结',
    '状态说明',
    '资源分享',
    'draft',
    'write',
  ])
}

function hasSensitiveDraftValue(value: unknown) {
  const text = JSON.stringify(value).toLowerCase()
  return (
    containsSensitiveText(text) ||
    /(api[_-]?key|secret|bearer\s+[a-z0-9._-]+|database_url|postgres:\/\/|mysql:\/\/|mongodb:\/\/|https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])|[a-z0-9.-]+\.internal)[^"'\s]*|token\s*[:=]\s*[a-z0-9._-]{8,}|密钥|连接串|后台密码|管理员密码|后台凭据)/iu.test(text)
  )
}

function hasSensitiveDraftRequest(value: string) {
  return hasSensitiveDraftValue(value)
}

function heading(text: string): StudioContentBlock {
  return { type: 'heading', level: 2, text }
}

function paragraph(text: string): StudioContentBlock {
  return { type: 'paragraph', text }
}

function list(items: string[]): StudioContentBlock {
  return { type: 'list', items }
}

function flow(caption: string): StudioContentBlock {
  return {
    type: 'flow',
    caption,
    mermaid: 'flowchart TD\n  A["打开草稿"] --> B["补充事实与证据"]\n  B --> C["人工审核"]\n  C --> D["通过后再导出发布"]',
  }
}

function toBodyJson(blocks: StudioContentBlock[]): Prisma.InputJsonValue {
  return stripUndefinedJson({ blocks }) as unknown as Prisma.InputJsonValue
}

function sanitizeMemberId(value: string) {
  return value.replace(/[^a-z0-9_-]+/giu, '').slice(0, 40) || 'member'
}

function extractAsciiTerms(value: string) {
  return Array.from(new Set((normalizeText(value).match(/[a-z0-9]+/gu) ?? []).filter((term) => term.length >= 2))).slice(0, 12)
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(normalizeText(term)))
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, '')
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>()
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
}

function stripUndefinedJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
