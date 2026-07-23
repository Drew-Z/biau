import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import {
  classifyAiDailyProductionConfigurationError,
  resolveAiDailyProductionGenerationExecution,
  type AiDailyProductionConfigurationIssue,
} from './aiDailyGenerationExecution.js'
import { executeAiDailyGenerationWork } from './aiDailyGenerationRunner.js'
import {
  appendAiDailyRunEvent,
  claimAiDailyWorkItem,
  loadAiDailyGenerationEvidencePack,
  queueAiDailyGenerationWork,
} from './aiDailyRepository.js'
import { env } from './env.js'

export const aiDailyLiveRunConfirmation = 'RUN_APPROVED_PRODUCTION_EDITION'

const productionWorkerLeaseMs = 20 * 60_000
const productionWorkerPollMs = 30_000
const productionWorkerConfigurationRetryMs = 60_000
const productionWorkerBatchSize = 4

export type AiDailyProductionReadiness =
  | { status: 'disabled'; enabled: false; issue: 'production-generation-disabled' }
  | { status: 'misconfigured'; enabled: true; issue: AiDailyProductionConfigurationIssue }
  | { status: 'ready'; enabled: true; issue: null }

export class AiDailyStudioProductionError extends Error {
  constructor(
    readonly code:
      | 'ai-daily-production-generation-disabled'
      | 'ai-daily-production-configuration-invalid'
      | 'ai-daily-generation-evidence-not-ready'
      | 'ai-daily-issue-version-conflict',
    readonly details: { issue?: AiDailyProductionConfigurationIssue; issues?: string[] } = {},
  ) {
    super(code)
    this.name = 'AiDailyStudioProductionError'
  }
}

export async function inspectAiDailyProductionReadiness(): Promise<AiDailyProductionReadiness> {
  if (!env.aiDailyProductionGenerationEnabled) {
    return { status: 'disabled', enabled: false, issue: 'production-generation-disabled' }
  }
  try {
    await resolveAiDailyProductionGenerationExecution()
    return { status: 'ready', enabled: true, issue: null }
  } catch (error) {
    return {
      status: 'misconfigured',
      enabled: true,
      issue: classifyAiDailyProductionConfigurationError(error),
    }
  }
}

export async function queueAiDailyStudioProductionRun(
  prisma: PrismaClient,
  input: {
    issueId: string
    actor: string
    expectedIssueUpdatedAt: Date
  },
) {
  if (!env.aiDailyProductionGenerationEnabled) {
    throw new AiDailyStudioProductionError('ai-daily-production-generation-disabled')
  }
  const issue = await prisma.aiDailyIssue.findUnique({
    where: { id: input.issueId },
    select: { id: true, updatedAt: true },
  })
  if (!issue) throw new Error('ai-daily-issue-not-found')
  if (issue.updatedAt.getTime() !== input.expectedIssueUpdatedAt.getTime()) {
    throw new AiDailyStudioProductionError('ai-daily-issue-version-conflict')
  }

  let execution
  try {
    execution = await resolveAiDailyProductionGenerationExecution()
  } catch (error) {
    throw new AiDailyStudioProductionError('ai-daily-production-configuration-invalid', {
      issue: classifyAiDailyProductionConfigurationError(error),
    })
  }

  const evidencePack = await loadAiDailyGenerationEvidencePack(prisma, issue.id)
  const evidenceIssues = summarizeEvidenceReadinessIssues(evidencePack)
  if (evidenceIssues.length > 0) {
    throw new AiDailyStudioProductionError('ai-daily-generation-evidence-not-ready', { issues: evidenceIssues })
  }

  const queued = await queueAiDailyGenerationWork(prisma, {
    issueId: issue.id,
    trigger: 'MANUAL',
    profile: execution.profile,
    configVersion: execution.configVersion,
  })
  if (queued.created) {
    try {
      await appendAiDailyRunEvent(prisma, {
        runId: queued.run.id,
        kind: 'studio-live-run-queued',
        outcome: 'accepted',
        metadataJson: { actor: input.actor },
      })
    } catch {
      console.error('AI Daily production queue audit event failed: persistence-error')
    }
  }
  wakeAiDailyStudioProductionWorker(prisma)
  return {
    runId: queued.run.id,
    workItemId: queued.work.id,
    created: queued.created,
    status: queued.work.status.toLowerCase().replaceAll('_', '-'),
  }
}

