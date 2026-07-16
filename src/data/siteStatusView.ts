import {
  SITE_STATUS_BASE_URL,
  getReliabilityProjectStatusCounts,
  reliabilityProjects,
  reliabilityStatusOrder,
  siteStatusTargets,
  type ReliabilityLayer,
  type ReliabilityProject,
  type ReliabilityStatus,
  type ReliabilityStatusCounts,
  type SiteStatusTarget,
} from './statusTargets'

export type EntryStatusValue = Exclude<ReliabilityStatus, 'planned'>

export interface SiteStatusCheck extends SiteStatusTarget {
  status: EntryStatusValue
  httpStatus: number
  durationMs: number
  checkedAt: string
  finalUrl: string
  issueKind?: 'none' | 'timeout' | 'dns_error' | 'tls_error' | 'connection_error' | 'network_error' | 'http_status' | 'not_checked'
  issues: string[]
}

export interface SiteStatusSummary {
  total: number
  online: number
  degraded: number
  offline: number
  unchecked: number
}

export interface SiteStatusPayload {
  checkedAt: string
  base: string
  ok: boolean
  summary: SiteStatusSummary
  targets: SiteStatusCheck[]
  reliabilityProjects?: ReliabilityProject[]
}

export type StatusManualActionType = 'manual-gate' | 'next-action'

export interface StatusManualActionItem {
  id: string
  projectId: string
  projectTitle: string
  projectCategory: ReliabilityProject['category']
  type: StatusManualActionType
  typeLabel: string
  text: string
  detailPath: string
}

export const statusMeta: Record<ReliabilityStatus, { label: string; tone: string; hint: string }> = {
  online: { label: '可用', tone: 'online', hint: '公开入口已响应' },
  degraded: { label: '受限', tone: 'degraded', hint: '入口响应但可能需要登录、重试或人工说明' },
  offline: { label: '异常', tone: 'offline', hint: '最近一次检测未能确认入口可达' },
  unchecked: { label: '未检测', tone: 'unchecked', hint: '尚未生成公开检测数据' },
  planned: { label: '待接入', tone: 'planned', hint: '已记录检查项，等待后续接入真实探针' },
}

export const expectationLabels: Record<SiteStatusTarget['expectation'], string> = {
  'public-entry': '公开入口',
  'login-gated': '登录门禁',
  'static-site': '静态展示',
}

export const layerLabels: Record<ReliabilityLayer, { title: string; code: string; description: string }> = {
  entry: {
    title: '入口可达',
    code: 'L0',
    description: '页面、工作台或展示站是否能响应。',
  },
  synthetic: {
    title: '功能小任务',
    code: 'L1',
    description: '用真实小流程证明问答、合同审查、登录或试玩能跑通。',
  },
  metrics: {
    title: '项目指标',
    code: 'L2',
    description: '服务暴露低敏指标，再交给 Prometheus 或托管平台采集。',
  },
  observability: {
    title: '看板告警',
    code: 'L3',
    description: 'Grafana、ARMS、Sentry、LLM tracing 或访问分析。',
  },
}

export const projectCategoryLabels: Record<ReliabilityProject['category'], string> = {
  'main-site': '主站',
  'ai-workbench': 'AI 工作台',
  'business-system': '业务系统',
  'mobile-app': '移动应用',
  interactive: '互动体验',
}

export function getStatusDetailPath(projectId: string) {
  return `/status/${projectId}`
}

export function createUncheckedTarget(target: SiteStatusTarget): SiteStatusCheck {
  return {
    ...target,
    status: 'unchecked',
    httpStatus: 0,
    durationMs: 0,
    checkedAt: '',
    finalUrl: target.url,
    issueKind: 'not_checked',
    issues: ['status data not generated'],
  }
}

export function buildSummary(targets: SiteStatusCheck[]): SiteStatusSummary {
  return targets.reduce<SiteStatusSummary>(
    (summary, target) => {
      summary.total += 1
      summary[target.status] += 1
      return summary
    },
    { total: 0, online: 0, degraded: 0, offline: 0, unchecked: 0 },
  )
}

export function getReliabilityStatusSummary(projects: ReliabilityProject[] | undefined = reliabilityProjects): ReliabilityStatusCounts {
  const summary = reliabilityStatusOrder.reduce(
    (counts, status) => {
      counts[status] = 0
      return counts
    },
    { total: 0 } as ReliabilityStatusCounts,
  )

  for (const project of projects ?? []) {
    for (const check of project.checks) {
      summary.total += 1
      summary[check.status] += 1
    }
  }

  return summary
}

