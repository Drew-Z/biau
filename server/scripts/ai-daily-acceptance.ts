import {
  aiDailyAcceptanceManifestDefaultPath,
  createAiDailyAcceptanceManifest,
  evaluateAiDailyAcceptanceManifest,
  sealAiDailyAcceptanceManifest,
} from '../src/aiDailyAcceptance.js'
import { aiDailyRollbackEvidenceDefaultPath } from '../src/aiDailyRollback.js'
import {
  assertLocalOutput,
  displayRepositoryPath,
  fileExists,
  readJsonFile,
  resolveRepositoryPath,
  writeJsonFile,
} from './local-evidence-file.js'

const defaultProposalPath = 'server/data/ai-daily-model-evaluation.local.json'
const defaultBundlePath = 'server/data/ai-daily-model-approval.v1.json'

type Command = 'init' | 'check' | 'seal'

const allowedOptions: Record<Command, ReadonlySet<string>> = {
  init: new Set(['acceptance-id', 'edition-date', 'created-at', 'proposal', 'bundle', 'out']),
  check: new Set(['manifest', 'proposal', 'bundle', 'rollback', 'require-sealed']),
  seal: new Set(['manifest', 'proposal', 'bundle', 'rollback', 'out']),
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (command === 'init') {
    const proposalPath = await resolveRepositoryPath(options, 'proposal', defaultProposalPath)
    const bundlePath = await resolveRepositoryPath(options, 'bundle', defaultBundlePath)
    const outPath = await resolveRepositoryPath(options, 'out', aiDailyAcceptanceManifestDefaultPath)
    assertLocalOutput(outPath, 'acceptance-output-must-be-local-file')
    const proposal = await readJsonFile(proposalPath)
    const bundle = await readJsonFile(bundlePath)
    const manifest = createAiDailyAcceptanceManifest({
      acceptanceId: requiredOption(options, 'acceptance-id'),
      editionDate: requiredOption(options, 'edition-date'),
      createdAt: options.get('created-at'),
      proposal,
      bundle,
    })
    await writeJsonFile(outPath, manifest)
    print({ command, output: displayRepositoryPath(outPath), acceptanceId: manifest.acceptanceId, editionDate: manifest.editionDate, sealed: false })
    return
  }

  const manifestPath = await resolveRepositoryPath(options, 'manifest', aiDailyAcceptanceManifestDefaultPath)
  const manifest = await readJsonFile(manifestPath)
  const proposalPath = await resolveRepositoryPath(options, 'proposal', defaultProposalPath)
  const bundlePath = await resolveRepositoryPath(options, 'bundle', defaultBundlePath)
  const rollbackPath = await resolveRepositoryPath(options, 'rollback', aiDailyRollbackEvidenceDefaultPath)
  const artifactPair = await readOptionalArtifactPair(options, proposalPath, bundlePath, command === 'check')
  const rollbackEvidence = await fileExists(rollbackPath) ? await readJsonFile(rollbackPath) : undefined

  if (command === 'check') {
    const result = evaluateAiDailyAcceptanceManifest({
      manifest,
      proposal: artifactPair.proposal,
      bundle: artifactPair.bundle,
      rollbackEvidence,
      requireArtifacts: true,
      requireSealed: options.has('require-sealed'),
    })
    if (!result.ok) {
      print({ command, manifest: displayRepositoryPath(manifestPath), ok: false, issues: result.issues })
      process.exitCode = 1
      return
    }
    const issues = [...new Set([...result.issues, ...artifactPair.issues])]
    print({
      command,
      manifest: displayRepositoryPath(manifestPath),
      ok: issues.length === 0 && result.readyToSeal,
      readyToSeal: result.readyToSeal,
      sealed: result.sealed,
      evidenceVerified: result.evidenceVerified,
      gates: result.gates,
      issues,
    })
    if (issues.length > 0 || !result.readyToSeal || (options.has('require-sealed') && !result.sealed)) process.exitCode = 1
    return
  }

  if (artifactPair.issues.length > 0 || artifactPair.proposal === undefined || artifactPair.bundle === undefined) {
    throw new Error(artifactPair.issues[0] ?? 'acceptance-artifacts-required')
  }
  if (rollbackEvidence === undefined) throw new Error('acceptance-rollback-evidence-required')

  const sealed = sealAiDailyAcceptanceManifest({
    manifest,
    proposal: artifactPair.proposal,
    bundle: artifactPair.bundle,
    rollbackEvidence,
  })
  const outPath = await resolveRepositoryPath(options, 'out', manifestPath)
  assertLocalOutput(outPath, 'acceptance-output-must-be-local-file')
  await writeJsonFile(outPath, sealed)
  print({ command, output: displayRepositoryPath(outPath), sealed: true, recordHash: sealed.recordHash })
}

function parseArgs(argv: string[]) {
  const [rawCommand, ...rest] = argv
  if (rawCommand !== 'init' && rawCommand !== 'check' && rawCommand !== 'seal') {
    throw new Error('usage: ai-daily-acceptance.ts <init|check|seal> [options]')
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

async function readOptionalArtifactPair(
  options: Map<string, string>,
  proposalPath: string,
  bundlePath: string,
  allowIncomplete: boolean,
) {
  const proposalExplicit = options.has('proposal')
  const bundleExplicit = options.has('bundle')
  if (proposalExplicit !== bundleExplicit) {
    if (allowIncomplete) return { proposal: undefined, bundle: undefined, issues: ['acceptance-artifact-pair-required'] }
    throw new Error('acceptance-artifact-pair-required')
  }
  const proposalExists = await fileExists(proposalPath)
  const bundleExists = await fileExists(bundlePath)
  if (!proposalExists && !bundleExists && !proposalExplicit) return { proposal: undefined, bundle: undefined, issues: [] }
  if (!proposalExists || !bundleExists) {
    if (allowIncomplete) return { proposal: undefined, bundle: undefined, issues: ['acceptance-artifact-pair-incomplete'] }
    throw new Error('acceptance-artifact-pair-incomplete')
  }
  return { proposal: await readJsonFile(proposalPath), bundle: await readJsonFile(bundlePath), issues: [] }
}

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
