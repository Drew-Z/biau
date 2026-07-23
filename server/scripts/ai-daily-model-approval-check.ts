import path from 'node:path'
import {
  buildAiDailyProductionProviders,
  loadAiDailyModelApprovalBundle,
  summarizeAiDailyModelApprovalBundle,
} from '../src/aiDailyModelProduction.js'
import { readAiDailyModelRuntimeConfig, summarizeAiDailyModelRuntime } from '../src/aiDailyModelRuntime.js'
import { env } from '../src/env.js'

async function main() {
  if (!env.aiDailyModelApprovalFile) throw new Error('ai-daily-model-approval-file-not-configured')
  if (!path.isAbsolute(env.aiDailyModelApprovalFile)) {
    throw new Error('ai-daily-model-approval-file-path-invalid')
  }
  if (!/^[a-f0-9]{64}$/u.test(env.aiDailyModelApprovalBundleHash)) {
    throw new Error('ai-daily-model-approval-bundle-hash-not-configured')
  }
  const runtime = readAiDailyModelRuntimeConfig()
  if (!runtime.ok) throw new Error(`invalid-ai-daily-model-runtime:${runtime.issues.join(',')}`)

  const bundle = await loadAiDailyModelApprovalBundle(
    env.aiDailyModelApprovalFile,
    env.aiDailyModelApprovalBundleHash,
  )
  buildAiDailyProductionProviders({ runtime: runtime.config, bundle })

  const runtimeSummary = summarizeAiDailyModelRuntime(runtime.config)
  const bundleSummary = summarizeAiDailyModelApprovalBundle(bundle)
  console.log(JSON.stringify({
    ok: true,
    networkCalls: 0,
    selectionBasis: bundleSummary.selectionBasis,
    bundleHash: bundleSummary.bundleHash,
    selectionRecordHash: bundleSummary.selectionRecordHash,
    approvedAt: bundleSummary.approvedAt,
    runtime: {
      channelCount: runtimeSummary.channelCount,
      candidateCount: runtimeSummary.candidateCount,
      failureDomainCount: runtimeSummary.failureDomains.length,
    },
    roles: bundleSummary.roles.map((role) => ({
      role: role.role,
      redundancy: role.redundancy,
      fallbackCount: role.fallbackCandidateIds.length,
    })),
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
