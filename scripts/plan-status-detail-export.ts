import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reliabilityProjects, type ReliabilityProject } from '../src/data/statusTargets'
import { normalizeStudioDraft, type StudioContentBlock, type StudioDraft } from '../src/data/studio'
import { bodyJsonFromText } from '../src/utils/studioDraftBody'
import { createStatusDraftTemplate } from '../src/utils/studioStatusDraft'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface Options {
  sampleProjectId?: string
  sourcePath?: string
  projectId?: string
}

interface ContentSection {
  title: string
  blocks: StudioContentBlock[]
}

function parseArgs(argv: string[]): Options {
  const options: Options = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = () => {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) throw new Error(`${arg} 需要一个值`)
      index += 1
      return value
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else if (arg === '--sample') {
      options.sampleProjectId = next()
    } else if (arg === '--source') {
      options.sourcePath = next()
    } else if (arg === '--project') {
      options.projectId = next()
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }

  const sourceCount = [Boolean(options.sampleProjectId), Boolean(options.sourcePath)].filter(Boolean).length
  if (sourceCount !== 1) throw new Error('请且只请指定一种来源：--sample <status-project-id> 或 --source <draft.json>')
  return options
}

function printHelp() {
  console.log(`用法：
  npm.cmd run studio:status-plan -- --sample <status-project-id>
  npm.cmd run studio:status-plan -- --source <draft.json> [--project <status-project-id>]

说明：
  该命令只输出状态页说明更新计划，不写入 src/data/statusTargets.ts。`)
}

function findStatusProject(projectId: string): ReliabilityProject {
  const project = reliabilityProjects.find((item) => item.id === projectId)
  if (!project) throw new Error(`未知状态项目 ID：${projectId}`)
  return project
}

function templateToDraft(project: ReliabilityProject): StudioDraft {
  const template = createStatusDraftTemplate(project)
  const now = new Date().toISOString()
  return {
    id: `sample-status-draft-${project.id}`,
    slug: template.slug,
    title: template.title,
    column: template.column,
    tag: template.tag,
    detail: template.detail,
    readTime: template.readTime,
    bodyJson: bodyJsonFromText(template.bodyText),
    knowledgePoints: template.knowledgePointsText.split('\n').filter(Boolean),
    projectIds: template.projectIdsText ? template.projectIdsText.split('\n').filter(Boolean) : [],
    status: 'draft',
    visibility: template.visibility,
    aiAssistance: template.aiAssistance,
    createdBy: 'studio-status-template',
    updatedBy: 'studio-status-template',
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    latestReview: null,
  }
}

