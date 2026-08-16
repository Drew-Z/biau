import { createApp } from './app.js'
import { env } from './env.js'
import { disconnectPrisma } from './db.js'
import { closeRagPostgresPool } from './ragPostgresStore.js'
import { inspectAiDailyModelDelivery, stopAiDailyStudioProductionWorker } from './aiDailyStudioProduction.js'
import { stopAiDailyStudioIngestionWorker } from './aiDailyStudioIngestion.js'

const app = createApp()
const server = app.listen(env.port, () => {
  console.log(`BIAU assistant API listening on :${env.port}`)
  void reportAiDailyModelDelivery()
})

async function reportAiDailyModelDelivery() {
  if (env.assistantServiceMode !== 'studio' && env.assistantServiceMode !== 'all') return
  const result = await inspectAiDailyModelDelivery()
  if (result.status === 'not-configured') return
  if (result.status === 'misconfigured') {
    console.error(`AI Daily model delivery check failed (networkCalls=0): ${result.issue}`)
    return
  }
  console.log(
    `AI Daily model delivery check passed (networkCalls=${result.networkCalls}, channelCount=${result.channelCount}, candidateCount=${result.candidateCount}, failureDomainCount=${result.failureDomainCount}, bundleHash=${result.bundleHash})`,
  )
}

async function shutdown() {
  server.close()
  stopAiDailyStudioProductionWorker()
  stopAiDailyStudioIngestionWorker()
  await closeRagPostgresPool()
  await disconnectPrisma()
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0))
})

process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0))
})
