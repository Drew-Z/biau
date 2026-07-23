import path from 'node:path'
import { buildAiDailyGenerationProvidersFixture } from './aiDailyGenerationFixtures.js'
import type { AiDailyGenerationProviders } from './aiDailyGeneration.js'
import { buildAiDailyProductionProviders, loadAiDailyModelApprovalBundle } from './aiDailyModelProduction.js'
import { readAiDailyModelRuntimeConfig } from './aiDailyModelRuntime.js'
import { env } from './env.js'

export interface AiDailyGenerationExecution {
  profile: 'FIXTURE' | 'PRODUCTION'
  providers: AiDailyGenerationProviders
  configVersion: string
  modelIdentifier: string
}

export function createAiDailyFixtureGenerationExecution(): AiDailyGenerationExecution {
  return {
    profile: 'FIXTURE',
    providers: buildAiDailyGenerationProvidersFixture(),
    configVersion: 'ai-daily-generation-runner-fixture-v1',
    modelIdentifier: 'fixture-provider-suite',
  }
}

export async function resolveAiDailyProductionGenerationExecution(): Promise<AiDailyGenerationExecution> {
  if (!env.aiDailyProductionGenerationEnabled) throw new Error('ai-daily-production-generation-disabled')
  const runtime = readAiDailyModelRuntimeConfig()
  if (!runtime.ok) throw new Error(`invalid-ai-daily-model-runtime:${runtime.issues.join(',')}`)
  if (!env.aiDailyModelApprovalFile) throw new Error('ai-daily-model-approval-file-not-configured')
  if (!path.isAbsolute(env.aiDailyModelApprovalFile)) {
    throw new Error('ai-daily-model-approval-file-path-invalid')
  }
  if (!/^[a-f0-9]{64}$/u.test(env.aiDailyModelApprovalBundleHash)) {
    throw new Error('ai-daily-model-approval-bundle-hash-not-configured')
  }
  const bundle = await loadAiDailyModelApprovalBundle(
    env.aiDailyModelApprovalFile,
    env.aiDailyModelApprovalBundleHash,
  )
  return {
    profile: 'PRODUCTION',
    providers: buildAiDailyProductionProviders({ runtime: runtime.config, bundle }),
    configVersion: `ai-daily-generation-runner-${bundle.bundleHash.slice(0, 12)}`,
    modelIdentifier: `approved-selection/${bundle.selection.recordHash.slice(0, 12)}`,
  }
}

export type AiDailyProductionConfigurationIssue =
  | 'production-generation-disabled'
  | 'model-runtime-invalid'
  | 'model-approval-file-invalid'
  | 'model-approval-bundle-invalid'
  | 'production-configuration-invalid'

export function classifyAiDailyProductionConfigurationError(error: unknown): AiDailyProductionConfigurationIssue {
  const message = error instanceof Error ? error.message : ''
  if (message === 'ai-daily-production-generation-disabled') return 'production-generation-disabled'
  if (message.startsWith('invalid-ai-daily-model-runtime:')) return 'model-runtime-invalid'
  if (message.includes('approval-file')) return 'model-approval-file-invalid'
  if (message.includes('approval-bundle') || message.includes('approved-candidate') || message.includes('runtime-channel-drift')) {
    return 'model-approval-bundle-invalid'
  }
  return 'production-configuration-invalid'
}
