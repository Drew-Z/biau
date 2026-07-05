import { blogColumnMeta, type BlogColumn } from '../data/blog'
import {
  projectDetailGroupLabels,
  type Project,
  type ProjectDetailContentKey,
} from '../data/portfolio'
import type { StudioVisibility } from '../data/studio'

export interface StudioProjectDetailDraftTemplate {
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

const projectDetailTemplateOrder: ProjectDetailContentKey[] = [
  'overview',
  'workflow',
  'architecture',
  'quality',
  'limitations',
  'roadmap',
]

export function createProjectDetailDraftTemplate(project: Project): StudioProjectDetailDraftTemplate {
  const stack = project.stack.slice(0, 5)
  const highlights = project.highlights.slice(0, 5)
  const heroImage = project.image
    ? `\n\n![${project.title} 展示图](${project.image} "公开项目截图或展示图，发布前确认不含敏感信息。")`
    : ''

  return {
    title: `${project.title} 项目详情页内容补全`,
    slug: `${project.id}-project-detail-update`,
    column: 'project-notes',
    tag: blogColumnMeta['project-notes'].titleZh,
    detail: `为 ${project.title} 补充访客可读的项目详情页素材，覆盖实现、架构、技术栈、质量边界和后续优化方向。`,
    readTime: '10 min',
    bodyText: [
      `## ${projectDetailGroupLabels.overview}`,
      '### 访客为什么要看这个项目',
      `${project.summary}${heroImage}`,
      highlights.length > 0 ? `\n\n- ${highlights.join('\n- ')}` : '',
      `## ${projectDetailGroupLabels.workflow}`,
      '### 主要使用路径',
      '- 入口：说明访客从主站、项目卡片或演示链接进入后的第一步。',
      '- 操作：列出最能体现产品价值的 3-5 个动作。',
      '- 结果：说明访客完成流程后能看到什么证据、状态或产物。',
      '```mermaid\nflowchart TD\n  A["打开项目详情"] --> B["进入演示入口"]\n  B --> C["完成核心操作"]\n  C --> D["查看结果与状态"]\n```',
      `## ${projectDetailGroupLabels.architecture}`,
      '### 实现与技术栈',
      `项目当前技术栈包括：${stack.join('、') || '待补充'}。这里需要解释前端、后端、数据层、模型/自动化或部署之间怎样协同，而不是只列工具名。`,
      '- 前端：页面、交互、状态或移动端能力。',
      '- 后端：API、任务、权限、数据模型或集成边界。',
      '- 数据/模型：持久化、检索、生成、同步或质量控制。',
      `## ${projectDetailGroupLabels.quality}`,
      '### 验证与可观测性',
      '- 写出已经能本地或线上验证的命令、smoke、synthetic 或人工验收路径。',
      '- 写出项目状态页、健康检查、演示入口、构建产物或截图证据。',
      '- 写出哪些检查仍然需要人工 gate 或生产凭据。',
      `## ${projectDetailGroupLabels.limitations}`,
      '### 当前边界',
      '- 明确不能公开的账号、密码、后台、数据库、模型渠道和私有路径。',
      '- 明确当前只是演示、MVP、受控入口还是已部署完全体。',
      '- 明确哪些能力尚未上线，避免把计划说成已完成事实。',
      `## ${projectDetailGroupLabels.roadmap}`,
      '### 后续版本',
      '- 下一步最值得做的产品体验优化。',
      '- 下一步最值得做的工程质量优化。',
      '- 下一步最值得做的内容、配图、流程图或状态页优化。',
    ]
      .filter(Boolean)
      .join('\n\n'),
    knowledgePointsText: ['项目详情页', '技术案例页', '架构说明', ...stack].join('\n'),
    projectIdsText: project.id,
    visibility: 'hidden',
    aiAssistance: 'none',
  }
}

export { projectDetailTemplateOrder }
