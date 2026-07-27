import { runPublicAssistantAgent } from './publicAssistantAgent.js'
import {
  claimPublicAssistantRequest,
  completePublicAssistantRequest,
  markPublicAssistantRequestFailed,
  persistPublicAssistantTurn,
} from './publicAssistantPersistence.js'
import { toPublicAssistantHttpResponse } from './publicAssistantProjection.js'
import type { PublicAssistantProgress, PublicAssistantRequest } from './publicAssistantRuntime.js'

type PublicAssistantRunResponse = Awaited<ReturnType<typeof runPublicAssistantAgent>>
type PublicAssistantClaimResult = Awaited<ReturnType<typeof claimPublicAssistantRequest>>
type PublicAssistantCompletionResult = Awaited<ReturnType<typeof completePublicAssistantRequest>>

export interface PublicAssistantExecutionDependencies {
  claimRequest: (request: PublicAssistantRequest) => Promise<PublicAssistantClaimResult>
  runAgent: (request: PublicAssistantRequest) => Promise<PublicAssistantRunResponse>
  completeRequest: (
    request: PublicAssistantRequest,
    response: PublicAssistantRunResponse,
    lease: Extract<PublicAssistantClaimResult, { status: 'acquired' }>['lease'],
  ) => Promise<PublicAssistantCompletionResult>
  markFailed: (
    lease: Extract<PublicAssistantClaimResult, { status: 'acquired' }>['lease'],
    input: { status: 'retryable_failed' | 'failed' | 'cancelled'; errorCode: string },
  ) => Promise<boolean>
  persistTurn: (
    request: PublicAssistantRequest,
    response: PublicAssistantRunResponse,
  ) => ReturnType<typeof persistPublicAssistantTurn>
}

export interface PublicAssistantExecutionOptions {
  signal: AbortSignal
  onProgress?: (progress: PublicAssistantProgress) => void
  onExecutionStart?: () => void
}

export class PublicAssistantExecutionError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId: string
  readonly retryAfterSeconds: number | null

  constructor(
    code: string,
    options: { status: number; requestId: string; retryAfterSeconds?: number; cause?: unknown },
  ) {
    super(code, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'PublicAssistantExecutionError'
    this.code = code
    this.status = options.status
    this.requestId = options.requestId
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
  }
}

const defaultDependencies: PublicAssistantExecutionDependencies = {
  claimRequest: claimPublicAssistantRequest,
  runAgent: runPublicAssistantAgent,
  completeRequest: completePublicAssistantRequest,
  markFailed: markPublicAssistantRequestFailed,
  persistTurn: persistPublicAssistantTurn,
}

export async function executePublicAssistantRequest(
  request: PublicAssistantRequest,
  options: PublicAssistantExecutionOptions,
  dependencies: PublicAssistantExecutionDependencies = defaultDependencies,
) {
  options.signal.throwIfAborted()
  const claim = await dependencies.claimRequest(request)

  if (claim.status === 'completed') return claim.response
  if (claim.status === 'conflict') {
    throw new PublicAssistantExecutionError('idempotency-key-reused', {
      status: 409,
      requestId: request.requestId,
    })
  }
  if (claim.status === 'processing') {
    throw new PublicAssistantExecutionError('public-assistant-request-processing', {
      status: 409,
      requestId: request.requestId,
      retryAfterSeconds: claim.retryAfterSeconds,
    })
  }
  if (claim.status === 'terminal') {
    throw new PublicAssistantExecutionError(claim.errorCode, {
      status: 409,
      requestId: request.requestId,
    })
  }

  options.onExecutionStart?.()
  const agentRequest = { ...request, signal: options.signal, onProgress: options.onProgress }

  if (claim.status === 'database-not-configured') {
    const response = await dependencies.runAgent(agentRequest)
    options.signal.throwIfAborted()
    options.onProgress?.({ stage: 'saving' })
    const persisted = await dependencies.persistTurn(request, response).catch(() => null)
    return toPublicAssistantHttpResponse({
      ...response,
      requestId: request.requestId,
      ...(persisted ? { sessionId: persisted.sessionId, messageId: persisted.turnId } : {}),
    })
  }

  try {
    const response = await dependencies.runAgent(agentRequest)
    options.signal.throwIfAborted()
    options.onProgress?.({ stage: 'saving' })
    const completed = await dependencies.completeRequest(request, response, claim.lease)
    if (completed.status === 'completed') return completed.response
    throw new PublicAssistantExecutionError('public-assistant-request-lease-lost', {
      status: 409,
      requestId: request.requestId,
      retryAfterSeconds: 1,
    })
  } catch (error) {
    const aborted = isAbortError(error) || options.signal.aborted
    await dependencies.markFailed(claim.lease, {
      status: 'retryable_failed',
      errorCode: aborted ? 'public-assistant-request-aborted' : 'public-assistant-generation-failed',
    }).catch(() => false)
    if (aborted) throw error
    if (error instanceof PublicAssistantExecutionError) throw error
    throw new PublicAssistantExecutionError('public-assistant-generation-failed', {
      status: 503,
      requestId: request.requestId,
      cause: error,
    })
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}
