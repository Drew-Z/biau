import type { PrismaClient } from '@prisma/client'
import { drainAiDailyIngestionWork } from './aiDailyIngestionRunner.js'

const ingestionWorkerPollMs = 30_000

interface IngestionWorkerState {
  prisma: PrismaClient | null
  running: boolean
  wakeRequested: boolean
  timer: ReturnType<typeof setTimeout> | null
}

const ingestionWorkerState: IngestionWorkerState = {
  prisma: null,
  running: false,
  wakeRequested: false,
  timer: null,
}

export function startAiDailyStudioIngestionWorker(prisma: PrismaClient) {
  ingestionWorkerState.prisma = prisma
  scheduleIngestionWorker(0)
}

export function wakeAiDailyStudioIngestionWorker(prisma: PrismaClient) {
  ingestionWorkerState.prisma = prisma
  ingestionWorkerState.wakeRequested = true
  scheduleIngestionWorker(0)
}

export function stopAiDailyStudioIngestionWorker() {
  ingestionWorkerState.prisma = null
  ingestionWorkerState.wakeRequested = false
  if (ingestionWorkerState.timer) clearTimeout(ingestionWorkerState.timer)
  ingestionWorkerState.timer = null
}

function scheduleIngestionWorker(delayMs: number) {
  if (!ingestionWorkerState.prisma) return
  if (ingestionWorkerState.running) {
    ingestionWorkerState.wakeRequested = true
    return
  }
  if (ingestionWorkerState.timer) {
    if (delayMs > 0) return
    clearTimeout(ingestionWorkerState.timer)
  }
  ingestionWorkerState.timer = setTimeout(() => void runScheduledIngestionWorker(), delayMs)
  ingestionWorkerState.timer.unref?.()
}

async function runScheduledIngestionWorker() {
  const prisma = ingestionWorkerState.prisma
  ingestionWorkerState.timer = null
  if (!prisma || ingestionWorkerState.running) return
  ingestionWorkerState.running = true
  ingestionWorkerState.wakeRequested = false
  let nextDelay = ingestionWorkerPollMs
  try {
    const result = await drainAiDailyIngestionWork(prisma, { limit: 1 })
    if (result.processed > 0) nextDelay = 0
  } catch (error) {
    console.error(`AI Daily ingestion worker task failed: ${classifyIngestionWorkerError(error)}`)
  } finally {
    ingestionWorkerState.running = false
    scheduleIngestionWorker(ingestionWorkerState.wakeRequested ? 0 : nextDelay)
  }
}

function classifyIngestionWorkerError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('lease')) return 'lease-error'
  if (message.includes('database') || message.includes('Prisma')) return 'persistence-error'
  if (message.includes('source') || message.includes('feed')) return 'source-error'
  return 'ingestion-runner-error'
}
