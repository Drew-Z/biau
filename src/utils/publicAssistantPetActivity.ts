import { createActivityState, reduceActivity, selectActivity } from '@lingban/pet-runtime/activity'
import type { ActivityEvent, ActivitySummary, Outcome } from '@lingban/pet-runtime/activity'
import type { PublicAssistantProgressStage, PublicAssistantStatus } from './publicAssistantApi'

type RunEvent<T = ActivityEvent> = T extends unknown ? Omit<T, 'sessionId' | 'runId' | 'sequence'> : never
type ProgressActivity = 'thinking' | 'working' | 'review'

const progressActivities: Record<PublicAssistantProgressStage, ProgressActivity> = {
  understanding_image: 'working', planning: 'thinking', researching: 'working',
  evaluating: 'review', refining: 'working', answering: 'working',
  recovering: 'working', verifying: 'review', saving: 'review',
}

export interface PublicAssistantPetRun {
  readonly sessionId: string
  readonly runId: string
  readonly requestId: string
}

export interface PublicAssistantPetResult {
  requestId?: string
  revisionId?: string
}

export interface PublicAssistantPetSnapshot {
  summary: ActivitySummary
  unreadCount: number
  feedbackKey: string | null
  feedbackCount: number
}

/** One widget's bounded, in-memory projection. It never stores chat or image content. */
export function createPublicAssistantPetActivity() {
  let state = createActivityState()
  let attempt = 0
  let feedbackCount = 0
  const listeners = new Set<() => void>()
  const results = new Map<string, { runId: string; requestId: string; revisionId?: string }>()
  const feedback = new Map<string, string>()

  function project(): PublicAssistantPetSnapshot {
    const summary = selectActivity(state)
    const selected = summary.activity === 'ready'
      ? state.sessions.find(item => item.sessionId === summary.sessionId)
      : summary.activity === 'idle'
        ? state.sessions.filter(item => feedback.has(item.sessionId)).sort((a, b) => b.order - a.order)[0]
        : undefined
    return {
      summary,
      unreadCount: state.sessions.filter(item => item.unread).length,
      feedbackKey: selected ? feedback.get(selected.sessionId) ?? null : null,
      feedbackCount,
    }
  }

  let snapshot = project()
  const serverSnapshot = snapshot
  function publish() {
    snapshot = project()
    listeners.forEach(listener => listener())
  }

  function dispatch(run: PublicAssistantPetRun, event: RunEvent, accepted?: () => void) {
    const previous = state.sessions.find(item => item.sessionId === run.sessionId)
    const next = reduceActivity(state, {
      ...event, sessionId: run.sessionId, runId: run.runId, sequence: (previous?.sequence ?? 0) + 1,
    })
    if (next === state) return false
    state = next
    if (event.type === 'started') results.delete(run.sessionId)
    if (event.type === 'completed' && event.outcome === 'success') {
      feedback.set(run.sessionId, JSON.stringify([run.sessionId, run.runId]))
    } else if (event.type !== 'read') feedback.delete(run.sessionId)
    accepted?.()
    publish()
    return true
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    start(sessionId: string, requestId: string): PublicAssistantPetRun {
      // Explicit transport retries keep their requestId, but own a fresh activity run.
      const run = { sessionId: `blog:${sessionId}`, runId: `${requestId}:${++attempt}`, requestId }
      dispatch(run, { type: 'started' })
      dispatch(run, { type: 'thinking' })
      return run
    },
    progress(run: PublicAssistantPetRun, stage: PublicAssistantProgressStage) {
      const type = progressActivities[stage]
      const previous = state.sessions.find(item => item.sessionId === run.sessionId)
      if (previous?.runId === run.runId && previous.status === type) return false
      return dispatch(run, { type })
    },
    complete(run: PublicAssistantPetRun, status: PublicAssistantStatus, revisionId?: string) {
      if (status === 'blocked') return dispatch(run, { type: 'needsInput' })
      const outcome: Outcome = status === 'answered' ? 'success' : status
      return dispatch(run, { type: 'completed', outcome }, () => {
        results.set(run.sessionId, { runId: run.runId, requestId: run.requestId, revisionId })
      })
    },
    needsInput: (run: PublicAssistantPetRun) => dispatch(run, { type: 'needsInput' }),
    fail: (run: PublicAssistantPetRun) => dispatch(run, { type: 'failed' }),
    cancel: (run: PublicAssistantPetRun) => dispatch(run, { type: 'cancelled' }),
    readVisibleResult(sessionId: string, visible: PublicAssistantPetResult) {
      const id = `blog:${sessionId}`
      const result = results.get(id)
      if (!result || !(result.revisionId
        ? visible.revisionId === result.revisionId
        : visible.requestId === result.requestId)) return false
      return dispatch({ sessionId: id, runId: result.runId, requestId: result.requestId }, { type: 'read' })
    },
    claimFeedback(key: string) {
      if (snapshot.feedbackKey !== key) return false
      const entry = [...feedback].find(([, pending]) => pending === key)
      if (!entry) return false
      feedback.delete(entry[0])
      feedbackCount += 1
      publish()
      return true
    },
    retainSessions(sessionIds: readonly string[]) {
      const retained = new Set(sessionIds.map(id => `blog:${id}`))
      const sessions = state.sessions.filter(item => retained.has(item.sessionId))
      if (sessions.length === state.sessions.length) return
      for (const id of results.keys()) if (!retained.has(id)) results.delete(id)
      for (const id of feedback.keys()) if (!retained.has(id)) feedback.delete(id)
      state = { revision: state.revision + 1, sessions }
      publish()
    },
  }
}
