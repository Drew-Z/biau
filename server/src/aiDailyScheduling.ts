const DEFAULT_AI_DAILY_TIME_ZONE = 'Asia/Shanghai'

export function getAiDailyTimeZone(source: NodeJS.ProcessEnv = process.env) {
  return source.AI_DAILY_TIME_ZONE?.trim() || DEFAULT_AI_DAILY_TIME_ZONE
}

export function formatAiDailyApplicationDate(now: Date, timeZone = DEFAULT_AI_DAILY_TIME_ZONE) {
  if (Number.isNaN(now.getTime())) throw new Error('invalid-ai-daily-clock')
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    if (!values.year || !values.month || !values.day) throw new Error('invalid-ai-daily-date-parts')
    return `${values.year}-${values.month}-${values.day}`
  } catch {
    throw new Error(`invalid-ai-daily-time-zone:${timeZone}`)
  }
}
