import assert from 'node:assert/strict'
import { createPublicAssistantPetActivity } from '../src/utils/publicAssistantPetActivity'
import { publicAssistantPetCopy } from '../src/data/publicAssistantPetCopy'

const passed: string[] = []
function check(name: string, run: () => void) {
  run()
  passed.push(name)
  console.log('[PASS]', name)
}

check('stable snapshots and owned subscriptions', () => {
  const tasks = createPublicAssistantPetActivity()
  const initial = tasks.getSnapshot()
  assert.equal(tasks.getSnapshot(), initial)
  assert.equal(initial.summary.activity, 'idle')
  let notifications = 0
  const unsubscribe = tasks.subscribe(() => { notifications += 1 })
  tasks.start('session-a', 'request-a')
  assert.ok(notifications > 0)
  assert.equal(initial.summary.activity, 'idle', 'Earlier snapshots must remain immutable')
  unsubscribe()
  const count = notifications
  tasks.start('session-a', 'request-b')
  assert.equal(notifications, count)
})

check('real request stages distinguish thinking, work and review', () => {
  const tasks = createPublicAssistantPetActivity()
  const run = tasks.start('session-a', 'request-a')
  assert.equal(tasks.getSnapshot().summary.activity, 'thinking')
  for (const [stage, activity] of [
    ['understanding_image', 'working'], ['planning', 'thinking'], ['researching', 'working'],
    ['evaluating', 'review'], ['refining', 'working'], ['answering', 'working'],
    ['recovering', 'working'], ['verifying', 'review'], ['saving', 'review'],
  ] as const) {
    tasks.progress(run, stage)
    assert.equal(tasks.getSnapshot().summary.activity, activity)
    const snapshot = tasks.getSnapshot()
    tasks.progress(run, stage)
    assert.equal(tasks.getSnapshot(), snapshot, 'Repeated progress must not produce a new snapshot')
  }
})

check('success stays unread until the exact result is viewed', () => {
  const tasks = createPublicAssistantPetActivity()
  const run = tasks.start('session-a', 'request-a')
  tasks.complete(run, 'answered', 'revision-a')
  assert.equal(tasks.getSnapshot().summary.activity, 'ready')
  assert.equal(tasks.getSnapshot().unreadCount, 1)
  assert.equal(tasks.readVisibleResult('session-b', { revisionId: 'revision-a' }), false)
  assert.equal(tasks.readVisibleResult('session-a', { requestId: 'request-a', revisionId: 'old-revision' }), false)
  assert.equal(tasks.getSnapshot().unreadCount, 1)
  assert.equal(tasks.readVisibleResult('session-a', { revisionId: 'revision-a' }), true)
  assert.equal(tasks.getSnapshot().unreadCount, 0)
  assert.equal(tasks.getSnapshot().summary.activity, 'idle')
})

check('viewing before visual loading preserves exactly one success feedback', () => {
  const tasks = createPublicAssistantPetActivity()
  const run = tasks.start('session-a', 'request-a')
  tasks.complete(run, 'answered')
  const key = tasks.getSnapshot().feedbackKey!
  tasks.readVisibleResult('session-a', { requestId: 'request-a' })
  assert.equal(tasks.getSnapshot().feedbackKey, key)
  assert.equal(tasks.claimFeedback(key), true)
  assert.equal(tasks.claimFeedback(key), false, 'Remounts must not replay the feedback')
  assert.equal(tasks.getSnapshot().feedbackCount, 1)
})

for (const outcome of ['partial', 'uncertain', 'degraded'] as const) {
  check(`${outcome} remains neutral and unread until viewed`, () => {
    const tasks = createPublicAssistantPetActivity()
    const run = tasks.start('session-a', 'request-a')
    tasks.complete(run, outcome)
    assert.equal(tasks.getSnapshot().summary.activity, 'review')
    assert.equal(tasks.getSnapshot().unreadCount, 1)
    assert.equal(tasks.getSnapshot().feedbackKey, null)
    tasks.readVisibleResult('session-a', { requestId: 'request-a' })
    assert.equal(tasks.getSnapshot().summary.activity, 'idle')
    assert.equal(tasks.getSnapshot().feedbackCount, 0)
  })
}

check('blocked response and unresolved authoritative history need input', () => {
  const tasks = createPublicAssistantPetActivity()
  const run = tasks.start('session-a', 'request-a')
  tasks.complete(run, 'blocked')
  assert.equal(tasks.getSnapshot().summary.activity, 'needsInput')
  assert.equal(tasks.getSnapshot().feedbackKey, null)
  assert.equal(tasks.getSnapshot().unreadCount, 0)
  const retry = tasks.start('session-a', 'request-a')
  tasks.needsInput(retry)
  assert.equal(tasks.getSnapshot().summary.activity, 'needsInput')
})

