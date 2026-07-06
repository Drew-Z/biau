import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/reliability-suite.json')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_STEP_TIMEOUT_MS = 90_000
const CAPTURE_LIMIT = 300_000

const steps = [
  {
    id: 'main-site',
    label: 'BIAU Port main site synthetic',
    script: 'main-site:synthetic',
    supportsStrict: true,
    outputPath: 'public/status/blog-semi-synthetic.json',
    reportKind: 'synthetic',
  },
  {
    id: 'legal-rag',
    label: 'Legal RAG synthetic',
    script: 'legal-rag:synthetic',
    supportsStrict: true,
    requiredEnv: ['LEGAL_RAG_API_BASE_URL'],
    outputPath: 'public/status/legal-rag-synthetic.json',
    reportKind: 'synthetic',
  },
  {
    id: 'erp',
    label: 'ERP synthetic',
    script: 'erp:synthetic',
    supportsStrict: true,
    outputPath: 'public/status/erp-synthetic.json',
    reportKind: 'synthetic',
  },
  {
    id: 'xunqiu',
    label: 'Xunqiu synthetic',
    script: 'xunqiu:synthetic',
    supportsStrict: true,
    outputPath: 'public/status/xunqiu-synthetic.json',
    reportKind: 'synthetic',
  },
  {
    id: 'pet',
    label: 'Pet showcase synthetic',
    script: 'pet:synthetic',
    supportsStrict: true,
    outputPath: 'public/status/pet-gamer-synthetic.json',
    reportKind: 'synthetic',
  },
  {
    id: 'playlab',
    label: 'BIAU Playlab synthetic',
    script: 'playlab:synthetic',
    supportsStrict: true,
    outputPath: 'public/status/biau-playlab-synthetic.json',
    reportKind: 'synthetic',
  },
  {
    id: 'site-status',
    label: 'Public status aggregation',
    script: 'site:status',
    supportsStrict: true,
    outputPath: 'public/status/site-status.json',
    reportKind: 'site-status',
  },
  {
    id: 'site-monitor',
    label: 'Core route monitor',
    script: 'site:monitor',
    extraArgs: ['--json'],
    supportsStrict: false,
    reportKind: 'site-monitor',
  },
]

function parseArgs(argv) {
  const args = {
    strict: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    stepTimeoutMs: DEFAULT_STEP_TIMEOUT_MS,
    skips: new Set(),
  }

  const readValue = (index) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--strict') {
      args.strict = true
      continue
    }
    if (item === '--timeout') {
      args.timeoutMs = Number(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--timeout=')) {
      args.timeoutMs = Number(item.slice('--timeout='.length))
      continue
    }
    if (item === '--step-timeout') {
      args.stepTimeoutMs = Number(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--step-timeout=')) {
      args.stepTimeoutMs = Number(item.slice('--step-timeout='.length))
      continue
    }
    if (item === '--skip') {
      addSkips(args.skips, readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--skip=')) {
      addSkips(args.skips, item.slice('--skip='.length))
      continue
    }
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) args.timeoutMs = DEFAULT_TIMEOUT_MS
  if (!Number.isFinite(args.stepTimeoutMs) || args.stepTimeoutMs <= 0) args.stepTimeoutMs = DEFAULT_STEP_TIMEOUT_MS
  args.stepTimeoutMs = Math.max(args.stepTimeoutMs, args.timeoutMs * 8)
  return args
}

function addSkips(skips, value) {
  for (const item of String(value || '').split(',')) {
    const normalized = item.trim()
    if (normalized) skips.add(normalized)
  }
}

function spawnNpm(args, options = {}) {
  if (process.platform !== 'win32') {
    return spawn(npmCommand, args, { shell: false, ...options })
  }

  return spawn('cmd.exe', ['/d', '/s', '/c', [npmCommand, ...args.map(quoteWindowsArg)].join(' ')], {
    shell: false,
    ...options,
  })
}

function quoteWindowsArg(value) {
  const raw = String(value)
  if (!/[\s"]/u.test(raw)) return raw
  return `"${raw.replace(/"/gu, '\\"')}"`
}

function commandForStep(step, args) {
  const forwardedArgs = [...(step.extraArgs ?? []), '--timeout', String(args.timeoutMs)]
  if (args.strict && step.supportsStrict) forwardedArgs.push('--strict')
  return {
    display: `npm run ${step.script}${forwardedArgs.length > 0 ? ` -- ${forwardedArgs.join(' ')}` : ''}`,
    spawnArgs: ['run', step.script, '--', ...forwardedArgs],
  }
}

function captureAppend(current, chunk) {
  if (current.length >= CAPTURE_LIMIT) return current
  const next = current + chunk.toString('utf8')
  return next.length > CAPTURE_LIMIT ? next.slice(0, CAPTURE_LIMIT) : next
}

function waitForExit(child, timeoutMs = 5_000) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }

    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(done, timeoutMs)
    child.once('exit', done)
    child.once('error', done)
  })
}

