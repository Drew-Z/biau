import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const defaultTimeoutMs = 120_000

// These checks use fixtures or loopback-only HTTP servers. They must not call
// a model, search provider, production database, or deployed service.
const deterministicChecks = [
  'studio:ai-daily-brief-check',
  'studio:ai-daily-domain-check',
  'studio:ai-daily-workspace-check',
  'studio:ai-daily-flash-check',
  'ai-daily:source-check',
  'ai-daily:manifest-check',
  'ai-daily:discovery-check',
  'ai-daily:evidence-check',
  'ai-daily:freshness-check',
  'ai-daily:dedupe-check',
  'ai-daily:ranking-check',
  'ai-daily:provider-check',
  'ai-daily:composition-check',
  'ai-daily:quality-check',
  'ai-daily:model-evaluation-check',
  'ai-daily:model-runtime-check',
  'ai-daily:runner-check',
  'ai-daily:public-feed-check',
  'ai-daily:operations-check',
  'ai-daily:retention-check',
]

const databaseChecks = [
  'studio:ai-daily-repository-check',
  'ai-daily:repository-check',
  'ai-daily:generation-repository-check',
]

function readArgs(argv) {
  const args = { includeDatabase: false, timeoutMs: defaultTimeoutMs }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--with-database') {
      args.includeDatabase = true
      continue
    }
    if (value === '--timeout') {
      args.timeoutMs = Number(argv[index + 1])
      index += 1
      continue
    }
    if (value.startsWith('--timeout=')) args.timeoutMs = Number(value.slice('--timeout='.length))
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1_000) args.timeoutMs = defaultTimeoutMs
  return args
}

function spawnNpm(script) {
  const args = ['run', script]
  if (process.platform !== 'win32') return spawn(npmCommand, args, { cwd: repoRoot, stdio: 'inherit' })
  return spawn('cmd.exe', ['/d', '/s', '/c', [npmCommand, ...args].join(' ')], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
}

function stopProcessTree(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    return
  }
  child.kill('SIGTERM')
}

function runCheck(script, timeoutMs) {
  return new Promise((resolveResult) => {
    const child = spawnNpm(script)
    let settled = false
    let timedOut = false
    let graceTimer
    const timer = setTimeout(() => {
      timedOut = true
      stopProcessTree(child)
      graceTimer = setTimeout(() => finish(124), 5_000)
    }, timeoutMs)

    const finish = (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearTimeout(graceTimer)
      resolveResult({ code: typeof code === 'number' ? code : 1, timedOut })
    }

    child.once('error', () => finish(1))
    child.once('exit', (code) => finish(code))
  })
}

async function main() {
  const args = readArgs(process.argv.slice(2))
  if (args.includeDatabase && process.env.AI_DAILY_DATABASE_CHECK !== '1') {
    throw new Error('ai-daily-database-check-not-enabled; set AI_DAILY_DATABASE_CHECK=1 for a disposable local test database')
  }

  const checks = args.includeDatabase ? [...deterministicChecks, ...databaseChecks] : deterministicChecks
  const failures = []
  console.log(`AI Daily contract suite: ${checks.length} check(s)`)
  for (const script of checks) {
    console.log(`\n[run] ${script}`)
    const result = await runCheck(script, args.timeoutMs)
    if (result.code !== 0 || result.timedOut) {
      const reason = result.timedOut ? `timed out after ${args.timeoutMs} ms` : `exited with code ${result.code}`
      failures.push(`${script}: ${reason}`)
      console.error(`[fail] ${reason}`)
    } else {
      console.log('[pass] passed')
    }
  }

  if (failures.length > 0) {
    console.error(`\nAI Daily contract suite failed (${failures.length}):`)
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }
  console.log('\nAI Daily contract suite passed')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
