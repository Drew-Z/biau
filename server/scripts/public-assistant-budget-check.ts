import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { env } from '../src/env.js'
import { normalizePublicAssistantPayload, runPublicAssistantAgent } from '../src/publicAssistantAgent.js'
import { executePublicAssistantRequest } from '../src/publicAssistantExecution.js'
import { generatePublicAssistantDraft } from '../src/publicAssistantModel.js'
import { buildPublicAssistantRequestHash } from '../src/publicAssistantPersistence.js'
import { toPublicAssistantHttpResponse } from '../src/publicAssistantProjection.js'
import type { PublicAssistantModel, PublicAssistantRequest } from '../src/publicAssistantRuntime.js'
import { requestResponsesText } from '../src/responsesApi.js'

const answer = JSON.stringify({ answer: '预算内完成的回答。', status: 'answered', claims: [], suggestions: [] })
const completed = `event: response.completed\ndata: ${JSON.stringify({ type: 'response.completed', response: { output_text: answer } })}\n\n`

export async function checkPublicAssistantBudgets() {
  const calls = new Map<string, number>()
  const closed = new Set<string>()
  const server = createServer((request, response) => {
    request.resume()
    request.on('end', () => {
      const scenario = request.url?.split('/')[1] ?? ''
      calls.set(scenario, (calls.get(scenario) ?? 0) + 1)
      const timers: Array<ReturnType<typeof setTimeout>> = []
      let heartbeat: ReturnType<typeof setInterval> | undefined
      response.on('close', () => {
        closed.add(scenario)
        timers.forEach(clearTimeout)
        clearInterval(heartbeat)
      })
      const finish = () => {
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.end(completed)
      }
      if (scenario === 'compat' && request.url?.endsWith('/compat/responses')) {
        timers.push(setTimeout(() => {
          response.writeHead(404)
          response.end()
        }, 200))
      } else if (scenario === 'stream-stall' || scenario === 'headers-only' || scenario === 'active-deadline') {
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.flushHeaders()
        if (scenario !== 'headers-only') response.write(': heartbeat\n\n')
        if (scenario === 'active-deadline') heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 40)
      } else {
        timers.push(setTimeout(finish, 350))
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('budget-fixture-port-missing')
    const channel = (scenario: string) => ({
      apiKey: 'fixture-key', baseUrl: `http://127.0.0.1:${address.port}/${scenario}/v1`, model: 'fixture',
    })
    const run = (scenario: string, options: Partial<Parameters<typeof requestResponsesText>[0]> = {}) => requestResponsesText({
      channel: channel(scenario), system: 'fixture', user: 'fixture', stream: true, timeoutMs: 150, ...options,
    })
    const legacy = await run('legacy')
    assert.equal(legacy.failureClass, 'timeout', 'callers without the new budget keep their existing header timeout')
    const first = await run('first', { firstResponseTimeoutMs: 700, deadlineAt: Date.now() + 1_000 })
    assert.equal(first.content, answer, 'delayed headers may use the first-response budget instead of stream idle')
    assert.ok((first.firstActivityMs ?? 0) >= 300)
    assert.equal(calls.get('first'), 1)

    for (const [scenario, phase] of [['headers-only', 'awaiting_stream'], ['stream-stall', 'streaming']]) {
      const result = await run(scenario, { firstResponseTimeoutMs: 700, deadlineAt: Date.now() + 1_000 })
      assert.equal(result.failureClass, 'timeout')
      assert.equal(result.diagnostic?.timeoutPhase, phase)
      assert.ok(result.durationMs < 500, 'header allowance must not become the stream idle timer')
    }
    for (const scenario of ['header-deadline', 'active-deadline', 'compat']) {
      const result = await run(scenario, {
        channel: scenario === 'compat' ? { ...channel(scenario), baseUrl: `http://127.0.0.1:${address.port}/compat` } : channel(scenario),
        firstResponseTimeoutMs: 1_000,
        deadlineAt: Date.now() + 300,
      })
      assert.equal(result.content, null, scenario)
      assert.equal(result.failureClass, 'timeout', scenario)
      assert.ok(result.durationMs < 500, `${scenario}: activity and endpoint fallback must share one deadline`)
      assert.equal(calls.get(scenario), scenario === 'compat' ? 2 : 1)
    }
    const expired = await run('expired', { firstResponseTimeoutMs: 700, deadlineAt: Date.now() - 1 })
    assert.equal(expired.failureClass, 'timeout')
    assert.equal(expired.diagnostic?.attemptedEndpoints, 0)
    assert.equal(calls.has('expired'), false, 'expired attempts must not issue a request')
    const alreadyAborted = new AbortController()
    alreadyAborted.abort()
    await assert.rejects(run('cancelled-expired', {
      signal: alreadyAborted.signal, deadlineAt: Date.now() - 1,
    }), { name: 'AbortError' })
    assert.equal(calls.has('cancelled-expired'), false)

    const abort = new AbortController()
    const cancelTimer = setTimeout(() => abort.abort(), 220)
    try {
      await assert.rejects(run('cancel-first', {
        firstResponseTimeoutMs: 700, deadlineAt: Date.now() + 1_000, signal: abort.signal,
      }), { name: 'AbortError' })
    } finally {
      clearTimeout(cancelTimer)
    }
    await checkExecutionBudget(channel('execution'))
    for (const scenario of calls.keys()) {
      for (let i = 0; i < 50 && !closed.has(scenario); i += 1) await delay(10)
      assert.equal(closed.has(scenario), true, `${scenario}: stop fixture work and close the body`)
    }
    console.log('Public assistant first-response/idle/deadline/execution fixtures passed; external provider calls=0.')
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

async function checkExecutionBudget(channel: { apiKey: string; baseUrl: string; model: string }) {
  const original = {
    publicAssistantRequestTimeoutMs: env.publicAssistantRequestTimeoutMs,
    publicAssistantAnswerTimeoutMs: env.publicAssistantAnswerTimeoutMs,
    publicAssistantModelMaxAttempts: env.publicAssistantModelMaxAttempts,
  }
  const request = normalizePublicAssistantPayload(Object.assign({
    contractVersion: 2,
    requestId: '11111111-1111-4111-8111-111111111111',
    sessionId: 'budget-fixture-session', message: '你好',
    intent: { kind: 'new-turn' as const, branchId: null, parentRevisionId: null },
  }, { deadlineAt: Number.MAX_SAFE_INTEGER }))
  assert.ok(request)
  assert.equal(request.deadlineAt, undefined, 'visitor payload cannot set the server deadline')
  assert.equal(buildPublicAssistantRequestHash(request), buildPublicAssistantRequestHash({ ...request, deadlineAt: 1 }))
  try {
    env.publicAssistantRequestTimeoutMs = 1_500
    env.publicAssistantAnswerTimeoutMs = 150
    env.publicAssistantModelMaxAttempts = 1
    const started = Date.now()
    const deadlineAt = started + 1_500
    let answerCalls = 0
    let persisted = false
    const result = await executePublicAssistantRequest(request, { signal: new AbortController().signal, deadlineAt }, {
      async claimRequest() {
        await delay(250)
        return {
          status: 'acquired',
          request: { ...request, deadlineAt: Number.MAX_SAFE_INTEGER },
          lease: { requestId: request.requestId, leaseToken: 'fixture-lease', requestHash: 'fixture-hash' },
        }
      },
      async runAgent(input) {
        assert.equal(input.deadlineAt, deadlineAt, 'server options replace a claimed request deadline')
        return runPublicAssistantAgent(input, {
          model: {
            async plan() { throw new Error('direct fixture must not plan') },
            async answer(input) {
              answerCalls += 1
              assert.equal(input.timeoutMs, 150)
              assert.equal(input.deadlineAt, deadlineAt - 300, 'reserve 20% on a short total budget')
              assert.ok((input.firstResponseTimeoutMs ?? Infinity) <= 950, 'claim time is not reset at Agent start')
              return generatePublicAssistantDraft(input, {
                ...channel, provider: 'fixture', id: 'fixture', label: 'fixture', configured: true, isDefault: true, isActive: true,
              })
            },
          },
          async retrieveSite() { throw new Error('direct fixture must not retrieve') },
          async researchWeb() { throw new Error('direct fixture must not search') },
        })
      },
      async completeRequest(_request, response) {
        await delay(100)
        persisted = true
        return { status: 'completed', response: toPublicAssistantHttpResponse(response) }
      },
      async persistTurn() { throw new Error('acquired fixture must not use legacy persistence') },
      async markFailed() { throw new Error('valid fixture must not fail') },
    })
    assert.equal(answerCalls, 1)
    assert.equal(persisted, true)
    assert.equal(result.status, 'answered')
    assert.equal(result.answer, '预算内完成的回答。')
    assert.ok(Date.now() < deadlineAt)
    assert.doesNotMatch(JSON.stringify(result), /deadlineAt|firstResponseTimeoutMs|fixture-key/u)

    await executePublicAssistantRequest({ ...request, deadlineAt: Number.MAX_SAFE_INTEGER }, {
      signal: new AbortController().signal, deadlineAt,
    }, {
      async claimRequest() { return { status: 'database-not-configured' } },
      async runAgent(input) {
        assert.equal(input.deadlineAt, deadlineAt, 'the ephemeral branch also uses the server deadline')
        return { answer: result.answer, status: result.status, citations: result.citations }
      },
      async persistTurn() { return null },
      async completeRequest() { throw new Error('ephemeral fixture must not complete a lease') },
      async markFailed() { throw new Error('ephemeral fixture must not fail a lease') },
    })

    env.publicAssistantRequestTimeoutMs = 45_000
    env.publicAssistantAnswerTimeoutMs = 20_000
    for (const [clock, expectedCalls, expectedFirstWait] of [[7_000, 1, 33_000], [41_000, 0, 0]]) {
      let calls = 0
      const model: PublicAssistantModel = {
        async plan() { throw new Error('direct fixture must not plan') },
        async answer(input) {
          calls += 1
          assert.equal(input.timeoutMs, 20_000)
          assert.equal(input.firstResponseTimeoutMs, expectedFirstWait)
          assert.equal(input.deadlineAt, 40_000)
          return { answer: '已完成。', status: 'answered', claims: [], suggestions: [], model: 'fixture', provider: 'fixture' }
        },
      }
      const input: PublicAssistantRequest = { ...request, deadlineAt: 45_000 }
      const response = await runPublicAssistantAgent(input, {
        now: () => clock, model,
        async retrieveSite() { throw new Error('must not retrieve') },
        async researchWeb() { throw new Error('must not search') },
      })
      assert.equal(calls, expectedCalls, 'no generation after the reserved cutoff')
      assert.equal(response.status, expectedCalls ? 'answered' : 'degraded')
    }
  } finally {
    Object.assign(env, original)
  }
}
