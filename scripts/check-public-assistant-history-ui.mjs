import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { tsImport } from 'tsx/esm/api'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const { normalizePublicAssistantSessionHistory, normalizePublicAssistantAnswer } = await tsImport('../src/utils/publicAssistantApi.ts', import.meta.url)
const { publicAssistantInterfaceCopy } = await tsImport('../src/data/publicAssistantInterfaceCopy.ts', import.meta.url)
const sessionIds = ['history-send-ui-session-a', 'history-send-ui-session-b']
const registryKey = 'biau-public-assistant-sessions-v2'
const draftPrefix = 'biau-public-assistant-draft-v1:'
const drafts = ['会话 A 的草稿', '会话 B 的草稿']
const pendingDraft = '等待历史操作时继续编辑的草稿'
const configurations = [
  { width: 1440, theme: 'morning', language: 'zh' },
  { width: 320, theme: 'stellar', language: 'en' },
  { width: 390, theme: 'nature', language: 'zh' },
  { width: 430, theme: 'morning', language: 'en' },
]
const initialRestoreFailures = [
  { name: 'service-unavailable', response: { status: 503, body: { error: 'public-assistant-service-unavailable' } } },
  { name: 'database-not-configured', response: { status: 503, body: { error: 'database-not-configured' } } },
  { name: 'unknown-failure', response: { status: 500, body: { error: 'history-fixture-unknown-failure' } } },
  { name: 'timeout', response: { status: 504, body: { error: 'public-assistant-upstream-timeout' } } },
  { name: 'unreachable', response: { status: 502, body: { error: 'public-assistant-endpoint-unreachable' } } },
  { name: 'invalid-response', response: { status: 200, body: {} } },
]

function historyFixture(id) {
  const date = '2026-09-01T08:00:00.000Z'
  const branchId = id + '-branch'
  const revisionId = id + '-revision'
  return {
    session: {
      id, activeBranchId: branchId, title: id, turnCount: 1, hasEarlierTurns: false,
      createdAt: date, lastActiveAt: date, expiresAt: '2026-10-01T08:00:00.000Z',
    },
    branches: [{ id: branchId, ordinal: 1, headRevisionId: revisionId, preview: '本地历史路径', turnCount: 1, hasEarlierTurns: false, lastActiveAt: date }],
    turns: [{
      id: id + '-turn', question: '历史问题 ' + id, mode: 'site', parentRevisionId: null,
      selectedRevisionId: revisionId, createdAt: date,
      revisions: [{
        id: revisionId, revisionNo: 1, basedOnRevisionId: null, answer: '历史回答 ' + id,
        status: 'answered', claims: [], citations: [], suggestions: [], route: 'site',
        meta: { mode: 'model', citationCount: 0 }, createdAt: date, feedback: null,
      }],
    }],
    hasEarlierTurns: false, revisionsTruncated: false, branchesTruncated: false, truncated: false,
  }
}

for (const id of sessionIds) assert.ok(normalizePublicAssistantSessionHistory(historyFixture(id)), 'history fixture must satisfy the production decoder')

async function bounded(promise, label, timeout = 20_000) {
  let timer
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), timeout) })])
  } finally {
    clearTimeout(timer)
  }
}

function responseGate() {
  return { started: Promise.withResolvers(), release: Promise.withResolvers(), settled: Promise.withResolvers(), active: false, allowAbort: false }
}

async function afterPaint(page) {
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
}

async function currentSession(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)).currentSessionId, registryKey)
}

async function readDraft(page, id) {
  return page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? 'null')?.input ?? null, draftPrefix + id)
}

