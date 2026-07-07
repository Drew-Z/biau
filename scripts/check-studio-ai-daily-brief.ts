import {
  createDefaultAiDailyBrief,
  evaluateAiDailyIssueReadiness,
  formatAiDailyBrief,
  parseAiDailyBriefText,
  validateAiDailyBrief,
} from '../src/utils/studioAiDailyBrief'
import { buildAiDailyIssueReadinessIssues } from '../server/src/studioAiDailyReadiness'

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
  keySignals: ['   '],
  toVerify: [],
})
assert(!thin.hasErrors, 'thin but well-shaped brief should be saveable')
assert(thin.hasWarnings, 'thin but well-shaped brief should show warnings')
assert(thin.brief?.keySignals.length === 0, 'blank key signal items should be normalized away')

const formatted = formatAiDailyBrief(completeBrief)
assert(formatted.includes('"summary"'), 'formatted brief should include summary')
assert(formatted.includes('"publicAngle"'), 'formatted brief should include publicAngle')

const partialFormatted = formatAiDailyBrief({ summary: '保留已有摘要' })
assert(partialFormatted.includes('保留已有摘要'), 'formatter should preserve partial saved brief objects for editing')
assert(!partialFormatted.includes('"publicAngle"'), 'formatter should not hide partial saved brief objects behind defaults')

const readySource = {
  title: '官方模型平台发布说明',
  url: 'https://example.com/ai-platform-release',
  sourceName: 'Official Platform Blog',
  sourceTier: 'official-primary',
  summary: '官方发布说明介绍了模型平台能力、发布时间和开发者可见的集成边界，适合进入本期日报证据池。',
}

const sourceReady = evaluateAiDailyIssueReadiness({
  briefValidation: completeValidation,
  sources: [
    readySource,
    {
      ...readySource,
      title: '开发工具集成更新',
      url: 'https://example.com/dev-tool-update',
      sourceTier: 'official-secondary',
    },
    {
      ...readySource,
      title: '工程实践案例更新',
      url: 'https://example.com/engineering-practice',
      sourceTier: 'trusted-aggregator',
    },
  ],
})
assert(sourceReady.ready, 'complete brief with useful sources should be review-ready')
assert(!sourceReady.hasErrors, 'source-ready issue should not have blocking errors')
assert(sourceReady.usefulSourceCount === 3, 'source-ready issue should count useful source summaries')

const sourcePoor = evaluateAiDailyIssueReadiness({
  briefValidation: completeValidation,
  sources: [{ ...readySource, summary: '', sourceTier: 'manual-candidate' }],
})
assert(sourcePoor.hasErrors, 'source-poor issue should have blocking readiness errors')
assert(sourcePoor.issues.some((issue) => issue.field === 'sourceSummary'), 'source-poor issue should report source summary quality')

const thinReadiness = evaluateAiDailyIssueReadiness({ briefValidation: thin, sources: [readySource] })
assert(thinReadiness.hasErrors, 'thin brief should block review readiness')
assert(thinReadiness.issues.some((issue) => issue.field === 'summary'), 'thin readiness should report summary')

const malformedReadiness = evaluateAiDailyIssueReadiness({ briefValidation: malformed, sources: [] })
assert(malformedReadiness.hasErrors, 'malformed brief should block readiness')
assert(malformedReadiness.issues.some((issue) => issue.field === 'brief'), 'malformed readiness should report brief')

const serverReadiness = buildAiDailyIssueReadinessIssues(completeBrief, [readySource])
assert(serverReadiness.length === 0, 'server readiness helper should accept complete brief with useful source')

const serverPoorReadiness = buildAiDailyIssueReadinessIssues(completeBrief, [{ ...readySource, summary: '' }])
assert(serverPoorReadiness.some((issue) => issue.field === 'sourceSummary'), 'server readiness should reject sources without summaries')

const serverThinBrief = buildAiDailyIssueReadinessIssues({ summary: '短' }, [readySource])
assert(serverThinBrief.some((issue) => issue.field === 'summary'), 'server readiness should reject thin summary')
assert(serverThinBrief.some((issue) => issue.field === 'publicAngle'), 'server readiness should reject missing publicAngle')

if (issues.length > 0) {
  console.error(`AI Daily brief check failed with ${issues.length} issue(s):`)
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  console.log('AI Daily brief check passed')
}