async function readDraft(options: Options) {
  if (options.sampleProjectId) return templateToDraft(findStatusProject(options.sampleProjectId))
  if (!options.sourcePath) throw new Error('缺少 --source')
  const payload = JSON.parse(await readFile(resolve(repoRoot, options.sourcePath), 'utf8')) as unknown
  const draft = normalizeStudioDraft(isRecord(payload) && 'draft' in payload ? payload.draft : payload)
  if (!draft) throw new Error('source JSON 不是有效 Studio draft payload')
  return draft
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function inferStatusProjectId(draft: StudioDraft, explicitProjectId?: string) {
  if (explicitProjectId) return explicitProjectId

  for (const project of reliabilityProjects) {
    if (draft.slug.startsWith(`${project.id}-`) || draft.projectIds.includes(project.id)) return project.id
  }
  if (draft.projectIds.includes('pet-workspace')) return 'pet-gamer'
  return ''
}

function buildPlan(draft: StudioDraft, project: ReliabilityProject) {
  const sections = groupSections(draft.bodyJson.blocks)
  const summary = firstTextFor(sections, '当前状态说明') || draft.detail || project.summary
  const gates = extractItemsFor(sections, '人工 gate')
  const nextActions = extractItemsFor(sections, '后续接入')
  const checksNote = bodyTextFor(sections, '分层检查项')
  const warnings = buildWarnings(draft, gates, nextActions)

  return {
    dryRun: true,
    projectId: project.id,
    projectTitle: project.title,
    sourceDraft: {
      slug: draft.slug,
      title: draft.title,
      column: draft.column,
      visibility: draft.visibility,
      aiAssistance: draft.aiAssistance,
    },
    updateCandidate: {
      summary,
      gates: gates.length > 0 ? gates : project.gates,
      nextActions: nextActions.length > 0 ? nextActions : project.nextActions,
      checksNote,
    },
    warnings,
    manualNext: [
      '人工比对 updateCandidate 与 src/data/statusTargets.ts 的现有 ReliabilityProject。',
      '确认没有公开真实凭据、后台地址、模型渠道、生产数据库、私有监控地址或敏感指标。',
      '如需落地状态数据，再手动编辑 statusTargets.ts 并运行 site:status、status:contract、docs:manual-gates-check、lint、build、check:ui。',
    ],
  }
}

function groupSections(blocks: StudioContentBlock[]) {
  const sections: ContentSection[] = [{ title: '正文', blocks: [] }]
  for (const block of blocks) {
    if (block.type === 'heading' && (block.level ?? 2) <= 2 && block.text) {
      sections.push({ title: block.text, blocks: [] })
      continue
    }
    sections[sections.length - 1].blocks.push(block)
  }
  return sections
}

function findSection(sections: ContentSection[], title: string) {
  return sections.find((section) => section.title.includes(title))
}

function firstTextFor(sections: ContentSection[], title: string) {
  const section = findSection(sections, title)
  if (!section) return ''
  return section.blocks.map(blockToText).find(Boolean) ?? ''
}

function bodyTextFor(sections: ContentSection[], title: string) {
  const section = findSection(sections, title)
  if (!section) return ''
  return section.blocks.map(blockToText).filter(Boolean).join('\n\n')
}

function extractItemsFor(sections: ContentSection[], title: string) {
  const section = findSection(sections, title)
  if (!section) return []
  return uniqueStrings(
    section.blocks.flatMap((block) => {
      if (block.type === 'list') return block.items ?? []
      const text = blockToText(block)
      return text
        .split(/\n|；|;|。/u)
        .map((item) => item.trim())
        .filter(Boolean)
    }),
  )
}

function blockToText(block: StudioContentBlock) {
  if (block.type === 'heading') return block.text ?? ''
  if (block.type === 'list') return (block.items ?? []).map((item) => `- ${item}`).join('\n')
  if (block.type === 'flow') return block.mermaid ? `流程图草稿：\n${block.mermaid}` : ''
  if (block.type === 'image') return block.src ? `图片：${block.caption || block.alt || block.src}` : ''
  if (block.type === 'source-card') return `来源：${block.caption || block.sourceItemId || '未绑定来源'}`
  return block.text ?? ''
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function buildWarnings(draft: StudioDraft, gates: string[], nextActions: string[]) {
  const warnings: string[] = []
  if (draft.column !== 'build-log') warnings.push(`草稿 column=${draft.column}；状态页说明模板推荐 build-log。`)
  if (draft.visibility !== 'hidden') warnings.push(`草稿 visibility=${draft.visibility}；状态页说明更新计划应先保持 hidden。`)
  if (draft.aiAssistance !== 'none') warnings.push(`草稿 aiAssistance=${draft.aiAssistance}；确认本次模型辅助已经被批准并记录。`)
  if (gates.length === 0) warnings.push('没有解析到人工 gate；落地状态页前需要明确哪些事项必须人工确认。')
  if (nextActions.length === 0) warnings.push('没有解析到后续接入；状态页说明应保留下一步可靠性观察路径。')
  return warnings
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const draft = await readDraft(options)
  const projectId = inferStatusProjectId(draft, options.projectId)
  if (!projectId) throw new Error('无法从草稿推断状态项目 ID，请增加 --project <status-project-id>')
  const project = findStatusProject(projectId)
  console.log(JSON.stringify(buildPlan(draft, project), null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
