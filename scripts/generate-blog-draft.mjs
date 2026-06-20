import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const planPath = resolve(repoRoot, 'scripts/blog-rewrite-plan.json')
const draftsDir = resolve(repoRoot, 'content-drafts')
const envPath = resolve(repoRoot, '.env.local')

const forbiddenTerms = ['面试', '答辩', '简历', '学习打卡', '内部解释', '不再铺满', '求职', '私下', '本地知识库']

function loadLocalEnv() {
  if (!existsSync(envPath)) return
  const raw = existsSync(envPath) ? readFile(envPath, 'utf8') : null
  return raw.then((text) => {
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!match) continue
      const [, key, value] = match
      if (process.env[key]) continue
      process.env[key] = value.replace(/^['"]|['"]$/g, '')
    }
  })
}

function parseArgs(argv) {
  const args = { list: false, force: false, limit: 1, slug: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--list') args.list = true
    if (item === '--force') args.force = true
    if (item === '--slug') args.slug = argv[index + 1] ?? ''
    if (item === '--limit') args.limit = Number(argv[index + 1] ?? '1')
  }
  return args
}

async function readPlan() {
  return JSON.parse(await readFile(planPath, 'utf8'))
}

function formatTopicList(plan) {
  return plan.map((topic) => `${String(topic.order).padStart(2, '0')}. ${topic.slug} - ${topic.title}`).join('\n')
}

function buildPrompt(topic) {
  return [
    '请把下面的知识点写成一篇公开发布的中文技术科普博客。',
    '',
    `标题：${topic.title}`,
    `摘要：${topic.summary}`,
    `系列：${topic.series}`,
    `目标读者：${topic.targetReader}`,
    `核心知识点：${topic.knowledgePoints.join('、')}`,
    `项目例子：${topic.projectExamples.join('、')}`,
    `公开角度：${topic.publicAngle}`,
    '',
    '硬性要求：',
    '1. 不要写成问答列表，不要写成学习记录，不要出现私密准备语境。',
    '2. 不要出现这些词：面试、答辩、简历、学习打卡、内部解释、不再铺满、求职、私下、本地知识库。',
    '3. 文章要像正式技术博客，语气清晰、克制、科普、有工程落地感。',
    '4. 需要包含这些二级标题：摘要、为什么这个问题重要、核心概念、工作流程、工程取舍、项目例子、常见误区、复盘结论。',
    '5. 项目例子只能使用可公开表达的项目语境，避免个人求职或内部准备叙述。',
    '6. 输出 Markdown 正文，不要输出 frontmatter，不要解释你如何写作。',
  ].join('\n')
}

async function requestDraft(topic) {
  const baseUrl = (process.env.GEMINI_BASE_URL || 'http://localhost:8317').replace(/\/$/, '')
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || 'gemini'
  const temperature = Number(process.env.GEMINI_TEMPERATURE || '0.65')

  if (!apiKey) {
    throw new Error('缺少 GEMINI_API_KEY。请复制 .env.example 为 .env.local，并填写本地 API key。')
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
          content: '你是公开技术博客作者，擅长把 AI 应用、RAG、Agent 和全栈工程知识写成清晰、可信、可发布的中文科普文章。',
        },
        { role: 'user', content: buildPrompt(topic) },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini API 请求失败：${response.status} ${body.slice(0, 500)}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Gemini API 没有返回 choices[0].message.content。')
  }
  return content.trim()
}

function validateDraft(topic, content) {
  const problems = []
  for (const term of forbiddenTerms) {
    if (content.includes(term)) problems.push(`包含公开禁用词：${term}`)
  }
  for (const heading of ['## 摘要', '## 为什么这个问题重要', '## 核心概念', '## 工作流程', '## 工程取舍', '## 项目例子', '## 常见误区', '## 复盘结论']) {
    if (!content.includes(heading)) problems.push(`缺少结构标题：${heading}`)
  }
  if (content.length < 1200) problems.push('正文偏短，可能还是浅层问答。')
  if (/Day\s*\d+|Day[一二三四五六七八九十]+/i.test(content)) problems.push('包含 Day 编号语境。')
  if (content.includes(topic.currentSlug)) problems.push('不应暴露旧 slug。')
  return problems
}

async function writeDraft(topic, content, force) {
  await mkdir(draftsDir, { recursive: true })
  const fileName = `${String(topic.order).padStart(2, '0')}-${topic.slug}.md`
  const outputPath = resolve(draftsDir, fileName)
  if (existsSync(outputPath) && !force) {
    console.log(`跳过已存在草稿：${fileName}。使用 --force 可覆盖。`)
    return
  }

  const frontmatter = [
    '---',
    `slug: ${JSON.stringify(topic.slug)}`,
    `title: ${JSON.stringify(topic.title)}`,
    `series: ${JSON.stringify(topic.series)}`,
    `tag: ${JSON.stringify(topic.tag)}`,
    `sourceCurrentSlug: ${JSON.stringify(topic.currentSlug)}`,
    'status: "draft"',
    'generatedBy: "gemini"',
    `generatedAt: ${JSON.stringify(new Date().toISOString())}`,
    '---',
    '',
  ].join('\n')

  const problems = validateDraft(topic, content)
  await writeFile(outputPath, `${frontmatter}${content}\n`, 'utf8')
  console.log(`已生成草稿：${fileName}`)
  if (problems.length > 0) {
    console.log(`需要复核：${problems.join('；')}`)
  }
}

async function main() {
  await loadLocalEnv()
  const args = parseArgs(process.argv.slice(2))
  const plan = await readPlan()

  if (args.list) {
    console.log(formatTopicList(plan))
    return
  }

  let selected = args.slug ? plan.filter((topic) => topic.slug === args.slug) : plan.slice(0, args.limit)
  if (selected.length === 0) {
    throw new Error(`没有找到匹配主题：${args.slug}`)
  }

  for (const topic of selected) {
    console.log(`开始生成：${topic.slug}`)
    const content = await requestDraft(topic)
    await writeDraft(topic, content, args.force)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
