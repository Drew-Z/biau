import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { tsImport } from 'tsx/esm/api'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const { normalizePublicAssistantSessionHistory } = await tsImport('../src/utils/publicAssistantApi.ts', import.meta.url)
const { publicAssistantInterfaceCopy } = await tsImport('../src/data/publicAssistantInterfaceCopy.ts', import.meta.url)
const sessionIds = ['feedback-ui-session-a', 'feedback-ui-session-b']
const registryKey = 'biau-public-assistant-sessions-v2'
const draftPrefix = 'biau-public-assistant-draft-v1:'
const configurations = [
  { width: 1440, theme: 'morning', language: 'zh' },
  { width: 320, theme: 'stellar', language: 'en' },
  { width: 390, theme: 'nature', language: 'zh' },
  { width: 430, theme: 'morning', language: 'en' },
]

function historyFixture(id) {
  const date = '2026-09-01T08:00:00.000Z'
  return {
    session: { id, activeBranchId: id + '-branch', title: id, turnCount: 2, hasEarlierTurns: false, createdAt: date, lastActiveAt: date, expiresAt: '2026-10-01T08:00:00.000Z' },
    branches: [{ id: id + '-branch', ordinal: 1, headRevisionId: id + '-revision-b', preview: 'Feedback fixture', turnCount: 2, hasEarlierTurns: false, lastActiveAt: date }],
    turns: ['a', 'b'].map((letter, index) => ({
      id: id + '-turn-' + letter, question: 'Question ' + id + ' ' + letter, mode: 'site', parentRevisionId: index === 0 ? null : id + '-revision-a', selectedRevisionId: id + '-revision-' + letter, createdAt: date,
      revisions: [{ id: id + '-revision-' + letter, revisionNo: 1, basedOnRevisionId: null, answer: 'Answer ' + id + ' ' + letter, status: 'answered', claims: [], citations: [], suggestions: [], route: 'site', meta: { mode: 'model', citationCount: 0 }, createdAt: date, feedback: null }],
    })),
    hasEarlierTurns: false, revisionsTruncated: false, branchesTruncated: false, truncated: false,
  }
}

for (const id of sessionIds) assert.ok(normalizePublicAssistantSessionHistory(historyFixture(id)), 'feedback fixture must satisfy the production decoder')

async function bounded(promise, label) {
  let timer
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), 20_000) })]) }
  finally { clearTimeout(timer) }
}

async function afterPaint(page) {
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
}

async function snapshot(page) {
  await afterPaint(page)
  return page.evaluate(({ ids, registry, prefix }) => {
    const active = document.activeElement
    return {
      stable: {
        url: location.href,
        registry: localStorage.getItem(registry),
        drafts: ids.map(id => sessionStorage.getItem(prefix + id)),
        input: document.querySelector('#public-assistant-input')?.value,
        mode: document.querySelector('.public-assistant__modes select')?.value,
        branch: document.querySelector('.public-assistant__branch-picker select')?.value,
        content: [...document.querySelectorAll('.public-assistant__message.is-user > p, .public-assistant__message.is-assistant > .public-assistant-markdown')].map(element => element.textContent),
      },
      focus: { tag: active?.tagName, id: active?.id, label: active?.getAttribute('aria-label'), controls: active?.getAttribute('aria-controls'), reasonMenu: active?.closest('.public-assistant__feedback-reasons')?.id ?? null },
      menus: [...document.querySelectorAll('.public-assistant__feedback-reasons')].map(element => element.id),
      statuses: [...document.querySelectorAll('.public-assistant__message-actions [role=status]')].map(element => element.textContent),
    }
  }, { ids: sessionIds, registry: registryKey, prefix: draftPrefix })
}

