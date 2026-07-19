import { readFile, rename, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { approveAiDailyModelEvaluationProposal, validateAiDailyModelEvaluationProposal } from '../src/aiDailyModelArtifacts.js'

const inputPath = path.resolve(readArg('--input'))
const outputPath = path.resolve(readArg('--out') || 'server/data/ai-daily-model-approval.v1.json')
const reviewedBy = readArg('--reviewed-by')
const notes = readArg('--notes')

async function main() {
  if (!readArg('--input') || !reviewedBy || !notes) {
    throw new Error('usage: ai-daily-model-approve --input <proposal.local.json> --reviewed-by <safe-id> --notes <review-note> [--out <path>]')
  }
  const proposal = validateAiDailyModelEvaluationProposal(JSON.parse(await readFile(inputPath, 'utf8')))
  const bundle = approveAiDailyModelEvaluationProposal({
    proposal,
    review: { reviewedAt: new Date().toISOString(), reviewedBy, notes },
  })
  await writeJsonAtomic(outputPath, bundle)
  console.log(JSON.stringify({
    output: outputPath,
    bundleHash: bundle.bundleHash,
    selectionId: bundle.selection.selectionId,
    approvalStatus: bundle.selection.approval.status,
    roles: bundle.selection.roles.map((role) => ({
      role: role.role,
      primaryCandidateId: role.primaryCandidateId,
      fallbackCandidateIds: role.fallbackCandidateIds,
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
