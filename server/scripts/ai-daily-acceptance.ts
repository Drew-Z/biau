import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  aiDailyAcceptanceManifestDefaultPath,
  createAiDailyAcceptanceManifest,
  evaluateAiDailyAcceptanceManifest,
  sealAiDailyAcceptanceManifest,
} from '../src/aiDailyAcceptance.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const defaultProposalPath = 'server/data/ai-daily-model-evaluation.local.json'
const defaultBundlePath = 'server/data/ai-daily-model-approval.v1.json'

type Command = 'init' | 'check' | 'seal'

const allowedOptions: Record<Command, ReadonlySet<string>> = {
  init: new Set(['acceptance-id', 'edition-date', 'created-at', 'proposal', 'bundle', 'out']),
  check: new Set(['manifest', 'proposal', 'bundle', 'require-sealed']),
  seal: new Set(['manifest', 'proposal', 'bundle', 'out']),
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (command === 'init') {
    const proposalPath = await optionPath(options, 'proposal', defaultProposalPath)
    const bundlePath = await optionPath(options, 'bundle', defaultBundlePath)
    const outPath = await optionPath(options, 'out', aiDailyAcceptanceManifestDefaultPath)
    assertLocalOutput(outPath)
    const proposal = await readJson(proposalPath)
    const bundle = await readJson(bundlePath)
    const manifest = createAiDailyAcceptanceManifest({
      acceptanceId: requiredOption(options, 'acceptance-id'),
      editionDate: requiredOption(options, 'edition-date'),
      createdAt: options.get('created-at'),
      proposal,
      bundle,
    })
    await writeJson(outPath, manifest)
    print({ command, output: displayPath(outPath), acceptanceId: manifest.acceptanceId, editionDate: manifest.editionDate, sealed: false })
    return
  }

  const manifestPath = await optionPath(options, 'manifest', aiDailyAcceptanceManifestDefaultPath)
  const manifest = await readJson(manifestPath)
  const proposalPath = await optionPath(options, 'proposal', defaultProposalPath)
  const bundlePath = await optionPath(options, 'bundle', defaultBundlePath)
  const artifactPair = await readOptionalArtifactPair(options, proposalPath, bundlePath, command === 'check')

  if (command === 'check') {
    const result = evaluateAiDailyAcceptanceManifest({
      manifest,
      proposal: artifactPair.proposal,
      bundle: artifactPair.bundle,
      requireArtifacts: true,
      requireSealed: options.has('require-sealed'),
    })
    if (!result.ok) {
      print({ command, manifest: displayPath(manifestPath), ok: false, issues: result.issues })
      process.exitCode = 1
      return
    }
    const issues = [...new Set([...result.issues, ...artifactPair.issues])]
    print({
      command,
      manifest: displayPath(manifestPath),
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

  const sealed = sealAiDailyAcceptanceManifest({
    manifest,
    proposal: artifactPair.proposal,
    bundle: artifactPair.bundle,
  })
  const outPath = await optionPath(options, 'out', manifestPath)
  assertLocalOutput(outPath)
  await writeJson(outPath, sealed)
  print({ command, output: displayPath(outPath), sealed: true, recordHash: sealed.recordHash })
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

async function optionPath(options: Map<string, string>, name: string, fallback: string) {
  const path = resolve(repoRoot, options.get(name) ?? fallback)
  const repoRelativePath = relative(repoRoot, path)
  if (repoRelativePath.startsWith('..') || isAbsolute(repoRelativePath)) throw new Error(`path-outside-repository:${name}`)
  await assertRealPathInsideRepository(path, name)
  return path
}

async function assertRealPathInsideRepository(path: string, label: string) {
  let current = path
  const repositoryRealPath = await realpath(repoRoot)
  while (true) {
    try {
      const currentRealPath = await realpath(current)
      const realRelativePath = relative(repositoryRealPath, currentRealPath)
      if (realRelativePath.startsWith('..') || isAbsolute(realRelativePath)) throw new Error(`path-outside-repository:${label}`)
      return
    } catch (error) {
      if (!isMissingPathError(error)) throw error
      const parent = dirname(current)
      if (parent === current) throw new Error(`path-outside-repository:${label}`, { cause: error })
      current = parent
    }
  }
}

function isMissingPathError(error: unknown) {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT'
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
  return { proposal: await readJson(proposalPath), bundle: await readJson(bundlePath), issues: [] }
}

async function readJson(path: string) {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown
  } catch (error) {
    throw new Error(`read-json-failed:${displayPath(path)}:${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function fileExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function assertLocalOutput(path: string) {
  if (!basename(path).includes('.local.')) throw new Error('acceptance-output-must-be-local-file')
}

function displayPath(path: string) {
  return relative(repoRoot, path).replaceAll('\\', '/') || '.'
}

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