for (const terminal of ['cancel', 'fail'] as const) {
  check(`${terminal} rejects late completion and progress`, () => {
    const tasks = createPublicAssistantPetActivity()
    const run = tasks.start('session-a', 'request-a')
    tasks[terminal](run)
    const snapshot = tasks.getSnapshot()
    tasks.progress(run, 'answering')
    tasks.complete(run, 'answered')
    assert.equal(tasks.getSnapshot(), snapshot)
    assert.equal(snapshot.summary.activity, terminal === 'cancel' ? 'idle' : 'blocked')
    assert.equal(snapshot.feedbackKey, null)
  })
}

check('same requestId retry owns a fresh run and rejects the previous attempt', () => {
  const tasks = createPublicAssistantPetActivity()
  const first = tasks.start('session-a', 'request-a')
  tasks.fail(first)
  const retry = tasks.start('session-a', 'request-a')
  assert.notEqual(retry.runId, first.runId)
  const current = tasks.getSnapshot()
  assert.equal(tasks.complete(first, 'answered'), false)
  assert.equal(tasks.progress(first, 'verifying'), false)
  assert.equal(tasks.getSnapshot(), current)
  assert.equal(tasks.complete(retry, 'answered'), true)
  assert.equal(tasks.getSnapshot().summary.activity, 'ready')
  assert.equal(tasks.getSnapshot().unreadCount, 1)
})

check('background priority and feedback survive other-session attention', () => {
  const tasks = createPublicAssistantPetActivity()
  const first = tasks.start('session-a', 'request-a')
  tasks.complete(first, 'answered')
  const firstKey = tasks.getSnapshot().feedbackKey!
  assert.equal(tasks.claimFeedback(firstKey), true)
  const second = tasks.start('session-b', 'request-b')
  tasks.fail(second)
  assert.equal(tasks.getSnapshot().summary.activity, 'blocked')
  assert.equal(tasks.getSnapshot().summary.counts.ready, 1)
  const third = tasks.start('session-c', 'request-c')
  tasks.needsInput(third)
  assert.equal(tasks.getSnapshot().summary.activity, 'needsInput')
  tasks.retainSessions(['session-a'])
  assert.equal(tasks.getSnapshot().summary.activity, 'ready')
  assert.equal(tasks.getSnapshot().feedbackKey, null, 'Priority switching must not replay an acknowledged success')
  assert.equal(tasks.getSnapshot().feedbackCount, 1)
})

check('superseding a result removes its old unread and feedback', () => {
  const tasks = createPublicAssistantPetActivity()
  const first = tasks.start('session-a', 'request-a')
  tasks.complete(first, 'answered')
  const oldKey = tasks.getSnapshot().feedbackKey!
  tasks.start('session-a', 'request-b')
  assert.equal(tasks.getSnapshot().unreadCount, 0)
  assert.equal(tasks.claimFeedback(oldKey), false)
  assert.equal(tasks.readVisibleResult('session-a', { requestId: 'request-a' }), false)
})

check('registry retirement bounds repeated new sessions and rejects retired callbacks', () => {
  const tasks = createPublicAssistantPetActivity()
  const retained: string[] = []
  const retired = tasks.start('retired-session', 'retired-request')
  tasks.retainSessions([])
  for (let i = 0; i < 100; i += 1) {
    retained.unshift(`session-${i}`)
    retained.splice(24)
    tasks.retainSessions(retained)
    const run = tasks.start(`session-${i}`, `request-${i}`)
    tasks.complete(run, 'answered')
    assert.ok(tasks.getSnapshot().summary.items.length <= 24)
  }
  const snapshot = tasks.getSnapshot()
  assert.equal(tasks.complete(retired, 'answered'), false)
  assert.equal(tasks.getSnapshot(), snapshot)
  tasks.retainSessions([])
  assert.equal(tasks.getSnapshot().unreadCount, 0)
  assert.equal(tasks.getSnapshot().feedbackKey, null)
})

check('activity descriptions have complete Chinese and English mappings', () => {
  assert.deepEqual(Object.keys(publicAssistantPetCopy.zh.activities), Object.keys(publicAssistantPetCopy.en.activities))
  assert.equal(publicAssistantPetCopy.zh.unread(1), '1 个结果未读')
  assert.equal(publicAssistantPetCopy.en.unread(1), '1 unread result')
  assert.equal(publicAssistantPetCopy.en.unread(2), '2 unread results')
})

console.log(JSON.stringify({ cases: passed.length, modelCalls: 0, passed }))