function summarizeEvidenceReadinessIssues(
  pack: Awaited<ReturnType<typeof loadAiDailyGenerationEvidencePack>>,
) {
  const issues: string[] = []
  if (pack.gaps.length > 0) issues.push('selected-evidence-incomplete')
  if (pack.evidence.length < 3) issues.push('minimum-selected-evidence-not-met')
  if (!pack.evidence.some((item) => item.sourceTier === 'TIER_1')) issues.push('tier1-evidence-missing')
  return [...new Set(issues)]
}

interface ProductionWorkerState {
  prisma: PrismaClient | null
  running: boolean
  wakeRequested: boolean
  timer: ReturnType<typeof setTimeout> | null
}

const productionWorkerState: ProductionWorkerState = {
  prisma: null,
  running: false,
  wakeRequested: false,
  timer: null,
}

export function startAiDailyStudioProductionWorker(prisma: PrismaClient) {
  if (!env.aiDailyProductionGenerationEnabled) return
  productionWorkerState.prisma = prisma
  scheduleProductionWorker(0)
}

export function wakeAiDailyStudioProductionWorker(prisma: PrismaClient) {
  productionWorkerState.prisma = prisma
  productionWorkerState.wakeRequested = true
  scheduleProductionWorker(0)
}

export function stopAiDailyStudioProductionWorker() {
  productionWorkerState.prisma = null
  productionWorkerState.wakeRequested = false
  if (productionWorkerState.timer) clearTimeout(productionWorkerState.timer)
  productionWorkerState.timer = null
}

function scheduleProductionWorker(delayMs: number) {
  if (!productionWorkerState.prisma || !env.aiDailyProductionGenerationEnabled) return
  if (productionWorkerState.running) {
    productionWorkerState.wakeRequested = true
    return
  }
  if (productionWorkerState.timer) {
    if (delayMs > 0) return
    clearTimeout(productionWorkerState.timer)
  }
  productionWorkerState.timer = setTimeout(() => void runScheduledProductionWorker(), delayMs)
  productionWorkerState.timer.unref?.()
}

async function runScheduledProductionWorker() {
  const prisma = productionWorkerState.prisma
  productionWorkerState.timer = null
  if (!prisma || productionWorkerState.running || !env.aiDailyProductionGenerationEnabled) return
  productionWorkerState.running = true
  productionWorkerState.wakeRequested = false
  let nextDelay = productionWorkerPollMs
  try {
    const execution = await resolveAiDailyProductionGenerationExecution()
    const workerId = `ai-daily-studio-${randomUUID().slice(0, 8)}`
    for (let processed = 0; processed < productionWorkerBatchSize; processed += 1) {
      const claimed = await claimAiDailyWorkItem(prisma, {
        leaseOwner: workerId,
        leaseDurationMs: productionWorkerLeaseMs,
        kinds: ['EXTRACT_FACTS'],
        profiles: ['PRODUCTION'],
      })
      if (!claimed) break
      try {
        await executeAiDailyGenerationWork({
          prisma,
          workItemId: claimed.workItem.id,
          leaseToken: claimed.leaseToken,
          providers: execution.providers,
          workerId,
          modelIdentifier: execution.modelIdentifier,
        })
      } catch (error) {
        console.error(`AI Daily production worker task failed: ${classifyProductionWorkerError(error)}`)
      }
      if (processed === productionWorkerBatchSize - 1) nextDelay = 0
    }
  } catch (error) {
    nextDelay = productionWorkerConfigurationRetryMs
    console.error(`AI Daily production worker paused: ${classifyAiDailyProductionConfigurationError(error)}`)
  } finally {
    productionWorkerState.running = false
    scheduleProductionWorker(productionWorkerState.wakeRequested ? 0 : nextDelay)
  }
}

function classifyProductionWorkerError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('provider')) return 'provider-error'
  if (message.includes('deadline')) return 'deadline-exceeded'
  if (message.includes('lease')) return 'lease-error'
  if (message.includes('checkpoint')) return 'checkpoint-error'
  return 'generation-runner-error'
}
