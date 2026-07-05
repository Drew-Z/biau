import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_READ_TIME = '6 min'

function parseArgs(argv) {
  const args = {
    source: '',
    out: '',
    force: false,
  }

  const readValue = (index) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--source') {
      args.source = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--source=')) {
      args.source = item.slice('--source='.length)
      continue
    }
    if (item === '--out') {
      args.out = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--out=')) {
      args.out = item.slice('--out='.length)
      continue
    }
    if (item === '--force') {
      args.force = true
    }
  }

  if (!args.source) throw new Error('Missing --source <json>')
  return args
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value) {
  return Array.isArray(value) ? value.map(asString).filter(Boolean) : []
}

function assertPublicUrl(value, label) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol')
    return url.toString()
  } catch {
    throw new Error(`${label} must be a public http(s) URL`)
  }
}

function loadSourcePayload(rawPayload) {
  if (!isRecord(rawPayload)) throw new Error('Source file must contain an object')
  const date = asString(rawPayload.date)
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new Error('Source file needs date in YYYY-MM-DD format')

  const items = Array.isArray(rawPayload.items) ? rawPayload.items.map(normalizeItem) : []
  if (items.length === 0) throw new Error('Source file needs at least one item')

  return {
    date,
    title: asString(rawPayload.title) || `AI 日报 ${date}`,
    subtitle: asString(rawPayload.subtitle) || 'AI Daily',
    editorNote: asString(rawPayload.editorNote),
    items,
  }
}

function normalizeItem(value, index) {
  if (!isRecord(value)) throw new Error(`items[${index}] must be an object`)
  const title = asString(value.title)
  const url = assertPublicUrl(asString(value.url), `items[${index}].url`)
  const source = asString(value.source) || 'Public source'
  const summary = asString(value.summary)
  const impact = asString(value.impact)
  if (!title) throw new Error(`items[${index}].title is required`)
  if (!summary) throw new Error(`items[${index}].summary is required`)
  if (!impact) throw new Error(`items[${index}].impact is required`)

  return {
    title,
    url,
    source,
    publishedAt: asString(value.publishedAt) || 'unknown',
    summary,
    impact,
    toVerify: asStringArray(value.toVerify),
    tags: asStringArray(value.tags),
  }
}

function markdownEscape(value) {
  return String(value).replace(/\|/gu, '\\|')
}

function yamlEscape(value) {
  return String(value).replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')
}

function slugFromDate(date) {
  return `ai-daily-${date}`
}

function defaultOutPath(date) {
  return resolve(repoRoot, 'content-drafts', `${slugFromDate(date)}.md`)
}

function resolveRepoPath(path) {
  return resolve(repoRoot, path)
}

async function assertWritable(filePath, force) {
  try {
    await access(filePath, constants.F_OK)
  } catch {
    return
  }
  if (!force) {
    throw new Error(`Draft already exists: ${relative(repoRoot, filePath)}. Re-run with --force to overwrite.`)
  }
}

function renderList(items, fallback = '- 待补充') {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : fallback
}

