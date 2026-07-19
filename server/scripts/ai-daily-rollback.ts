import {
  aiDailyRollbackEvidenceDefaultPath,
  createAiDailyRollbackEvidenceManifest,
  evaluateAiDailyRollbackEvidenceManifest,
  sealAiDailyRollbackEvidenceManifest,
} from '../src/aiDailyRollback.js'
import {
  assertLocalOutput,
  displayRepositoryPath,
  readJsonFile,
  resolveRepositoryPath,
  writeJsonFile,
} from './local-evidence-file.js'

type Command = 'init' | 'check' | 'seal'

const allowedOptions: Record<Command, ReadonlySet<string>> = {
  init: new Set(['evidence-id', 'recorded-by', 'recorded-at', 'acceptance-id', 'edition-date', 'issue-id', 'run-id', 'reason', 'out']),
  check: new Set(['manifest', 'require-sealed']),
  seal: new Set(['manifest', 'out']),
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (command === 'init') {
    const outPath = await resolveRepositoryPath(options, 'out', aiDailyRollbackEvidenceDefaultPath)
    assertLocalOutput(outPath, 'rollback-output-must-be-local-file')
    const manifest = createAiDailyRollbackEvidenceManifest({
      evidenceId: requiredOption(options, 'evidence-id'),
      recordedBy: requiredOption(options, 'recorded-by'),
      recordedAt: options.get('recorded-at'),
      acceptanceBinding: {
        acceptanceId: requiredOption(options, 'acceptance-id'),
        editionDate: requiredOption(options, 'edition-date'),
        issueId: requiredOption(options, 'issue-id'),
        runId: requiredOption(options, 'run-id'),
      },
      reason: requiredOption(options, 'reason') as 'acceptance-drill' | 'production-incident' | 'operator-request',
    })
    await writeJsonFile(outPath, manifest)
    print({ command, output: displayRepositoryPath(outPath), evidenceId: manifest.evidenceId, sealed: false })
    return
  }

  const manifestPath = await resolveRepositoryPath(options, 'manifest', aiDailyRollbackEvidenceDefaultPath)
  const manifest = await readJsonFile(manifestPath)
  if (command === 'check') {
    const result = evaluateAiDailyRollbackEvidenceManifest({
      manifest,
      requireSealed: options.has('require-sealed'),
    })
    if (!result.ok) {
      print({ command, manifest: displayRepositoryPath(manifestPath), ok: false, issues: result.issues })
      process.exitCode = 1
      return
    }
    print({
      command,
      manifest: displayRepositoryPath(manifestPath),
      ok: result.readyToSeal && (!options.has('require-sealed') || result.sealed),
      readyToSeal: result.readyToSeal,
      sealed: result.sealed,
      issues: result.issues,
    })
    if (!result.readyToSeal || (options.has('require-sealed') && !result.sealed)) process.exitCode = 1
    return
  }

  const sealed = sealAiDailyRollbackEvidenceManifest({ manifest })
  const outPath = await resolveRepositoryPath(options, 'out', manifestPath)
  assertLocalOutput(outPath, 'rollback-output-must-be-local-file')
  await writeJsonFile(outPath, sealed)
  print({ command, output: displayRepositoryPath(outPath), sealed: true, recordHash: sealed.recordHash })
}

function parseArgs(argv: string[]) {
  const [rawCommand, ...rest] = argv
  if (rawCommand !== 'init' && rawCommand !== 'check' && rawCommand !== 'seal') {
    throw new Error('usage: ai-daily-rollback.ts <init|check|seal> [options]')
  }
  const command = rawCommand as Command
  const options = new Map<string, string>()
  const setOption = (name: string, value: string) => {
    if (!allowedOptions[command].has(name)) throw new Error(`unknown-option:${name}`)
    if (options.has(name)) throw new Error(`duplicate-option:${name}`)
    if (name === 'require-sealed' && value !== 'true') throw new Error('invalid-option-value:require-sealed')
    if (name !== 'require-sealed' && value.trim().length === 0) throw new Error(`missing-option-value:${name}`)
    options.set(name, value)
  }
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token?.startsWith('--')) throw new Error(`unknown-argument:${token ?? ''}`)
    const equals = token.indexOf('=')
    if (equals > 2) {
      setOption(token.slice(2, equals), token.slice(equals + 1))
      continue
    }
    const name = token.slice(2)
    if (name === 'require-sealed') {
      setOption(name, 'true')
      continue
    }
    const value = rest[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing-option-value:${name}`)
    setOption(name, value)
    index += 1
  }
  return { command, options }
}

function requiredOption(options: Map<string, string>, name: string) {
  const value = options.get(name)?.trim()
  if (!value) throw new Error(`missing-required-option:${name}`)
  return value
}

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
