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

export interface AiDailyIssueReadinessSource {
  title: string
  url: string
  sourceName: string
  summary: string
  sourceTier?: string
}

export type AiDailyIssueReadinessField = AiDailyBriefIssue['field'] | 'sources' | 'sourceUrl' | 'sourceSummary'

export interface AiDailyIssueReadinessIssue {
  level: 'error' | 'warning'
  field: AiDailyIssueReadinessField
  message: string
}

export interface AiDailyBriefValidation {
  brief: AiDailyBrief | null
  issues: AiDailyBriefIssue[]
  hasErrors: boolean
  hasWarnings: boolean
}

export interface AiDailyIssueReadiness {
  issues: AiDailyIssueReadinessIssue[]
  hasErrors: boolean
  hasWarnings: boolean
  ready: boolean
  sourceCount: number
  usefulSourceCount: number
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

function normalizeText(value: string) {
  return value.trim().replace(/\s+/gu, ' ')
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return null
  return value.map((item) => (typeof item === 'string' ? normalizeText(item) : '')).filter(Boolean)
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
  if (brief.keySignals.some((item) => item.length < 8)) {
    pushIssue(issues, 'warning', 'keySignals', '关键信号偏短，建议写成可复核的具体变化。')
  }
  if (brief.toVerify.some((item) => item.length < 8)) {
    pushIssue(issues, 'warning', 'toVerify', '待核查项偏短，建议写清楚需要复核的事实。')
  }

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

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function pushReadinessIssue(
  issues: AiDailyIssueReadinessIssue[],
  level: AiDailyIssueReadinessIssue['level'],
  field: AiDailyIssueReadinessField,
  message: string,
) {
  issues.push({ level, field, message })
}

function hasUsefulSourceSummary(source: AiDailyIssueReadinessSource) {
  return normalizeText(source.summary).length >= 24
}

export function evaluateAiDailyIssueReadiness({
  briefValidation,
  sources,
}: {
  briefValidation: AiDailyBriefValidation
  sources: AiDailyIssueReadinessSource[]
}): AiDailyIssueReadiness {
  const issues: AiDailyIssueReadinessIssue[] = briefValidation.issues.map((issue) => ({
    level: issue.level,
    field: issue.field,
    message: issue.message,
  }))

  const brief = briefValidation.brief
  if (!brief || briefValidation.hasErrors) {
    pushReadinessIssue(issues, 'error', 'brief', 'brief 还没有形成可审核的结构。')
  } else {
    if (brief.summary.trim().length < 20) {
      pushReadinessIssue(issues, 'error', 'summary', '进入审核前需要补充本期摘要，不能只保留占位或短句。')
    }
    if (brief.publicAngle.trim().length < 16) {
      pushReadinessIssue(issues, 'error', 'publicAngle', '进入审核前需要写清楚公开读者为什么要关注。')
    }
    if (brief.keySignals.length === 0) {
      pushReadinessIssue(issues, 'error', 'keySignals', '进入审核前至少需要 1 个可复核的关键信号。')
    }
    if (brief.toVerify.length === 0) {
      pushReadinessIssue(issues, 'error', 'toVerify', '进入审核前至少需要 1 个待核查项。')
    }
  }

  const selectedSources = sources.filter((source) => source.title.trim() || source.url.trim() || source.sourceName.trim())
  const usefulSourceCount = selectedSources.filter(hasUsefulSourceSummary).length
  if (selectedSources.length === 0) {
    pushReadinessIssue(issues, 'error', 'sources', '进入审核前至少选择 1 个公开来源。')
  }
  if (selectedSources.length > 0 && usefulSourceCount === 0) {
    pushReadinessIssue(issues, 'error', 'sourceSummary', '至少 1 个来源需要有可转述的摘要，草稿才有证据骨架。')
  }
  if (selectedSources.some((source) => !source.title.trim() || !source.sourceName.trim())) {
    pushReadinessIssue(issues, 'error', 'sources', '选中来源必须包含标题和来源名称。')
  }
  if (selectedSources.some((source) => !isPublicHttpUrl(source.url))) {
    pushReadinessIssue(issues, 'error', 'sourceUrl', '选中来源必须使用公开 http(s) 链接。')
  }
  if (selectedSources.length > 0 && selectedSources.length < 3) {
    pushReadinessIssue(issues, 'warning', 'sources', '建议至少选择 3 个来源，让日报判断更稳。')
  }
  if (selectedSources.some((source) => !hasUsefulSourceSummary(source))) {
    pushReadinessIssue(issues, 'warning', 'sourceSummary', '部分来源摘要偏短，转草稿后仍需要人工补充。')
  }
  if (selectedSources.some((source) => source.sourceTier === 'manual-candidate' || source.sourceTier === 'community-generated')) {
    pushReadinessIssue(issues, 'warning', 'sources', '包含手动候选或社区来源，发布前需要优先复核原始出处。')
  }

  const hasErrors = issues.some((issue) => issue.level === 'error')
  const hasWarnings = issues.some((issue) => issue.level === 'warning')
  return {
    issues,
    hasErrors,
    hasWarnings,
    ready: !hasErrors,
    sourceCount: selectedSources.length,
    usefulSourceCount,
  }
}
