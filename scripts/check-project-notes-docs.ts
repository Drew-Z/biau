import { access, readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

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
  'README.md': ['Scope And Privacy Boundary', 'Evidence Labels', 'Document Map', 'Validation'],
  'chatus.md': ['Executive Summary', 'Product Boundary', 'Architecture', 'Core Implementation', 'Core Data Flow', 'Reliability And Failure Handling', 'Trade-Offs', 'Security And Privacy', 'Verification', 'Delivery Status', 'Code Entrypoints', 'Evidence', 'Interview Focus'],
  'anchor.md': ['Executive Summary', 'Product Boundary', 'Architecture', 'Core Implementation', 'Core Data Flow', 'Reliability And Failure Handling', 'Trade-Offs', 'Security And Privacy', 'Verification', 'Delivery Status', 'Code Entrypoints', 'Evidence', 'Interview Focus'],
  'public-assistant.md': ['Executive Summary', 'Product Boundary', 'Architecture', 'Core Implementation', 'Core Data Flow', 'Reliability And Failure Handling', 'Trade-Offs', 'Security And Privacy', 'Verification', 'Delivery Status', 'Code Entrypoints', 'Evidence', 'Interview Focus'],
  'ai-daily.md': ['Executive Summary', 'Product Boundary', 'Architecture', 'Core Implementation', 'Core Data Flow', 'Reliability And Failure Handling', 'Trade-Offs', 'Security And Privacy', 'Verification', 'Delivery Status', 'Code Entrypoints', 'Evidence', 'Interview Focus'],
  'cross-project-patterns.md': ['Shared Boundaries', 'Evidence-Bound Design', 'Deterministic Checks', 'Fail-Closed Comparison', 'Realtime And Asynchronous Execution', 'Failure And Recovery', 'Privacy And Public Projection', 'Trade-Offs', 'Evidence'],
  'interview-question-bank.md': ['Chatus', 'Anchor', 'Public Assistant', 'AI Daily', 'Cross-Project'],
  'evidence-register.md': ['Label Definitions', 'Chatus Evidence', 'Anchor Evidence', 'Public Assistant Evidence', 'AI Daily Evidence', 'Cross-Project Evidence', 'Production Observation Boundary'],
}

const allowedLabels = new Set(['source-verified', 'production-observed', 'documented-design', 'portfolio-claim'])
const qaPrefixToScope: Record<string, string> = {
  CHATUS: 'chatus',
  ANCHOR: 'anchor',
  'PUBLIC-ASSISTANT': 'public-assistant',
  'AI-DAILY': 'ai-daily',
  CROSS: 'cross-project',
}
const qaMinimums: Record<string, number> = {
  chatus: 25,
  anchor: 25,
  'public-assistant': 25,
  'ai-daily': 25,
  'cross-project': 20,
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
  const qaBlocks = collectQaBlocks(interviewMarkdown)
  const qaIds = new Set<string>()
  const qaCounts: Record<string, number> = Object.fromEntries(Object.keys(qaMinimums).map((scope) => [scope, 0]))
  for (const block of qaBlocks) {
    if (qaIds.has(block.id)) issues.push(`interview-question-bank.md: duplicate QA ID ${block.id}`)
    qaIds.add(block.id)
    const scope = block.body.match(/^- Scope: ([a-z-]+)\s*$/mu)?.[1]
    const question = block.body.match(/^- Question: (.+)$/mu)?.[1]?.trim()
    const followUp = block.body.match(/^- Follow-up: (.+)$/mu)?.[1]?.trim()
    const answer = block.body.match(/^- Answer: (.+)$/mu)?.[1]?.trim()
    const evidence = block.body.match(/^- Evidence: (.+)$/mu)?.[1]?.trim()
    const expectedScope = qaPrefixToScope[block.prefix]
    if (scope !== expectedScope) issues.push(`${block.id}: expected scope ${expectedScope}, got ${scope ?? 'missing'}`)
    if (!question) issues.push(`${block.id}: missing Question`)
    if (!followUp || followUp.length < 60) issues.push(`${block.id}: Follow-up must cover an alternative, failure signal, and verification strategy`)
    if (!answer || answer.length < 40) issues.push(`${block.id}: Answer must contain at least 40 characters`)
    if (!evidence) {
      issues.push(`${block.id}: missing Evidence`)
    } else {
      const references = [...evidence.matchAll(/\bE-[A-Z-]+-\d{3}\b/gu)].map((match) => match[0])
      if (references.length === 0) issues.push(`${block.id}: Evidence must reference at least one evidence ID`)
      for (const reference of references) if (!evidenceIds.has(reference)) issues.push(`${block.id}: unknown evidence ${reference}`)
    }
    if (expectedScope) qaCounts[expectedScope] += 1
  }

  for (const [scope, minimum] of Object.entries(qaMinimums)) {
    if (qaCounts[scope] < minimum) issues.push(`interview-question-bank.md: ${scope} needs at least ${minimum} Q&A items, got ${qaCounts[scope]}`)
  }
  if (qaBlocks.length < 120) issues.push(`interview-question-bank.md: needs at least 120 Q&A items, got ${qaBlocks.length}`)

  if (issues.length > 0) {
    console.error(`Project notes check failed with ${issues.length} issue(s):`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log(`Project notes check passed: ${Object.entries(qaCounts).map(([scope, count]) => `${scope}=${count}`).join(', ')}, total=${qaBlocks.length}, evidence=${evidenceIds.size}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