async function createHistoryPage(browser, base, configuration, options = {}) {
  const page = await browser.newPage({ viewport: { width: configuration.width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  page.setDefaultTimeout(10_000)
  const errors = []
  const chats = []
  const cancellations = []
  const actions = []
  const stages = []
  const chatGate = responseGate()
  const initialGate = responseGate()
  const listGate = responseGate()
  const cancellationReceived = Promise.withResolvers()
  let initialRestore = true
  let listCount = 0
  await installLocalNetworkGuard(page, base, () => errors.push('external-request'), { allowLoopback: false })
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(({ language, theme, ids, registry, prefix, values }) => {
    localStorage.setItem('biau-port-language', language)
    localStorage.setItem('biau-port-theme', theme)
    localStorage.setItem(registry, JSON.stringify({ version: 2, currentSessionId: ids[0], sessionIds: ids }))
    ids.forEach((id, index) => sessionStorage.setItem(prefix + id, JSON.stringify({ version: 1, sessionId: id, input: values[index], mode: index === 0 ? 'site' : 'web', updatedAt: Date.now() })))
  }, { ...configuration, ids: options.onlyCurrent ? sessionIds.slice(0, 1) : sessionIds, registry: registryKey, prefix: draftPrefix, values: drafts })
  const serveGate = async (gate, reply) => {
    gate.active = true
    gate.started.resolve()
    try {
      const outcome = await bounded(gate.release.promise, 'history fixture was not released')
      await reply(outcome)
    } catch (error) {
      if (!gate.allowAbort) errors.push('fixture: ' + error.message)
    } finally {
      gate.active = false
      gate.settled.resolve()
    }
  }
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const reply = (body, status = 200, headers = {}) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/health') return reply({ ok: true, database: true, modelConfigured: true, webSearchConfigured: true })
    if (path === '/api/chat/public/sessions') {
      listCount += 1
      if (options.failList) return reply({ error: 'public-assistant-service-unavailable' }, 503)
      const body = { sessions: sessionIds.filter(id => request.postDataJSON().sessionIds.includes(id)).map(id => historyFixture(id).session) }
      if (options.delayList && listCount === 1) return serveGate(listGate, () => reply(body))
      return reply(body)
    }
    if (path === '/api/chat/public/session') {
      const body = request.postDataJSON()
      if (initialRestore && request.method() === 'POST' && body.sessionId === sessionIds[0]) {
        initialRestore = false
        if (options.holdInitialRestore) return serveGate(initialGate, () => reply(historyFixture(sessionIds[0])))
        if (options.failInitialRestore) {
          const response = options.initialRestoreResponse ?? initialRestoreFailures[0].response
          return reply(response.body, response.status, response.headers)
        }
        return reply(historyFixture(sessionIds[0]))
      }
      const gate = stages[actions.length]
      if (!gate || gate.id !== body.sessionId || gate.method !== request.method()) {
        errors.push('unexpected-history-operation')
        return reply({ error: 'unexpected-fixture-request' }, 500)
      }
      actions.push({ method: request.method(), body })
      return serveGate(gate, outcome => outcome === 'failure'
        ? reply({ error: 'public-assistant-service-unavailable' }, 503)
        : outcome === 'expired'
          ? reply({ error: 'session-not-found' }, 404)
          : reply(request.method() === 'DELETE' ? { ok: true } : historyFixture(body.sessionId)))
    }
    if (path === '/api/chat/public/cancel') {
      const body = request.postDataJSON()
      cancellations.push(body)
      cancellationReceived.resolve(body)
      return reply({ ok: true })
    }
    if (path === '/api/chat/public/stream') {
      const body = request.postDataJSON()
      const index = chats.length
      chats.push({ body, whileHistoryPending: stages.some(gate => gate.active), whileListPending: listGate.active })
      const answer = {
        contractVersion: 2, requestId: body.requestId, sessionId: body.sessionId,
        answer: '本地明确发送完成 ' + (index + 1), status: 'answered', claims: [], citations: [], suggestions: [],
        conversation: {
          branchId: body.intent?.branchId ?? body.sessionId + '-branch', branchOrdinal: 1,
          turnId: 'history-send-ui-new-turn-' + index, revisionId: 'history-send-ui-new-revision-' + index,
          revisionNo: 1, basedOnRevisionId: null, activated: true,
        },
        meta: { mode: 'model', citationCount: 0 },
      }
      assert.ok(normalizePublicAssistantAnswer(answer), 'chat fixture must satisfy the production decoder')
      const send = () => route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: result\ndata: ' + JSON.stringify(answer) + '\n\n' })
      if (options.holdChat && index === 0) return serveGate(chatGate, send)
      return send()
    }
    errors.push('unexpected-api: ' + request.method() + ' ' + path)
    return reply({ error: 'unexpected-fixture-request' }, 500)
  })
  const close = async () => {
    const gates = [...stages, chatGate, initialGate, listGate]
    for (const gate of gates) { gate.allowAbort = true; gate.release.resolve('success') }
    await Promise.all(gates.filter(gate => gate.active).map(gate => bounded(gate.settled.promise, 'history fixture cleanup timed out')))
    await page.close()
  }
  try {
    await page.goto(base + '/blog', { waitUntil: 'load' })
    await page.locator('.public-assistant__trigger').click()
    if (options.holdInitialRestore) {
      await bounded(initialGate.started.promise, 'initial restoration did not start')
    } else if (options.failInitialRestore) {
      await page.locator('.public-assistant__notice--restore').waitFor({ state: 'visible' })
    } else {
      await page.getByText('历史回答 ' + sessionIds[0], { exact: true }).waitFor({ state: 'visible' })
      await page.waitForFunction(() => document.querySelector('.public-assistant__composer button[type=submit]')?.disabled === false)
      assert.equal(await page.locator('#public-assistant-input').inputValue(), drafts[0])
    }
    return { page, errors, chats, cancellations, cancellationReceived, actions, stages, chatGate, initialGate, listGate, close }
  } catch (error) {
    await close()
    throw error
  }
}

async function openHistoryEntry(page, id) {
  if (!await page.locator('.public-assistant__history').count()) await page.locator('.public-assistant__header-actions button').first().click()
  const entry = page.locator('.public-assistant__history-list article').filter({ has: page.getByText(id, { exact: true }) })
  await entry.waitFor({ state: 'visible' })
  return entry
}

async function closeHistoryAndRestoreFocus(page) {
  await page.locator('.public-assistant__history header button').click()
  await page.waitForFunction(() => document.activeElement === document.querySelector('.public-assistant__header-actions button'))
}

async function startHistoryAction(test, action, target = action === 'restore' ? sessionIds[1] : sessionIds[0], synchronousRetry = false) {
  const entry = await openHistoryEntry(test.page, target)
  const gate = { ...responseGate(), id: target, method: action === 'restore' ? 'POST' : 'DELETE' }
  test.stages.push(gate)
  if (action !== 'restore') test.page.once('dialog', dialog => dialog.accept())
  const selector = action === 'restore' ? '.public-assistant__history-open' : '.public-assistant__history-delete'
  if (synchronousRetry) {
    gate.retryWasEnabledBeforeProjection = await entry.evaluate((element, actionSelector) => {
      const retry = document.querySelector('.public-assistant__notice--restore button')
      element.querySelector(actionSelector).click()
      const enabled = !retry.disabled
      retry.click()
      return enabled
    }, selector)
  } else {
    await entry.locator(selector).click()
  }
  await bounded(gate.started.promise, 'history action did not reach its fixture')
  await closeHistoryAndRestoreFocus(test.page)
  return gate
}

async function assertPending(test, draft = pendingDraft, expectedChats = 0, expectedQuestions = 1) {
  const { page, chats } = test
  const input = page.locator('#public-assistant-input')
  assert.equal(await input.isEnabled(), true, 'history pending leaves the owning session draft editable')
  await input.fill(draft)
  await input.press('Enter')
  await page.locator('.public-assistant__composer').evaluate(form => form.requestSubmit())
  await afterPaint(page)
  assert.equal(chats.length, expectedChats, 'Enter and form submission must not send while history changes are pending')
  assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isDisabled(), true, 'send must project the history operation gate')
  assert.equal(await input.inputValue(), draft)
  assert.equal(await page.locator('.public-assistant__message.is-user').count(), expectedQuestions, 'blocked submission must not append a pending question')
  const controls = page.locator('.public-assistant__branch-picker select, .public-assistant__suggestion, .public-assistant__composer .is-attach, .public-assistant__user-message-actions button')
  assert.ok(await controls.count() > 0)
  assert.equal(await controls.evaluateAll(elements => elements.every(element => element.disabled)), true, 'context-changing controls share history busy state')
}