export function getStatusManualActionQueue(
  projects: ReliabilityProject[] | undefined = reliabilityProjects,
  options: { limit?: number } = {},
): StatusManualActionItem[] {
  const limit = Math.max(0, options.limit ?? 12)
  const sourceProjects = Array.isArray(projects) ? projects : []
  const rankedProjects = sourceProjects
    .map((project, index) => {
      const counts = getReliabilityProjectStatusCounts(project)
      const needsAttention = counts.degraded + counts.offline + counts.unchecked + counts.planned > 0
      return { project, index, needsAttention }
    })
    .sort((left, right) => {
      if (left.needsAttention !== right.needsAttention) return left.needsAttention ? -1 : 1
      return left.index - right.index
    })

  const actions: StatusManualActionItem[] = []
  for (const { project } of rankedProjects) {
    const detailPath = getStatusDetailPath(project.id)
    const firstGate = project.gates[0]?.trim()
    const firstNextAction = project.nextActions[0]?.trim()

    if (firstGate) {
      actions.push({
        id: `${project.id}:manual-gate`,
        projectId: project.id,
        projectTitle: project.title,
        projectCategory: project.category,
        type: 'manual-gate',
        typeLabel: '人工 gate',
        text: firstGate,
        detailPath,
      })
    }

    if (firstNextAction) {
      actions.push({
        id: `${project.id}:next-action`,
        projectId: project.id,
        projectTitle: project.title,
        projectCategory: project.category,
        type: 'next-action',
        typeLabel: '后续接入',
        text: firstNextAction,
        detailPath,
      })
    }
  }

  return actions.slice(0, limit)
}

export function hasEntryStatusAttention(summary: SiteStatusSummary) {
  return summary.degraded > 0 || summary.offline > 0 || summary.unchecked > 0
}

export function hasReliabilityStatusAttention(summary: ReliabilityStatusCounts) {
  return summary.degraded > 0 || summary.offline > 0 || summary.unchecked > 0 || summary.planned > 0
}

export function mergeSiteStatusPayload(payload: SiteStatusPayload | null): SiteStatusPayload {
  const payloadTargets = Array.isArray(payload?.targets) ? payload.targets : []
  const generatedTargets = new Map(payloadTargets.map((target) => [target.id, target]))
  const targets = siteStatusTargets.map((target) => generatedTargets.get(target.id) ?? createUncheckedTarget(target))
  const summary = payload?.summary && payloadTargets.length === targets.length ? payload.summary : buildSummary(targets)
  const projects = Array.isArray(payload?.reliabilityProjects) ? payload.reliabilityProjects : reliabilityProjects

  return {
    checkedAt: payload?.checkedAt ?? '',
    base: payload?.base ?? SITE_STATUS_BASE_URL,
    ok: payload?.ok ?? false,
    summary,
    targets,
    reliabilityProjects: projects,
  }
}

export function formatCheckedAt(value: string) {
  if (!value) return '未生成'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间不可读'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  }).format(date)
}

export type EvidenceFreshnessLabel = '新鲜' | '接近过期' | '已过期' | '未知'

export interface ParsedEvidenceFreshness {
  checkedAt: string
  checkedAtLabel: string
  freshnessLabel: EvidenceFreshnessLabel
  ageText: string
  tone: ReliabilityStatus
}

const evidenceFreshnessPattern = /证据时间：([^；。]+)；证据新鲜度：(新鲜|接近过期|已过期|未知)(?:（([^）]+)）)?/u

const evidenceFreshnessTone: Record<EvidenceFreshnessLabel, ReliabilityStatus> = {
  新鲜: 'online',
  接近过期: 'degraded',
  已过期: 'degraded',
  未知: 'unchecked',
}

export function parseEvidenceFreshness(evidence: string): ParsedEvidenceFreshness | null {
  const match = evidenceFreshnessPattern.exec(evidence)
  if (!match) return null

  const checkedAt = match[1]?.trim() ?? ''
  const freshnessLabel = match[2] as EvidenceFreshnessLabel
  const ageText = match[3]?.trim() ?? ''

  return {
    checkedAt,
    checkedAtLabel: formatCheckedAt(checkedAt),
    freshnessLabel,
    ageText,
    tone: evidenceFreshnessTone[freshnessLabel],
  }
}

export function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '未记录'
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(2)} s`
}

export function formatHttpStatus(value: number) {
  return value > 0 ? `HTTP ${value}` : '未记录'
}