async function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    await waitForExit(killer)
    await waitForExit(child)
    return
  }
  child.kill('SIGTERM')
  await waitForExit(child)
}

function runCommand(spawnArgs, timeoutMs) {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    const child = spawnNpm(spawnArgs, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const timer = setTimeout(() => {
      timedOut = true
      void stopProcessTree(child)
    }, timeoutMs)

    const finish = (code, signal, spawnError) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        exitCode: typeof code === 'number' ? code : timedOut ? 124 : 1,
        signal: signal || '',
        durationMs: Date.now() - startedAt,
        timedOut,
        stdout,
        stderr,
        spawnError,
      })
    }

    child.stdout?.on('data', (chunk) => {
      stdout = captureAppend(stdout, chunk)
    })
    child.stderr?.on('data', (chunk) => {
      stderr = captureAppend(stderr, chunk)
    })
    child.on('error', (error) => finish(1, '', error))
    child.on('exit', (code, signal) => finish(code, signal))
  })
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

function sanitizeIssue(value) {
  return String(value || '')
    .replace(/https?:\/\/[^\s)]+/giu, '[url]')
    .replace(/[A-Za-z]:\\[^\s)]+/gu, '[path]')
    .replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{8,}\b/gu, '[secret]')
    .replace(/\bBearer\s+[A-Za-z0-9._-]+/giu, 'Bearer [secret]')
    .slice(0, 220)
}

function countStatuses(checks) {
  const summary = { total: 0, online: 0, degraded: 0, offline: 0, unchecked: 0, other: 0 }
  for (const check of checks) {
    summary.total += 1
    const status = isRecord(check) && typeof check.status === 'string' ? check.status : 'other'
    if (status in summary) summary[status] += 1
    else summary.other += 1
  }
  return summary
}

function collectCheckIssues(checks) {
  const issues = []
  for (const check of checks) {
    if (!isRecord(check) || !Array.isArray(check.issues)) continue
    for (const issue of check.issues) {
      if (typeof issue === 'string' && issue.trim()) issues.push(sanitizeIssue(issue))
    }
  }
  return issues.slice(0, 8)
}