async function settleHistory(test, gate, outcome) {
  gate.release.resolve(outcome)
  await bounded(gate.settled.promise, 'history response did not finish')
  await test.page.waitForFunction(() => document.querySelector('.public-assistant__composer .is-attach')?.disabled === false)
}

async function explicitSend(test, configuration, id, draft, hasHistory = true, expectedChats = 0, allowListPending = false) {
  const { page, chats } = test
  const input = page.locator('#public-assistant-input')
  assert.equal(chats.length, expectedChats, 'settling history must not automatically send')
  assert.equal(await currentSession(page), id)
  assert.equal(await input.inputValue(), draft)
  await input.press('Control+End')
  await input.press('Shift+Enter')
  assert.equal(await input.inputValue(), draft + '\n')
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
  await afterPaint(page)
  assert.equal(chats.length, expectedChats, 'composition must not send')
  if (configuration.language === 'en') await page.locator('.public-assistant__composer button[type=submit]').click()
  else await input.press('Enter')
  await page.getByText('本地明确发送完成 ' + (expectedChats + 1), { exact: true }).waitFor({ state: 'visible' })
  assert.equal(chats.length, expectedChats + 1)
  const sent = chats[expectedChats]
  assert.equal(sent.whileHistoryPending, false)
  assert.equal(sent.whileListPending, allowListPending)
  assert.equal(sent.body.sessionId, id)
  assert.equal(sent.body.message, draft)
  assert.deepEqual(sent.body.intent, { kind: 'new-turn', branchId: hasHistory ? id + '-branch' : null, parentRevisionId: hasHistory ? id + '-revision' : null })
  assert.deepEqual(sent.body.history, hasHistory ? [{ role: 'user', content: '历史问题 ' + id }, { role: 'assistant', content: '历史回答 ' + id }] : [])
  assert.equal(await input.inputValue(), '')
}

async function assertRestoreNotice(notice, expectedCopy) {
  await notice.waitFor({ state: 'visible' })
  assert.equal(await notice.locator('strong').textContent(), expectedCopy.title, 'restore notice must describe the current recovery action')
  assert.equal(await notice.locator('span').first().textContent(), expectedCopy.detail, 'restore notice must not claim an available composer or nonexistent fallback answer')
  const layout = await notice.evaluate(element => {
    const area = element.getBoundingClientRect()
    const buttons = [...element.querySelectorAll('button')].map(button => button.getBoundingClientRect())
    const text = [...element.firstElementChild.querySelectorAll('strong, span')].flatMap(element => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return [...range.getClientRects()]
    })
    return {
      overlaps: text.some(line => buttons.some(button => Math.min(line.right, button.right) - Math.max(line.left, button.left) > 0.5 && Math.min(line.bottom, button.bottom) - Math.max(line.top, button.top) > 0.5)),
      contained: [...text, ...buttons].every(rect => rect.left >= area.left - 0.5 && rect.right <= area.right + 0.5 && rect.top >= area.top - 0.5 && rect.bottom <= area.bottom + 0.5),
    }
  })
  assert.equal(layout.overlaps, false, 'restore explanation must not overlap recovery buttons')
  assert.equal(layout.contained, true, 'restore explanation and buttons stay within the notice')
}

