import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const draftsDir = resolve(repoRoot, 'content-drafts')
const blogDataPath = resolve(repoRoot, 'src/data/blog.ts')
const blogPostsDir = resolve(repoRoot, 'src/data/blog-posts')
const forbiddenTerms = ['面试', '答辩', '简历', '学习打卡', '内部解释', '不再铺满', '求职', '私下', '本地知识库']
const requiredDraftHeadings = ['## 摘要', '## 为什么这个问题重要', '## 核心概念', '## 工作流程', '## 工程取舍', '## 项目例子', '## 常见误区', '## 复盘结论']
const evidenceDraftHeadings = [
  '## Evidence Pack',
  '## Safe Public Facts',
  '## Uncertain Or Stale Facts',
  '## Forbidden / Private Details',
  '## Draft Brief',
  '## Article Outline',
  '## Review Gates',
  '## Promotion Checklist',
]
const blogColumns = ['knowledge', 'project-notes', 'resources', 'ai-daily', 'build-log']

function checkText(label, text, checks) {
  const issues = []
  for (const term of forbiddenTerms) {
    if (text.includes(term)) issues.push(`${label} 包含公开禁用词：${term}`)
  }
  if (/Day\s*\d+|Day[一二三四五六七八九十]+/i.test(text)) {
    issues.push(`${label} 包含 Day 编号语境`)
  }
  for (const check of checks) {
    if (!text.includes(check)) issues.push(`${label} 缺少结构标题：${check}`)
  }
  return issues
}

async function checkDrafts() {
  if (!existsSync(draftsDir)) return []
  const files = (await readdir(draftsDir)).filter((file) => file.endsWith('.md') && file !== 'README.md')
  const issues = []
  for (const file of files) {
    const text = await readFile(resolve(draftsDir, file), 'utf8')
    if (!/^---[\s\S]*status:\s*["']?draft["']?/m.test(text)) continue
    const isEvidenceDraft = evidenceDraftHeadings.some((heading) => text.includes(heading))
    const label = `content-drafts/${file}`
    issues.push(...checkText(label, text, isEvidenceDraft ? evidenceDraftHeadings : requiredDraftHeadings))
    if (isEvidenceDraft) {
      if (!blogColumns.some((column) => new RegExp(`column:\\s*["']?${column}["']?`).test(text))) {
        issues.push(`${label} 缺少有效 BlogColumn frontmatter`)
      }
      if (!/^---[\s\S]*modelStrategy:\s*/m.test(text)) {
        issues.push(`${label} 缺少 modelStrategy frontmatter`)
      }
    } else if (text.length < 1200) {
      issues.push(`${label} 正文偏短，可能仍然像问答或提纲`)
    }
  }
  return issues
}

async function checkBlogData() {
  const issues = []
  const summaryText = await readFile(blogDataPath, 'utf8')
  issues.push(...checkText('src/data/blog.ts', summaryText, []))

  if (!existsSync(blogPostsDir)) return issues
  const files = (await readdir(blogPostsDir)).filter((file) => file.endsWith('.ts'))
  for (const file of files) {
    const text = await readFile(resolve(blogPostsDir, file), 'utf8')
    issues.push(...checkText(`src/data/blog-posts/${file}`, text, []))
  }

  return issues
}

async function main() {
  const issues = [...(await checkBlogData()), ...(await checkDrafts())]
  if (issues.length > 0) {
    console.error(`公开博客检查失败，共 ${issues.length} 个问题：`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }
  console.log('公开博客检查通过：未发现禁用词、Day 编号语境或草稿结构缺失。')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
