import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const repoRoot = process.cwd()

function runStep(index, total, name, args) {
  console.log(`\n[studio:smoke] ${index}/${total} ${name}`)
  console.log(`[studio:smoke] ${npmCommand} ${args.join(' ')}`)

  try {
    execFileSync(npmCommand, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
  } catch (error) {
    throw new Error(`${name} failed with exit code ${error?.status ?? 'unknown'}`)
  }
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
      name: 'Studio review and publish policy',
      args: ['run', 'studio:review-policy-check'],
    },
    {
      name: 'Studio export sample dry-run',
      args: ['run', 'studio:export', '--', '--sample', '--dry-run', '--allow-dirty'],
    },
    {
      name: 'Project detail export plan sample',
      args: ['run', 'studio:project-detail-plan', '--', '--sample', 'legal-rag'],
    },
    {
      name: 'Status detail export plan sample',
      args: ['run', 'studio:status-plan', '--', '--sample', 'legal-rag'],
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
      await runStep(index + 1, steps.length, step.name, step.args)
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
