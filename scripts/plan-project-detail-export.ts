import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { blogColumnMeta } from '../src/data/blog'
import {
  projectDetailGroupLabels,
  projects,
  type Project,
  type ProjectDetailContent,
  type ProjectDetailContentKey,
  type ProjectDetailSection,
  type ProjectVisualBlock,
  type ProjectVisualBlockType,
} from '../src/data/portfolio'
import { normalizeStudioDraft, type StudioContentBlock, type StudioContentBody, type StudioDraft } from '../src/data/studio'
import { bodyJsonFromText } from '../src/utils/studioDraftBody'
import { createProjectDetailDraftTemplate, projectDetailTemplateOrder } from '../src/utils/studioProjectDraft'

interface Options {
  sampleProjectId?: string
  sourcePath?: string
  projectId?: string
}

interface PlannedProjectDetailExport {
  projectId: string
  projectTitle: string
  sourceDraft: {
    title: string
    slug: string
    status: StudioDraft['status']
    visibility: StudioDraft['visibility']
  }
  detailContent: ProjectDetailContent
  assistantContext: string[]
  warnings: string[]
  manualNext: string[]
}

const groupLookup = new Map<string, ProjectDetailContentKey>(
  projectDetailTemplateOrder.flatMap((key) => [
    [key, key],
    [projectDetailGroupLabels[key], key],
  ]),
)