async function createFeedbackPage(browser, base, configuration) {
  const page = await browser.newPage({ viewport: { width: configuration.width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  page.setDefaultTimeout(10_000)
  const errors = []
  const requests = []
  const gates = []
  const modelRequests = []
  const trace = []
  await installLocalNetworkGuard(page, base, () => errors.push('external-request'), { allowLoopback: false })
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(({ configuration, ids, registry, prefix }) => {
    localStorage.setItem('biau-port-language', configuration.language)
    localStorage.setItem('biau-port-theme', configuration.theme)
    localStorage.setItem(registry, JSON.stringify({ version: 2, currentSessionId: ids[0], sessionIds: ids }))
    ids.forEach((id, index) => sessionStorage.setItem(prefix + id, JSON.stringify({ version: 1, sessionId: id, input: 'Draft ' + id, mode: index === 0 ? 'site' : 'web', updatedAt: Date.now() })))
  }, { configuration, ids: sessionIds, registry: registryKey, prefix: draftPrefix })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/health' && request.method() === 'GET') return reply({ ok: true, database: true, modelConfigured: true, webSearchConfigured: true })
    if (path === '/api/chat/public/sessions' && request.method() === 'POST') return reply({ sessions: sessionIds.map(id => historyFixture(id).session) })
    if (path === '/api/chat/public/session' && request.method() === 'POST' && sessionIds.includes(request.postDataJSON().sessionId)) return reply(historyFixture(request.postDataJSON().sessionId))
    if (path === '/api/chat/public/feedback') {
      const gate = gates[requests.length]
      const actual = { method: request.method(), body: request.postDataJSON() }
      requests.push(actual)
      if (!gate) { errors.push('unexpected-feedback'); return reply({ error: 'unexpected-feedback' }, 500) }
      gate.active = true
      gate.started.resolve(actual)
      try {
        const outcome = await bounded(gate.release.promise, 'feedback fixture was not released')
        await reply(outcome === 'success' ? { ok: true } : { error: 'fixture-feedback-failure' }, outcome === 'success' ? 200 : 503)
      } catch (error) {
        if (!gate.allowAbort) errors.push('fixture: ' + error.message)
      } finally { gate.active = false; gate.settled.resolve() }
      return
    }
    if (path === '/api/chat/public' || path === '/api/chat/public/stream') modelRequests.push(path)
    errors.push('unexpected-api: ' + request.method() + ' ' + path)
    return reply({ error: 'unexpected-fixture-request' }, 500)
  })
  const close = async () => {
    for (const gate of gates) { gate.allowAbort = true; gate.release.resolve('success') }
    await Promise.all(gates.filter(gate => gate.active).map(gate => bounded(gate.settled.promise, 'feedback cleanup timed out')))
    await page.close()
  }
  try {
    await page.goto(base + '/blog', { waitUntil: 'load' })
    await page.locator('.public-assistant__trigger').click()
    await page.getByText('Answer ' + sessionIds[0] + ' b', { exact: true }).waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.querySelector('.public-assistant__composer button[type=submit]')?.disabled === false)
    assert.equal(await page.locator('.public-assistant__message.is-assistant').count(), 2)
    return { page, errors, requests, gates, modelRequests, trace, close, copy: publicAssistantInterfaceCopy[configuration.language] }
  } catch (error) { await close(); throw error }
}

function negativeTrigger(test, index) {
  return test.page.locator('.public-assistant__message-actions button[aria-controls]').nth(index)
}

async function assertFocus(locator) {
  await locator.page().waitForFunction(element => element === document.activeElement, await locator.elementHandle())
}

async function beginFeedback(test, index, rating = 'down') {
  const { page, copy, gates } = test
  const reason = rating === 'down' ? 'missing-sources' : 'helpful'
  const gate = { started: Promise.withResolvers(), release: Promise.withResolvers(), settled: Promise.withResolvers(), active: false, allowAbort: false }
  gates.push(gate)
  const trigger = negativeTrigger(test, index)
  if (rating === 'down') {
    if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
    await page.getByRole('button', { name: copy.feedbackReasons[reason], exact: true }).click()
  } else {
    await page.getByRole('button', { name: copy.answer.helpful, exact: true }).nth(index).click()
  }
  const actual = await bounded(gate.started.promise, 'feedback command did not reach its fixture')
  assert.deepEqual(actual, { method: 'POST', body: { sessionId: sessionIds[0], revisionId: sessionIds[0] + '-revision-' + (index === 0 ? 'a' : 'b'), rating, reason } }, 'feedback must retain the exact bounded Revision payload')
  await page.waitForFunction(element => element.disabled, await trigger.elementHandle())
  assert.equal(await page.locator('#public-assistant-input').isEnabled(), true)
  assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isEnabled(), true, 'feedback does not block an independent question')
  return gate
}

async function settleFeedback(test, gate, outcome, index) {
  const response = test.page.waitForResponse(response => new URL(response.url()).pathname === '/api/chat/public/feedback')
  gate.release.resolve(outcome)
  await bounded(gate.settled.promise, 'feedback fixture did not settle')
  await (await response).finished()
  const originalSessionVisible = await test.page.getByText('Answer ' + sessionIds[0] + ' a', { exact: true }).count()
  if (originalSessionVisible) await test.page.waitForFunction(element => !element.disabled, await negativeTrigger(test, index).elementHandle())
  await afterPaint(test.page)
}

async function assertOriginalRating(test, index, outcome) {
  const trigger = negativeTrigger(test, index)
  assert.equal(await trigger.getAttribute('aria-pressed'), String(outcome === 'success'))
  const status = test.page.locator('.public-assistant__message.is-assistant').nth(index).locator('.public-assistant__message-actions [role=status]')
  if (outcome === 'failure') assert.equal(await status.textContent(), test.copy.answer.feedbackFailed)
  else assert.equal(await status.count(), 0)
}

