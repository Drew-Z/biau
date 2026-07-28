import assert from 'node:assert/strict'
import {
  activePublicAssistantGenerationIntent,
  appendPendingPublicAssistantTurn,
  buildPublicAssistantConversationHistory,
  hydratePublicAssistantConversation,
  mergePublicAssistantAnswer,
  selectedPublicAssistantRevision,
  selectViewedPublicAssistantRevision,
  updatePublicAssistantRevisionFeedback,
} from '../src/utils/publicAssistantConversation'
import type {
  PublicAssistantAnswer,
  PublicAssistantAnswerRevision,
  PublicAssistantSessionHistory,
} from '../src/utils/publicAssistantApi'

const createdAt = '2026-07-28T08:00:00.000Z'

function revision(id: string, revisionNo: number, answer: string): PublicAssistantAnswerRevision {
  return {
    id,
    revisionNo,
    basedOnRevisionId: revisionNo === 1 ? null : 'revision-1',
    answer,
    status: 'answered',
    claims: [],
    citations: [],
    suggestions: [`追问 ${revisionNo}`],
    route: 'site',
    meta: { mode: 'model', citationCount: 0 },
    createdAt,
    feedback: null,
  }
}

const history: PublicAssistantSessionHistory = {
  session: {
    id: 'public-session-1234',
    activeBranchId: 'branch-1',
    title: '第一个问题',
    turnCount: 1,
    hasEarlierTurns: false,
    createdAt,
    lastActiveAt: createdAt,
    expiresAt: '2026-08-28T08:00:00.000Z',
  },
  branches: [{
    id: 'branch-1',
    ordinal: 1,
    headRevisionId: 'revision-1',
    preview: '第一个问题',
    turnCount: 1,
    hasEarlierTurns: false,
    lastActiveAt: createdAt,
  }],
  turns: [{
    id: 'turn-1',
    question: '第一个问题',
    mode: 'site',
    parentRevisionId: null,
    selectedRevisionId: 'revision-1',
    revisions: [revision('revision-1', 1, '活动路径答案'), revision('revision-2', 2, '另一个版本')],
    createdAt,
  }],
  hasEarlierTurns: false,
  revisionsTruncated: false,
  branchesTruncated: false,
  truncated: false,
}

const hydrated = hydratePublicAssistantConversation(history)
assert.equal(selectedPublicAssistantRevision(hydrated.turns[0])?.id, 'revision-1')
const viewedAlternative = selectViewedPublicAssistantRevision(hydrated, 'turn-1', 'revision-2')
assert.equal(selectedPublicAssistantRevision(viewedAlternative.turns[0])?.id, 'revision-2')
assert.deepEqual(activePublicAssistantGenerationIntent(viewedAlternative), {
  kind: 'new-turn',
  branchId: 'branch-1',
  parentRevisionId: 'revision-1',
}, 'viewing an alternative must not mutate the active branch head')
assert.equal(buildPublicAssistantConversationHistory(viewedAlternative)[1]?.content, '活动路径答案')

const regenerationIntent = {
  kind: 'answer-revision' as const,
  branchId: 'branch-1',
  turnId: 'turn-1',
  baseRevisionId: 'revision-2',
}
const regeneration: PublicAssistantAnswer = {
  contractVersion: 2,
  requestId: '11111111-1111-4111-8111-111111111111',
  answer: '第三个不可变版本',
  status: 'answered',
  claims: [],
  citations: [],
  suggestions: [],
  sessionId: 'public-session-1234',
  turnId: 'turn-1',
  conversation: {
    branchId: 'branch-2',
    branchOrdinal: 2,
    turnId: 'turn-1',
    revisionId: 'revision-3',
    revisionNo: 3,
    basedOnRevisionId: 'revision-2',
    activated: true,
  },
  meta: { mode: 'model', citationCount: 0 },
}
const regenerated = mergePublicAssistantAnswer(viewedAlternative, {
  answer: regeneration,
  requestId: regeneration.requestId!,
  question: '不得覆盖原问题',
  mode: 'web',
  intent: regenerationIntent,
})
assert.equal(regenerated.turns.length, 1, 'regeneration must not duplicate the logical question')
assert.equal(regenerated.turns[0].question, '第一个问题')
assert.equal(regenerated.turns[0].revisions.length, 3)
assert.equal(regenerated.turns[0].activeRevisionId, 'revision-3')
assert.equal(regenerated.activeBranchId, 'branch-2')

