import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createAiDailyModelEvaluationProposal } from '../src/aiDailyModelArtifacts.js'
import { evaluateAiDailyBusinessCandidate } from '../src/aiDailyModelBusinessEvaluation.js'
import {
  readAiDailyModelRuntimeConfig,
  resolveAiDailyRuntimeCandidate,
  validateAiDailyModelEvaluationPool,
} from '../src/aiDailyModelRuntime.js'
import { env } from '../src/env.js'

const execute = process.argv.includes('--execute')
const allowReducedRedundancy = process.argv.includes('--allow-reduced-redundancy')
const approvalId = readArg('--approval-id')
const outputPath = path.resolve(readArg('--out') || 'server/data/ai-daily-model-evaluation.local.json')

async function main() {
  if (!execute) throw new Error('ai-daily-business-evaluation-requires---execute')
  if (!env.aiDailyBusinessEvaluationEnabled) throw new Error('ai-daily-business-evaluation-disabled')
  if (!approvalId || approvalId !== env.aiDailyModelEvaluationApprovalId) {
    throw new Error('ai-daily-business-evaluation-approval-id-mismatch')
  }
  if (!path.basename(outputPath).includes('.local.')) {
    throw new Error('ai-daily-business-evaluation-output-must-be-local')
  }
  const runtimeResult = readAiDailyModelRuntimeConfig(undefined, { allowLocalBaseUrl: env.nodeEnv !== 'production' })
  if (!runtimeResult.ok) throw new Error(`invalid-ai-daily-model-runtime:${runtimeResult.issues.join(',')}`)
  const pool = validateAiDailyModelEvaluationPool(runtimeResult.config, { allowReducedRedundancy })
  if (pool.reducedRedundancyRoles.length > 0) {
    console.warn(`AI Daily evaluation uses reduced redundancy for: ${pool.reducedRedundancyRoles.join(', ')}. Models share a provider failure domain; this is comparison, not failover.`)
  }

  const evaluatedAt = new Date().toISOString()
  const candidateInputs = []
  for (const candidate of runtimeResult.config.candidates) {
    const resolved = resolveAiDailyRuntimeCandidate(runtimeResult.config, candidate.candidateId)
    if (!resolved) throw new Error('ai-daily-model-runtime-candidate-missing')
    console.log(`AI Daily business evaluation started: ${candidate.candidateId} (${candidate.role})`)
    candidateInputs.push(await evaluateAiDailyBusinessCandidate({
      candidate: resolved.candidate,
      channel: resolved.channel,
      evaluationRunId: approvalId,
      evaluatedAt,
      onProgress(progress) {
        if (progress.completed % 5 === 0 || progress.completed === progress.total) {
          console.log(`AI Daily business evaluation progress: ${progress.candidateId} ${progress.completed}/${progress.total}`)
        }
      },
    }))
  }
  const proposal = createAiDailyModelEvaluationProposal({
    selectionId: `${approvalId}-selection`,
    generatedAt: evaluatedAt,
    candidates: candidateInputs,
  })
  await writeJsonAtomic(outputPath, proposal)
  console.log(JSON.stringify({
    output: outputPath,
    proposalHash: proposal.proposalHash,
    approvalEligible: proposal.selection.approvalEligible,
    reducedRedundancyOptIn: allowReducedRedundancy,
    roles: proposal.selection.roles.map((role) => ({
      role: role.role,
      primaryCandidateId: role.primaryCandidateId,
      fallbackCandidateIds: role.fallbackCandidateIds,
      redundancy: role.redundancy,
      blockingGaps: role.blockingGaps,
      warnings: role.warnings,
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
