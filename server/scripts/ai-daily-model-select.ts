import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createAiDailyModelManualSelectionProposal } from '../src/aiDailyModelArtifacts.js'
import { aiDailyGenerationRoles, type AiDailyGenerationRole } from '../src/aiDailyGeneration.js'
import { readAiDailyModelRuntimeConfig } from '../src/aiDailyModelRuntime.js'
import { env } from '../src/env.js'

const acknowledgeReducedRedundancy = process.argv.includes('--acknowledge-reduced-redundancy')

async function main() {
  const selectionId = readArg('--selection-id')
  const outputPath = path.resolve(readArg('--out') || 'server/data/ai-daily-model-selection.local.json')
  const candidateIds = Object.fromEntries(aiDailyGenerationRoles.map((role) => [role, readArg(`--${role}`)])) as Record<AiDailyGenerationRole, string>
  if (!selectionId || aiDailyGenerationRoles.some((role) => !candidateIds[role])) {
    throw new Error('usage: ai-daily-model-select --selection-id <safe-id> --extractor <candidate-id> --composer <candidate-id> --verifier <candidate-id> --acknowledge-reduced-redundancy [--out <selection.local.json>]')
  }
  if (!path.basename(outputPath).includes('.local.')) {
    throw new Error('ai-daily-model-manual-selection-output-must-be-local')
  }
  const runtime = readAiDailyModelRuntimeConfig(undefined, { allowLocalBaseUrl: env.nodeEnv !== 'production' })
  if (!runtime.ok) throw new Error(`invalid-ai-daily-model-runtime:${runtime.issues.join(',')}`)
  const proposal = createAiDailyModelManualSelectionProposal({
    selectionId,
    generatedAt: readArg('--generated-at') || new Date().toISOString(),
    runtime: runtime.config,
    candidateIds,
    acknowledgeReducedRedundancy,
  })
  await writeJsonAtomic(outputPath, proposal)
  console.log(JSON.stringify({
    output: outputPath,
    proposalHash: proposal.proposalHash,
    selectionId: proposal.selection.selectionId,
    selectionBasis: 'manual-static-selection',
    approvalStatus: proposal.selection.approval.status,
    redundancy: proposal.selection.redundancy,
    modelCalls: 0,
    roles: proposal.selection.roles.map((role) => ({
      role: role.role,
      candidateId: role.candidateId,
      modelIdentifier: role.modelIdentifier,
      redundancy: role.redundancy,
    })),
  }, null, 2))
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filePath)
}

function readArg(name: string) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1]?.trim() ?? '' : ''
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
