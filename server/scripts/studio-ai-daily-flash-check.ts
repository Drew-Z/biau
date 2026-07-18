import {
  evaluateAiDailyFlashLifecycleTransition,
  evaluateAiDailyFlashRevisionTransition,
} from '../src/aiDailyDomain.js'
import { assertDeepEqual } from './ai-daily-check-helpers.js'

const lifecycleTransitions = [
  ['ACTIVE', 'HELD'],
  ['HELD', 'ACTIVE'],
  ['ACTIVE', 'WITHDRAWN'],
] as const

for (const [current, next] of lifecycleTransitions) {
  assertDeepEqual(
    evaluateAiDailyFlashLifecycleTransition(current, next),
    { ok: true, current, next },
    `flash lifecycle ${current} -> ${next}`,
  )
}

const revisionTransitions = [
  ['DRAFT', 'APPROVED'],
  ['DRAFT', 'REJECTED'],
  ['APPROVED', 'SUPERSEDED'],
] as const

for (const [current, next] of revisionTransitions) {
  assertDeepEqual(
    evaluateAiDailyFlashRevisionTransition(current, next),
    { ok: true, current, next },
    `flash revision ${current} -> ${next}`,
  )
}

assertDeepEqual(
  evaluateAiDailyFlashLifecycleTransition('WITHDRAWN', 'ACTIVE'),
  {
    ok: false,
    error: 'invalid-ai-daily-transition',
    domain: 'flash-lifecycle',
    current: 'WITHDRAWN',
    next: 'ACTIVE',
  },
  'withdrawn flash cannot return to active',
)

const invalidRevisionTransitions = [
  ['APPROVED', 'DRAFT'],
  ['REJECTED', 'DRAFT'],
  ['SUPERSEDED', 'APPROVED'],
] as const

for (const [current, next] of invalidRevisionTransitions) {
  assertDeepEqual(
    evaluateAiDailyFlashRevisionTransition(current, next),
    {
      ok: false,
      error: 'invalid-ai-daily-transition',
      domain: 'flash-revision',
      current,
      next,
    },
    `flash revision ${current} -> ${next} should be rejected`,
  )
}

console.log('Studio AI Daily flash transition check passed')
