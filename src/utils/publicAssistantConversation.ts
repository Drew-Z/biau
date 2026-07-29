import type {
  PublicAssistantAnswer,
  PublicAssistantAnswerRevision,
  PublicAssistantBranchSummary,
  PublicAssistantGenerationIntent,
  PublicAssistantHistoryTurn,
  PublicAssistantMode,
  PublicAssistantSessionHistory,
  PublicAssistantSessionTurn,
} from './publicAssistantApi'

export interface PublicAssistantConversationRevision extends PublicAssistantAnswerRevision {
  requestId?: string
  persisted: boolean
  feedbackPending?: boolean
  feedbackError?: boolean
}

export interface PublicAssistantConversationTurn extends Omit<PublicAssistantSessionTurn, 'selectedRevisionId' | 'revisions'> {
  activeRevisionId: string | null
  viewedRevisionId: string | null
  revisions: PublicAssistantConversationRevision[]
  requestId?: string
  persisted: boolean
}

export interface PublicAssistantConversationState {
  turns: PublicAssistantConversationTurn[]
  branches: PublicAssistantBranchSummary[]
  activeBranchId: string | null
  hasEarlierTurns: boolean
  revisionsTruncated: boolean
  branchesTruncated: boolean
}

export interface PublicAssistantQuestionEditRequest {
  question: string
  mode: PublicAssistantMode
  history: PublicAssistantHistoryTurn[]
  intent: Extract<PublicAssistantGenerationIntent, { kind: 'new-turn' }>
}

export function createEmptyPublicAssistantConversation(): PublicAssistantConversationState {
  return {
    turns: [],
    branches: [],
    activeBranchId: null,
    hasEarlierTurns: false,
    revisionsTruncated: false,
    branchesTruncated: false,
  }
}

export function hydratePublicAssistantConversation(history: PublicAssistantSessionHistory): PublicAssistantConversationState {
  return {
    turns: history.turns.map((turn) => ({
      id: turn.id,
      question: turn.question,
      mode: turn.mode,
      parentRevisionId: turn.parentRevisionId,
      activeRevisionId: turn.selectedRevisionId,
      viewedRevisionId: turn.selectedRevisionId,
      revisions: turn.revisions.map((revision) => ({ ...revision, persisted: true })),
      createdAt: turn.createdAt,
      persisted: true,
    })),
    branches: history.branches,
    activeBranchId: history.session.activeBranchId,
    hasEarlierTurns: history.hasEarlierTurns,
    revisionsTruncated: history.revisionsTruncated,
    branchesTruncated: history.branchesTruncated,
  }
}

export function appendPendingPublicAssistantTurn(
  state: PublicAssistantConversationState,
  input: {
    requestId: string
    question: string
    mode: PublicAssistantMode
    parentRevisionId?: string | null
  },
): PublicAssistantConversationState {
  if (state.turns.some((turn) => turn.requestId === input.requestId)) return state
  return {
    ...state,
    turns: [...state.turns, {
      id: `pending-turn-${input.requestId}`,
      question: input.question,
      mode: input.mode,
      parentRevisionId: input.parentRevisionId === undefined
        ? activeHeadRevisionId(state)
        : input.parentRevisionId,
      activeRevisionId: null,
      viewedRevisionId: null,
      revisions: [],
      requestId: input.requestId,
      createdAt: new Date().toISOString(),
      persisted: false,
    }],
  }
}

export function createPublicAssistantQuestionEditRequest(
  state: PublicAssistantConversationState,
  turnId: string,
): PublicAssistantQuestionEditRequest | null {
  const targetIndex = state.turns.findIndex((turn) => turn.id === turnId)
  if (targetIndex < 0) return null
  const target = state.turns[targetIndex]
  if (!target.persisted) return null

  if (target.parentRevisionId && !state.activeBranchId) return null
  const intent: PublicAssistantQuestionEditRequest['intent'] = target.parentRevisionId
    ? {
        kind: 'new-turn',
        branchId: state.activeBranchId!,
        parentRevisionId: target.parentRevisionId,
      }
    : { kind: 'new-turn', branchId: null, parentRevisionId: null }

  return {
    question: target.question,
    mode: target.mode,
    history: buildPublicAssistantConversationHistory({
      ...state,
      turns: state.turns.slice(0, targetIndex),
    }),
    intent,
  }
}

