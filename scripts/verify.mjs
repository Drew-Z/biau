import { spawn } from 'node:child_process'
import { createServer } from 'node:net'

const preferredPreviewPort = 4174
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function spawnNpm(args, options = {}) {
  if (process.platform !== 'win32') {
    return spawn(npmCommand, args, { shell: false, ...options })
  }

  return spawn('cmd.exe', ['/d', '/s', '/c', [npmCommand, ...args].join(' ')], {
    shell: false,
    ...options,
  })
}

function run(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnNpm(args, {
      stdio: 'inherit',
      ...options,
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${npmCommand} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = createServer()
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          tryPort(port + 1)
          return
        }
        reject(error)
      })
      server.once('listening', () => {
        server.close(() => resolve(port))
      })
      server.listen(port, '127.0.0.1')
    }

    tryPort(startPort)
  })
}

function startPreview(previewPort) {
  return spawnNpm(['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], {
    stdio: 'inherit',
  })
}

async function waitForPreview(previewBase) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(previewBase)
      if (response.ok) return
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Preview did not start at ${previewBase}`)
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

async function stopPreview(child) {
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

await run(['run', 'assistant:index'])
await run(['run', 'assistant:kg-check'])
await run(['run', 'assistant:eval'])
await run(['run', 'assistant:agent-contract'])
await run(['run', 'assistant:agent-eval'])
await run(['run', 'assistant:rag-sync-local'])
await run(['run', 'assistant:meta-check'])
await run(['run', 'assistant:admin-check'])
await run(['run', 'prisma:validate'])
await run(['run', 'lint'])
await run(['run', 'server:build'])
await run(['run', 'server:smoke'])
await run(['run', 'assistant:service-modes-smoke'])
await run(['run', 'assistant:rag-smoke'])
await run(['run', 'cf-assistant:smoke'])
await run(['run', 'build'])
await run(['run', 'blog:check'])
await run(['run', 'blog:knowledge-check'])
await run(['run', 'blog:project-notes-check'])
await run(['run', 'docs:deployment-check'])
await run(['run', 'docs:manual-gates-check'])
await run(['run', 'docs:observability-check'])
await run(['run', 'analytics:check'])
await run(['run', 'studio:ai-daily-brief-check'])
await run(['run', 'studio:smoke'])
await run(['run', 'project-details:check'])
await run(['run', 'status:contract'])

const previewPort = await findAvailablePort(preferredPreviewPort)
const previewBase = `http://127.0.0.1:${previewPort}`
const preview = startPreview(previewPort)
try {
  await waitForPreview(previewBase)
  await run(['run', 'check:ui'], {
    env: { ...process.env, UI_CHECK_BASE: previewBase },
  })
} finally {
  await stopPreview(preview)
}
