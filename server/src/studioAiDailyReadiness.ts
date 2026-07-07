export interface StudioAiDailyReadinessSource {
  title: string
  url: string
  sourceName: string
  summary: string
}

export interface StudioAiDailyReadinessIssue {
  field: 'brief' | 'summary' | 'publicAngle' | 'keySignals' | 'toVerify' | 'sources' | 'sourceUrl' | 'sourceSummary'
  message: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => readString(item, 240)).filter(Boolean)
}

function isPublicUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function buildAiDailyIssueReadinessIssues(
  briefJson: unknown,
  sources: StudioAiDailyReadinessSource[],
): StudioAiDailyReadinessIssue[] {
  const issues: StudioAiDailyReadinessIssue[] = []
  if (!isRecord(briefJson)) {
    issues.push({ field: 'brief', message: 'brief JSON 必须是一个对象。' })
  } else {
    const summary = readString(briefJson.summary, 600)
    const publicAngle = readString(briefJson.publicAngle, 800)
    const keySignals = readStringArray(briefJson.keySignals)
    const toVerify = readStringArray(briefJson.toVerify)
    if (summary.length < 20) issues.push({ field: 'summary', message: 'summary 不足以进入审核。' })
    if (publicAngle.length < 16) issues.push({ field: 'publicAngle', message: 'publicAngle 不足以进入审核。' })
    if (keySignals.length === 0) issues.push({ field: 'keySignals', message: '至少需要 1 个关键信号。' })
    if (toVerify.length === 0) issues.push({ field: 'toVerify', message: '至少需要 1 个待核查项。' })
  }

  if (sources.length === 0) issues.push({ field: 'sources', message: '至少需要 1 个公开来源。' })
  if (sources.some((source) => !source.title.trim() || !source.sourceName.trim())) {
    issues.push({ field: 'sources', message: '来源必须包含标题和来源名称。' })
  }
  if (sources.some((source) => !isPublicUrl(source.url))) {
    issues.push({ field: 'sourceUrl', message: '来源 URL 必须是公开 http(s) 链接。' })
  }
  if (sources.length > 0 && sources.every((source) => readString(source.summary, 1200).length < 24)) {
    issues.push({ field: 'sourceSummary', message: '至少 1 个来源需要可转述摘要。' })
  }

  return issues
}
