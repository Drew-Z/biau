import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blogColumnMeta, blogPosts, type BlogColumn, type BlogPostSummary } from '../src/data/blog'
import { blogCuration, type BlogContentRole, type BlogCuration, type BlogVisibility } from '../src/data/blogCuration'
import type { BlogPost } from '../src/data/blogShared'
import { projects } from '../src/data/portfolio'
import { evaluatePublishExportReadiness } from '../server/src/studioReviewPolicy.js'
import {
  normalizeStudioDraft,
  normalizeStudioDrafts,
  normalizeStudioPublishExport,
  type StudioContentBlock,
  type StudioContentBody,
  type StudioDraft,
} from '../src/data/studio'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const blogDataPath = resolve(repoRoot, 'src/data/blog.ts')
const blogContentPath = resolve(repoRoot, 'src/data/blogContent.ts')
const blogCurationPath = resolve(repoRoot, 'src/data/blogCuration.ts')
const blogPostsDir = resolve(repoRoot, 'src/data/blog-posts')
const publicBlogVisibility: BlogVisibility = 'featured'
const exportValidationCommands = [
  'blog:audit',
  'blog:check',
  'blog:knowledge-check',
  'blog:project-notes-check',
  'lint',
  'build',
] as const

interface ExportOptions {
  draftRef?: string
  sourcePath?: string
  publishExportId?: string
  dryRun: boolean
  force: boolean
  allowDirty: boolean
  sample: boolean
  runChecks: boolean
  role?: BlogContentRole
  priority?: number
  series?: string
  date?: string
  exportedBy?: string
}

interface ContentSection {
  title: string
  blocks: StudioContentBlock[]
}

interface ExportPlan {
  draftId: string
  reviewId: string
  draftUpdatedAt: string
  post: BlogPost
  summary: BlogPostSummary
  curation: BlogCuration
  files: Record<string, string>
  exportedFiles: string[]
}

function parseArgs(argv: string[]): ExportOptions {
  const options: ExportOptions = {
    dryRun: false,
    force: false,
    allowDirty: false,
    sample: false,
    runChecks: false,
  }

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
    } else if (arg === '--draft') {
      options.draftRef = next()
    } else if (arg === '--source') {
      options.sourcePath = next()
    } else if (arg === '--publish-export-id') {
      options.publishExportId = next()
    } else if (arg === '--role') {
      options.role = readRole(next())
    } else if (arg === '--priority') {
      options.priority = readPositiveNumber(next(), '--priority')
    } else if (arg === '--series') {
      options.series = next()
    } else if (arg === '--date') {
      options.date = readDate(next(), '--date')
    } else if (arg === '--exported-by') {
      options.exportedBy = next()
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--force') {
      options.force = true
    } else if (arg === '--allow-dirty') {
      options.allowDirty = true
    } else if (arg === '--sample') {
      options.sample = true
      options.dryRun = true
    } else if (arg === '--run-checks') {
      options.runChecks = true
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }

  const sourceCount = [options.sample, Boolean(options.sourcePath), Boolean(options.draftRef)].filter(Boolean).length
  if (sourceCount !== 1) {
    throw new Error('请且只请指定一种来源：--sample、--source <json> 或 --draft <id-or-slug>')
  }
  if (options.publishExportId && !options.draftRef) {
    throw new Error('--publish-export-id 只能和 Studio 远端草稿 --draft 一起使用')
  }
  return options
}

function printHelp() {
  console.log(`用法：
  npm.cmd run studio:export -- --draft <id-or-slug>
  npm.cmd run studio:export -- --source <draft.json>
  npm.cmd run studio:export -- --sample --dry-run

常用参数：
  --dry-run                 只打印导出计划，不写文件
  --force                   允许覆盖已存在的 slug
  --allow-dirty             允许目标公开数据文件存在未提交改动
  --role <role>             case-study | technical-method | resource | roadmap
  --priority <number>       写入 blogCuration 的排序优先级
  --series <text>           写入 BlogPost.series
  --date <YYYY-MM-DD>       覆盖公开文章日期
  --publish-export-id <id>  导出后回写 Studio PublishExport 记录
  --run-checks              写文件后自动运行 ${exportValidationCommands.join(' / ')}

从 Studio API 读取时需要环境变量：
  STUDIO_EXPORT_API_BASE 或 VITE_STUDIO_API_BASE_URL
  STUDIO_ADMIN_TOKEN 或 ADMIN_TOKEN`)
}