async function checkInitialRestoreFailure(test, configuration, kind) {
  const { page } = test
  const copy = publicAssistantInterfaceCopy[configuration.language]
  const notice = page.locator('.public-assistant__notice--restore')
  const retry = notice.locator('button').first()
  assert.equal(await page.locator('#public-assistant-input').isDisabled(), true)
  assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isDisabled(), true)
  assert.equal(await page.locator('#public-assistant-input').inputValue(), drafts[0])
  assert.equal(await readDraft(page, sessionIds[0]), drafts[0])
  assert.equal(await currentSession(page), sessionIds[0])
  assert.equal(await page.locator('.public-assistant__message').count(), 0, 'restoration has not produced a chat or fallback answer')
  if (kind === 'rate-limit') {
    assert.equal(await notice.locator('strong').textContent(), copy.rateLimited.title)
    assert.equal(await retry.isDisabled(), true, 'restore copy must retain the Retry-After gate')
    assert.match(await notice.locator('span').first().textContent(), /[1-3]/u)
    await page.waitForFunction(() => document.querySelector('.public-assistant__notice--restore button')?.disabled === false)
    await assertRestoreNotice(notice, { title: copy.rateLimited.title, detail: copy.rateLimited.ready })
  } else {
    await assertRestoreNotice(notice, copy.restore)
  }
  if (kind === 'offline') {
    await page.context().setOffline(true)
    await page.waitForFunction(expected => document.querySelector('.public-assistant__notice--restore strong')?.textContent === expected, copy.issues.offline.title)
    await assertRestoreNotice(notice, copy.issues.offline)
    assert.equal(await retry.isDisabled(), true)
    await page.context().setOffline(false)
    await page.waitForFunction(() => document.querySelector('.public-assistant__notice--restore button')?.disabled === false)
    await assertRestoreNotice(notice, copy.restore)
  }
  if (kind === 'service-unavailable') {
    const previousUrl = page.url()
    await page.locator('.public-assistant__header-actions button').last().click()
    await page.locator('.nav-lang-toggle').click()
    await page.locator('.public-assistant__trigger').click()
    await assertRestoreNotice(notice, publicAssistantInterfaceCopy[configuration.language === 'zh' ? 'en' : 'zh'].restore)
    assert.equal(page.url(), previousUrl)
    assert.equal(await page.locator('#public-assistant-input').inputValue(), drafts[0])
    assert.equal(await currentSession(page), sessionIds[0])
  }
  assert.equal(await retry.isEnabled(), true)
  assert.equal(test.actions.length, 0, 'network, countdown, language and reopen changes must not automatically restore')
  assert.equal(test.chats.length, 0, 'restore error presentation must not send a question')
  if (process.env.UI_CHECK_ARTIFACT_DIR && ['service-unavailable', 'unknown-failure'].includes(kind)) {
    await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'history-restore-copy-' + configuration.width + '-' + kind + '.png') })
  }
  if (kind === 'unknown-failure') {
    await notice.locator('button').nth(1).click()
    const nextId = await currentSession(page)
    assert.equal(sessionIds.includes(nextId), false)
    assert.equal(await notice.count(), 0)
    assert.equal(await page.locator('.public-assistant__message').count(), 0)
    assert.equal(await page.locator('#public-assistant-input').inputValue(), '')
    await page.locator('#public-assistant-input').fill('恢复错误后新会话明确发送')
    await explicitSend(test, configuration, nextId, '恢复错误后新会话明确发送', false)
  } else {
    const gate = { ...responseGate(), id: sessionIds[0], method: 'POST' }
    test.stages.push(gate)
    await retry.click()
    await bounded(gate.started.promise, 'explicit restore after error notice did not start')
    assert.deepEqual(test.actions, [{ method: 'POST', body: { sessionId: sessionIds[0] } }])
    await settleHistory(test, gate, 'success')
    await page.getByText('历史回答 ' + sessionIds[0], { exact: true }).waitFor({ state: 'visible' })
    assert.equal(await notice.count(), 0)
    await explicitSend(test, configuration, sessionIds[0], drafts[0])
  }
}

async function checkReadyListFailure(test, configuration) {
  const { page } = test
  const copy = publicAssistantInterfaceCopy[configuration.language]
  await page.locator('.public-assistant__header-actions button').first().click()
  const error = page.locator('.public-assistant__history-state')
  await error.locator('strong').waitFor({ state: 'visible' })
  assert.equal(await error.locator('strong').textContent(), copy.issues.history.title)
  assert.equal(await error.locator('span').first().textContent(), copy.issues.history.detail, 'a ready conversation retains the existing history-list explanation')
  await closeHistoryAndRestoreFocus(page)
  assert.equal(await page.locator('.public-assistant__notice--restore').count(), 0)
  assert.equal(await page.locator('#public-assistant-input').isEnabled(), true)
  await explicitSend(test, configuration, sessionIds[0], drafts[0])
}

async function checkTransition(test, configuration, action, outcome) {
  const { page } = test
  let gate = await startHistoryAction(test, action)
  if (outcome === 'success') {
    await page.locator('.public-assistant__header-actions button').last().click()
    await page.locator('.public-assistant__trigger').click()
  }
  await assertPending(test)
  if (process.env.UI_CHECK_ARTIFACT_DIR && outcome === 'success') {
    await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'history-pending-' + action + '-' + configuration.width + '.png') })
  }
  if (outcome === 'new-session') {
    gate.allowAbort = true
    await page.locator('.public-assistant__header-actions button').nth(1).click()
    const nextId = await currentSession(page)
    assert.notEqual(nextId, sessionIds[0])
    await page.locator('#public-assistant-input').fill('新会话明确发送')
    assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isEnabled(), true)
    gate.release.resolve('success')
    await bounded(gate.settled.promise, 'cancelled history response did not finish')
    await afterPaint(page)
    assert.equal(await page.locator('.public-assistant__branch-picker').count(), 0, 'late history must not restore a previous path')
    await explicitSend(test, configuration, nextId, '新会话明确发送', false)
    return
  }
  await settleHistory(test, gate, outcome === 'success' ? 'success' : 'failure')
  let currentDraft = pendingDraft
  if (outcome !== 'success') {
    assert.equal(await currentSession(page), sessionIds[0])
    assert.equal(await page.locator('#public-assistant-input').inputValue(), currentDraft)
  }
  if (outcome === 'retry') {
    gate = await startHistoryAction(test, action)
    currentDraft += '，重试期间继续编辑'
    await assertPending(test, currentDraft)
    assert.deepEqual(test.actions[1], test.actions[0], 'explicit retry retains the same history operation')
    await settleHistory(test, gate, 'success')
  }
  if (outcome === 'failure') await explicitSend(test, configuration, sessionIds[0], currentDraft)
  else if (action === 'restore') {
    assert.equal(await readDraft(page, sessionIds[0]), currentDraft, 'restore keeps the old session draft under its old identity')
    assert.equal(await readDraft(page, sessionIds[1]), drafts[1])
    await explicitSend(test, configuration, sessionIds[1], drafts[1])
  } else {
    const nextId = await currentSession(page)
    assert.notEqual(nextId, sessionIds[0])
    assert.equal(await readDraft(page, sessionIds[0]), null, 'deleting the current session removes its draft')
    assert.equal(await page.locator('#public-assistant-input').inputValue(), '')
    assert.equal(await page.locator('.public-assistant__message').count(), 0)
    await page.locator('#public-assistant-input').fill('删除后明确发送')
    await explicitSend(test, configuration, nextId, '删除后明确发送', false)
  }
}