async function checkInteraction(test, configuration, kind, outcome) {
  const { page } = test
  const first = negativeTrigger(test, 0)
  if (kind === 'stay') {
    await first.click()
    await page.keyboard.press('Escape')
    await assertFocus(first)
    assert.equal(await page.locator('.public-assistant__feedback-reasons').count(), 0)
  }
  const gate = await beginFeedback(test, 0)
  test.trace.push({ stage: 'pending', ...await snapshot(page) })
  if (kind === 'other-menu' || kind === 'reopened') {
    if (kind === 'reopened') {
      await page.locator('.public-assistant__header-actions button').last().click()
      await assertFocus(page.locator('.public-assistant__trigger'))
      assert.equal(await page.locator('.public-assistant__panel').count(), 0)
      assert.equal(test.requests.length, 1, 'closing does not cancel or resubmit feedback')
      await page.locator('.public-assistant__trigger').click()
      await assertFocus(configuration.width > 768 ? page.locator('#public-assistant-input') : page.locator('.public-assistant__header-actions button').last())
    }
    await negativeTrigger(test, 1).click()
    await assertFocus(negativeTrigger(test, 1))
    if (outcome === 'failure') {
      await page.keyboard.press('Tab')
      await assertFocus(page.locator('.public-assistant__feedback-reasons button').first())
    }
  }
  if (kind === 'escape-composer') await page.keyboard.press('Escape')
  if (kind === 'composer' || kind === 'escape-composer') await page.locator('#public-assistant-input').fill('继续编辑当前草稿 / Keep typing')
  if (kind === 'history' || kind === 'restored') {
    await page.locator('.public-assistant__header-actions button').first().click()
    await assertFocus(page.locator('.public-assistant__history header button'))
    if (kind === 'restored') {
      const entry = page.locator('.public-assistant__history-list article').filter({ has: page.getByText(sessionIds[1], { exact: true }) })
      await entry.locator('.public-assistant__history-open').click()
      await page.getByText('Answer ' + sessionIds[1] + ' b', { exact: true }).waitFor({ state: 'visible' })
      await page.locator('#public-assistant-input').fill('另一会话继续编辑 / Another session')
    }
  }
  const before = await snapshot(page)
  const focus = await page.evaluateHandle(() => document.activeElement)
  test.trace.push({ stage: 'before-completion', ...before })
  await settleFeedback(test, gate, outcome, 0)
  const after = await snapshot(page)
  test.trace.push({ stage: 'after-completion', ...after })
  assert.equal(before.stable.content.length, 4)
  assert.deepEqual(after.stable, before.stable, 'feedback must preserve transcript, branch, mode, drafts, registry and URL')
  if (kind === 'stay') {
    await assertFocus(first)
    assert.equal(after.menus.length, outcome === 'success' ? 0 : 1)
  } else {
    assert.equal(await page.evaluate(element => element === document.activeElement, focus), true, 'late feedback must preserve the visitor\'s current focus')
    const closesOwnMenu = kind === 'composer' && outcome === 'success'
    assert.deepEqual(after.menus, closesOwnMenu ? [] : before.menus, 'late feedback must preserve a newer menu')
  }
  await focus.dispose()
  if (kind === 'restored') {
    assert.equal(JSON.parse(after.stable.registry).currentSessionId, sessionIds[1])
    assert.equal(after.statuses.length, 0, 'old feedback must not attach an error to the restored session')
    assert.equal(await page.locator('.public-assistant__message-actions button[aria-pressed=true]').count(), 0)
  } else {
    await assertOriginalRating(test, 0, outcome)
    assert.equal(await negativeTrigger(test, 1).getAttribute('aria-pressed'), 'false')
  }
  assert.equal(test.requests.length, 1, 'settlement must not automatically retry or submit other feedback')
  if (kind === 'composer' || kind === 'escape-composer' || kind === 'restored') {
    await page.keyboard.type(' + next')
    assert.equal(await page.locator('#public-assistant-input').inputValue(), before.stable.input + ' + next')
  }
  if (kind === 'stay' && outcome === 'failure') {
    const retry = await beginFeedback(test, 0)
    assert.equal(await page.locator('.public-assistant__message-actions [role=status]').count(), 0)
    await settleFeedback(test, retry, 'success', 0)
    await assertFocus(first)
    assert.equal(await page.locator('.public-assistant__feedback-reasons').count(), 0)
    await assertOriginalRating(test, 0, 'success')
    assert.deepEqual(test.requests[1], test.requests[0], 'explicit retry preserves the bounded reason')
  }
  if (kind === 'stay' && outcome === 'success') {
    const positive = await beginFeedback(test, 1, 'up')
    await settleFeedback(test, positive, 'success', 1)
    assert.equal(await page.getByRole('button', { name: test.copy.answer.helpful, exact: true }).nth(1).getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('.public-assistant__feedback-reasons').count(), 0)
  }
}