export function removeLocalPublicAssistantAnswer(
  state: PublicAssistantConversationState,
  requestId: string,
): PublicAssistantConversationState {
  return {
    ...state,
    turns: state.turns.map((turn) => ({
      ...turn,
      revisions: turn.revisions.filter((revision) => revision.persisted || revision.requestId !== requestId),
    })),
  }
}

export function retargetPendingPublicAssistantTurn(
  state: PublicAssistantConversationState,
  previousRequestId: string,
  nextRequestId: string,
): PublicAssistantConversationState {
  if (previousRequestId === nextRequestId) return state
  return {
    ...state,
    turns: state.turns.map((turn) => turn.requestId === previousRequestId && !turn.persisted
      ? { ...turn, requestId: nextRequestId, id: `pending-turn-${nextRequestId}` }
      : turn),
  }
}

export function mergePublicAssistantAnswer(
  state: PublicAssistantConversationState,
  input: {
    answer: PublicAssistantAnswer
    requestId: string
    question: string
    mode: PublicAssistantMode
    intent: PublicAssistantGenerationIntent
  },
): PublicAssistantConversationState {
  const identity = input.answer.conversation
  if (!identity) return mergeLocalAnswer(state, input)
  if (!identity.activated) return state
  const revision = toConversationRevision(input.answer, input.requestId)
  const targetTurnId = input.intent.kind === 'answer-revision' ? input.intent.turnId : null
  const targetIndex = targetTurnId
    ? state.turns.findIndex((turn) => turn.id === targetTurnId)
    : state.turns.findIndex((turn) => turn.requestId === input.requestId)
  const turns = [...state.turns]
  const mayActivate = identity.activated && input.answer.replayed !== true
  if (input.intent.kind === 'answer-revision') {
    if (targetIndex < 0) return state
    const target = turns[targetIndex]
    const revisions = upsertRevision(target.revisions, revision)
    turns[targetIndex] = {
      ...target,
      activeRevisionId: mayActivate ? identity.revisionId : target.activeRevisionId,
      viewedRevisionId: identity.revisionId,
      revisions,
      persisted: true,
    }
    if (mayActivate) turns.splice(targetIndex + 1)
  } else {
    const nextTurn: PublicAssistantConversationTurn = {
      id: identity.turnId,
      question: input.question,
      mode: input.mode,
      parentRevisionId: input.intent.parentRevisionId,
      activeRevisionId: identity.revisionId,
      viewedRevisionId: identity.revisionId,
      revisions: [revision],
      requestId: input.requestId,
      createdAt: new Date().toISOString(),
      persisted: true,
    }
    if (targetIndex >= 0) turns[targetIndex] = nextTurn
    else turns.push(nextTurn)
  }

  const existingBranch = state.branches.find((branch) => branch.id === identity.branchId)
  const branch: PublicAssistantBranchSummary = {
    id: identity.branchId,
    ordinal: identity.branchOrdinal,
    headRevisionId: input.answer.replayed && existingBranch
      ? existingBranch.headRevisionId
      : identity.revisionId,
    preview: input.question.slice(0, 64),
    turnCount: input.intent.kind === 'new-turn' ? turns.length : (existingBranch?.turnCount ?? turns.length),
    hasEarlierTurns: existingBranch?.hasEarlierTurns ?? false,
    lastActiveAt: new Date().toISOString(),
  }
  return {
    ...state,
    turns,
    branches: [...state.branches.filter((item) => item.id !== branch.id), branch]
      .sort((left, right) => left.ordinal - right.ordinal),
    activeBranchId: mayActivate ? identity.branchId : state.activeBranchId,
  }
}

export function selectViewedPublicAssistantRevision(
  state: PublicAssistantConversationState,
  turnId: string,
  revisionId: string,
): PublicAssistantConversationState {
  return {
    ...state,
    turns: state.turns.map((turn) => turn.id === turnId && turn.revisions.some((revision) => revision.id === revisionId)
      ? { ...turn, viewedRevisionId: revisionId }
      : turn),
  }
}

