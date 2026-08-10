import { access, readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import { renderQuestionBank } from './generate-project-notes-question-bank'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const notesDir = resolve(repoRoot, 'docs/project-notes')
const execFileAsync = promisify(execFile)
const repositoryRoots = new Map<string, string>([
  ['blog-semi', repoRoot],
  ['chatus', resolve(repoRoot, '..', 'chatus')],
  ['anchor', resolve(repoRoot, '..', 'learn', 'anchor')],
])

const requiredDocuments: Record<string, string[]> = {
  'README.md': ['范围与隐私边界', '证据标签', '文档索引', '题库结构', '验证方式'],
  'chatus.md': ['项目摘要', '产品边界', '架构与职责', '核心实现', '核心数据流', '可靠性与故障处理', '关键取舍', '安全与隐私', '验证矩阵', '交付状态', '代码入口', '证据索引', '面试重点'],
  'anchor.md': ['项目摘要', '产品边界', '架构与职责', '核心实现', '核心数据流', '可靠性与故障处理', '关键取舍', '安全与隐私', '验证矩阵', '交付状态', '代码入口', '证据索引', '面试重点'],
  'public-assistant.md': ['项目摘要', '产品边界', '架构与职责', '核心实现', '核心数据流', '可靠性与故障处理', '关键取舍', '安全与隐私', '验证矩阵', '交付状态', '代码入口', '证据索引', '面试重点'],
  'ai-daily.md': ['项目摘要', '产品边界', '架构与职责', '核心实现', '核心数据流', '可靠性与故障处理', '关键取舍', '安全与隐私', '验证矩阵', '交付状态', '代码入口', '证据索引', '面试重点'],
  'cross-project-patterns.md': ['共同边界', '证据约束设计', '确定性检查', '失败闭合对比', '实时与异步执行', '故障与恢复', '隐私与公开投影', '关键取舍', '证据索引'],
  'interview-question-bank.md': ['Chatus', 'Anchor', '公开助手', 'AI 日报', '跨项目'],
  'evidence-register.md': ['标签定义', 'Chatus 证据', 'Anchor 证据', '公开助手证据', 'AI 日报证据', '跨项目证据', '生产观察边界'],
}

const allowedLabels = new Set(['source-verified', 'production-observed', 'documented-design', 'portfolio-claim'])
const qaPrefixToScope: Record<string, string> = {
  CHATUS: 'chatus',
  ANCHOR: 'anchor',
  'PUBLIC-ASSISTANT': 'public-assistant',
  'AI-DAILY': 'ai-daily',
  CROSS: 'cross-project',
}
const qaTargets: Record<string, number> = {
  chatus: 65,
  anchor: 60,
  'public-assistant': 60,
  'ai-daily': 65,
  'cross-project': 50,
}
const qaEvidencePrefixes: Record<string, string> = {
  chatus: 'E-CHATUS-',
  anchor: 'E-ANCHOR-',
  'public-assistant': 'E-PA-',
  'ai-daily': 'E-AID-',
  'cross-project': 'E-CROSS-',
}
const minimumHanCharacters: Record<string, number> = {
  'README.md': 250,
  'chatus.md': 800,
  'anchor.md': 800,
  'public-assistant.md': 800,
  'ai-daily.md': 800,
  'cross-project-patterns.md': 500,
  'interview-question-bank.md': 5_000,
  'evidence-register.md': 500,
}

const sensitivePatterns: Array<[string, RegExp]> = [
  ['Windows absolute path', /\b[A-Za-z]:[\\/]/u],
  ['UNC path', /\\\\[^\\\s]+\\/u],
  ['Unix user path', /\/(?:Users|home)\/[^/\s]+\//u],
  ['WSL mount path', /\/mnt\/[a-z]\//iu],
  ['file URL', /file:\/\//iu],
  ['localhost URL', /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/iu],
  ['private IPv4 address', /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/u],
  ['credential-bearing URL', /https?:\/\/[^\s/:]+:[^\s/@]+@/iu],
  ['secret assignment', /\b(?:api[_-]?key|token|password|database_url)\s*[=:]\s*['"]?[A-Za-z0-9_./+-]{12,}/iu],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
  ['private Chatus repository name', /chatus-private-chat/iu],
]

function collectQaBlocks(markdown: string) {
  const heading = /^### (QA-(CHATUS|ANCHOR|PUBLIC-ASSISTANT|AI-DAILY|CROSS)-\d{3})\s*$/gmu
  const matches = [...markdown.matchAll(heading)]
  return matches.map((match, index) => ({
    id: match[1],
    prefix: match[2],
    body: markdown.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? markdown.length),
  }))
}

async function checkMarkdownLinks(filePath: string, markdown: string, issues: string[]) {
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/gu
  for (const match of markdown.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/gu, '')
    if (!rawTarget || rawTarget.startsWith('#') || /^(?:https?:|mailto:)/iu.test(rawTarget)) continue
    const targetWithoutHash = decodeURIComponent(rawTarget.split('#', 1)[0])
    const resolved = resolve(dirname(filePath), targetWithoutHash)
    const relativeTarget = relative(repoRoot, resolved)
    if (relativeTarget.startsWith('..') || relativeTarget.startsWith('/') || relativeTarget.startsWith('\\')) {
      issues.push(`${relative(repoRoot, filePath)}: local link escapes the repository: ${rawTarget}`)
      continue
    }
    try {
      await access(resolved)
    } catch {
      issues.push(`${relative(repoRoot, filePath)}: local link does not exist: ${rawTarget}`)
    }
  }
}

async function main() {
  const issues: string[] = []
  const contents = new Map<string, string>()

  for (const [fileName, headings] of Object.entries(requiredDocuments)) {
    const filePath = resolve(notesDir, fileName)
    let markdown: string
    try {
      markdown = await readFile(filePath, 'utf8')
    } catch {
      issues.push(`missing required document: docs/project-notes/${fileName}`)
      continue
    }
    contents.set(fileName, markdown)
    const hanCharacters = [...markdown.matchAll(/\p{Script=Han}/gu)].length
    if (hanCharacters < minimumHanCharacters[fileName]) {
      issues.push(`${fileName}: expected at least ${minimumHanCharacters[fileName]} Chinese characters, got ${hanCharacters}`)
    }
    for (const heading of headings) {
      if (!markdown.includes(`## ${heading}`)) issues.push(`${fileName}: missing heading "## ${heading}"`)
    }
    for (const [label, pattern] of sensitivePatterns) {
      if (pattern.test(markdown)) issues.push(`${fileName}: contains ${label}`)
    }
    await checkMarkdownLinks(filePath, markdown, issues)
  }

  const evidenceMarkdown = contents.get('evidence-register.md') ?? ''
  const evidenceRow = /^\| (E-[A-Z-]+-\d{3}) \| (source-verified|production-observed|documented-design|portfolio-claim) \| ([^|]+) \| ([0-9a-f]{7,40}|working-tree) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|\s*$/u
  const evidenceRows: RegExpMatchArray[] = []
  for (const line of evidenceMarkdown.split(/\r?\n/u).filter((candidate) => candidate.startsWith('| E-'))) {
    const row = line.match(evidenceRow)
    if (row) evidenceRows.push(row)
    else issues.push(`evidence-register.md: malformed evidence row: ${line}`)
  }
  const evidenceIds = new Set<string>()
  const crossDependencies = new Map<string, string[]>()
  for (const row of evidenceRows) {
    const [, id, label, rawRepository, commit, rawPath, , observation] = row
    const repository = rawRepository.trim()
    const evidencePath = rawPath.trim()
    if (evidenceIds.has(id)) issues.push(`evidence-register.md: duplicate evidence ID ${id}`)
    evidenceIds.add(id)
    if (!allowedLabels.has(label)) issues.push(`evidence-register.md: unsupported label ${label}`)
    if (label === 'production-observed' && commit === 'working-tree') {
      issues.push(`evidence-register.md: ${id} production observation requires an immutable commit`)
    }

    const repositoryRoot = repositoryRoots.get(repository)
    if (!repositoryRoot) {
      issues.push(`evidence-register.md: ${id} uses unknown repository label ${repository}`)
    } else {
      const resolvedPath = resolve(repositoryRoot, evidencePath)
      const relativePath = relative(repositoryRoot, resolvedPath)
      if (relativePath.startsWith('..') || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        issues.push(`evidence-register.md: ${id} path escapes the repository: ${evidencePath}`)
      } else if (commit === 'working-tree') {
        try {
          await access(resolvedPath)
        } catch {
          issues.push(`evidence-register.md: ${id} working-tree path does not exist: ${evidencePath}`)
        }
      } else {
        try {
          await execFileAsync('git', ['cat-file', '-e', `${commit}:${evidencePath}`], { cwd: repositoryRoot })
        } catch {
          issues.push(`evidence-register.md: ${id} path does not exist in ${repository} at ${commit}: ${evidencePath}`)
        }
      }
    }

    if (id.startsWith('E-CROSS-')) {
      crossDependencies.set(id, [...observation.matchAll(/\bE-(?!CROSS-)[A-Z-]+-\d{3}\b/gu)].map((match) => match[0]))
    }
  }
  for (const [id, dependencies] of crossDependencies) {
    const uniqueDependencies = [...new Set(dependencies)]
    if (uniqueDependencies.length < 2) issues.push(`evidence-register.md: ${id} must name at least two project-specific evidence IDs`)
    for (const dependency of uniqueDependencies) {
      if (!evidenceIds.has(dependency)) issues.push(`evidence-register.md: ${id} references unknown dependency ${dependency}`)
    }
    const projectPrefixes = new Set(uniqueDependencies.map((dependency) => dependency.replace(/-\d{3}$/u, '')))
    if (projectPrefixes.size < 2) issues.push(`evidence-register.md: ${id} dependencies must cover at least two projects`)
  }
  if (evidenceIds.size < 20) issues.push(`evidence-register.md: expected at least 20 evidence rows, got ${evidenceIds.size}`)

  for (const [fileName, markdown] of contents) {
    if (!['README.md', 'interview-question-bank.md'].includes(fileName) && !/\[(?:source-verified|production-observed|documented-design|portfolio-claim)\]/u.test(markdown)) {
      issues.push(`${fileName}: needs at least one explicit evidence label`)
    }
    for (const reference of markdown.matchAll(/\bE-[A-Z-]+-\d{3}\b/gu)) {
      if (!evidenceIds.has(reference[0])) issues.push(`${fileName}: references unknown evidence ${reference[0]}`)
    }
  }

  const interviewMarkdown = contents.get('interview-question-bank.md') ?? ''
  if (interviewMarkdown !== renderQuestionBank()) {
    issues.push('interview-question-bank.md: generated output is stale; run npm.cmd run docs:project-notes-generate')
  }
  if (/^- (?:Scope|Question|Follow-up|Answer|Failure Scenario|Verification|Evidence):/gmu.test(interviewMarkdown)) {
    issues.push('interview-question-bank.md: contains legacy English Q&A field names')
  }
  const qaBlocks = collectQaBlocks(interviewMarkdown)
  const qaIds = new Set<string>()
  const questions = new Set<string>()
  const qaCounts: Record<string, number> = Object.fromEntries(Object.keys(qaTargets).map((scope) => [scope, 0]))
  const qaNumbers: Record<string, number[]> = Object.fromEntries(Object.keys(qaTargets).map((scope) => [scope, []]))
  for (const block of qaBlocks) {
    if (qaIds.has(block.id)) issues.push(`interview-question-bank.md: duplicate QA ID ${block.id}`)
    qaIds.add(block.id)
    const scope = block.body.match(/^- 范围: ([a-z-]+)\s*$/mu)?.[1]
    const question = block.body.match(/^- 问题: (.+)$/mu)?.[1]?.trim()
    const followUp = block.body.match(/^- 深入追问: (.+)$/mu)?.[1]?.trim()
    const answer = block.body.match(/^- 参考回答: (.+)$/mu)?.[1]?.trim()
    const failureScenario = block.body.match(/^- 失败场景: (.+)$/mu)?.[1]?.trim()
    const verification = block.body.match(/^- 验证方式: (.+)$/mu)?.[1]?.trim()
    const evidence = block.body.match(/^- 证据: (.+)$/mu)?.[1]?.trim()
    const expectedScope = qaPrefixToScope[block.prefix]
    if (scope !== expectedScope) issues.push(`${block.id}: expected scope ${expectedScope}, got ${scope ?? 'missing'}`)
    if (!question || !/\p{Script=Han}/u.test(question)) issues.push(`${block.id}: missing Chinese Question`)
    else if (questions.has(question)) issues.push(`${block.id}: duplicate Question`)
    else questions.add(question)
    if (!followUp || followUp.length < 45) issues.push(`${block.id}: 深入追问 must contain at least 45 characters`)
    if (!answer || answer.length < 55) issues.push(`${block.id}: 参考回答 must contain at least 55 characters`)
    if (!failureScenario || failureScenario.length < 35) issues.push(`${block.id}: 失败场景 must contain at least 35 characters`)
    if (!verification || verification.length < 35) issues.push(`${block.id}: 验证方式 must contain at least 35 characters`)
    if (!evidence) {
      issues.push(`${block.id}: missing 证据`)
    } else {
      const references = [...evidence.matchAll(/\bE-[A-Z-]+-\d{3}\b/gu)].map((match) => match[0])
      if (references.length === 0) issues.push(`${block.id}: 证据 must reference at least one evidence ID`)
      for (const reference of references) if (!evidenceIds.has(reference)) issues.push(`${block.id}: unknown evidence ${reference}`)
      const expectedEvidencePrefix = qaEvidencePrefixes[expectedScope]
      if (expectedEvidencePrefix && !references.some((reference) => reference.startsWith(expectedEvidencePrefix))) {
        issues.push(`${block.id}: expected at least one ${expectedEvidencePrefix} evidence reference`)
      }
    }
    if (expectedScope) {
      qaCounts[expectedScope] += 1
      qaNumbers[expectedScope].push(Number(block.id.slice(-3)))
    }
  }

  for (const [scope, target] of Object.entries(qaTargets)) {
    if (qaCounts[scope] !== target) issues.push(`interview-question-bank.md: ${scope} needs exactly ${target} Q&A items, got ${qaCounts[scope]}`)
    const sortedNumbers = qaNumbers[scope].sort((left, right) => left - right)
    const expectedNumbers = Array.from({ length: target }, (_, index) => index + 1)
    if (sortedNumbers.some((value, index) => value !== expectedNumbers[index])) {
      issues.push(`interview-question-bank.md: ${scope} QA numbering must be continuous from 001 to ${String(target).padStart(3, '0')}`)
    }
  }
  if (qaBlocks.length !== 300) issues.push(`interview-question-bank.md: needs exactly 300 Q&A items, got ${qaBlocks.length}`)

  if (issues.length > 0) {
    console.error(`Project notes check failed with ${issues.length} issue(s):`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log(`项目技术档案检查通过：${Object.entries(qaCounts).map(([scope, count]) => `${scope}=${count}`).join(', ')}，总计=${qaBlocks.length}，证据=${evidenceIds.size}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