function parseArgs(args: string[]): Options {
  const options: Options = {}
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = () => {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} 缺少参数`)
      index += 1
      return value
    }
    if (arg === '--sample') options.sampleProjectId = next()
    else if (arg === '--source') options.sourcePath = next()
    else if (arg === '--project') options.projectId = next()
    else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }
  return options
}

function printHelp() {
  console.log(`用法：
  npm.cmd run studio:project-detail-plan -- --sample <projectId>
  npm.cmd run studio:project-detail-plan -- --source <draft.json> [--project <projectId>]

说明：
  该命令只输出 Project.detailContent 导出计划，不会写入 src/data/portfolio.ts。
  source JSON 可以是 Studio draft payload，或 { "draft": ... } 包装结构。`)
}

async function readDraft(options: Options): Promise<StudioDraft> {
  if (options.sampleProjectId) {
    const project = findProject(options.sampleProjectId)
    const template = createProjectDetailDraftTemplate(project)
    return {
      id: 'sample-project-detail-draft',
      slug: template.slug,
      title: template.title,
      column: template.column,
      tag: template.tag,
      detail: template.detail,
      readTime: template.readTime,
      bodyJson: bodyJsonFromText(template.bodyText),
      knowledgePoints: template.knowledgePointsText.split('\n').filter(Boolean),
      projectIds: [project.id],
      status: 'review-needed',
      visibility: template.visibility,
      aiAssistance: template.aiAssistance,
      createdBy: 'studio-project-detail-template',
      updatedBy: 'studio-project-detail-template',
      publishedAt: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      latestReview: null,
    }
  }

  if (!options.sourcePath) throw new Error('请指定 --sample <projectId> 或 --source <draft.json>')
  const payload = JSON.parse(await readFile(resolve(options.sourcePath), 'utf8')) as unknown
  const draft = normalizeStudioDraft(isRecord(payload) && 'draft' in payload ? payload.draft : payload)
  if (!draft) throw new Error('source JSON 不是有效 Studio draft payload')
  return draft
}

function buildPlan(draft: StudioDraft, options: Options): PlannedProjectDetailExport {
  const projectId = options.projectId || draft.projectIds[0]
  if (!projectId) throw new Error('项目详情导出需要 draft.projectIds 至少包含一个项目 ID，或传入 --project <projectId>')
  const project = findProject(projectId)
  const warnings = validateDraftForProjectDetail(draft, project)
  const detailContent = bodyToProjectDetailContent(draft.bodyJson, warnings)
  return {
    projectId: project.id,
    projectTitle: project.title,
    sourceDraft: {
      title: draft.title,
      slug: draft.slug,
      status: draft.status,
      visibility: draft.visibility,
    },
    detailContent,
    assistantContext: buildAssistantContext(draft, detailContent),
    warnings,
    manualNext: [
      '人工审查 detailContent 是否适合写入 src/data/portfolio.ts 对应项目。',
      '确认 visual.image 均为 /images/projects/ 下的公开安全资产，且文件实际存在。',
      '写入 portfolio.ts 后运行 npm.cmd run assistant:index、npm.cmd run lint、npm.cmd run build 和 npm.cmd run check:ui。',
      '项目详情页发布前不要公开账号、密码、模型渠道、数据库 URL、内部后台或本地绝对路径。',
    ],
  }
}

function bodyToProjectDetailContent(body: StudioContentBody, warnings: string[]) {
  const content: ProjectDetailContent = {}
  let currentKey: ProjectDetailContentKey = 'overview'
  let currentSection: ProjectDetailSection | null = null

  for (const block of body.blocks) {
    if (block.type === 'heading') {
      const text = (block.text ?? '').trim()
      const key = groupLookup.get(text)
      if ((block.level ?? 2) <= 2 && key) {
        currentKey = key
        currentSection = null
        continue
      }
      currentSection = createSection(content, currentKey, text || projectDetailGroupLabels[currentKey])
      continue
    }

    currentSection ??= createSection(content, currentKey, projectDetailGroupLabels[currentKey])
    appendBlockToSection(currentSection, block, currentKey, warnings)
  }

  return content
}

function createSection(content: ProjectDetailContent, key: ProjectDetailContentKey, title: string) {
  const section: ProjectDetailSection = { title }
  content[key] = [...(content[key] ?? []), section]
  return section
}

function appendBlockToSection(
  section: ProjectDetailSection,
  block: StudioContentBlock,
  key: ProjectDetailContentKey,
  warnings: string[],
) {
  if (block.type === 'paragraph' && block.text) {
    section.body = section.body ? `${section.body}\n\n${block.text}` : block.text
    return
  }

  if (block.type === 'list') {
    section.items = [...(section.items ?? []), ...(block.items ?? [])]
    return
  }

  if (block.type === 'image') {
    section.visual ??= imageBlockToVisual(block, key, warnings)
    return
  }

  if (block.type === 'flow') {
    section.visual ??= flowBlockToVisual(block, key)
    return
  }

  if (block.type === 'source-card') {
    const text = `来源线索：${block.caption || block.sourceItemId || '未绑定来源'}`
    section.body = section.body ? `${section.body}\n\n${text}` : text
  }
}

function imageBlockToVisual(
  block: StudioContentBlock,
  key: ProjectDetailContentKey,
  warnings: string[],
): ProjectVisualBlock {
  const image = block.src
  if (image && !image.startsWith('/images/projects/')) {
    warnings.push(`visual image 不是 /images/projects/ 公开资产路径：${image}`)
  }
  return {
    id: makeVisualId(block.alt || block.caption || key),
    type: visualTypeForGroup(key),
    title: block.caption || block.alt || '项目详情配图',
    description: block.caption || block.alt || '从 Studio 草稿映射来的项目详情页配图。',
    image,
    alt: block.alt,
    caption: block.caption,
  }
}

function flowBlockToVisual(block: StudioContentBlock, key: ProjectDetailContentKey): ProjectVisualBlock {
  const firstLine = block.mermaid?.split('\n').find(Boolean) ?? 'Mermaid flow draft'
  return {
    id: makeVisualId(`${key}-${firstLine}`),
    type: visualTypeForGroup(key),
    title: '流程图草稿',
    description: `Studio Mermaid 草稿：${firstLine}`,
    caption: '该 visual 只记录流程图意图；发布前建议转换成公开 SVG/截图资产。',
  }
}

function visualTypeForGroup(key: ProjectDetailContentKey): ProjectVisualBlockType {
  if (key === 'architecture') return 'architecture'
  if (key === 'workflow') return 'workflow'
  if (key === 'quality') return 'status'
  if (key === 'roadmap') return 'release'
  return 'diagram'
}

function validateDraftForProjectDetail(draft: StudioDraft, project: Project) {
  const warnings: string[] = []
  if (draft.column !== 'project-notes') warnings.push(`建议项目详情草稿使用 ${blogColumnMeta['project-notes'].titleZh} 栏目。`)
  if (!draft.projectIds.includes(project.id)) warnings.push(`draft.projectIds 未包含目标项目：${project.id}`)
  if (draft.status !== 'approved' && draft.status !== 'review-needed') {
    warnings.push(`当前 draft.status=${draft.status}，建议先进入 review-needed 或 approved 再规划项目详情导出。`)
  }
  if (draft.visibility !== 'hidden') warnings.push('项目详情页导出计划建议保持 Studio 草稿 hidden，避免误进入博客公开列表。')
  return warnings
}

function buildAssistantContext(draft: StudioDraft, detailContent: ProjectDetailContent) {
  const sectionTexts = projectDetailTemplateOrder.flatMap((key) =>
    (detailContent[key] ?? []).flatMap((section) => [section.title, section.body ?? '', ...(section.items ?? [])]),
  )
  return Array.from(new Set([draft.detail, ...draft.knowledgePoints, ...sectionTexts].map((item) => item.trim()).filter(Boolean))).slice(0, 12)
}

function findProject(projectId: string) {
  const project = projects.find((item) => item.id === projectId)
  if (!project) throw new Error(`未知项目 ID：${projectId}`)
  return project
}

function makeVisualId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, '-')
    .replace(/[\u4e00-\u9fa5]/gu, '')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .slice(0, 72) || 'project-detail-visual'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const draft = await readDraft(options)
  console.log(JSON.stringify(buildPlan(draft, options), null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