async function checkExpiredHistory(test, configuration, kind) {
  const { page } = test
  const target = kind === 'other' ? sessionIds[1] : sessionIds[0]
  const gate = await startHistoryAction(test, 'restore', target)
  await assertPending(test)
  await settleHistory(test, gate, 'expired')
  const registry = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), registryKey)
  assert.equal(registry.sessionIds.includes(target), false, 'expired capability must be forgotten')
  assert.equal(await readDraft(page, target), null, 'expired session draft must be cleared')
  assert.equal(await page.evaluate(id => sessionStorage.getItem('biau-public-assistant-history-v1:' + id), target), null)
  if (kind === 'other') {
    await explicitSend(test, configuration, sessionIds[0], pendingDraft)
  } else {
    const nextId = registry.currentSessionId
    assert.equal(sessionIds.includes(nextId), false, 'current-session expiry must create a fresh context instead of selecting another stored capability')
    assert.equal(await page.locator('.public-assistant__message').count(), 0, 'expired transcript must not survive under a new session identity')
    assert.equal(await page.locator('.public-assistant__branch-picker').count(), 0)
    assert.equal(await page.locator('#public-assistant-input').inputValue(), '')
    assert.equal(registry.sessionIds.includes(sessionIds[1]), kind === 'current-with-other')
    if (kind === 'current-with-other') assert.equal(await readDraft(page, sessionIds[1]), drafts[1], 'an unrelated saved session draft remains untouched')
    await page.locator('#public-assistant-input').fill('过期恢复后的明确问题')
    await explicitSend(test, configuration, nextId, '过期恢复后的明确问题', false)
  }
  assert.equal(test.actions.length, 1, 'expiry must not automatically restore another session')
}

async function checkActiveDeletion(test, outcome) {
  const { page, chatGate } = test
  await page.locator('#public-assistant-input').fill('删除前正在生成的问题')
  await page.locator('#public-assistant-input').press('Enter')
  await bounded(chatGate.started.promise, 'initial chat did not start')
  const entry = await openHistoryEntry(page, sessionIds[0])
  page.once('dialog', dialog => dialog.dismiss())
  await entry.locator('.public-assistant__history-delete').click()
  assert.equal(test.actions.length, 0, 'dismissing deletion must not send DELETE')
  assert.equal(test.cancellations.length, 0, 'dismissing deletion must not cancel the active generation')
  assert.equal(await page.locator('.public-assistant__composer .is-stop').count(), 1)
  chatGate.allowAbort = true
  const gate = await startHistoryAction(test, 'delete-current')
  const cancellation = await bounded(test.cancellationReceived.promise, 'confirmed current-session deletion must cancel the active generation', 5_000)
  assert.deepEqual(cancellation, { requestId: test.chats[0].body.requestId, sessionId: sessionIds[0] })
  assert.equal(test.cancellations.length, 1)
  await assertPending(test, pendingDraft, 1, 2)
  await settleHistory(test, gate, outcome)
  const nextId = await currentSession(page)
  assert.equal(nextId === sessionIds[0], outcome === 'failure')
  await page.locator('#public-assistant-input').fill('删除处理结束后的草稿')
  assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isEnabled(), true, 'the old generation must not keep the current composer busy')
  chatGate.release.resolve('success')
  await bounded(chatGate.settled.promise, 'cancelled chat response did not finish')
  await afterPaint(page)
  assert.equal(await currentSession(page), nextId)
  assert.equal(await page.getByText('本地明确发送完成 1', { exact: true }).count(), 0, 'cancelled generation cannot insert its late answer')
  assert.equal(await page.locator('#public-assistant-input').inputValue(), '删除处理结束后的草稿')
  assert.equal(test.chats.length, 1, 'deletion and cancellation do not replay the question')
}

async function checkSupersededHistory(test, configuration) {
  const { page } = test
  const first = await startHistoryAction(test, 'restore')
  first.allowAbort = true
  await page.locator('.public-assistant__header-actions button').nth(1).click()
  const nextId = await currentSession(page)
  const second = await startHistoryAction(test, 'restore', sessionIds[0])
  first.release.resolve('success')
  await bounded(first.settled.promise, 'old history response did not finish')
  await assertPending(test, pendingDraft, 0, 0)
  assert.equal(await currentSession(page), nextId, 'superseded history cannot select its session')
  await settleHistory(test, second, 'success')
  assert.equal(await readDraft(page, nextId), pendingDraft)
  assert.equal(await page.locator('#public-assistant-input').inputValue(), '')
  await page.locator('#public-assistant-input').fill('再次恢复后的明确问题')
  await explicitSend(test, configuration, sessionIds[0], '再次恢复后的明确问题')
}

