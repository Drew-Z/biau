import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { upgradeAiDailyModelManualSelectionProposal } from '../src/aiDailyModelArtifacts.js'

const acknowledgeReducedRedundancy = process.argv.includes('--acknowledge-reduced-redundancy')

async function main() {
  const input = readArg('--input')
  if (!input) {
    throw new Error('usage: ai-daily-model-select-upgrade --input <v1-selection.local.json> --acknowledge-reduced-redundancy [--out <v2-selection.local.json>]')
  }
  const inputPath = path.resolve(input)
  const outputPath = path.resolve(readArg('--out') || input)
  if (!path.basename(outputPath).includes('.local.')) {
    throw new Error('ai-daily-model-manual-selection-output-must-be-local')
  }
  const proposal = upgradeAiDailyModelManualSelectionProposal({
    proposal: JSON.parse(await readFile(inputPath, 'utf8')),
    generatedAt: readArg('--generated-at') || new Date().toISOString(),
    acknowledgeReducedRedundancy,
  })
  await writeJsonAtomic(outputPath, proposal)
  console.log(JSON.stringify({
    output: outputPath,
    proposalHash: proposal.proposalHash,
    selectionId: proposal.selection.selectionId,
    promptVersion: proposal.selection.promptVersion,
    generationSchemaVersion: proposal.selection.generationSchemaVersion,
    selectionBasis: 'manual-static-selection',
    approvalStatus: proposal.selection.approval.status,
    redundancy: proposal.selection.redundancy,
    modelCalls: 0,
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