function readRole(value: string): BlogContentRole {
  if (value === 'case-study' || value === 'technical-method' || value === 'resource' || value === 'roadmap') return value
  throw new Error(`无效 role：${value}`)
}

function readDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error(`${label} 必须是 YYYY-MM-DD`)
  return value
}

function readPositiveNumber(value: string, label: string) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) throw new Error(`${label} 必须是正数`)
  return numberValue
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readDraft(options: ExportOptions) {
  if (options.sample) return sampleDraft()
  if (options.sourcePath) {
    const payload = JSON.parse(await readFile(resolve(repoRoot, options.sourcePath), 'utf8')) as unknown
    const draft = normalizeStudioDraft(isRecord(payload) && 'draft' in payload ? payload.draft : payload)
    if (!draft) throw new Error('本地 source JSON 不是有效 Studio draft payload')
    return draft
  }
  if (!options.draftRef) throw new Error('缺少 --draft')
  return fetchDraftFromStudio(options.draftRef)
}

async function fetchDraftFromStudio(draftRef: string) {
  const { base, token } = readStudioApiConfig()

  const response = await fetch(`${base}/studio/api/content-drafts`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = (await response.json().catch(() => ({}))) as unknown
  if (!response.ok) throw new Error(`Studio API 返回 ${response.status}`)

  const drafts = normalizeStudioDrafts(payload)
  const draft = drafts.find((item) => item.id === draftRef || item.slug === draftRef)
  if (!draft) throw new Error(`没有找到 Studio draft：${draftRef}`)
  return draft
}

function normalizeApiBase(value: string | undefined) {
  return value?.trim().replace(/\/+$/u, '') ?? ''
}

function readStudioApiConfig() {
  const base = normalizeApiBase(
    process.env.STUDIO_EXPORT_API_BASE || process.env.VITE_STUDIO_API_BASE_URL || process.env.STUDIO_API_BASE,
  )
  const token = process.env.STUDIO_ADMIN_TOKEN || process.env.ADMIN_TOKEN
  if (!base) throw new Error('缺少 STUDIO_EXPORT_API_BASE 或 VITE_STUDIO_API_BASE_URL')
  if (!token) throw new Error('缺少 STUDIO_ADMIN_TOKEN 或 ADMIN_TOKEN')
  return { base, token }
}

async function assertPublishExportMatchesDraft(draft: StudioDraft, publishExportId: string) {
  const { base, token } = readStudioApiConfig()
  const response = await fetch(`${base}/studio/api/publish-exports/${publishExportId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = (await response.json().catch(() => ({}))) as unknown
  if (!response.ok) throw new Error(`PublishExport 读取失败：${response.status}`)
  const publishExport = normalizeStudioPublishExport(isRecord(payload) ? payload.publishExport : null)
  if (!publishExport) throw new Error('PublishExport 返回格式不完整')
  if (publishExport.draftId !== draft.id) {
    throw new Error('PublishExport 不属于当前草稿，请复制该草稿卡片中的完整导出命令')
  }
  if (!publishExport.reviewId || !publishExport.draftUpdatedAt) {
    throw new Error('PublishExport 缺少草稿版本绑定，请在 Studio 中重新创建导出记录')
  }
  if (publishExport.reviewId !== draft.latestReview?.id || publishExport.draftUpdatedAt !== draft.updatedAt) {
    throw new Error('PublishExport 对应的草稿或批准版本已经变化，请重新创建导出记录')
  }
}

function assertStudioDraftExportReady(draft: StudioDraft) {
  const review = draft.latestReview
  const readiness = evaluatePublishExportReadiness(
    draft.status.toUpperCase(),
    review ? { status: review.status.toUpperCase(), checklist: review.checklist } : null,
  )
  if (readiness.ok) return
  if (readiness.error === 'draft-not-approved') {
    throw new Error(`草稿状态是 ${draft.status}，只有 approved 草稿可以导出`)
  }
  if (readiness.error === 'publish-review-not-approved') {
    throw new Error('草稿最新审核不是 approved，不能执行 Publish Export')
  }
  throw new Error('草稿最新审核清单不完整，不能执行 Publish Export')
}

function sampleDraft(): StudioDraft {
  const now = new Date().toISOString()
  return {
    id: 'sample-studio-draft',
    slug: 'sample-studio-export',
    title: 'Studio 导出器样例：从审核草稿到公开博客',
    column: 'build-log',
    tag: '内容系统',
    detail: '用一个本地 dry-run 样例验证 Studio 草稿导出器的字段映射、文件计划和发布边界。',
    readTime: '6 min',
    bodyJson: {
      blocks: [
        { type: 'heading', level: 2, text: '为什么需要导出器' },
        { type: 'paragraph', text: '内容工作台负责编辑和审核，公开站继续读取静态数据。导出器连接这两个边界。' },
        { type: 'heading', level: 2, text: '实践清单' },
        { type: 'list', items: ['检查 slug 冲突', '写入公开数据文件', '运行博客审计和构建验证'] },
        { type: 'heading', level: 2, text: '关键收获' },
        { type: 'list', items: ['发布面保持静态稳定', '编辑面可以继续后端化', '导出结果保留 Git diff 审查'] },
      ],
    },
    knowledgePoints: ['Content Studio', 'Static Export', 'Review Gate'],
    projectIds: ['blog-semi'],
    status: 'approved',
    visibility: 'featured',
    aiAssistance: 'none',
    createdBy: 'sample',
    updatedBy: 'sample',
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    latestReview: null,
  }
}

function buildExportPlan(draft: StudioDraft, options: ExportOptions): ExportPlan {
  if (draft.status !== 'approved') throw new Error(`草稿状态是 ${draft.status}，只有 approved 草稿可以导出`)
  if (!isBlogColumn(draft.column)) throw new Error(`无效博客栏目：${draft.column}`)

  const slug = draft.slug
  const date = options.date ?? draft.publishedAt?.slice(0, 10) ?? draft.updatedAt.slice(0, 10)
  const series = options.series ?? blogColumnMeta[draft.column].titleZh
  const knowledgePoints = uniqueStrings(draft.knowledgePoints)
  const projectIds = uniqueStrings(draft.projectIds)
  assertKnownProjects(projectIds)

  const content = mapBodyToBlogContent(draft.bodyJson, draft.detail, knowledgePoints)
  const post: BlogPost = {
    slug,
    title: draft.title,
    tag: draft.tag,
    column: draft.column,
    detail: draft.detail,
    date,
    readTime: draft.readTime,
    series,
    knowledgePoints,
    scenarios: content.scenarios,
    practiceChecklist: content.practiceChecklist,
    sections: content.sections,
    takeaways: content.takeaways,
  }
  const summary: BlogPostSummary = {
    slug: post.slug,
    title: post.title,
    tag: post.tag,
    column: post.column,
    detail: post.detail,
    date: post.date,
    readTime: post.readTime,
    series: post.series,
    knowledgePoints: post.knowledgePoints,
  }
  const curation: BlogCuration = {
    visibility: publicBlogVisibility,
    role: options.role ?? defaultRoleFor(post.column, projectIds),
    priority: options.priority ?? nextPriority(),
    projectIds,
  }

  const nextSummaries = upsertBySlug(blogPosts, summary)
  const nextCuration = {
    ...blogCuration,
    [slug]: curation,
  }
  const postPath = resolve(blogPostsDir, `${slug}.ts`)
  const exportedFiles = [
    relativeRepoPath(postPath),
    relativeRepoPath(blogDataPath),
    relativeRepoPath(blogContentPath),
    relativeRepoPath(blogCurationPath),
  ]

  return {
    draftId: draft.id,
    reviewId: draft.latestReview?.id ?? '',
    draftUpdatedAt: draft.updatedAt,
    post,
    summary,
    curation,
    exportedFiles,
    files: {
      [postPath]: formatBlogPostModule(post),
      [blogDataPath]: formatBlogData(nextSummaries),
      [blogContentPath]: formatBlogContent(nextSummaries.map((item) => item.slug)),
      [blogCurationPath]: replaceCurationObject(nextCuration, nextSummaries.map((item) => item.slug)),
    },
  }
}

function isBlogColumn(value: string): value is BlogColumn {
  return Object.prototype.hasOwnProperty.call(blogColumnMeta, value)
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function assertKnownProjects(projectIds: string[]) {
  const knownProjectIds = new Set(projects.map((project) => project.id))
  const unknownProjectIds = projectIds.filter((projectId) => !knownProjectIds.has(projectId))
  if (unknownProjectIds.length > 0) throw new Error(`关联项目不存在：${unknownProjectIds.join(', ')}`)
}

function nextPriority() {
  const priorities = Object.values(blogCuration)
    .map((item) => item?.priority ?? 0)
    .filter((priority) => Number.isFinite(priority))
  return Math.max(0, ...priorities) + 10
}

function defaultRoleFor(column: BlogColumn, projectIds: string[]): BlogContentRole {
  if (column === 'resources') return 'resource'
  if (column === 'project-notes' && projectIds.length > 0) return 'case-study'
  return 'technical-method'
}

function mapBodyToBlogContent(body: StudioContentBody, detail: string, knowledgePoints: string[]) {
  const groupedSections = groupSections(body.blocks)
  const sections: BlogPost['sections'] = []
  let scenarios: string[] = []
  let practiceChecklist: string[] = []
  let takeaways: string[] = []

  for (const section of groupedSections) {
    const titleKey = section.title.toLowerCase()
    if (/应用场景|scenarios?/iu.test(titleKey)) {
      scenarios = uniqueStrings(extractItems(section.blocks))
      continue
    }
    if (/实践清单|checklist|行动清单/iu.test(titleKey)) {
      practiceChecklist = uniqueStrings(extractItems(section.blocks))
      continue
    }
    if (/关键收获|takeaways?|结论/iu.test(titleKey)) {
      takeaways = uniqueStrings(extractItems(section.blocks))
      continue
    }

    const bodyText = blocksToBodyText(section.blocks)
    if (bodyText) sections.push({ title: section.title, body: bodyText })
  }

  if (sections.length === 0) sections.push({ title: '正文', body: detail })
  if (takeaways.length === 0) takeaways = knowledgePoints.length > 0 ? knowledgePoints.slice(0, 6) : [detail]

  return { sections, scenarios, practiceChecklist, takeaways }
}

function groupSections(blocks: StudioContentBlock[]) {
  const sections: ContentSection[] = [{ title: '正文', blocks: [] }]
  for (const block of blocks) {
    if (block.type === 'heading' && block.text) {
      sections.push({ title: block.text, blocks: [] })
      continue
    }
    sections[sections.length - 1].blocks.push(block)
  }
  return sections.filter((section, index) => section.blocks.length > 0 || (index === 0 && sections.length === 1))
}

function extractItems(blocks: StudioContentBlock[]) {
  return blocks.flatMap((block) => {
    if (block.type === 'list') return block.items ?? []
    const text = blockToText(block)
    if (!text) return []
    return text
      .split(/\n|；|;|。/u)
      .map((item) => item.trim())
      .filter(Boolean)
  })
}

function blocksToBodyText(blocks: StudioContentBlock[]) {
  return blocks
    .map((block) => blockToText(block))
    .filter(Boolean)
    .join('\n\n')
}

function blockToText(block: StudioContentBlock) {
  if (block.type === 'list') return (block.items ?? []).map((item) => `- ${item}`).join('\n')
  if (block.type === 'image') {
    const label = block.caption || block.alt || '文章配图'
    return block.src ? `图片：${label}（${block.src}）` : `图片：${label}`
  }
  if (block.type === 'flow') return block.mermaid ? `流程图草稿：\n${block.mermaid}` : ''
  if (block.type === 'source-card') {
    const snapshot = block.citationSnapshot
    if (snapshot?.version === 2) {
      const publishedAt = snapshot.publishedAt ? ` · ${snapshot.publishedAt.slice(0, 10)}` : ''
      return `来源：${snapshot.title} · ${snapshot.publisher}${publishedAt}\n链接：${snapshot.originalUrl}\n证据摘录：${snapshot.excerpt}`
    }
    return `来源：${block.caption || block.sourceItemId || '未绑定来源'}`
  }
  return block.text ?? ''
}

function upsertBySlug<T extends { slug: string }>(items: T[], nextItem: T) {
  const index = items.findIndex((item) => item.slug === nextItem.slug)
  if (index === -1) return [...items, nextItem]
  return items.map((item) => (item.slug === nextItem.slug ? nextItem : item))
}

function formatBlogPostModule(post: BlogPost) {
  return `import type { BlogPost } from '../blogShared'\n\nconst post: BlogPost = ${JSON.stringify(post, null, 2)}\n\nexport default post\n`
}

function formatBlogData(posts: BlogPostSummary[]) {
  return `import type { BlogPostSummary } from './blogShared'\n\nexport { blogColumnMeta, blogColumnOrder } from './blogShared'\nexport type { BlogColumn, BlogPostSummary } from './blogShared'\n\nexport const blogPosts: BlogPostSummary[] = ${JSON.stringify(posts, null, 2)}\n`
}

function formatBlogContent(slugs: string[]) {
  const loaderLines = slugs.map((slug) => `  '${slug}': () => import('./blog-posts/${slug}'),`).join('\n')
  return `import type { BlogPost } from './blogShared'\n\nexport { blogColumnMeta, blogColumnOrder } from './blogShared'\n\nconst postLoaders: Record<string, () => Promise<{ default: BlogPost }>> = {\n${loaderLines}\n}\n\nexport function getBlogPost(slug: string): Promise<BlogPost | undefined> {\n  const loader = postLoaders[slug]\n  if (!loader) return Promise.resolve(undefined)\n  return loader().then((module) => module.default)\n}\n\nexport function getLoadableBlogPostSlugs() {\n  return Object.keys(postLoaders)\n}\n`
}

function replaceCurationObject(nextCuration: Partial<Record<string, BlogCuration>>, slugOrder: string[]) {
  const currentText = readFileSync(blogCurationPath, 'utf8')
  const objectText = formatCurationObject(nextCuration, slugOrder)
  const marker = '\n\nconst sourceOrder'
  const nextText = currentText.replace(
    /export const blogCuration: Partial<Record<string, BlogCuration>> = \{[\s\S]*?\n\}\n\nconst sourceOrder/u,
    `${objectText}${marker}`,
  )
  if (nextText === currentText) throw new Error('无法替换 blogCuration 对象')
  return nextText
}

function formatCurationObject(nextCuration: Partial<Record<string, BlogCuration>>, slugOrder: string[]) {
  const order = new Map(slugOrder.map((slug, index) => [slug, index]))
  const entries = Object.entries(nextCuration)
    .filter((entry): entry is [string, BlogCuration] => Boolean(entry[1]))
    .sort((a, b) => (order.get(a[0]) ?? 9999) - (order.get(b[0]) ?? 9999) || a[0].localeCompare(b[0]))
  const body = entries.map(([slug, curation]) => `  '${slug}': ${formatCurationEntry(curation)},`).join('\n')
  return `export const blogCuration: Partial<Record<string, BlogCuration>> = {\n${body}\n}`
}

function formatCurationEntry(curation: BlogCuration) {
  const lines = [
    `visibility: '${curation.visibility}'`,
    `role: '${curation.role}'`,
    `priority: ${curation.priority}`,
  ]
  if (curation.projectIds && curation.projectIds.length > 0) {
    lines.push(`projectIds: ${JSON.stringify(curation.projectIds)}`)
  }
  return `{\n    ${lines.join(',\n    ')},\n  }`
}

function relativeRepoPath(absolutePath: string) {
  return absolutePath.replace(`${repoRoot}\\`, '').replace(`${repoRoot}/`, '').replace(/\\/gu, '/')
}

async function assertCanWrite(plan: ExportPlan, options: ExportOptions) {
  const postPath = resolve(blogPostsDir, `${plan.post.slug}.ts`)
  const slugExists = blogPosts.some((post) => post.slug === plan.post.slug) || existsSync(postPath)
  if (slugExists && !options.force) {
    throw new Error(`slug 已存在：${plan.post.slug}。如确认覆盖，请加 --force`)
  }
  if (!options.allowDirty) {
    const status = execFileSync('git', ['status', '--porcelain', '--', ...Object.keys(plan.files).map(relativeRepoPath)], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim()
    if (status) throw new Error(`目标文件存在未提交改动，请先处理或使用 --allow-dirty：\n${status}`)
  }
}

async function writePlan(plan: ExportPlan) {
  await mkdir(blogPostsDir, { recursive: true })
  await Promise.all(Object.entries(plan.files).map(([filePath, content]) => writeFile(filePath, content, 'utf8')))
}

interface ExportFileSnapshot {
  filePath: string
  existed: boolean
  content: string
}

async function capturePlanFiles(plan: ExportPlan): Promise<ExportFileSnapshot[]> {
  return Promise.all(
    Object.keys(plan.files).map(async (filePath) => {
      const existed = existsSync(filePath)
      return {
        filePath,
        existed,
        content: existed ? await readFile(filePath, 'utf8') : '',
      }
    }),
  )
}

async function restorePlanFiles(snapshots: ExportFileSnapshot[]) {
  await Promise.all(
    snapshots.map(async (snapshot) => {
      if (!snapshot.existed) {
        await rm(snapshot.filePath, { force: true })
        return
      }
      await mkdir(dirname(snapshot.filePath), { recursive: true })
      await writeFile(snapshot.filePath, snapshot.content, 'utf8')
    }),
  )
}

interface ExportChecks {
  status: 'local-export-written' | 'passed' | 'failed'
  exportedAt: string
  validationNext?: string[]
  results?: Array<{ command: string; exitCode: number | null }>
}

async function reportPublishExport(plan: ExportPlan, options: ExportOptions, checks: ExportChecks) {
  if (!options.publishExportId || options.dryRun) return
  const { base, token } = readStudioApiConfig()

  const response = await fetch(`${base}/studio/api/publish-exports/${options.publishExportId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      draftId: plan.draftId,
      reviewId: plan.reviewId,
      draftUpdatedAt: plan.draftUpdatedAt,
      exportedFiles: plan.exportedFiles,
      checks,
      exportedBy: options.exportedBy || 'studio-export-script',
    }),
  })
  if (!response.ok) throw new Error(`PublishExport 回写失败：${response.status}`)
}

