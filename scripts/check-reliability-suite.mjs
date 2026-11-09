import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { reliabilityTempPrefix, resolveDiagnosticsOutput, resolveStatusOutput, writeJsonAtomically } from './lib/status-output.mjs'
import { projectAssistantHealthAttempts } from './lib/assistant-health-diagnostics.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_STATUS_PATH = 'public/status/reliability-suite.json'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_STEP_TIMEOUT_MS = 240_000
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
    id: 'public-links',
    label: 'Public project link manifest',
    script: 'public-links:check',
    supportsStrict: true,
    outputPath: 'public/status/public-links-synthetic.json',
    reportKind: 'synthetic',
  },
  {
    id: 'legal-rag',
    label: 'Legal RAG synthetic',
    script: 'legal-rag:synthetic',
    extraArgs: ['--read-only'],
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
    json: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    stepTimeoutMs: DEFAULT_STEP_TIMEOUT_MS,
    skips: new Set(),
  }

  const readValue = (index) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--json') {
      args.json = true
      continue
    }
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

function commandForStep(step, args, temporaryOutputPath, temporaryRoot) {
  const forwardedArgs = [...(step.extraArgs ?? []), '--timeout', String(args.timeoutMs)]
  const displayArgs = [...forwardedArgs]
  if (args.strict && step.supportsStrict) forwardedArgs.push('--strict')
  if (args.strict && step.supportsStrict) displayArgs.push('--strict')
  if (temporaryOutputPath) {
    forwardedArgs.push('--write-status', temporaryOutputPath)
    displayArgs.push('--write-status', '[temporary]')
  }
  if (step.id === 'site-status') {
    forwardedArgs.push('--status-input-dir', temporaryRoot)
    displayArgs.push('--status-input-dir', '[temporary]')
  }
  if (step.id === 'public-links' && args.diagnosticsDir) {
    forwardedArgs.push('--diagnostics-file', join(args.diagnosticsDir, 'public-links.json'))
    displayArgs.push('--diagnostics-file', '[temporary]')
  }
  return {
    display: `npm run ${step.script}${displayArgs.length > 0 ? ` -- ${displayArgs.join(' ')}` : ''}`,
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
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
  if (!Array.isArray(checks) || checks.length === 0) return null
  const summary = { total: checks.length, online: 0, degraded: 0, offline: 0, unchecked: 0, planned: 0 }
  for (const check of checks) {
    if (!isRecord(check) || !['online', 'degraded', 'offline', 'unchecked', 'planned'].includes(check.status)) return null
    summary[check.status] += 1
  }
  return summary
}

function invalidReport(issue, evidenceSource = 'current') {
  return { readable: false, ok: false, coverage: null, coverageStatus: 'unknown', evidenceSource, summary: issue, issues: [issue] }
}

function summarizeReport(payload, reportKind) {
  if (!isRecord(payload) || typeof payload.ok !== 'boolean') return invalidReport('expected report had an invalid structure')
  const checks = reportKind === 'site-status' ? payload.targets : payload.checks
  if (reportKind === 'site-monitor' && (!Array.isArray(checks) || checks.some((check) => !isRecord(check) || typeof check.ok !== 'boolean'))) {
    return invalidReport('expected report had invalid monitor checks')
  }
  const coverage = countStatuses(reportKind === 'site-monitor' ? checks.map((check) => ({ status: check.ok ? 'online' : 'offline' })) : checks)
  if (!coverage) return invalidReport('expected report had empty or invalid checks')
  const checked = coverage.online + coverage.degraded + coverage.offline
  const label = reportKind === 'site-status' ? 'site status targets' : reportKind === 'site-monitor' ? 'site monitor checks' : 'synthetic checks'
  return {
    readable: true,
    ok: payload.ok && coverage.offline === 0,
    coverage,
    coverageStatus: checked === 0 ? 'none' : checked === coverage.total ? 'complete' : 'partial',
    evidenceSource: 'current',
    summary: `${label}: online=${coverage.online} degraded=${coverage.degraded} offline=${coverage.offline} unchecked=${coverage.unchecked} planned=${coverage.planned}`,
    issues: collectCheckIssues(checks),
  }
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

async function readJsonFile(pathValue) {
  const filePath = isAbsolute(pathValue) ? pathValue : resolve(repoRoot, pathValue)
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function seedTemporaryProjections(temporaryRoot) {
  for (const step of steps) {
    if (!step.outputPath) continue
    try {
      const payload = await readJsonFile(step.outputPath)
      await writeJsonAtomically(join(temporaryRoot, basename(step.outputPath)), payload)
    } catch {
      // A missing baseline is valid on a fresh clone; the live step may create it.
    }
  }
}

async function summarizeOutputFile(step, pathValue = step.outputPath) {
  if (!step.outputPath) return null

  try {
    const payload = await readJsonFile(pathValue)
    const summary = summarizeReport(payload, step.reportKind)
    if (summary.readable && step.id === 'main-site') {
      const assistant = payload.checks.find((check) => check.id === 'blog-semi-public-assistant')
      const healthAttempts = projectAssistantHealthAttempts(assistant?.healthAttempts)
      if (healthAttempts.length > 0) summary.healthAttempts = healthAttempts
    }
    return summary
  } catch (error) {
    return invalidReport('expected report was not readable', error instanceof SyntaxError ? 'current' : 'none')
  }
}

function summarizeSiteMonitor(stdout) {
  try {
    return summarizeReport(parseJsonFromMixedOutput(stdout), 'site-monitor')
  } catch {
    return invalidReport('expected monitor report was not readable', stdout.trim() ? 'current' : 'none')
  }
}

function parseJsonFromMixedOutput(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('no-json-object')
  return JSON.parse(text.slice(start, end + 1))
}

async function runStep(step, args, temporaryRoot) {
  const temporaryOutputPath = step.outputPath ? join(temporaryRoot, basename(step.outputPath)) : ''
  const requestedSkip = args.skips.has(step.id)
  const missingEnv = (step.requiredEnv ?? []).filter((key) => !String(process.env[key] ?? '').trim())
  if (requestedSkip || missingEnv.length > 0) {
    const previous = await summarizeOutputFile(step)
    const preservedReport = previous?.readable ? previous : null
    const reason = requestedSkip ? 'Skipped by --skip' : `Skipped because required environment is not configured: ${missingEnv.join(', ')}`
    return {
      id: step.id,
      label: step.label,
      command: '',
      status: 'skipped',
      skipReason: requestedSkip ? 'requested' : 'missing-env',
      coverage: null,
      coverageStatus: 'none',
      evidenceSource: preservedReport ? 'previous' : 'none',
      durationMs: 0,
      exitCode: 0,
      outputPath: step.outputPath,
      summary: preservedReport
        ? `${reason}. Existing report is preserved: ${preservedReport.summary}.`
        : `${reason}. No existing report was readable.`,
      issues: preservedReport?.issues ?? [],
      temporaryOutputPath: '',
      projectionReady: true,
    }
  }

  const command = commandForStep(step, args, temporaryOutputPath, temporaryRoot)
  // Seeded snapshots are only fallback evidence for skipped steps. A running
  // step must produce its own report, including when its process fails.
  if (temporaryOutputPath) await rm(temporaryOutputPath, { force: true })
  if (!args.json) console.log(`→ ${step.label}`)
  const result = await runCommand(command.spawnArgs, args.stepTimeoutMs)
  const parsed =
    step.reportKind === 'site-monitor'
      ? summarizeSiteMonitor(result.stdout)
      : await summarizeOutputFile(step, temporaryOutputPath)

  const processFailed = result.exitCode !== 0 || result.timedOut || Boolean(result.spawnError)
  const reportFailed = parsed?.ok !== true
  const status = processFailed || reportFailed ? 'failed' : parsed.coverageStatus === 'none' ? 'skipped' : 'passed'
  const issues = []
  if (result.timedOut) issues.push(`step timed out after ${args.stepTimeoutMs} ms`)
  if (result.spawnError) issues.push(sanitizeIssue(result.spawnError.message))
  if (result.exitCode !== 0 && !result.timedOut) issues.push(`command exited with code ${result.exitCode}`)
  if (parsed?.issues?.length) issues.push(...parsed.issues)

  if (!args.json) console.log(`  ${status.toUpperCase()} ${result.durationMs} ms`)
  return {
    id: step.id,
    label: step.label,
    command: command.display,
    status,
    ...(status === 'skipped' ? { skipReason: 'no-checks-run' } : {}),
    coverage: parsed?.coverage ?? null,
    coverageStatus: parsed?.coverageStatus ?? 'unknown',
    evidenceSource: parsed?.evidenceSource ?? 'none',
    ...(parsed?.healthAttempts ? { healthAttempts: parsed.healthAttempts } : {}),
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    outputPath: step.outputPath,
    summary: parsed?.summary ?? (status === 'passed' ? 'command completed' : 'command failed'),
    issues: issues.slice(0, 10),
    temporaryOutputPath,
    projectionReady: !step.outputPath || parsed?.readable === true,
  }
}

function summarizeSuite(stepResults, durationMs) {
  return stepResults.reduce(
    (summary, step) => {
      summary.total += 1
      if (step.status === 'passed') summary.passed += 1
      else if (step.status === 'failed') summary.failed += 1
      else if (step.status === 'skipped') summary.skipped += 1
      summary.coverage[step.coverageStatus] += 1
      summary.durationMs = durationMs
      return summary
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, durationMs, coverage: { complete: 0, partial: 0, none: 0, unknown: 0 } },
  )
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)
  args.diagnosticsDir = resolveDiagnosticsOutput(argv, { repoRoot, directory: true })
  // A reused explicit directory must not upload a previous run's link evidence.
  if (args.diagnosticsDir) await rm(join(args.diagnosticsDir, 'public-links.json'), { force: true })
  const statusOutput = resolveStatusOutput(argv, {
    repoRoot,
    defaultRelativePath: DEFAULT_STATUS_PATH,
  })
  const temporaryRoot = await mkdtemp(join(tmpdir(), reliabilityTempPrefix()))

  try {
    await seedTemporaryProjections(temporaryRoot)
    const startedAt = Date.now()
    const checkedAt = new Date().toISOString()
    const stepResults = []

    for (const step of steps) {
      stepResults.push(await runStep(step, args, temporaryRoot))
    }

    const durationMs = Date.now() - startedAt
    const report = {
      checkedAt,
      ok: stepResults.every((step) => step.status !== 'failed'),
      strict: args.strict,
      timeoutMs: args.timeoutMs,
      stepTimeoutMs: args.stepTimeoutMs,
      summary: summarizeSuite(stepResults, durationMs),
      steps: stepResults.map(({ temporaryOutputPath: _temporaryOutputPath, projectionReady: _projectionReady, ...step }) => ({
        ...step,
        outputPath: step.outputPath ? relative(repoRoot, resolve(repoRoot, step.outputPath)).replace(/\\/gu, '/') : undefined,
      })),
    }

    if (statusOutput.enabled) {
      const incompleteProjection = stepResults.find((step) => !step.projectionReady)
      if (incompleteProjection) {
        throw new Error(`cannot publish because ${incompleteProjection.id} did not produce a readable temporary projection`)
      }

      for (const step of stepResults) {
        if (!step.temporaryOutputPath || !step.outputPath) continue
        const payload = await readJsonFile(step.temporaryOutputPath)
        await writeJsonAtomically(resolve(repoRoot, step.outputPath), payload)
      }
      await writeJsonAtomically(statusOutput.filePath, report)
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(
        statusOutput.enabled
          ? `Reliability suite published: ${statusOutput.displayPath}`
          : 'Reliability suite completed with temporary projections only; public/status was not modified.',
      )
      console.log(`passed=${report.summary.passed} failed=${report.summary.failed} skipped=${report.summary.skipped}`)
      console.log(`coverage: complete=${report.summary.coverage.complete} partial=${report.summary.coverage.partial} none=${report.summary.coverage.none} unknown=${report.summary.coverage.unknown}`)
    }

    if (args.strict && !report.ok) process.exitCode = 1
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  const message = sanitizeIssue(error instanceof Error ? error.message : String(error))
  console.error(message)
  process.exitCode = 1
})
