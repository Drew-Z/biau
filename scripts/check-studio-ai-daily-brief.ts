import {
  createDefaultAiDailyBrief,
  formatAiDailyBrief,
  parseAiDailyBriefText,
  validateAiDailyBrief,
} from '../src/utils/studioAiDailyBrief'

const issues: string[] = []

function assert(condition: unknown, message: string) {
  if (!condition) issues.push(message)
}

const defaultValidation = validateAiDailyBrief(createDefaultAiDailyBrief())
assert(!defaultValidation.hasErrors, 'default AI Daily brief template should not have blocking errors')
assert(defaultValidation.hasWarnings, 'default AI Daily brief template should surface editorial warnings')

const completeBrief = {
  summary: '本期关注模型平台、开发工具和工程实践中的可公开变化，优先整理对站点读者有复用价值的信号。',
  publicAngle: '帮助读者快速判断哪些 AI 工具变化值得进入自己的工作流。',
  keySignals: ['官方模型更新需要二次核查发布时间', '开发工具集成变化适合作为资源分享候选'],
  toVerify: ['确认来源是否为官方主来源', '确认公开示例不包含付费或私有配置'],
}
const completeValidation = validateAiDailyBrief(completeBrief)
assert(!completeValidation.hasErrors, 'complete AI Daily brief should not have errors')
assert(!completeValidation.hasWarnings, 'complete AI Daily brief should not have warnings')

const malformed = parseAiDailyBriefText('{')
assert(malformed.hasErrors, 'malformed JSON should produce a blocking error')
assert(malformed.issues.some((issue) => issue.field === 'brief'), 'malformed JSON should point at brief')

const incomplete = validateAiDailyBrief({ summary: '只有摘要' })
assert(incomplete.hasErrors, 'incomplete brief should produce blocking errors')
assert(incomplete.issues.some((issue) => issue.field === 'publicAngle'), 'incomplete brief should report publicAngle')
assert(incomplete.issues.some((issue) => issue.field === 'keySignals'), 'incomplete brief should report keySignals')
assert(incomplete.issues.some((issue) => issue.field === 'toVerify'), 'incomplete brief should report toVerify')

const thin = validateAiDailyBrief({
  summary: '',
  publicAngle: '',
  keySignals: [],
  toVerify: [],
})
assert(!thin.hasErrors, 'thin but well-shaped brief should be saveable')
assert(thin.hasWarnings, 'thin but well-shaped brief should show warnings')

const formatted = formatAiDailyBrief(completeBrief)
assert(formatted.includes('"summary"'), 'formatted brief should include summary')
assert(formatted.includes('"publicAngle"'), 'formatted brief should include publicAngle')

const partialFormatted = formatAiDailyBrief({ summary: '保留已有摘要' })
assert(partialFormatted.includes('保留已有摘要'), 'formatter should preserve partial saved brief objects for editing')
assert(!partialFormatted.includes('"publicAngle"'), 'formatter should not hide partial saved brief objects behind defaults')

if (issues.length > 0) {
  console.error(`AI Daily brief check failed with ${issues.length} issue(s):`)
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  console.log('AI Daily brief check passed')
}
