import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildChatCompletionsUrl,
  loadLocalEnv,
  readDraftModelChannels,
  redactSensitiveText,
  validateDraftModelChannel,
} from './blog-model-config.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const planPath = resolve(repoRoot, 'scripts/blog-rewrite-plan.json')
const draftsDir = resolve(repoRoot, 'content-drafts')
const polishCheckpointsDir = resolve(draftsDir, '.checkpoints')
const draftBodyHeading = '## Draft Body'
const defaultModelRequestTimeoutMs = 300000

const blogColumnOrder = ['knowledge', 'project-notes', 'resources', 'ai-daily', 'build-log']

const columnMeta = {
  knowledge: {
    titleZh: '知识积累',
    titleEn: 'Knowledge Notes',
    outline: [
      'Problem boundary',
      'Core mechanism',
      'Engineering tradeoffs',
      'Example from this site or a sanitized project',
      'Common failure modes',
      'Practical checklist',
    ],
    note: '适合长期有效的技术总结、架构理解、工程治理、AI 应用方法。',
  },
  'project-notes': {
    titleZh: '项目总结',
    titleEn: 'Project Notes',
    outline: [
      'Project stage and goal',
      'What changed or what was built',
      'Architecture or workflow choice',
      'Bugs, constraints, or tradeoffs',
      'What the project still lacks',
      'Next iteration direction',
    ],
    note: '不要复制项目详情页；重点写阶段复盘、取舍、缺口和下一轮迭代。',
  },
  resources: {
    titleZh: '资源分享',
    titleEn: 'Resource Picks',
    outline: [
      'What it is',
      'Why I recommend it',
      'Best-fit scenarios',
      'How I would use it',
      'Limitations or caveats',
      'Related alternatives',
    ],
    note: '必须有个人判断和使用语境，不发布无筛选链接堆。',
  },
  'ai-daily': {
    titleZh: 'AI 日报',
    titleEn: 'AI Daily',
    outline: [
      "Today's highlights",
      'What changed',
      'Why it matters',
      'What to try',
      'Sources to revisit',
      'Open questions',
    ],
    note: '每条新闻式判断都需要来源；来源弱时保持草稿。',
  },
  'build-log': {
    titleZh: '构建手记',
    titleEn: 'Build Log',
    outline: [
      'Starting point',
      'Decision made',
      'Implementation path',
      'Verification',
      'What became easier',
      'Follow-up work',
    ],
    note: '适合记录站点、助手、内容系统和 Trellis 工作流演进。',
  },
}

const forbiddenTerms = ['面试', '答辩', '简历', '学习打卡', '内部解释', '不再铺满', '求职', '私下', '本地知识库']
const defaultModelStrategy = 'Codex evidence pack + Codex scaffold + strong profile draft + review profile polish + Codex final fact/safety review'

function parseArgs(argv) {
  const args = {
    list: false,
    force: false,
    generate: false,
    polish: false,
    polishFrom: '',
    limit: 1,
    slug: '',
    profile: '',
  }
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--list') args.list = true
    if (item === '--force') args.force = true
    if (item === '--generate') args.generate = true
    if (item === '--scaffold') args.generate = false
    if (item === '--polish') args.polish = true
    if (item === '--slug') {
      args.slug = argv[index + 1] ?? ''
      index += 1
    }
    if (item === '--polish-from' || item === '--from-draft') {
      args.polish = true
      args.polishFrom = argv[index + 1] ?? ''
      index += 1
    }
    if (item.startsWith('--polish-from=')) {
      args.polish = true
      args.polishFrom = item.slice('--polish-from='.length)
    }
    if (item.startsWith('--from-draft=')) {
      args.polish = true
      args.polishFrom = item.slice('--from-draft='.length)
    }
    if (item === '--profile') {
      args.profile = argv[index + 1] ?? ''
      index += 1
    }
    if (item.startsWith('--profile=')) {
      args.profile = item.slice('--profile='.length)
    }
    if (item === '--limit') {
      args.limit = Number(argv[index + 1] ?? '1')
      index += 1
    }
  }
  return args
}