async function checkOtherDeletionDuringChat(test, outcome) {
  const { page, chatGate } = test
  await page.locator('#public-assistant-input').fill('删除其他会话期间正在生成的问题')
  await page.locator('#public-assistant-input').press('Enter')
  await bounded(chatGate.started.promise, 'independent generation did not start')
  await page.locator('#public-assistant-input').fill(pendingDraft)
  const gate = await startHistoryAction(test, 'delete-other', sessionIds[1])
  const finishChat = async () => {
    chatGate.release.resolve('success')
    await bounded(chatGate.settled.promise, 'independent generation did not settle')
    await page.getByText('本地明确发送完成 1', { exact: true }).waitFor({ state: 'visible' })
  }
  const finishDelete = async () => {
    await openHistoryEntry(page, sessionIds[1])
    gate.release.resolve(outcome === 'failure' ? 'failure' : 'success')
    await bounded(gate.settled.promise, 'non-current deletion did not settle')
    if (outcome === 'failure') {
      await page.waitForFunction(() => {
        const buttons = [...document.querySelectorAll('.public-assistant__history-open')]
        return buttons.length > 0 && buttons.every(button => !button.disabled)
      })
    } else {
      await page.waitForFunction(({ key, id }) => !JSON.parse(localStorage.getItem(key)).sessionIds.includes(id), { key: registryKey, id: sessionIds[1] })
    }
    await closeHistoryAndRestoreFocus(page)
  }
  if (outcome === 'delete-first') {
    await finishDelete()
    await finishChat()
  } else {
    await finishChat()
    await finishDelete()
  }
  await afterPaint(page)
  const registry = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), registryKey)
  assert.equal(registry.currentSessionId, sessionIds[0])
  assert.equal(registry.sessionIds.includes(sessionIds[1]), outcome === 'failure', 'late generation must not restore a deleted capability from an older registry')
  assert.equal(await readDraft(page, sessionIds[1]), outcome === 'failure' ? drafts[1] : null)
  assert.equal(await readDraft(page, sessionIds[0]), pendingDraft)
  assert.equal(await page.locator('#public-assistant-input').inputValue(), pendingDraft)
  assert.equal(test.chats.length, 1, 'independent generation completes once without replay')
  assert.equal(test.chats[0].body.sessionId, sessionIds[0])
  assert.equal(test.chats[0].body.intent.parentRevisionId, sessionIds[0] + '-revision')
  assert.equal(test.cancellations.length, 0, 'deleting another session must not cancel the current generation')
  assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isEnabled(), true)
}

async function checkInterruptedInitialRestore(test, configuration, kind, recovery) {
  const { page, initialGate } = test
  initialGate.allowAbort = true
  const target = kind === 'current-failure' ? sessionIds[0] : sessionIds[1]
  const gate = await startHistoryAction(test, 'restore', target)
  gate.release.resolve(kind === 'other-expired' ? 'expired' : 'failure')
  await bounded(gate.settled.promise, 'replacement restoration did not settle')
  await page.locator('.public-assistant__loading').waitFor({ state: 'hidden' })
  const recoveryNotice = page.locator('.public-assistant__notice--restore')
  await assertRestoreNotice(recoveryNotice, publicAssistantInterfaceCopy[configuration.language].restore)
  assert.equal(await page.locator('#public-assistant-input').isDisabled(), true, 'unrestored current history must remain fenced until explicit recovery')
  assert.equal(await page.locator('#public-assistant-input').inputValue(), drafts[0])
  assert.equal(await currentSession(page), sessionIds[0])
  assert.equal(await recoveryNotice.locator('button').first().isEnabled(), true)
  assert.equal(test.chats.length, 0)
  assert.equal(test.actions.length, 1, 'failure does not automatically retry a restore')
  const registry = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), registryKey)
  assert.equal(registry.sessionIds.includes(sessionIds[1]), kind !== 'other-expired')
  assert.equal(await readDraft(page, sessionIds[1]), kind === 'other-expired' ? null : drafts[1])
  if (process.env.UI_CHECK_ARTIFACT_DIR && kind === 'other-expired' && recovery === 'retry') {
    await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'history-interrupted-restore-' + configuration.width + '.png') })
  }
  if (recovery === 'retry') {
    const retry = { ...responseGate(), id: sessionIds[0], method: 'POST' }
    test.stages.push(retry)
    await recoveryNotice.locator('button').first().click()
    await bounded(retry.started.promise, 'explicit current-session retry did not start')
    initialGate.release.resolve('success')
    await bounded(initialGate.settled.promise, 'superseded initial response did not settle')
    await afterPaint(page)
    assert.equal(await page.locator('.public-assistant__loading').isVisible(), true, 'old initial response cannot finish the newer retry')
    assert.equal(await page.locator('.public-assistant__message').count(), 0)
    retry.release.resolve('success')
    await bounded(retry.settled.promise, 'explicit retry did not settle')
    await page.getByText('历史回答 ' + sessionIds[0], { exact: true }).waitFor({ state: 'visible' })
    await explicitSend(test, configuration, sessionIds[0], drafts[0])
    assert.deepEqual(test.actions[1], { method: 'POST', body: { sessionId: sessionIds[0] } }, 'restore recovery targets the current session, not the failed history selection')
  } else {
    await recoveryNotice.locator('button').nth(1).click()
    const nextId = await currentSession(page)
    assert.equal(sessionIds.includes(nextId), false)
    initialGate.release.resolve('success')
    await bounded(initialGate.settled.promise, 'superseded initial response did not settle after New')
    await afterPaint(page)
    assert.equal(await page.locator('.public-assistant__message').count(), 0)
    assert.equal(await page.locator('.public-assistant__loading, .public-assistant__notice--restore').count(), 0)
    await page.locator('#public-assistant-input').fill('恢复失败后新会话明确发送')
    await explicitSend(test, configuration, nextId, '恢复失败后新会话明确发送', false)
  }
}