const failedRegeneration = mergePublicAssistantAnswer(viewedAlternative, {
  answer: {
    contractVersion: 1,
    requestId: '44444444-4444-4444-8444-444444444444',
    answer: '不应进入版本集合的本地降级回答',
    status: 'degraded',
    claims: [],
    citations: [],
    suggestions: [],
    meta: { mode: 'fallback', reason: 'public-chat-request-failed', citationCount: 0 },
  },
  requestId: '44444444-4444-4444-8444-444444444444',
  question: '第一个问题',
  mode: 'site',
  intent: regenerationIntent,
})
assert.strictEqual(failedRegeneration, viewedAlternative, 'a failed regeneration must preserve the exact persisted conversation state')
assert.equal(failedRegeneration.turns[0].activeRevisionId, 'revision-1')
assert.equal(failedRegeneration.turns[0].viewedRevisionId, 'revision-2')
assert.equal(failedRegeneration.turns[0].revisions.length, 2)
assert.equal(failedRegeneration.turns[0].revisions.some((item) => item.id.startsWith('local-revision-')), false)

const requestId = '22222222-2222-4222-8222-222222222222'
const pending = appendPendingPublicAssistantTurn(regenerated, { requestId, question: '第二个问题', mode: 'auto' })
assert.equal(pending.turns.length, 2)
assert.equal(pending.turns[1].revisions.length, 0)
const nextIntent = activePublicAssistantGenerationIntent(regenerated)
const nextAnswer: PublicAssistantAnswer = {
  contractVersion: 2,
  requestId,
  answer: '第二个答案',
  status: 'answered',
  claims: [],
  citations: [],
  suggestions: [],
  sessionId: 'public-session-1234',
  turnId: 'turn-2',
  conversation: {
    branchId: 'branch-2',
    branchOrdinal: 2,
    turnId: 'turn-2',
    revisionId: 'revision-4',
    revisionNo: 1,
    basedOnRevisionId: null,
    activated: true,
  },
  meta: { mode: 'model', citationCount: 0 },
}
const completed = mergePublicAssistantAnswer(pending, {
  answer: nextAnswer,
  requestId,
  question: '第二个问题',
  mode: 'auto',
  intent: nextIntent,
})
assert.equal(completed.turns[1].id, 'turn-2')
assert.equal(completed.turns[1].parentRevisionId, 'revision-3')
assert.equal(completed.branches.find((branch) => branch.id === 'branch-2')?.headRevisionId, 'revision-4')

const fencedCompletion = mergePublicAssistantAnswer(pending, {
  answer: {
    ...nextAnswer,
    conversation: {
      ...nextAnswer.conversation!,
      branchId: 'branch-4',
      branchOrdinal: 4,
      revisionId: 'revision-6',
      activated: false,
    },
  },
  requestId,
  question: '第二个问题',
  mode: 'auto',
  intent: nextIntent,
})
assert.deepEqual(fencedCompletion, pending, 'a non-activated completion must wait for authoritative history instead of entering the visible path')
assert.equal(buildPublicAssistantConversationHistory(fencedCompletion).length, 2, 'a non-activated completion must not contaminate prompt history')

const earlierTurnRegeneration = mergePublicAssistantAnswer(completed, {
  answer: {
    ...regeneration,
    requestId: '33333333-3333-4333-8333-333333333333',
    answer: '从第一轮生成的新分支答案',
    conversation: {
      ...regeneration.conversation!,
      branchId: 'branch-3',
      branchOrdinal: 3,
      revisionId: 'revision-5',
      revisionNo: 4,
    },
  },
  requestId: '33333333-3333-4333-8333-333333333333',
  question: '第一个问题',
  mode: 'site',
  intent: regenerationIntent,
})
assert.equal(earlierTurnRegeneration.turns.length, 1, 'activating a revision on an earlier turn must remove stale descendant turns')
assert.equal(earlierTurnRegeneration.turns[0].activeRevisionId, 'revision-5')
assert.equal(earlierTurnRegeneration.activeBranchId, 'branch-3')
assert.equal(buildPublicAssistantConversationHistory(earlierTurnRegeneration).length, 2)

const replayed = mergePublicAssistantAnswer(completed, {
  answer: {
    ...regeneration,
    replayed: true,
  },
  requestId: regeneration.requestId!,
  question: '第一个问题',
  mode: 'site',
  intent: regenerationIntent,
})
assert.equal(replayed.activeBranchId, 'branch-2', 'a frozen replay must not replace the locally active branch before authoritative hydration')
assert.equal(replayed.branches.find((branch) => branch.id === 'branch-2')?.headRevisionId, 'revision-4')
assert.equal(replayed.turns.length, 2, 'a frozen replay must not truncate the current active path')

const feedback = updatePublicAssistantRevisionFeedback(completed, 'revision-4', {
  feedback: 'up',
  feedbackPending: false,
  feedbackError: false,
})
assert.equal(feedback.turns[1].revisions[0].feedback, 'up')

const replaced = hydratePublicAssistantConversation({
  ...history,
  session: { ...history.session, activeBranchId: 'branch-9' },
  branches: [{ ...history.branches[0], id: 'branch-9', ordinal: 9 }],
})
assert.equal(replaced.activeBranchId, 'branch-9')
assert.equal(replaced.branches.length, 1, 'authoritative branch hydration replaces stale local branch summaries')

console.log('Public assistant browser conversation contracts passed.')