function runValidationChecks(): ExportChecks {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const results: Array<{ command: string; exitCode: number | null }> = []

  for (const command of exportValidationCommands) {
    const result = spawnSync(npmCommand, ['run', command], {
      cwd: repoRoot,
      stdio: 'inherit',
    })
    const exitCode = result.status
    results.push({ command: `${npmCommand} run ${command}`, exitCode })
    if (exitCode !== 0) {
      return { status: 'failed', exportedAt: new Date().toISOString(), results }
    }
  }

  return { status: 'passed', exportedAt: new Date().toISOString(), results }
}

function pendingValidationChecks(): ExportChecks {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  return {
    status: 'local-export-written',
    exportedAt: new Date().toISOString(),
    validationNext: exportValidationCommands.map((command) => `${npmCommand} run ${command}`),
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const draft = await readDraft(options)
  if (options.draftRef) assertStudioDraftExportReady(draft)
  if (options.publishExportId) await assertPublishExportMatchesDraft(draft, options.publishExportId)
  if (draft.visibility !== 'featured') {
    console.warn(`提示：草稿当前 visibility=${draft.visibility}；本地公开导出会写入 featured curation。`)
  }

  const plan = buildExportPlan(draft, options)
  await assertCanWrite(plan, options)

  if (options.dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      slug: plan.post.slug,
      title: plan.post.title,
      curation: plan.curation,
      exportedFiles: plan.exportedFiles,
    }, null, 2))
    return
  }

  if (options.draftRef) {
    const refreshedDraft = await fetchDraftFromStudio(options.draftRef)
    assertStudioDraftExportReady(refreshedDraft)
    if (refreshedDraft.id !== draft.id || refreshedDraft.updatedAt !== draft.updatedAt) {
      throw new Error('Studio 草稿在导出准备期间发生变化，请重新运行导出命令')
    }
    if (options.publishExportId) await assertPublishExportMatchesDraft(refreshedDraft, options.publishExportId)
  }

  const fileSnapshots = await capturePlanFiles(plan)
  let checks: ExportChecks
  try {
    await writePlan(plan)
    if (options.draftRef) {
      const postWriteDraft = await fetchDraftFromStudio(options.draftRef)
      assertStudioDraftExportReady(postWriteDraft)
      if (postWriteDraft.id !== draft.id || postWriteDraft.updatedAt !== draft.updatedAt) {
        throw new Error('Studio 草稿在文件写入期间发生变化，已恢复写入前文件')
      }
      if (options.publishExportId) await assertPublishExportMatchesDraft(postWriteDraft, options.publishExportId)
    }
    checks = options.runChecks ? runValidationChecks() : pendingValidationChecks()
    await reportPublishExport(plan, options, checks)
  } catch (error) {
    await restorePlanFiles(fileSnapshots)
    throw error
  }
  console.log(JSON.stringify({
    exported: true,
    slug: plan.post.slug,
    exportedFiles: plan.exportedFiles,
    checks,
  }, null, 2))
  if (checks.status === 'failed') process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