async function checkInterruptedInitialRestoreSuccess(test, configuration) {
  const { page, initialGate } = test
  initialGate.allowAbort = true
  const gate = await startHistoryAction(test, 'restore')
  await settleHistory(test, gate, 'success')
  initialGate.release.resolve('success')
  await bounded(initialGate.settled.promise, 'old initial response did not settle after manual success')
  await afterPaint(page)
  assert.equal(await page.locator('.public-assistant__loading, .public-assistant__notice--restore').count(), 0)
  assert.equal(await readDraft(page, sessionIds[0]), drafts[0])
  await explicitSend(test, configuration, sessionIds[1], drafts[1])
}

async function checkRestoreRetryDuringHistory(test, configuration, action, target, outcome, synchronousRetry = false) {
  const { page } = test
  const gate = await startHistoryAction(test, action, target, synchronousRetry)
  const notice = page.locator('.public-assistant__notice--restore')
  await notice.waitFor({ state: 'visible' })
  if (synchronousRetry) assert.equal(gate.retryWasEnabledBeforeProjection, true, 'synchronous fixture must exercise the command before disabled is projected')
  assert.equal(await notice.locator('button').first().isDisabled(), true, 'current-session restore retry must share the pending history action gate')
  assert.equal(await notice.locator('button').nth(1).isEnabled(), true, 'New remains available while history owns recovery')
  assert.equal(await page.locator('#public-assistant-input').isDisabled(), true)
  assert.equal(await page.locator('#public-assistant-input').inputValue(), drafts[0])
  await afterPaint(page)
  assert.equal(test.actions.length, 1, 'retry must not start a concurrent session request')
  assert.equal(test.chats.length, 0)
  assert.equal(await currentSession(page), sessionIds[0])
  if (process.env.UI_CHECK_ARTIFACT_DIR && action === 'restore' && target === sessionIds[1] && outcome === 'failure' && !synchronousRetry) {
    await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'history-restore-retry-pending-' + configuration.width + '.png') })
  }

  gate.release.resolve(outcome)
  await bounded(gate.settled.promise, 'history operation during restore error did not settle')
  const removed = outcome === 'expired' || (action === 'delete' && outcome === 'success')
  const freshSession = target === sessionIds[0] && removed
  if (freshSession) {
    await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).currentSessionId !== id, { key: registryKey, id: sessionIds[0] })
  } else if (action === 'restore' && outcome === 'success') {
    await page.getByText('历史回答 ' + target, { exact: true }).waitFor({ state: 'visible' })
  } else {
    await page.waitForFunction(() => document.querySelector('.public-assistant__notice--restore button')?.disabled === false)
  }
  await afterPaint(page)
  assert.equal(test.actions.length, 1, 'settlement must not automatically retry current history')
  assert.equal(test.chats.length, 0, 'settlement must not automatically send')
  const registry = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), registryKey)
  assert.equal(registry.sessionIds.includes(target), !removed)
  assert.equal(await readDraft(page, target), removed ? null : drafts[sessionIds.indexOf(target)])
  const other = sessionIds.find(id => id !== target)
  assert.equal(registry.sessionIds.includes(other), true, 'unrelated capability survives')
  assert.equal(await readDraft(page, other), drafts[sessionIds.indexOf(other)], 'unrelated draft survives')

  if (freshSession) {
    assert.equal(sessionIds.includes(registry.currentSessionId), false, 'current deletion/expiry creates a fresh context')
    assert.equal(await notice.count(), 0)
    assert.equal(await page.locator('.public-assistant__message, .public-assistant__branch-picker').count(), 0)
    assert.equal(await page.locator('#public-assistant-input').inputValue(), '')
    await page.locator('#public-assistant-input').fill('历史处理后新会话明确发送')
    await explicitSend(test, configuration, registry.currentSessionId, '历史处理后新会话明确发送', false)
  } else if (action === 'restore' && outcome === 'success') {
    assert.equal(await notice.count(), 0)
    await explicitSend(test, configuration, target, drafts[sessionIds.indexOf(target)])
  } else {
    assert.equal(registry.currentSessionId, sessionIds[0])
    assert.equal(await page.locator('#public-assistant-input').isDisabled(), true, 'unrestored history stays fenced until explicit recovery')
    assert.equal(await page.locator('.public-assistant__message').count(), 0)
    const retry = { ...responseGate(), id: sessionIds[0], method: 'POST' }
    test.stages.push(retry)
    await notice.locator('button').first().click()
    await bounded(retry.started.promise, 'retry must become available after history settlement')
    assert.deepEqual(test.actions[1], { method: 'POST', body: { sessionId: sessionIds[0] } })
    retry.release.resolve('success')
    await bounded(retry.settled.promise, 'explicit current recovery did not settle')
    await page.getByText('历史回答 ' + sessionIds[0], { exact: true }).waitFor({ state: 'visible' })
    await explicitSend(test, configuration, sessionIds[0], drafts[0])
  }
}

