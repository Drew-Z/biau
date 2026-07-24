import { randomUUID } from 'node:crypto'
import { disconnectPrisma, requireStudioDatabase } from '../src/db.js'
import {
  createAiDailyFixtureGenerationExecution,
  resolveAiDailyProductionGenerationExecution,
  type AiDailyGenerationExecution,
} from '../src/aiDailyGenerationExecution.js'
import { executeAiDailyGenerationWork } from '../src/aiDailyGenerationRunner.js'
import { resolveAiDailyRunnerGenerationMode } from '../src/aiDailyRunnerMode.js'
import { env } from '../src/env.js'
import {
  drainAiDailyIngestionWork,
  queueAiDailyIngestionRefresh,
} from '../src/aiDailyIngestionRunner.js'
import {
  claimAiDailyWorkItem,
  queueAiDailyGenerationWork,
} from '../src/aiDailyRepository.js'

const command = process.argv[2]
const fixtureMode = process.argv.includes('--fixture')
const liveMode = process.argv.includes('--live')
const workerId = `ai-daily-cli-${randomUUID().slice(0, 8)}`

async function main() {
  const prisma = requireStudioDatabase()
  switch (command) {
    case 'ingest-tick':
      return runIngestTick(prisma)
    case 'editorial-tick':
      return runEditorialTick(prisma, await resolveGenerationExecution())
    case 'run':
    case 'compose':
    case 'resume':
      return runIssueCommand(prisma, command, await resolveGenerationExecution())
    default:
      throw new Error('usage: ai-daily-runner <ingest-tick|editorial-tick|run|compose|resume> [--issue <id>|--date YYYY-MM-DD] [--fixture|--live]')
  }
}

async function runIngestTick(prisma: ReturnType<typeof requireStudioDatabase>) {
  const queued = await queueAiDailyIngestionRefresh(prisma, {
    timeZone: env.aiDailyTimeZone,
    trigger: 'SCHEDULED',
  })
  const completed = await drainAiDailyIngestionWork(prisma, {
    runId: queued.runId,
    limit: 50,
    workerId,
  })
  console.log(
    `AI Daily ingest tick queued ${queued.queuedFeeds} feed(s), processed ${completed.processed}, succeeded ${completed.succeeded}, failed ${completed.failed}`,
  )
}

async function runEditorialTick(
  prisma: ReturnType<typeof requireStudioDatabase>,
  execution: GenerationExecution,
  runId?: string,
) {
  const claimed = await claimAiDailyWorkItem(prisma, {
    leaseOwner: workerId,
    leaseDurationMs: 20 * 60_000,
    runId,
    kinds: ['EXTRACT_FACTS'],
    profiles: [execution.profile],
  })
  if (!claimed) {
    console.log('AI Daily editorial tick found no generation work')
    return null
  }
  const result = await executeAiDailyGenerationWork({
    prisma,
    workItemId: claimed.workItem.id,
    leaseToken: claimed.leaseToken,
    providers: execution.providers,
    workerId,
    modelIdentifier: execution.modelIdentifier,
  })
  console.log(`AI Daily editorial tick completed with ${result.outcome}`)
  return result
}

async function runIssueCommand(
  prisma: ReturnType<typeof requireStudioDatabase>,
  triggerCommand: 'run' | 'compose' | 'resume',
  execution: GenerationExecution,
) {
  const issueId = readArg('--issue')
  const date = readArg('--date')
  const issue = issueId
    ? await prisma.aiDailyIssue.findUnique({ where: { id: issueId } })
    : date
      ? await prisma.aiDailyIssue.findUnique({ where: { date } })
      : null
  if (!issue) throw new Error('ai-daily-runner-issue-not-found; provide --issue or --date')
  const queued = await queueAiDailyGenerationWork(prisma, {
    issueId: issue.id,
    trigger: triggerCommand === 'resume' ? 'RETRY' : 'MANUAL',
    profile: execution.profile,
    configVersion: execution.configVersion,
  })
  return runEditorialTick(prisma, execution, queued.run.id)
}

async function resolveGenerationExecution(): Promise<GenerationExecution> {
  const mode = resolveAiDailyRunnerGenerationMode({
    fixture: fixtureMode,
    live: liveMode,
    productionEnabled: env.aiDailyProductionGenerationEnabled,
  })
  if (mode === 'fixture') {
    return createAiDailyFixtureGenerationExecution()
  }
  return resolveAiDailyProductionGenerationExecution()
}

type GenerationExecution = AiDailyGenerationExecution

function readArg(name: string) {
  const index = process.argv.indexOf(name)
  if (index < 0) return ''
  return process.argv[index + 1]?.trim() ?? ''
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(disconnectPrisma)
