export type AiDailyRunnerGenerationMode = 'fixture' | 'live'

export function resolveAiDailyRunnerGenerationMode(input: {
  fixture: boolean
  live: boolean
  productionEnabled: boolean
}): AiDailyRunnerGenerationMode {
  if (input.fixture && input.live) throw new Error('ai-daily-generation-mode-conflict')
  if (input.fixture) return 'fixture'
  if (input.live) {
    if (!input.productionEnabled) throw new Error('ai-daily-production-generation-disabled')
    return 'live'
  }
  throw new Error('ai-daily-generation-mode-required')
}
