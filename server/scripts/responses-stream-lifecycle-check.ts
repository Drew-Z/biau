import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { buildPublicAssistantRecoveryLogRecord } from '../src/publicAssistantRecoveryLog.js'
import { readResponsesStreamResult, requestResponsesText } from '../src/responsesApi.js'

const frame = (type: string, fields: Record<string, unknown> = {}) =>
  `event: ${type}\r\ndata: ${JSON.stringify({ type, ...fields })}\r\n\r\n`

export async function checkResponsesStreamLifecycle() {
  // One byte at a time exercises UTF-8 and SSE delimiters independently of TCP
  // coalescing. The source stays open; terminal handling must cancel it.
  for (const [wire, content, completion] of [
    [frame('response.completed', { response: { output_text: '完整答案 🐉' } }), '完整答案 🐉', 'response_completed'],
    ['data: [DONE]\n\n', '', 'done_marker'],
  ] as const) {
    const bytes = new TextEncoder().encode(wire)
    let index = 0
    let cancelled = false
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        // A missed terminal remains a deterministic failure, never a hung check.
        watchdog = setTimeout(() => controller.error(new Error('terminal-waited-for-eof')), 1_000)
      },
      pull(controller) {
        if (index < bytes.length) controller.enqueue(bytes.slice(index, ++index))
      },
      cancel() {
        cancelled = true
      },
    })
    try {
      const result = await readResponsesStreamResult(body)
      assert.equal(result.content, content)
      assert.equal(result.streamCompletion, completion)
      assert.equal(cancelled, true, 'terminal event must cancel the open body')
      assert.equal(body.locked, false)
    } finally {
      clearTimeout(watchdog)
    }
  }

  // Completion cancels the body asynchronously. A caller abort arriving during
  // that cleanup must still reject, rather than publish the completed answer.
  const originalFetch = globalThis.fetch
  const cancelledAtCompletion = new AbortController()
  try {
    globalThis.fetch = async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(frame('response.completed', {
          response: { output_text: 'cancelled answer' },
        })))
      },
      cancel() {
        cancelledAtCompletion.abort()
      },
    }), { headers: { 'Content-Type': 'text/event-stream' } })
    await assert.rejects(requestResponsesText({
      channel: { apiKey: 'fixture', baseUrl: 'https://fixture.example.invalid/v1', model: 'fixture' },
      system: 'fixture', user: 'fixture', timeoutMs: 1_000, stream: true, signal: cancelledAtCompletion.signal,
    }), { name: 'AbortError' })
  } finally {
    globalThis.fetch = originalFetch
  }

  const calls = new Map<string, number>()
  const closed = new Set<string>()
  const received = new Map<string, () => void>()
  const server = createServer((request, response) => {
    request.resume()
    request.on('end', () => {
      const scenario = request.url?.split('/')[1] ?? ''
      calls.set(scenario, (calls.get(scenario) ?? 0) + 1)
      const timers: Array<ReturnType<typeof setTimeout>> = []
      response.on('close', () => {
        closed.add(scenario)
        timers.forEach(clearTimeout)
      })
      received.get(scenario)?.()
      if (scenario === 'headers-stalled' || scenario === 'cancel-headers') return
      response.writeHead(200, {
        'Content-Type': scenario === 'json-stalled' ? 'application/json' : 'text/event-stream',
      })
      response.flushHeaders()
      const later = (ms: number, text: string) => timers.push(setTimeout(() => response.write(text), ms))
      switch (scenario) {
        case 'completed-open':
          response.write(frame('response.completed', { response: { output_text: 'completed answer' } }))
          break
        case 'terminal-trailing':
          response.write(frame('response.completed', { response: { output_text: 'final answer' } })
            + frame('response.failed') + 'data: unfinished trailing frame')
          break
        case 'done-open':
          response.write('data: {"choices":[{"delta":{"content":"relay answer"}}]}\n\ndata: [DONE]\n\n')
          break
        case 'text-done-continue':
          response.write(frame('response.output_text.done', { text: 'first part', output_index: 0 }))
          later(30, frame('response.output_text.delta', { delta: 'second part', output_index: 1 }))
          later(60, frame('response.completed', { response: { output_text: 'both parts complete' } }))
          break
        case 'idle-reset':
          response.write(frame('response.output_text.delta', { delta: 'first ' }))
          later(100, frame('response.output_text.delta', { delta: 'second ' }))
          later(200, frame('response.output_text.delta', { delta: 'third' }))
          later(300, frame('response.completed', { response: { output_text: 'active answer' } }))
          break
        case 'stream-stalled':
        case 'cancel-stream':
          response.write(frame('response.output_text.delta', { delta: 'partial answer' }))
          break
        case 'heartbeat-stalled':
          response.write(': heartbeat\n\n')
          break
        case 'text-done-stalled':
          response.write(frame('response.output_text.done', { text: 'only one part' }))
          break
        case 'json-stalled':
          response.write('{"output_text":')
          break
        case 'stream-error':
          response.write(frame('response.output_text.done', { text: 'partial' }) + frame('response.failed'))
          break
        case 'oversized':
          response.write('x'.repeat(2_097_153))
          break
        case 'delta-eof':
          response.end(frame('response.output_text.delta', { delta: 'legacy EOF answer' }))
          break
        case 'first-byte-stalled':
          break
        default:
          response.end()
      }
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('fixture-port-missing')
    const run = (scenario: string, signal?: AbortSignal, timeoutMs = 200) => requestResponsesText({
      channel: { apiKey: 'fixture-key', baseUrl: `http://127.0.0.1:${address.port}/${scenario}/v1`, model: 'fixture' },
      system: 'fixture', user: 'fixture', stream: true, timeoutMs, signal,
    })
    const assertClosed = async (scenario: string) => {
      // Socket-close notification follows fetch cancellation asynchronously.
      for (let i = 0; i < 50 && !closed.has(scenario); i += 1) await delay(10)
      assert.equal(closed.has(scenario), true, `${scenario}: socket must close`)
      assert.equal(calls.get(scenario), 1, `${scenario}: must not replay request`)
    }

    for (const [scenario, answer] of [
      ['completed-open', 'completed answer'],
      ['terminal-trailing', 'final answer'],
      ['done-open', 'relay answer'],
      ['text-done-continue', 'both parts complete'],
      ['idle-reset', 'active answer'],
      ['delta-eof', 'legacy EOF answer'],
    ]) {
      const result = await run(scenario)
      assert.equal(result.failure, undefined, scenario)
      assert.equal(result.content, answer, scenario)
      assert.equal(result.diagnostic?.timeoutPhase, undefined)
      if (scenario === 'idle-reset') assert.ok(result.durationMs >= 200, 'activity must extend the idle timer')
      await assertClosed(scenario)
    }

    for (const [scenario, phase] of [
      ['headers-stalled', 'awaiting_headers'],
      ['first-byte-stalled', 'awaiting_stream'],
      ['stream-stalled', 'streaming'],
      ['heartbeat-stalled', 'streaming'],
      ['text-done-stalled', 'streaming'],
      ['json-stalled', 'reading_body'],
    ]) {
      const result = await run(scenario)
      assert.equal(result.content, null, `${scenario}: never publish partial content`)
      assert.equal(result.failureClass, 'timeout', scenario)
      assert.equal(result.diagnostic?.timeoutPhase, phase, scenario)
      const record = buildPublicAssistantRecoveryLogRecord({
        recovery: { state: 'degraded', attempts: 1, failureClass: 'timeout' },
        diagnostic: result.diagnostic, failureClass: 'timeout', durationMs: result.durationMs,
      })
      assert.deepEqual(record, {
        event: 'public-assistant-recovery', state: 'degraded', failure_class: 'timeout',
        failure_origin: 'network', timeout_phase: phase, attempts: 1, duration_bucket: 'under_1s',
      })
      assert.doesNotMatch(JSON.stringify(record), /httpStatus|timeoutMs|model|provider|endpoint|question|request|session|fixture|127\.0\.0\.1/iu)
      await assertClosed(scenario)
    }

    for (const scenario of ['cancel-headers', 'cancel-stream']) {
      const abort = new AbortController()
      const arrived = new Promise<void>((resolve) => received.set(scenario, resolve))
      const result = run(scenario, abort.signal, 1_000)
      // Attach rejection handling before aborting; cancellation must propagate.
      const rejected = assert.rejects(result, (error) => error instanceof DOMException && error.name === 'AbortError')
      await arrived
      if (scenario === 'cancel-stream') await delay(30)
      abort.abort()
      await rejected
      await assertClosed(scenario)
    }
    const alreadyAborted = new AbortController()
    alreadyAborted.abort()
    await assert.rejects(run('pre-cancelled', alreadyAborted.signal), { name: 'AbortError' })
    assert.equal(calls.has('pre-cancelled'), false)

    for (const [scenario, failure] of [['stream-error', 'upstream'], ['oversized', 'invalid']]) {
      const result = await run(scenario, undefined, 1_000)
      assert.equal(result.content, null)
      assert.equal(result.failureClass, failure)
      assert.equal(result.diagnostic?.timeoutPhase, undefined)
      await assertClosed(scenario)
    }

    for (const diagnostic of [
      { kind: 'timeout' as const, attemptedEndpoints: 1, timeoutMs: 100 },
      { kind: 'http_status' as const, timeoutPhase: 'streaming' as const, attemptedEndpoints: 1, timeoutMs: 100 },
      Object.assign({ kind: 'timeout' as const, attemptedEndpoints: 1, timeoutMs: 100 }, { timeoutPhase: 'untrusted-private-value' }),
    ]) {
      const record = buildPublicAssistantRecoveryLogRecord({
        recovery: { state: 'degraded', attempts: 1, failureClass: 'timeout' },
        // Deliberately inject an untyped runtime value to test the log allowlist.
        diagnostic: diagnostic as Parameters<typeof buildPublicAssistantRecoveryLogRecord>[0]['diagnostic'],
        durationMs: 20,
      })
      assert.equal(record?.timeout_phase, undefined)
      assert.doesNotMatch(JSON.stringify(record), /untrusted-private-value/u)
    }
    console.log('Responses terminal/cancellation/idle/timeout-phase fixtures passed; external provider calls=0.')
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