async function readJsonFile(relativePath) {
  const filePath = resolve(repoRoot, relativePath)
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function summarizeOutputFile(step) {
  if (!step.outputPath) return null

  try {
    const payload = await readJsonFile(step.outputPath)
    if (!isRecord(payload)) return null

    if (step.reportKind === 'site-status') {
      const targets = Array.isArray(payload.targets) ? payload.targets : []
      const targetSummary = isRecord(payload.summary) ? payload.summary : countStatuses(targets)
      return {
        ok: payload.ok !== false,
        summary: `site status targets: online=${targetSummary.online ?? 0} degraded=${targetSummary.degraded ?? 0} offline=${targetSummary.offline ?? 0} unchecked=${targetSummary.unchecked ?? 0}`,
        issues: collectCheckIssues(targets),
      }
    }

    const checks = Array.isArray(payload.checks) ? payload.checks : []
    const statusSummary = countStatuses(checks)
    return {
      ok: payload.ok !== false && statusSummary.offline === 0,
      summary: `synthetic checks: online=${statusSummary.online} degraded=${statusSummary.degraded} offline=${statusSummary.offline} unchecked=${statusSummary.unchecked}`,
      issues: collectCheckIssues(checks),
    }
  } catch {
    return {
      ok: false,
      summary: `expected report was not readable at ${step.outputPath}`,
      issues: ['expected report was not readable'],
    }
  }
}

function summarizeSiteMonitor(stdout) {
  try {
    const payload = parseJsonFromMixedOutput(stdout)
    if (!isRecord(payload) || !Array.isArray(payload.checks)) return null
    const failed = payload.checks.filter((check) => isRecord(check) && check.ok === false)
    const issues = failed
      .flatMap((check) => (Array.isArray(check.issues) ? check.issues : []))
      .filter((issue) => typeof issue === 'string' && issue.trim())
      .map(sanitizeIssue)
      .slice(0, 8)

    return {
      ok: payload.ok !== false,
      summary: `site monitor checks: passed=${payload.checks.length - failed.length} failed=${failed.length}`,
      issues,
    }
  } catch {
    return null
  }
}

function parseJsonFromMixedOutput(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('no-json-object')
  return JSON.parse(text.slice(start, end + 1))
}

async function runStep(step, args) {
  if (args.skips.has(step.id)) {
    return {
      id: step.id,
      label: step.label,
      command: '',
      status: 'skipped',
      durationMs: 0,
      exitCode: 0,
      outputPath: step.outputPath,
      summary: 'Skipped by --skip',
      issues: [],
    }
  }

  const missingEnv = (step.requiredEnv ?? []).filter((key) => !String(process.env[key] ?? '').trim())
  if (missingEnv.length > 0) {
    const preservedReport = await summarizeOutputFile(step)
    return {
      id: step.id,
      label: step.label,
      command: '',
      status: 'skipped',
      durationMs: 0,
      exitCode: 0,
      outputPath: step.outputPath,
      summary: preservedReport
        ? `Skipped because required environment is not configured: ${missingEnv.join(', ')}. Existing report is preserved: ${preservedReport.summary}.`
        : `Skipped because required environment is not configured: ${missingEnv.join(', ')}. No existing report was readable.`,
      issues: preservedReport?.issues ?? [],
    }
  }

  const command = commandForStep(step, args)
  console.log(`→ ${step.label}`)
  const result = await runCommand(command.spawnArgs, args.stepTimeoutMs)
  const parsed =
    step.reportKind === 'site-monitor' ? summarizeSiteMonitor(result.stdout) : await summarizeOutputFile(step)

  const processFailed = result.exitCode !== 0 || result.timedOut || Boolean(result.spawnError)
  const reportFailed = parsed?.ok === false
  const status = processFailed || reportFailed ? 'failed' : 'passed'
  const issues = []
  if (result.timedOut) issues.push(`step timed out after ${args.stepTimeoutMs} ms`)
  if (result.spawnError) issues.push(sanitizeIssue(result.spawnError.message))
  if (result.exitCode !== 0 && !result.timedOut) issues.push(`command exited with code ${result.exitCode}`)
  if (parsed?.issues?.length) issues.push(...parsed.issues)

  console.log(`  ${status.toUpperCase()} ${result.durationMs} ms`)
  return {
    id: step.id,
    label: step.label,
    command: command.display,
    status,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    outputPath: step.outputPath,
    summary: parsed?.summary ?? (status === 'passed' ? 'command completed' : 'command failed'),
    issues: issues.slice(0, 10),
  }
}

function summarizeSuite(stepResults, durationMs) {
  return stepResults.reduce(
    (summary, step) => {
      summary.total += 1
      if (step.status === 'passed') summary.passed += 1
      else if (step.status === 'failed') summary.failed += 1
      else if (step.status === 'skipped') summary.skipped += 1
      summary.durationMs = durationMs
      return summary
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, durationMs },
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const startedAt = Date.now()
  const checkedAt = new Date().toISOString()
  const stepResults = []

  for (const step of steps) {
    stepResults.push(await runStep(step, args))
  }

  const durationMs = Date.now() - startedAt
  const report = {
    checkedAt,
    ok: stepResults.every((step) => step.status !== 'failed'),
    strict: args.strict,
    timeoutMs: args.timeoutMs,
    stepTimeoutMs: args.stepTimeoutMs,
    summary: summarizeSuite(stepResults, durationMs),
    steps: stepResults.map((step) => ({
      ...step,
      outputPath: step.outputPath ? relative(repoRoot, resolve(repoRoot, step.outputPath)).replace(/\\/gu, '/') : undefined,
    })),
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Reliability suite report generated: ${relative(repoRoot, outputPath).replace(/\\/gu, '/')}`)
  console.log(`passed=${report.summary.passed} failed=${report.summary.failed} skipped=${report.summary.skipped}`)

  if (args.strict && !report.ok) process.exitCode = 1
}

main().catch(async (error) => {
  const message = sanitizeIssue(error instanceof Error ? error.message : String(error))
  const checkedAt = new Date().toISOString()
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        checkedAt,
        ok: false,
        strict: process.argv.includes('--strict'),
        timeoutMs: DEFAULT_TIMEOUT_MS,
        stepTimeoutMs: DEFAULT_STEP_TIMEOUT_MS,
        summary: { total: 0, passed: 0, failed: 1, skipped: 0, durationMs: 0 },
        steps: [
          {
            id: 'reliability-suite',
            label: 'Reliability suite runner',
            command: 'node scripts/check-reliability-suite.mjs',
            status: 'failed',
            durationMs: 0,
            exitCode: 1,
            summary: 'runner failed before executing checks',
            issues: [message],
          },
        ],
      },
      null,
      2,
    )}\n`,
  )
  console.error(message)
  process.exitCode = 1
})
