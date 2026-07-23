import { createApp } from './app.js'
import { env } from './env.js'
import { disconnectPrisma } from './db.js'
import { closeRagPostgresPool } from './ragPostgresStore.js'
import { stopAiDailyStudioProductionWorker } from './aiDailyStudioProduction.js'

const app = createApp()
const server = app.listen(env.port, () => {
  console.log(`BIAU assistant API listening on :${env.port}`)
})

async function shutdown() {
  server.close()
  stopAiDailyStudioProductionWorker()
  await closeRagPostgresPool()
  await disconnectPrisma()
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0))
})

process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0))
})
