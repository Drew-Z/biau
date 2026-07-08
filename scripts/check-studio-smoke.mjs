import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

function runStep(index, total, name, args, options = {}) {
  console.log(`\n[studio:smoke] ${index}/${total} ${name}`)
  console.log(`[studio:smoke] ${npmCommand} ${args.join(' ')}`)

  return new Promise((resolve, reject) => {
    const shouldCapture = Array.isArray(options.expectedOutputMarkers) && options.expectedOutputMarkers.length > 0
    const child = spawnNpm(args, { stdio: shouldCapture ? ['ignore', 'pipe', 'pipe'] : 'inherit' })
    let output = ''
    if (shouldCapture) {
      child.stdout?.on('data', (chunk) => {
        const text = chunk.toString()
        output += text
        process.stdout.write(text)
      })
      child.stderr?.on('data', (chunk) => {
        const text = chunk.toString()
        output += text
        process.stderr.write(text)
      })
    }
    child.on('error', reject)
    child.on('exit', (code) => {
      const missing = shouldCapture ? options.expectedOutputMarkers.filter((marker) => !output.includes(marker)) : []
      if (code === 0) {
        if (missing.length > 0) {
          reject(new Error(`${name} output missing required marker(s): ${missing.join(', ')}`))
          return
        }
        resolve()
        return
      }
      reject(new Error(`${name} failed with exit code ${code}`))
    })
  })
}

async function assertAiDailySmokeOutput(outputPath) {
  const text = await readFile(outputPath, 'utf8')
  const required = [
    'column: "ai-daily"',
    'status: "draft"',
    'model channel: none',
    'publication state: draft/manual-review',
    '## Review Gates',
  ]
  const missing = required.filter((marker) => !text.includes(marker))
  if (missing.length > 0) {
    throw new Error(`AI Daily smoke draft missing required marker(s): ${missing.join(', ')}`)
  }
}

async function main() {
  const tempDir = await mkdtemp(join(tmpdir(), 'biau-studio-smoke-'))
  const aiDailySmokePath = join(tempDir, 'ai-daily-smoke.md')

  const steps = [
    {
      name: 'Studio export sample dry-run',
      args: ['run', 'studio:export', '--', '--sample', '--dry-run', '--allow-dirty'],
    },
    {
      name: 'Project detail export plan sample',
      args: ['run', 'studio:project-detail-plan', '--', '--sample', 'legal-rag'],
      expectedOutputMarkers: ['project-details:check'],
    },
    {
      name: 'Status detail export plan sample',
      args: ['run', 'studio:status-plan', '--', '--sample', 'legal-rag'],
      expectedOutputMarkers: ['status:contract', 'docs:manual-gates-check'],
    },
    {
      name: 'Offline AI Daily draft sample',
      args: [
        'run',
        'ai-daily:draft',
        '--',
        '--source',
        'content-drafts/ai-daily/sample-sources.json',
        '--out',
        aiDailySmokePath,
        '--force',
      ],
    },
  ]

  try {
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]
      await runStep(index + 1, steps.length, step.name, step.args, {
        expectedOutputMarkers: step.expectedOutputMarkers,
      })
    }
    await assertAiDailySmokeOutput(aiDailySmokePath)
    console.log('\n[studio:smoke] passed without live model calls, external fetches, or tracked draft output.')
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
