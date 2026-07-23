import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  approveAiDailyModelManualSelectionProposal,
  validateAiDailyModelManualSelectionProposal,
} from '../src/aiDailyModelArtifacts.js'

const acknowledgeReducedRedundancy = process.argv.includes('--acknowledge-reduced-redundancy')

async function main() {
  const input = readArg('--input')
  const reviewedBy = readArg('--reviewed-by')
  const notes = readArg('--notes')
  if (!input || !reviewedBy || !notes) {
    throw new Error('usage: ai-daily-model-select-approve --input <selection.local.json> --reviewed-by <safe-id> --notes <safe-note> --acknowledge-reduced-redundancy [--out <path>]')
  }
  const inputPath = path.resolve(input)
  const outputPath = path.resolve(readArg('--out') || 'server/data/ai-daily-model-approval.v1.json')
  const proposal = validateAiDailyModelManualSelectionProposal(JSON.parse(await readFile(inputPath, 'utf8')))
  const bundle = approveAiDailyModelManualSelectionProposal({
    proposal,
    review: { reviewedAt: new Date().toISOString(), reviewedBy, notes },
    acknowledgeReducedRedundancy,
  })
  await writeJsonAtomic(outputPath, bundle)
  console.log(JSON.stringify({
    output: outputPath,
    bundleHash: bundle.bundleHash,
    selectionId: bundle.selection.selectionId,
    selectionBasis: 'manual-static-selection',
    approvalStatus: bundle.selection.approval.status,
    redundancy: bundle.selection.redundancy,
    modelCalls: 0,
    roles: bundle.selection.roles.map((role) => ({
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