function renderDraft(payload, sourcePath) {
  const slug = slugFromDate(payload.date)
  const sourceRelativePath = relative(repoRoot, sourcePath).replace(/\\/gu, '/')
  const sourceRows = payload.items
    .map(
      (item, index) =>
        `| ${index + 1} | [${markdownEscape(item.title)}](${item.url}) | ${markdownEscape(item.source)} | ${markdownEscape(item.publishedAt)} | ${markdownEscape(item.summary)} |`,
    )
    .join('\n')
  const verifyItems = payload.items.flatMap((item) =>
    item.toVerify.length > 0
      ? item.toVerify.map((note) => `${item.title}: ${note}`)
      : [`${item.title}: 发布前复核来源日期、原文语境和是否有后续更正。`],
  )

  return `---
title: "${yamlEscape(payload.title)}"
slug: "${slug}"
column: "ai-daily"
tag: "AI 日报"
status: "draft"
date: "${payload.date}"
readTime: "${DEFAULT_READ_TIME}"
modelStrategy: "Codex-only scaffold/review; model channel: none"
sourceFile: "${yamlEscape(sourceRelativePath)}"
---

# ${payload.title}

## Evidence Pack

- target column: AI 日报 / AI Daily
- intended reader: 关注 AI 模型、工具、开发平台和工程实践变化的技术访客
- writing mode: Codex-only scaffold/review
- model channel: none
- source file: \`${sourceRelativePath}\`
- source count: ${payload.items.length}
- publication state: draft/manual-review

## Safe Public Facts

| # | source | publisher | publishedAt | summary |
|---:|---|---|---|---|
${sourceRows}

## Uncertain Or Stale Facts

${renderList(verifyItems)}

## Forbidden / Private Details

- 不写入模型中转站地址、API key、token、数据库 URL、后台账号或私有部署链接。
- 不声称“已自动发布”“每日自动运行”或“事实已经最终确认”。
- 不复制来源长段原文；摘要必须保持转述。
- 不使用没有来源支撑的“最新、首个、最强、颠覆”等夸张判断。

## Draft Brief

- column fit: 高频 AI 动态观察，适合进入 AI 日报栏目。
- public angle: 用少量来源解释今天值得关注的技术信号，而不是堆新闻标题。
- review status: 需要人工核查来源、日期、摘要和影响判断后才能公开。
${payload.editorNote ? `- editor note: ${payload.editorNote}\n` : ''}
## Article Outline

- 今日摘要 / Daily Brief
- 来源速览 / Source Cards
- 影响判断 / Why It Matters
- 待核查事项 / To Verify
- 发布建议 / Publish Gate

## Review Gates

- [ ] 每条事实都能追溯到上方来源。
- [ ] 摘要是转述，不包含大段复制。
- [ ] 没有私有链接、密钥、账号、后台路径或未公开部署细节。
- [ ] 影响判断没有夸大来源原文。
- [ ] 发布前运行 \`npm.cmd run blog:check\`、\`npm.cmd run lint\` 和 \`npm.cmd run build\`。

## Promotion Checklist

- [ ] 人工核查所有来源链接。
- [ ] 如需模型润色，先通过 \`npm.cmd run blog:model -- status --all --format markdown\` 做 masked/offline 检查。
- [ ] 如需真实模型生成或润色，必须显式批准一次具体内容任务，不做中转站测活。
- [ ] 通过审核后再更新公开博客数据和 sitemap。

## Draft Body

### 今日摘要 / Daily Brief

今天的信号集中在 ${payload.items.map((item) => item.tags[0] || item.source).join('、')}。这些来源还没有经过最终发布审核，当前稿件只作为 AI 日报栏目样例和人工 review 草稿。

### 来源速览 / Source Cards

${payload.items
  .map(
    (item, index) => `#### ${index + 1}. ${item.title}

- 来源：${item.source}
- 链接：${item.url}
- 发布日期：${item.publishedAt}
- 摘要：${item.summary}
- 影响判断：${item.impact}
- 待核查：${item.toVerify.length > 0 ? item.toVerify.join('；') : '发布前复核来源日期、原文语境和后续更正。'}`,
  )
  .join('\n\n')}

### 影响判断 / Why It Matters

${payload.items.map((item) => `- ${item.impact}`).join('\n')}

### 待核查事项 / To Verify

${renderList(verifyItems)}

### 发布建议 / Publish Gate

当前稿件应保持 \`draft/manual-review\`。只有当来源、摘要、影响判断和版权摘要边界都通过人工 review 后，才可以进入公开博客发布流程。
`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const sourcePath = resolveRepoPath(args.source)
  const payload = loadSourcePayload(JSON.parse(await readFile(sourcePath, 'utf8')))
  const outPath = args.out ? resolveRepoPath(args.out) : defaultOutPath(payload.date)

  await assertWritable(outPath, args.force)
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, renderDraft(payload, sourcePath))
  console.log(`AI daily draft generated: ${relative(repoRoot, outPath).replace(/\\/gu, '/')}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
