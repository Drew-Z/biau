export interface AiDailyBrief {
  summary: string
  publicAngle: string
  keySignals: string[]
  toVerify: string[]
}

export interface AiDailyBriefIssue {
  level: 'error' | 'warning'
  field: keyof AiDailyBrief | 'brief'
  message: string
}

export interface AiDailyBriefValidation {
  brief: AiDailyBrief | null
  issues: AiDailyBriefIssue[]
  hasErrors: boolean
  hasWarnings: boolean
}

export const aiDailyBriefFieldLabels: Record<keyof AiDailyBrief, string> = {
  summary: '摘要',
  publicAngle: '公开角度',
  keySignals: '关键信号',
  toVerify: '待核查项',
}

export function createDefaultAiDailyBrief(): AiDailyBrief {
  return {
    summary: '',
    publicAngle: '',
    keySignals: [],
    toVerify: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null
}

function pushIssue(
  issues: AiDailyBriefIssue[],
  level: AiDailyBriefIssue['level'],
  field: AiDailyBriefIssue['field'],
  message: string,
) {
  issues.push({ level, field, message })
}

export function validateAiDailyBrief(value: unknown): AiDailyBriefValidation {
  const issues: AiDailyBriefIssue[] = []

  if (!isRecord(value)) {
    pushIssue(issues, 'error', 'brief', 'brief JSON 必须是一个对象。')
    return { brief: null, issues, hasErrors: true, hasWarnings: false }
  }

  const summary = typeof value.summary === 'string' ? value.summary : null
  const publicAngle = typeof value.publicAngle === 'string' ? value.publicAngle : null
  const keySignals = readStringArray(value.keySignals)
  const toVerify = readStringArray(value.toVerify)

  if (summary === null) pushIssue(issues, 'error', 'summary', '缺少 summary 字符串。')
  if (publicAngle === null) pushIssue(issues, 'error', 'publicAngle', '缺少 publicAngle 字符串。')
  if (keySignals === null) pushIssue(issues, 'error', 'keySignals', '缺少 keySignals 字符串数组。')
  if (toVerify === null) pushIssue(issues, 'error', 'toVerify', '缺少 toVerify 字符串数组。')

  if (issues.some((issue) => issue.level === 'error')) {
    return { brief: null, issues, hasErrors: true, hasWarnings: false }
  }

  const brief: AiDailyBrief = {
    summary: summary ?? '',
    publicAngle: publicAngle ?? '',
    keySignals: keySignals ?? [],
    toVerify: toVerify ?? [],
  }

  if (brief.summary.trim().length < 20) pushIssue(issues, 'warning', 'summary', '摘要偏短，建议说明本期日报的核心变化。')
  if (brief.publicAngle.trim().length < 16) {
    pushIssue(issues, 'warning', 'publicAngle', '公开角度偏短，建议写清楚读者为什么要关注。')
  }
  if (brief.keySignals.length === 0) pushIssue(issues, 'warning', 'keySignals', '至少补充 1 个关键信号。')
  if (brief.toVerify.length === 0) pushIssue(issues, 'warning', 'toVerify', '至少补充 1 个待核查项。')

  return {
    brief,
    issues,
    hasErrors: false,
    hasWarnings: issues.some((issue) => issue.level === 'warning'),
  }
}

export function parseAiDailyBriefText(value: string): AiDailyBriefValidation {
  try {
    return validateAiDailyBrief(JSON.parse(value) as unknown)
  } catch {
    const issues: AiDailyBriefIssue[] = [{ level: 'error', field: 'brief', message: 'brief JSON 格式不正确。' }]
    return { brief: null, issues, hasErrors: true, hasWarnings: false }
  }
}

export function formatAiDailyBrief(value: unknown = createDefaultAiDailyBrief()) {
  return JSON.stringify(isRecord(value) ? value : createDefaultAiDailyBrief(), null, 2)
}
