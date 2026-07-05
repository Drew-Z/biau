import { blogColumnMeta, type BlogColumn } from '../data/blog'
import type { StudioVisibility } from '../data/studio'

export type StudioResourceDraftType = 'tool' | 'article' | 'repository' | 'model' | 'course' | 'asset'

export const studioResourceDraftTypeLabels: Record<StudioResourceDraftType, string> = {
  tool: '工具',
  article: '文章',
  repository: '开源仓库',
  model: '模型/服务',
  course: '课程/教程',
  asset: '素材/资源包',
}

export interface StudioResourceDraftTemplateInput {
  title?: string
  url?: string
  resourceType?: StudioResourceDraftType
}

export interface StudioResourceDraftTemplate {
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, '-')
    .replace(/[\u4e00-\u9fa5]/gu, '')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .slice(0, 72)
}

function readResourceUrlLine(value: string) {
  const url = value.trim()
  if (!url) return '- 公开链接：待补充。'

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '- 公开链接：待补充公开 HTTP/HTTPS 链接。'
    }
    if (parsed.search || parsed.hash) {
      return `- 公开链接：${parsed.origin}${parsed.pathname}（已建议移除查询参数和锚点，发布前确认不含私有 token。）`
    }
    return `- 公开链接：${parsed.toString()}`
  } catch {
    return '- 公开链接：待补充有效公开 URL。'
  }
}

export function createResourceDraftTemplate(input: StudioResourceDraftTemplateInput = {}): StudioResourceDraftTemplate {
  const resourceTitle = input.title?.trim() || '待分享资源'
  const resourceType = input.resourceType ?? 'tool'
  const resourceTypeLabel = studioResourceDraftTypeLabels[resourceType]
  const slugBase = slugify(resourceTitle) || 'resource-pick-draft'

  return {
    title: `${resourceTitle} 使用笔记与推荐理由`,
    slug: `${slugBase}-resource-pick`,
    column: 'resources',
    tag: blogColumnMeta.resources.titleZh,
    detail: `围绕 ${resourceTitle} 记录资源定位、适用场景、使用方式、判断依据和维护边界，避免只发布无筛选的链接清单。`,
    readTime: '6 min',
    bodyText: [
      '## 资源定位',
      '### 它是什么',
      `- 资源名称：${resourceTitle}`,
      `- 资源类型：${resourceTypeLabel}`,
      readResourceUrlLine(input.url ?? ''),
      '- 一句话判断：写清楚为什么值得分享，以及它解决的是哪类具体问题。',
      '## 应用场景',
      '- 适合谁使用：说明读者画像、项目阶段或技术背景。',
      '- 适合什么问题：说明它最能改善的工作流、学习路径或工程环节。',
      '- 不适合什么情况：说明成本、门槛、替代方案或风险边界。',
      '## 使用方式',
      '- 第一步：如何确认资源是否可靠、是否适配当前需求。',
      '- 第二步：最小试用路径是什么，需要准备哪些输入或环境。',
      '- 第三步：如何把结果沉淀为模板、清单、代码片段或项目实践。',
      '## 判断依据',
      '- 来源可信度：官方文档、README、发布记录、社区反馈或个人试用证据。',
      '- 实用性：它是否节省时间、降低复杂度、提升质量或带来新的能力。',
      '- 可维护性：后续更新频率、依赖风险、迁移成本和长期可用性。',
      '## 注意事项',
      '- 授权与成本：确认许可证、价格、免费额度或商业使用限制。',
      '- 数据与隐私：不要上传敏感数据、账号、密钥、客户资料或内部链接。',
      '- 表达边界：没有亲自验证的能力只写“待验证”，不要写成确定事实。',
      '## 后续维护',
      '- 后续补充一张使用截图或流程图，展示资源进入实际工作流的位置。',
      '- 后续记录一次真实使用后的优缺点，而不是只保留初次推荐理由。',
      '## 关键收获',
      `- ${resourceTitle} 的价值不只在链接本身，而在筛选理由、适用边界和可复用使用方式。`,
      '- 资源分享文章必须保留个人判断和公开证据，避免变成自动生成的链接堆。',
    ].join('\n\n'),
    knowledgePointsText: ['资源分享', resourceTypeLabel, '使用笔记', '筛选标准', resourceTitle].join('\n'),
    projectIdsText: '',
    visibility: 'hidden',
    aiAssistance: 'none',
  }
}