async function checkConcurrentFeedback(test, order, outcome) {
  const { page } = test
  const first = await beginFeedback(test, 0)
  const second = await beginFeedback(test, 1)
  const before = await snapshot(page)
  test.trace.push({ stage: 'both-pending', ...before })
  if (order === 'old-first') {
    const focus = await page.evaluateHandle(() => document.activeElement)
    await settleFeedback(test, first, outcome, 0)
    assert.equal(await page.evaluate(element => element === document.activeElement, focus), true, 'old feedback must not take focus from the newer pending interaction')
    assert.deepEqual((await snapshot(page)).menus, before.menus)
    assert.equal(await negativeTrigger(test, 1).isDisabled(), true)
    await focus.dispose()
    await settleFeedback(test, second, 'success', 1)
  } else {
    await settleFeedback(test, second, 'success', 1)
    await assertFocus(negativeTrigger(test, 1))
    await settleFeedback(test, first, outcome, 0)
  }
  await assertFocus(negativeTrigger(test, 1))
  const after = await snapshot(page)
  test.trace.push({ stage: 'both-settled', ...after })
  assert.deepEqual(after.stable, before.stable)
  assert.equal(after.menus.length, 0)
  await assertOriginalRating(test, 0, outcome)
  await assertOriginalRating(test, 1, 'success')
  assert.equal(test.requests.length, 2)
}

export async function checkPublicAssistantFeedbackFocus(browser, base) {
  const url = new URL(base)
  assert.ok(['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'feedback UI checks require a local preview')
  let cases = 0
  for (const configuration of configurations) {
    for (const kind of ['stay', 'other-menu', 'composer', 'escape-composer', 'reopened', 'history', 'restored', 'old-first', 'new-first']) {
      for (const outcome of ['success', 'failure']) {
        const name = [configuration.width, configuration.theme, configuration.language, kind, outcome].join('-')
        const test = await createFeedbackPage(browser, base, configuration)
        try {
          if (kind === 'old-first' || kind === 'new-first') await checkConcurrentFeedback(test, kind, outcome)
          else await checkInteraction(test, configuration, kind, outcome)
          assert.deepEqual(test.errors, [], 'feedback must not cause page errors or external requests')
          assert.deepEqual(test.modelRequests, [], 'feedback controls must not call a model')
          assert.equal(await test.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
          if (kind === 'other-menu' && outcome === 'success') {
            const menu = test.page.locator('.public-assistant__feedback-reasons')
            await menu.scrollIntoViewIfNeeded()
            assert.equal(await menu.evaluate(element => {
              const scroller = element.closest('.public-assistant__messages').getBoundingClientRect()
              return [...element.querySelectorAll('button')].every(button => {
                const rect = button.getBoundingClientRect()
                return rect.width > 0 && rect.height > 0 && rect.left >= scroller.left - 1 && rect.right <= scroller.right + 1 && rect.top >= scroller.top - 1 && rect.bottom <= scroller.bottom + 1
              })
            }), true, 'the retained menu must be reachable within the conversation scroller')
            if (process.env.UI_CHECK_ARTIFACT_DIR) await test.page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'feedback-focus-' + configuration.width + '-' + configuration.language + '.png') })
          }
          if (process.env.UI_CHECK_ARTIFACT_DIR) await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'feedback-' + name + '.json'), JSON.stringify({ configuration, kind, outcome, requests: test.requests, trace: test.trace, errors: test.errors, modelCalls: test.modelRequests.length }, null, 2) + '\n', { flag: 'wx' })
          cases += 1
        } catch (error) {
          if (process.env.UI_CHECK_ARTIFACT_DIR) {
            await test.page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'feedback-failure-' + name + '.png') }).catch(() => {})
            await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'feedback-failure-' + name + '.json'), JSON.stringify({ name, error: error.message, requests: test.requests, trace: test.trace, current: await snapshot(test.page).catch(() => null), errors: test.errors }, null, 2) + '\n', { flag: 'wx' })
          }
          throw new Error(name + ': ' + error.message, { cause: error })
        } finally { await test.close() }
      }
    }
  }
  return { cases, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Public assistant feedback focus passed:', await checkPublicAssistantFeedbackFocus(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } finally { await browser.close() }
}
