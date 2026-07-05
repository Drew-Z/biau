import type { BlogColumn } from '../data/blog'
import {
  layerLabels,
  projectCategoryLabels,
  statusMeta,
} from '../data/siteStatusView'
import type { ReliabilityProject } from '../data/statusTargets'
import { projects } from '../data/portfolio'
import type { StudioVisibility } from '../data/studio'

export interface StudioStatusDraftTemplate {
  title: string
  slug: string
  column: BlogColumn
  tag: string
  detail: string
  readTime: string
  bodyText: string
  knowledgePointsText: string
  projectIdsText: string
  visibility: StudioVisibility
  aiAssistance: string
}

const projectIdAliases: Record<string, string> = {
  'pet-gamer': 'pet-workspace',
}

function readRelatedProjectId(projectId: string) {
  const candidate = projectIdAliases[projectId] ?? projectId
  return projects.some((project) => project.id === candidate) ? candidate : ''
}

export function createStatusDraftTemplate(project: ReliabilityProject): StudioStatusDraftTemplate {
  const relatedProjectId = readRelatedProjectId(project.id)
  const checks = project.checks.map((check) => {
    const layer = layerLabels[check.layer]
    const status = statusMeta[check.status]
    return [
      `### ${check.label}`,
      `- 层级：${layer.code} ${layer.title}`,
      `- 当前状态：${status.label}`,
      `- 说明：${check.description}`,
      `- 证据：${check.evidence}`,
      `- 频率：${check.cadence}`,
      `- 接入点：${check.ownerHint}`,
    ].join('\n')
  })

  return {
    title: `${project.title} 状态页说明更新`,
    slug: `${project.id}-status-notes-update`,
    column: 'build-log',
    tag: '可靠性观察',
    detail: `为 ${project.title} 补充状态页说明草稿，覆盖状态语义、检查分层、人工 gate 和后续观测接入。`,
    readTime: '7 min',
    bodyText: [
      '## 页面定位',
      `这个草稿用于更新 ${project.title} 在状态页中的访客可读说明。状态页只能表达已经观察、计划接入或需要人工 gate 的事实，不能把未验证能力写成已完成。`,
      `项目类别：${projectCategoryLabels[project.category]}`,
      '```mermaid\nflowchart TD\n  A["公开入口"] --> B["功能小任务"]\n  B --> C["项目指标"]\n  C --> D["看板告警"]\n  D --> E["人工复核与发布说明"]\n```',
      '## 当前状态说明',
      project.summary,
      '## 分层检查项',
      checks.join('\n\n'),
      '## 人工 gate',
      project.gates.length > 0 ? `- ${project.gates.join('\n- ')}` : '- 待补充人工 gate。注意不要公开真实账号、密码、模型渠道、后台地址或内部链接。',
      '## 后续接入',
      project.nextActions.length > 0
        ? `- ${project.nextActions.join('\n- ')}`
        : '- 待补充下一步 synthetic、metrics 或 observability 接入计划。',
      '## 更新计划',
      '- 如果要修改 `src/data/statusTargets.ts`，先把草稿转成可审查的 JSON plan，再人工比对 Git diff。',
      '- 如果要新增真实 synthetic 或 metrics，先确认不泄露私有 URL、凭据、业务数据或模型渠道。',
      '- 如果状态由生产平台决定，保留 manual gate，不在页面里伪造实时状态。',
      '## 关键收获',
      `- ${project.title} 的状态页说明必须把入口可达、功能验证、指标接入和人工 gate 分开表达。`,
      '- 状态页编辑是可靠性说明的结构化草稿，不是生产监控配置本身。',
    ].join('\n\n'),
    knowledgePointsText: ['状态页', '可靠性观察', 'synthetic check', 'observability', project.title].join('\n'),
    projectIdsText: relatedProjectId,
    visibility: 'hidden',
    aiAssistance: 'none',
  }
}