async function readPlan() {
  return JSON.parse(await readFile(planPath, 'utf8'))
}

function normalizeColumn(value) {
  return blogColumnOrder.includes(value) ? value : 'knowledge'
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function normalizeTopic(topic, index) {
  const column = normalizeColumn(topic.column)
  return {
    order: Number.isFinite(topic.order) ? topic.order : index + 1,
    slug: String(topic.slug ?? '').trim(),
    currentSlug: String(topic.currentSlug ?? '').trim(),
    title: String(topic.title ?? '').trim(),
    column,
    tag: String(topic.tag ?? columnMeta[column].titleZh).trim(),
    series: String(topic.series ?? columnMeta[column].titleZh).trim(),
    summary: String(topic.summary ?? '').trim(),
    targetReader: String(topic.targetReader ?? '公开站点访客、项目协作者和技术读者').trim(),
    knowledgePoints: normalizeList(topic.knowledgePoints),
    projectExamples: normalizeList(topic.projectExamples),
    publicAngle: String(topic.publicAngle ?? '').trim(),
    evidenceSources: normalizeList(topic.evidenceSources),
    safeFacts: normalizeList(topic.safeFacts),
    uncertainFacts: normalizeList(topic.uncertainFacts),
    forbiddenDetails: normalizeList(topic.forbiddenDetails),
    modelStrategy: String(topic.modelStrategy ?? defaultModelStrategy).trim(),
    priority: topic.priority ?? topic.order ?? index + 1,
  }
}

function formatTopicList(plan) {
  return plan
    .map((topic, index) => normalizeTopic(topic, index))
    .map((topic) => {
      const column = columnMeta[topic.column]
      return [
        `${String(topic.order).padStart(2, '0')}. ${topic.slug}`,
        `column=${topic.column} (${column.titleZh} / ${column.titleEn})`,
        `priority=${topic.priority}`,
        `title=${topic.title}`,
      ].join(' | ')
    })
    .join('\n')
}

function yamlString(value) {
  return JSON.stringify(value)
}

function markdownList(items, fallback) {
  const values = items.length > 0 ? items : [fallback]
  return values.map((item) => `- ${item}`).join('\n')
}

function buildPrompt(topic) {
  const column = columnMeta[topic.column]
  return [
    `请把下面的材料写成一篇公开发布的中文技术博客草稿，栏目为 ${column.titleZh} / ${column.titleEn}。`,
    '',
    `标题：${topic.title}`,
    `摘要：${topic.summary}`,
    `系列：${topic.series}`,
    `目标读者：${topic.targetReader}`,
    `核心知识点：${topic.knowledgePoints.join('、') || '待补充'}`,
    `项目例子：${topic.projectExamples.join('、') || '待补充'}`,
    `公开角度：${topic.publicAngle || '待补充'}`,
    '',
    '证据来源：',
    markdownList(topic.evidenceSources, '待 Codex 或作者补充真实代码、文档、任务、截图或外部来源。'),
    '',
    '可公开事实：',
    markdownList(topic.safeFacts, '待补充。'),
    '',
    '不确定或可能过时的事实：',
    markdownList(topic.uncertainFacts, '待核验。'),
    '',
    '禁止写入的细节：',
    markdownList(topic.forbiddenDetails, '真实 IP、账号、密钥、私有 URL、客户名称、敏感指标、本地路径。'),
    '',
    '推荐文章结构：',
    ...column.outline.map((item, index) => `${index + 1}. ${item}`),
    '',
    '硬性要求：',
    '1. 不要写成问答列表、学习记录、简历材料或内部说明。',
    `2. 不要出现这些词：${forbiddenTerms.join('、')}。`,
    '3. 不要编造部署状态、客户、指标、截图、私有系统地址或任何证据包里没有的事实。',
    '4. 项目相关内容不能只依赖 README，必须提醒作者回到代码、数据、测试、部署脚本、截图或 Trellis 任务核验。',
    '5. 输出 Markdown 正文，不要输出 frontmatter，不要解释你如何写作。',
  ].join('\n')
}

function stripFrontmatter(content) {
  return String(content ?? '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
}

function extractDraftBody(draftText) {
  const match = String(draftText ?? '').match(/(?:^|\r?\n)## Draft Body\s*\r?\n([\s\S]*)$/)
  if (!match) throw new Error('待润色草稿缺少 ## Draft Body，不能安全区分证据区和正文区。')
  return match[1].trim()
}

function extractMarkdownSection(markdown, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(markdown ?? '').match(new RegExp(`(?:^|\\r?\\n)## ${escapedHeading}\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`))
  return match?.[1]?.trim() ?? ''
}

function truncateSectionText(text, maxLength = 2600) {
  const normalized = String(text ?? '').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function buildPolishEvidenceSummary(draftText) {
  const sections = [
    ['Safe Public Facts', extractMarkdownSection(draftText, 'Safe Public Facts')],
    ['Uncertain Or Stale Facts', extractMarkdownSection(draftText, 'Uncertain Or Stale Facts')],
    ['Forbidden / Private Details', extractMarkdownSection(draftText, 'Forbidden / Private Details')],
    ['Codex Compare / Fuse Notes', extractMarkdownSection(draftText, 'Codex Compare / Fuse Notes')],
  ].filter(([, body]) => body)

  return sections
    .map(([heading, body]) => `### ${heading}\n${truncateSectionText(body)}`)
    .join('\n\n')
}

function readPolishMode() {
  const mode = String(process.env.BLOG_DRAFT_POLISH_MODE ?? '').trim().toLowerCase()
  return mode === 'full' ? 'full' : 'sections'
}

function splitPolishSections(body) {
  const lines = String(body ?? '').trim().split(/\r?\n/)
  const sections = []
  let current = []

  for (const line of lines) {
    if (/^#{2,4}\s+\S/.test(line) && current.some((item) => item.trim())) {
      sections.push(createPolishSection(current))
      current = []
    }
    current.push(line)
  }

  if (current.some((item) => item.trim())) sections.push(createPolishSection(current))
  return sections.filter((section) => section.text.trim())
}

function createPolishSection(lines) {
  const text = lines.join('\n').trim()
  const heading = lines.find((line) => /^#{2,4}\s+\S/.test(line))?.replace(/^#{2,4}\s+/, '').trim()
  return {
    title: heading || '正文开头',
    text,
  }
}

function buildPolishSectionPrompt(topic, draftText, section, index, total, sectionTitles) {
  const column = columnMeta[topic.column]
  const evidenceSummary = buildPolishEvidenceSummary(stripFrontmatter(draftText))
  return [
    '请润色公开中文技术博客的一段正文。',
    '',
    `标题：${topic.title}`,
    `栏目：${column.titleZh} / ${column.titleEn}`,
    `目标读者：${topic.targetReader}`,
    `当前段落：${index + 1} / ${total} - ${section.title}`,
    '',
    '全文段落顺序：',
    ...sectionTitles.map((title, titleIndex) => `${titleIndex + 1}. ${title}`),
    '',
    '证据、边界和审稿要求摘要：',
    evidenceSummary || '证据摘要缺失：不得新增正文之外的项目事实、部署状态、指标、私有基础设施或敏感信息。',
    '',
    '待润色段落：',
    section.text,
    '',
    '润色要求：',
    '1. 只输出这一段润色后的 Markdown，不要输出全文、frontmatter、Evidence Pack、Review Gates 或解释说明。',
    '2. 保留本段标题层级和标题含义；不要新增证据区没有支持的项目事实、部署状态、指标、截图或私有基础设施细节。',
    '3. 可以优化过渡、句式、信息密度和可读性，但不要改变“已实现 / 路线图 / 待验证”的事实边界。',
    '4. 不要输出 API key、token、数据库 URL、私有 relay URL、账号、密码、本地路径或云平台私有配置。',
  ].join('\n')
}

function buildPolishPrompt(topic, draftText) {
  const column = columnMeta[topic.column]
  const evidenceSummary = buildPolishEvidenceSummary(stripFrontmatter(draftText))
  const currentBody = extractDraftBody(draftText)

  return [
    '请润色下面这篇公开中文技术博客草稿的正文。',
    '',
    `标题：${topic.title}`,
    `栏目：${column.titleZh} / ${column.titleEn}`,
    `目标读者：${topic.targetReader}`,
    '',
    '证据、边界和审稿要求：',
    evidenceSummary || '证据摘要缺失：不得新增正文之外的项目事实、部署状态、指标、私有基础设施或敏感信息。',
    '',
    '当前正文：',
    currentBody,
    '',
    '润色要求：',
    '1. 只输出润色后的 Markdown 正文，不要输出 frontmatter、Evidence Pack、Review Gates 或解释说明。',
    '2. 不要新增证据区没有支持的项目事实、部署状态、客户、指标、截图或私有基础设施细节。',
    '3. 保留“待作者补充/待核验”这类需要人工确认的提示，不要把它们改写成确定事实。',
    '4. 降低模板感和 AI 味，改进段落衔接、标题密度、技术表达和读者可读性。',
    '5. 如果发现正文里有无法证实的具体实现细节，请改成谨慎表达或作者待补充提示。',
  ].join('\n')
}

async function requestModelContent({ profile, prompt, systemContent }) {
  await loadLocalEnv()
  const channelSet = readDraftModelChannels(profile)
  const attempts = []
  const candidateChannels = []

  for (const channel of channelSet.channels) {
    const issues = validateDraftModelChannel(channel)
    if (issues.length > 0) {
      attempts.push({
        channel,
        kind: 'missing_required_field',
        detail: issues.map((issue) => issue.code).join(', '),
      })
      continue
    }
    candidateChannels.push(channel)
  }

  if (candidateChannels.length === 0) {
    throw new Error(`没有可用模型渠道。${formatModelAttempts(attempts)} 默认请不加 --generate 先生成 evidence-first scaffold，或运行 blog:model setup 配置当前 profile。`)
  }

  for (const channel of candidateChannels) {
    const attempt = await requestModelChannel(channel, { prompt, systemContent })
    if (attempt.content) return { content: attempt.content, config: channel, attempts }
    attempts.push(attempt)
  }

  throw new Error(`所有模型渠道都未返回可用内容。${formatModelAttempts(attempts)}`)
}

async function requestModelChannel(config, { prompt, systemContent }) {
  const { apiKey, model, provider, temperature } = config
  console.log(`使用模型渠道：${config.profile} ${config.label} -> ${provider} / ${model}`)
  const timeoutMs = readModelRequestTimeoutMs()
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), timeoutMs)

  try {
    const response = await fetch(buildChatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: abort.signal,
    })

    if (!response.ok) {
      const body = redactSensitiveText((await response.text()).slice(0, 300))
      return {
        channel: config,
        kind: `http_status:${response.status}`,
        detail: body,
      }
    }

    const json = await response.json().catch(() => null)
    if (!json) {
      return {
        channel: config,
        kind: 'invalid_json',
        detail: 'response body is not valid JSON',
      }
    }
    const content = json?.choices?.[0]?.message?.content
    if (!content) {
      return {
        channel: config,
        kind: 'empty_response',
        detail: 'missing choices[0].message.content',
      }
    }
    return { channel: config, content: content.trim() }
  } catch (error) {
    const kind = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network_error'
    const detail =
      kind === 'timeout'
        ? `request exceeded ${timeoutMs}ms`
        : redactSensitiveText(error instanceof Error ? error.message : String(error))
    return {
      channel: config,
      kind,
      detail,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function readModelRequestTimeoutMs() {
  const raw = process.env.BLOG_DRAFT_REQUEST_TIMEOUT_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultModelRequestTimeoutMs
  return Math.max(5000, Math.min(600000, Math.trunc(parsed)))
}

function formatModelAttempts(attempts) {
  const visible = attempts
    .map((attempt) => {
      const channel = attempt.channel
      const provider = channel?.provider || 'missing-provider'
      const model = channel?.model || 'missing-model'
      const label = channel ? `${channel.profile}/${channel.label}` : 'unknown-channel'
      const detail = attempt.detail ? ` (${redactSensitiveText(attempt.detail)})` : ''
      return `${label} ${provider}/${model}: ${attempt.kind}${detail}`
    })
    .join('；')
  return visible ? `尝试记录：${visible}` : ''
}

async function requestDraft(topic, profile) {
  return requestModelContent({
    profile,
    prompt: buildPrompt(topic),
    systemContent: '你是公开技术博客作者，擅长把 AI 应用、项目复盘、资源推荐和构建手记写成清晰、可信、可审稿的中文文章。',
  })
}

async function requestPolish(topic, draftText, profile) {
  if (readPolishMode() === 'sections') {
    return requestSectionedPolish(topic, draftText, profile)
  }
  return requestModelContent({
    profile: profile || 'review',
    prompt: buildPolishPrompt(topic, draftText),
    systemContent: '你是中文技术博客审稿与润色编辑，必须保持证据边界，不编造事实，只优化结构、表达、密度和可读性。',
  })
}

async function requestSectionedPolish(topic, draftText, profile) {
  const currentBody = extractDraftBody(draftText)
  const sections = splitPolishSections(currentBody)
  if (sections.length < 2) {
    return requestModelContent({
      profile: profile || 'review',
      prompt: buildPolishPrompt(topic, draftText),
      systemContent: '你是中文技术博客审稿与润色编辑，必须保持证据边界，不编造事实，只优化结构、表达、密度和可读性。',
    })
  }

  const sectionTitles = sections.map((section) => section.title)
  const polishedSections = []
  const issues = []
  let firstConfig = null

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index]
    console.log(`润色段落 ${index + 1}/${sections.length}：${section.title}`)
    try {
      const result = await requestModelContent({
        profile: profile || 'review',
        prompt: buildPolishSectionPrompt(topic, draftText, section, index, sections.length, sectionTitles),
        systemContent: '你是中文技术博客分段审稿编辑。只润色当前段落，保持证据边界，不新增事实，不输出解释。',
      })
      firstConfig = firstConfig ?? result.config
      polishedSections.push(stripGeneratedTitle(result.content))
    } catch (error) {
      const message = redactSensitiveText(error instanceof Error ? error.message : String(error))
      issues.push(`段落 ${index + 1}「${section.title}」润色失败，已保留原文：${message}`)
      polishedSections.push(section.text)
    }

    await writePolishCheckpoint(topic, polishedSections.concat(sections.slice(index + 1).map((section) => section.text)).join('\n\n'), issues)
  }

  if (!firstConfig) {
    throw new Error(`分段润色没有任何段落成功。${issues.join('；')}`)
  }

  if (issues.length > 0) {
    console.log(`分段润色存在 ${issues.length} 个问题：${issues.join('；')}`)
  }

  return {
    content: polishedSections.join('\n\n'),
    config: firstConfig,
    issues,
  }
}

function buildScaffold(topic) {
  const column = columnMeta[topic.column]
  const projectEvidenceReminder = topic.column === 'project-notes'
    ? '\n- [ ] Read code, data modules, tests, deployment scripts, screenshots, and Trellis tasks. Do not rely only on README files.'
    : ''

  return [
    `# ${topic.title}`,
    '',
    '## Evidence Pack',
    markdownList(topic.evidenceSources, 'TODO: add source paths, URLs, screenshots, task notes, test output, or external references.'),
    '',
    '## Safe Public Facts',
    markdownList(topic.safeFacts, 'TODO: add exact facts that can be stated publicly.'),
    '',
    '## Uncertain Or Stale Facts',
    markdownList(topic.uncertainFacts, 'TODO: add claims that need verification before drafting.'),
    '',
    '## Forbidden / Private Details',
    markdownList(topic.forbiddenDetails, 'Do not include real IPs, accounts, keys, database URLs, private dashboards, local secret paths, customer names, or sensitive metrics.'),
    '',
    '## Draft Brief',
    `- Column: ${column.titleZh} / ${column.titleEn}`,
    `- Column note: ${column.note}`,
    `- Target reader: ${topic.targetReader}`,
    `- Summary: ${topic.summary || 'TODO: write the one-paragraph value of this post.'}`,
    `- Public angle: ${topic.publicAngle || 'TODO: define why this should be public and what reader value it provides.'}`,
    `- Knowledge points: ${topic.knowledgePoints.join('、') || 'TODO'}`,
    `- Project examples: ${topic.projectExamples.join('、') || 'TODO'}`,
    '',
    '## Article Outline',
    ...column.outline.map((item) => `- ${item}`),
    '',
    '## Model Strategy',
    `- ${topic.modelStrategy}`,
    '- Default important-post flow: Codex evidence/scaffold, strong profile draft, review profile polish, then Codex final fact/safety review.',
    '- Single-profile generation is allowed for small or low-risk drafts when the evidence pack is complete.',
    '',
    '## Review Gates',
    '- [ ] Every project claim is backed by the evidence pack.',
    '- [ ] No private or sensitive information is included.',
    '- [ ] The draft does not duplicate stable project-detail-page facts.',
    '- [ ] The selected column matches the actual purpose of the article.',
    '- [ ] Hidden drafts remain hidden until explicitly curated.',
    projectEvidenceReminder,
    '',
    '## Promotion Checklist',
    '- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.',
    '- [ ] Add summary metadata to `src/data/blog.ts`.',
    '- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.',
    '- [ ] Add `blogCuration` only when ready for public visibility.',
    '- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
}

function stripGeneratedTitle(content) {
  const lines = String(content ?? '').trim().split(/\r?\n/)
  if (lines[0]?.trim().startsWith('# ')) return lines.slice(1).join('\n').trim()
  return lines.join('\n').trim()
}

function buildGeneratedDraft(topic, generatedContent) {
  return [
    buildScaffold(topic),
    '',
    draftBodyHeading,
    '',
    stripGeneratedTitle(generatedContent),
  ].join('\n')
}

function draftFileName(topic) {
  return `${String(topic.order).padStart(2, '0')}-${topic.slug}.md`
}

function draftPathForTopic(topic) {
  return resolve(draftsDir, draftFileName(topic))
}

function setFrontmatterField(frontmatter, key, value) {
  const line = `${key}: ${yamlString(value)}`
  const fieldPattern = new RegExp(`^${key}:.*$`, 'm')
  if (fieldPattern.test(frontmatter)) return frontmatter.replace(fieldPattern, () => line)
  return `${frontmatter.replace(/\s*$/, '')}\n${line}`
}

function updateDraftFrontmatter(content, updates) {
  const match = String(content ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) throw new Error('待润色草稿缺少 frontmatter，不能安全更新生成元数据。')
  let frontmatter = match[1]
  for (const [key, value] of Object.entries(updates)) {
    frontmatter = setFrontmatterField(frontmatter, key, value)
  }
  const body = content.slice(match[0].length).trimStart()
  return `---\n${frontmatter.replace(/\s*$/, '')}\n---\n\n${body}`
}

function appendModelStrategyNote(content, note) {
  const line = `- ${note}`
  if (content.includes(line)) return content
  const reviewHeadingIndex = content.indexOf('\n## Review Gates')
  if (reviewHeadingIndex < 0) return content
  return `${content.slice(0, reviewHeadingIndex).replace(/\s*$/, '')}\n${line}\n\n${content.slice(reviewHeadingIndex + 1)}`
}

function modelChannelLabel(config) {
  return `${config.profile}/${config.label} (${config.provider} / ${config.model})`
}

function markPolishedDraftMetadata(content, config) {
  const channel = modelChannelLabel(config)
  return content
    .replace(
      /^- Writing mode: .*$/m,
      '- Writing mode: Model-assisted draft/rewrite (review polish pass).',
    )
    .replace(
      /^- Blog model channel: .*$/m,
      `- Blog model channel: ${channel}. This pass called \`blog:draft -- --polish-from ... --profile ${config.profile}\` and only rewrote \`## Draft Body\`.`,
    )
    .replace(
      /^- Baseline version: .*$/m,
      '- Baseline version: Codex-only scaffold/review; this file is a model-assisted polish pass over that baseline.',
    )
    .replace(
      /^- Selected model channel: .*$/m,
      `- Selected model channel: ${channel}.`,
    )
    .replace(
      /^- \[x\] No live blog model generation or polish happened\.$/m,
      [
        '- [x] Live model polish happened and is recorded in Model Strategy.',
        '- [ ] Codex final fact/safety review after polish is required before promotion.',
      ].join('\n'),
    )
    .replace(
      /^- \[ \] Human review should compare this baseline against a future model-polished version before final editorial lock\.$/m,
      '- [ ] Human review should compare this model-polished version against the baseline before final editorial lock.',
    )
}

function replaceDraftBodyContent(content, nextBody) {
  const pattern = /(^|\r?\n)## Draft Body\s*\r?\n[\s\S]*$/m
  if (!pattern.test(content)) throw new Error('待润色草稿缺少 ## Draft Body，不能安全写入润色正文。')
  return content.replace(pattern, (_match, prefix) => `${prefix}${draftBodyHeading}\n\n${stripGeneratedTitle(nextBody)}\n`)
}

function validateDraft(topic, content) {
  const problems = []
  for (const term of forbiddenTerms) {
    if (content.includes(term)) problems.push(`包含公开禁用词：${term}`)
  }
  for (const heading of [
    '## Evidence Pack',
    '## Safe Public Facts',
    '## Uncertain Or Stale Facts',
    '## Forbidden / Private Details',
    '## Draft Brief',
    '## Article Outline',
    '## Review Gates',
    '## Promotion Checklist',
  ]) {
    if (!content.includes(heading)) problems.push(`缺少结构标题：${heading}`)
  }
  if (/Day\s*\d+|Day[一二三四五六七八九十]+/i.test(content)) problems.push('包含 Day 编号语境。')
  if (topic.currentSlug && content.includes(topic.currentSlug)) problems.push('不应暴露旧 slug。')
  return problems
}

async function writeDraft(topic, content, force, generatedBy) {
  await mkdir(draftsDir, { recursive: true })
  const fileName = draftFileName(topic)
  const outputPath = draftPathForTopic(topic)
  if (existsSync(outputPath) && !force) {
    console.log(`跳过已存在草稿：${fileName}。使用 --force 可覆盖。`)
    return
  }

  const frontmatter = [
    '---',
    `slug: ${yamlString(topic.slug)}`,
    `title: ${yamlString(topic.title)}`,
    `column: ${yamlString(topic.column)}`,
    `series: ${yamlString(topic.series)}`,
    `tag: ${yamlString(topic.tag)}`,
    topic.currentSlug ? `sourceCurrentSlug: ${yamlString(topic.currentSlug)}` : '',
    'status: "draft"',
    `generatedBy: ${yamlString(generatedBy)}`,
    `generatedAt: ${yamlString(new Date().toISOString())}`,
    `modelStrategy: ${yamlString(topic.modelStrategy)}`,
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n')

  const problems = validateDraft(topic, content)
  await writeFile(outputPath, `${frontmatter}\n\n${content}\n`, 'utf8')
  console.log(`已生成草稿：${fileName}`)
  if (problems.length > 0) {
    console.log(`需要复核：${problems.join('；')}`)
  }
}

async function writePolishCheckpoint(topic, draftBody, issues) {
  await mkdir(polishCheckpointsDir, { recursive: true })
  const outputPath = resolve(polishCheckpointsDir, `${topic.slug}.polish-checkpoint.md`)
  const content = [
    `# ${topic.title} - polish checkpoint`,
    '',
    `- updatedAt: ${new Date().toISOString()}`,
    `- issueCount: ${issues.length}`,
    '',
    '## Issues',
    issues.length > 0 ? issues.map((issue) => `- ${issue}`).join('\n') : '- none',
    '',
    draftBodyHeading,
    '',
    draftBody,
  ].join('\n')
  await writeFile(outputPath, `${content.replace(/\s*$/, '')}\n`, 'utf8')
}

async function writePolishedDraft(topic, outputPath, existingDraft, polishedContent, config, issues = []) {
  const generatedBy = `model-assisted-polish:${config.profile}:${config.label}:${config.provider}:${config.model}`
  let content = updateDraftFrontmatter(existingDraft, {
    generatedBy,
    generatedAt: new Date().toISOString(),
    modelStrategy: `Model-assisted polish via ${modelChannelLabel(config)}; source evidence remains Codex-reviewed; Codex final fact/safety review required.`,
  })
  content = markPolishedDraftMetadata(content, config)
  content = appendModelStrategyNote(content, `Review/polish stage used the \`${config.profile}\` profile \`${config.label}\` channel (${config.provider} / ${config.model}).`)
  content = appendModelStrategyNote(content, 'Codex final fact/safety review is still required before promotion.')
  if (issues.length > 0) {
    content = appendModelStrategyNote(content, `Sectioned polish completed with ${issues.length} issue(s); failed sections kept the original prose and require Codex/human review.`)
  }
  content = replaceDraftBodyContent(content, polishedContent)

  const problems = validateDraft(topic, stripFrontmatter(content))
  await writeFile(outputPath, `${content.replace(/\s*$/, '')}\n`, 'utf8')
  console.log(`已润色草稿：${relative(repoRoot, outputPath).replace(/\\/g, '/')}`)
  if (problems.length > 0) {
    console.log(`需要复核：${problems.join('；')}`)
  }
}

function resolvePolishPath(topic, inputPath) {
  if (!inputPath) return draftPathForTopic(topic)
  return resolve(repoRoot, inputPath)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.generate && args.polish) {
    throw new Error('请在同一次命令中只选择 --generate 或 --polish-from，不要同时生成初稿和润色稿。')
  }

  const plan = await readPlan()

  if (args.list) {
    console.log(formatTopicList(plan))
    return
  }

  const normalizedPlan = plan.map(normalizeTopic)
  const selected = args.slug
    ? normalizedPlan.filter((topic) => topic.slug === args.slug)
    : normalizedPlan.slice(0, args.limit)

  if (selected.length === 0) {
    throw new Error(`没有找到匹配主题：${args.slug}`)
  }

  for (const topic of selected) {
    console.log(`开始生成：${topic.slug}`)
    if (args.polish) {
      const polishPath = resolvePolishPath(topic, args.polishFrom)
      if (!existsSync(polishPath)) throw new Error(`待润色草稿不存在：${relative(repoRoot, polishPath).replace(/\\/g, '/')}`)
      const existingDraft = await readFile(polishPath, 'utf8')
      const { content, config, issues = [] } = await requestPolish(topic, existingDraft, args.profile || 'review')
      await writePolishedDraft(topic, polishPath, existingDraft, content, config, issues)
    } else if (args.generate) {
      const { content, config } = await requestDraft(topic, args.profile)
      await writeDraft(topic, buildGeneratedDraft(topic, content), args.force, `model-assisted-draft:${config.profile}:${config.label}:${config.provider}:${config.model}`)
    } else {
      await writeDraft(topic, buildScaffold(topic), args.force, 'codex-draft-scaffold')
    }
  }
}

main().catch((error) => {
  console.error(redactSensitiveText(error.message))
  process.exitCode = 1
})