async function checkRestoreRetryDuringList(test, configuration) {
  const { page, listGate } = test
  await page.locator('.public-assistant__header-actions button').first().click()
  await bounded(listGate.started.promise, 'read-only list did not start')
  await closeHistoryAndRestoreFocus(page)
  const retryButton = page.locator('.public-assistant__notice--restore button').first()
  assert.equal(await retryButton.isEnabled(), true, 'read-only list transport must not own the restore retry gate')
  const retry = { ...responseGate(), id: sessionIds[0], method: 'POST' }
  test.stages.push(retry)
  await retryButton.click()
  await bounded(retry.started.promise, 'current retry must start while the list is pending')
  assert.equal(listGate.active, true)
  retry.release.resolve('success')
  await bounded(retry.settled.promise, 'current retry during list did not settle')
  await page.getByText('历史回答 ' + sessionIds[0], { exact: true }).waitFor({ state: 'visible' })
  await explicitSend(test, configuration, sessionIds[0], drafts[0], true, 0, true)
  listGate.release.resolve('success')
  await bounded(listGate.settled.promise, 'read-only list did not settle')
  await afterPaint(page)
  assert.equal(test.actions.length, 1)
  assert.equal(test.chats.length, 1)
  assert.equal(await currentSession(page), sessionIds[0])
}

export async function checkPublicAssistantHistorySendGate(browser, base) {
  const url = new URL(base)
  assert.ok(['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'history UI checks require a local preview')
  let cases = 0
  for (const configuration of configurations) {
    const scenarios = [
      ...initialRestoreFailures.map(failure => ({ name: 'initial-restore-' + failure.name, options: { failInitialRestore: true, initialRestoreResponse: failure.response }, run: test => checkInitialRestoreFailure(test, configuration, failure.name) })),
      { name: 'initial-restore-offline', options: { failInitialRestore: true }, run: test => checkInitialRestoreFailure(test, configuration, 'offline') },
      { name: 'initial-restore-rate-limit', options: { failInitialRestore: true, initialRestoreResponse: { status: 429, headers: { 'Retry-After': '3' }, body: { error: 'public-assistant-rate-limited' } } }, run: test => checkInitialRestoreFailure(test, configuration, 'rate-limit') },
      { name: 'ready-list-failure', options: { failList: true }, run: test => checkReadyListFailure(test, configuration) },
      ...['restore', 'delete'].flatMap(action => sessionIds.flatMap(target => (action === 'restore' ? ['success', 'failure', 'expired'] : ['success', 'failure']).map(outcome => ({ name: 'restore-retry-' + action + '-' + sessionIds.indexOf(target) + '-' + outcome, options: { failInitialRestore: true }, run: test => checkRestoreRetryDuringHistory(test, configuration, action, target, outcome) })))),
      ...['restore', 'delete'].map(action => ({ name: 'restore-retry-synchronous-' + action, options: { failInitialRestore: true }, run: test => checkRestoreRetryDuringHistory(test, configuration, action, action === 'restore' ? sessionIds[1] : sessionIds[0], action === 'restore' ? 'failure' : 'success', true) })),
      { name: 'restore-retry-list-only', options: { failInitialRestore: true, delayList: true }, run: test => checkRestoreRetryDuringList(test, configuration) },
      ...['delete-first', 'chat-first', 'failure'].map(outcome => ({ name: 'other-deletion-' + outcome, options: { holdChat: true }, run: test => checkOtherDeletionDuringChat(test, outcome) })),
      ...['current-failure', 'other-failure', 'other-expired'].flatMap(kind => ['retry', 'new-session'].map(recovery => ({ name: 'interrupted-restore-' + kind + '-' + recovery, options: { holdInitialRestore: true }, run: test => checkInterruptedInitialRestore(test, configuration, kind, recovery) }))),
      { name: 'interrupted-restore-success', options: { holdInitialRestore: true }, run: test => checkInterruptedInitialRestoreSuccess(test, configuration) },
      ...['current-with-other', 'current-only', 'other'].map(kind => ({ name: 'expired-' + kind, options: { onlyCurrent: kind === 'current-only' }, run: test => checkExpiredHistory(test, configuration, kind) })),
      ...['success', 'failure'].map(outcome => ({ name: 'active-deletion-' + outcome, options: { holdChat: true }, run: test => checkActiveDeletion(test, outcome) })),
      ...['restore', 'delete-current'].flatMap(action => ['success', 'failure', 'retry', 'new-session'].map(outcome => ({ name: action + '-' + outcome, run: test => checkTransition(test, configuration, action, outcome) }))),
      { name: 'superseded-history', run: test => checkSupersededHistory(test, configuration) },
      { name: 'list-only', options: { delayList: true }, run: async test => {
        await test.page.locator('.public-assistant__header-actions button').first().click()
        await bounded(test.listGate.started.promise, 'list refresh did not start')
        await closeHistoryAndRestoreFocus(test.page)
        await explicitSend(test, configuration, sessionIds[0], drafts[0], true, 0, true)
        test.listGate.release.resolve('success')
        await bounded(test.listGate.settled.promise, 'list refresh did not finish')
        await afterPaint(test.page)
        assert.equal(test.chats.length, 1)
        assert.equal(await currentSession(test.page), sessionIds[0])
      } },
    ]
    for (const scenario of scenarios) {
      const label = [configuration.width, configuration.theme, configuration.language, scenario.name].join('/')
      const test = await createHistoryPage(browser, base, configuration, scenario.options)
      try {
        await scenario.run(test)
        assert.deepEqual(test.errors, [], 'history interactions must not cause page errors or external requests')
        cases += 1
      } catch (error) {
        if (process.env.UI_CHECK_ARTIFACT_DIR) await test.page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'history-failure-' + configuration.width + '-' + scenario.name + '.png') }).catch(() => {})
        throw new Error(label + ': ' + error.message, { cause: error })
      } finally {
        await test.close()
      }
    }
  }
  return { cases, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Public assistant history send gate passed:', await checkPublicAssistantHistorySendGate(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } finally {
    await browser.close()
  }
}