export function updatePublicAssistantRevisionFeedback(
  state: PublicAssistantConversationState,
  revisionId: string,
  update: Pick<PublicAssistantConversationRevision, 'feedback' | 'feedbackPending' | 'feedbackError'>,
): PublicAssistantConversationState {
  return {
    ...state,
    turns: state.turns.map((turn) => ({
      ...turn,
      revisions: turn.revisions.map((revision) => revision.id === revisionId ? { ...revision, ...update } : revision),
    })),
  }
}

export function selectedPublicAssistantRevision(turn: PublicAssistantConversationTurn) {
  return turn.revisions.find((revision) => revision.id === turn.viewedRevisionId) ?? null
}

export function activePublicAssistantRevision(turn: PublicAssistantConversationTurn) {
  return turn.revisions.find((revision) => revision.id === turn.activeRevisionId) ?? null
}

export function activePublicAssistantGenerationIntent(state: PublicAssistantConversationState): PublicAssistantGenerationIntent {
  const headRevisionId = activeHeadRevisionId(state)
  return state.activeBranchId && headRevisionId
    ? { kind: 'new-turn', branchId: state.activeBranchId, parentRevisionId: headRevisionId }
    : { kind: 'new-turn', branchId: null, parentRevisionId: null }
}

export function buildPublicAssistantConversationHistory(state: PublicAssistantConversationState): PublicAssistantHistoryTurn[] {
  return state.turns
    .flatMap((turn) => {
      const revision = activePublicAssistantRevision(turn)
      return revision
        ? [
            { role: 'user' as const, content: turn.question.slice(0, 800) },
            { role: 'assistant' as const, content: revision.answer.slice(0, 800) },
          ]
        : []
    })
    .slice(-12)
}

function activeHeadRevisionId(state: PublicAssistantConversationState) {
  const activeBranch = state.branches.find((branch) => branch.id === state.activeBranchId)
  if (activeBranch) return activeBranch.headRevisionId
  for (let index = state.turns.length - 1; index >= 0; index -= 1) {
    const revision = activePublicAssistantRevision(state.turns[index])
    if (revision?.persisted) return revision.id
  }
  return null
}

function mergeLocalAnswer(
  state: PublicAssistantConversationState,
  input: {
    answer: PublicAssistantAnswer
    requestId: string
    question: string
    mode: PublicAssistantMode
    intent: PublicAssistantGenerationIntent
  },
) {
  if (input.intent.kind === 'answer-revision') return state
  const targetIndex = state.turns.findIndex((turn) => turn.requestId === input.requestId)
  if (targetIndex < 0) return state
  const target = state.turns[targetIndex]
  const revision = toConversationRevision(input.answer, input.requestId, false)
  const turns = [...state.turns]
  turns[targetIndex] = {
    ...target,
    activeRevisionId: revision.id,
    viewedRevisionId: revision.id,
    revisions: upsertRevision(target.revisions, revision),
  }
  return { ...state, turns }
}

function toConversationRevision(answer: PublicAssistantAnswer, requestId: string, persisted = true): PublicAssistantConversationRevision {
  return {
    id: answer.conversation?.revisionId ?? `local-revision-${requestId}`,
    revisionNo: answer.conversation?.revisionNo ?? 1,
    basedOnRevisionId: answer.conversation?.basedOnRevisionId ?? null,
    answer: answer.answer,
    status: answer.status,
    claims: answer.claims,
    citations: answer.citations,
    suggestions: answer.suggestions,
    route: answer.meta.research?.route ?? 'direct',
    meta: answer.meta,
    createdAt: new Date().toISOString(),
    feedback: null,
    requestId,
    persisted,
  }
}

function upsertRevision(
  revisions: PublicAssistantConversationRevision[],
  revision: PublicAssistantConversationRevision,
) {
  return [...revisions.filter((item) => item.id !== revision.id), revision]
    .sort((left, right) => left.revisionNo - right.revisionNo)
}
