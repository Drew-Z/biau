import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildChatCompletionsUrl, loadLocalEnv, readDraftModelConfig, redactSensitiveText } from './blog-model-config.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const planPath = resolve(repoRoot, 'scripts/blog-rewrite-plan.json')
const draftsDir = resolve(repoRoot, 'content-drafts')

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
  const args = { list: false, force: false, generate: false, limit: 1, slug: '', profile: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--list') args.list = true
    if (item === '--force') args.force = true
    if (item === '--generate') args.generate = true
    if (item === '--scaffold') args.generate = false
    if (item === '--slug') {
      args.slug = argv[index + 1] ?? ''
      index += 1
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

async function requestDraft(topic, profile) {
  await loadLocalEnv()
  const config = readDraftModelConfig(profile)
  const { apiKey, model, provider, temperature } = config

  if (!apiKey) {
    throw new Error('缺少 BLOG_DRAFT_<PROFILE>_API_KEY、BLOG_DRAFT_API_KEY 或 GEMINI_API_KEY。默认请不加 --generate 先生成 evidence-first scaffold。')
  }

  console.log(`使用模型渠道：${config.profile} -> ${provider} / ${model}`)

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
          content: '你是公开技术博客作者，擅长把 AI 应用、项目复盘、资源推荐和构建手记写成清晰、可信、可审稿的中文文章。',
        },
        { role: 'user', content: buildPrompt(topic) },
      ],
    }),
  })

  if (!response.ok) {
    const body = redactSensitiveText((await response.text()).slice(0, 500))
    throw new Error(`模型 API 请求失败：${response.status} ${body}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('模型 API 没有返回 choices[0].message.content。')
  }
  return { content: content.trim(), config }
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
  const fileName = `${String(topic.order).padStart(2, '0')}-${topic.slug}.md`
  const outputPath = resolve(draftsDir, fileName)
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

async function main() {
  const args = parseArgs(process.argv.slice(2))
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
    if (args.generate) {
      const { content, config } = await requestDraft(topic, args.profile)
      await writeDraft(topic, content, args.force, `model-assisted-draft:${config.profile}:${config.provider}:${config.model}`)
    } else {
      await writeDraft(topic, buildScaffold(topic), args.force, 'codex-draft-scaffold')
    }
  }
}

main().catch((error) => {
  console.error(redactSensitiveText(error.message))
  process.exitCode = 1
})
