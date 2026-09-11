import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { tsImport } from 'tsx/esm/api'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const { normalizePublicAssistantSessionHistory, normalizePublicAssistantAnswer } = await tsImport('../src/utils/publicAssistantApi.ts', import.meta.url)
const sessionId = 'branch-send-ui-session'
const branchIds = ['branch-send-ui-a', 'branch-send-ui-b']
const revisionIds = ['branch-send-ui-revision-1', 'branch-send-ui-revision-2']
const question = '分支操作完成前保留我的新问题'
const configurations = [
  { width: 1440, theme: 'morning', language: 'zh' },
  { width: 320, theme: 'stellar', language: 'en' },
  { width: 390, theme: 'nature', language: 'zh' },
  { width: 430, theme: 'morning', language: 'en' },
]

function historyFixture(branchId = branchIds[0]) {
  const date = '2026-09-01T08:00:00.000Z'
  return {
    session: {
      id: sessionId, activeBranchId: branchId, title: 'Branch send fixture', turnCount: 1,
      hasEarlierTurns: false, createdAt: date, lastActiveAt: date, expiresAt: '2026-10-01T08:00:00.000Z',
    },
    branches: branchIds.map((id, index) => ({
      id, ordinal: index + 1, headRevisionId: revisionIds[1 - index], preview: 'Path ' + (index + 1),
      turnCount: 1, hasEarlierTurns: false, lastActiveAt: date,
    })),
    turns: [{
      id: 'branch-send-ui-turn', question: '本地分支问题', mode: 'site', parentRevisionId: null,
      selectedRevisionId: branchId === branchIds[0] ? revisionIds[1] : revisionIds[0], createdAt: date,
      revisions: revisionIds.map((id, index) => ({
        id, revisionNo: index + 1, basedOnRevisionId: index === 0 ? null : revisionIds[0],
        answer: '本地分支回答 ' + (index + 1), status: 'answered', claims: [], citations: [], suggestions: [],
        route: 'site', meta: { mode: 'model', citationCount: 0 }, createdAt: date, feedback: null,
      })),
    }],
    hasEarlierTurns: false, revisionsTruncated: false, branchesTruncated: false, truncated: false,
  }
}

for (const id of branchIds) assert.ok(normalizePublicAssistantSessionHistory(historyFixture(id)), 'branch fixture must satisfy the production decoder')

async function bounded(promise, label) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), 20_000) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function afterPaint(page) {
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
}

async function createBranchPage(browser, base, configuration) {
  const page = await browser.newPage({
    viewport: { width: configuration.width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block',
  })
  page.setDefaultTimeout(10_000)
  const errors = []
  const chats = []
  const branches = []
  const stages = Array.from({ length: 2 }, () => ({
    started: Promise.withResolvers(), release: Promise.withResolvers(), settled: Promise.withResolvers(),
    active: false, allowAbort: false,
  }))
  await installLocalNetworkGuard(page, base, () => errors.push('external-request'), { allowLoopback: false })
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(({ language, theme, id }) => {
    localStorage.setItem('biau-port-language', language)
    localStorage.setItem('biau-port-theme', theme)
    localStorage.setItem('biau-public-assistant-sessions-v2', JSON.stringify({ version: 2, currentSessionId: id, sessionIds: [id] }))
  }, { ...configuration, id: sessionId })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/health') return reply({ ok: true, database: true, modelConfigured: true, webSearchConfigured: true })
    if (path === '/api/chat/public/session') return reply(historyFixture())
    if (path === '/api/chat/public/branch') {
      const stage = stages[branches.length]
      if (!stage) {
        errors.push('unexpected-extra-branch-request')
        return reply({ error: 'unexpected-fixture-request' }, 500)
      }
      const body = request.postDataJSON()
      branches.push(body)
      stage.active = true
      stage.started.resolve(body)
      try {
        const outcome = await bounded(stage.release.promise, 'branch fixture was not released')
        await (outcome === 'failure'
          ? reply({ error: 'public-assistant-service-unavailable' }, 503)
          : reply(historyFixture(branchIds[1])))
      } catch (error) {
        if (!stage.allowAbort) errors.push('branch-fixture: ' + error.message)
      } finally {
        stage.active = false
        stage.settled.resolve()
      }
      return
    }
    if (path === '/api/chat/public/stream') {
      const body = request.postDataJSON()
      chats.push({ body, whileBranchPending: stages.some(stage => stage.active) })
      const answer = {
        contractVersion: 2, requestId: body.requestId, sessionId: body.sessionId,
        answer: '本地明确发送已完成', status: 'answered', claims: [], citations: [], suggestions: [],
        conversation: {
          branchId: body.intent?.branchId ?? 'branch-send-ui-new', branchOrdinal: body.intent?.branchId === branchIds[1] ? 2 : 1,
          turnId: 'branch-send-ui-new-turn', revisionId: 'branch-send-ui-new-revision',
          revisionNo: 1, basedOnRevisionId: null, activated: true,
        },
        meta: { mode: 'model', citationCount: 0 },
      }
      assert.ok(normalizePublicAssistantAnswer(answer), 'chat fixture must satisfy the production decoder')
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: result\ndata: ' + JSON.stringify(answer) + '\n\n' })
    }
    errors.push('unexpected-api: ' + request.method() + ' ' + path)
    return reply({ error: 'unexpected-fixture-request' }, 500)
  })
  const close = async () => {
    for (const stage of stages) {
      stage.allowAbort = true
      stage.release.resolve('success')
    }
    await Promise.all(stages.filter(stage => stage.active).map(stage => bounded(stage.settled.promise, 'branch fixture cleanup timed out')))
    await page.close()
  }
  try {
    await page.goto(base + '/blog', { waitUntil: 'load' })
    await page.locator('.public-assistant__trigger').click()
    await page.getByText('本地分支回答 2', { exact: true }).waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.querySelector('.public-assistant__branch-picker select')?.disabled === false)
    return { page, errors, chats, branches, stages, close }
  } catch (error) {
    await close()
    throw error
  }
}

async function startBranch(test, action) {
  const { page, stages } = test
  await page.locator('#public-assistant-input').fill(question)
  if (action === 'select') await page.locator('.public-assistant__branch-picker select').selectOption(branchIds[1])
  else {
    await page.locator('.public-assistant__revision-nav button').first().click()
    await page.locator('.public-assistant__continue-version').click()
  }
  await bounded(stages[0].started.promise, 'branch request was not received')
}

async function assertPendingSendGate(test, draft = question) {
  const { page, chats } = test
  const input = page.locator('#public-assistant-input')
  assert.equal(await input.isEnabled(), true, 'branch pending must leave the draft editable')
  await input.fill(draft)
  await input.press('Enter')
  await page.locator('.public-assistant__composer').evaluate(form => form.requestSubmit())
  await afterPaint(page)
  assert.equal(chats.length, 0, 'Enter and form submit must not send to the old branch while a branch action is pending')
  assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isDisabled(), true, 'the send button must share the branch pending gate')
  assert.equal(await page.locator('.public-assistant__branch-picker select').isDisabled(), true)
  assert.equal(await input.inputValue(), draft)
  assert.equal(await page.locator('.public-assistant__message.is-user').count(), 1, 'blocked submission must not append a question')
}

async function settleBranch(test, index, outcome) {
  test.stages[index].release.resolve(outcome)
  await bounded(test.stages[index].settled.promise, 'branch response was not completed')
  await test.page.waitForFunction(({ failed, branchId }) => {
    const picker = document.querySelector('.public-assistant__branch-picker select')
    return picker?.disabled === false && (failed
      ? Boolean(document.querySelector('.public-assistant__notice button'))
      : picker.value === branchId)
  }, { failed: outcome === 'failure', branchId: branchIds[1] })
}

async function assertExplicitSend(test, configuration, expectedBranch, expectedSession = sessionId, draft = question) {
  const { page, chats } = test
  const input = page.locator('#public-assistant-input')
  assert.equal(await input.inputValue(), draft, 'branch completion must preserve the current draft')
  assert.equal(chats.length, 0, 'branch completion must not automatically send the draft')
  assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isEnabled(), true)
  await input.press('Shift+Enter')
  assert.equal(await input.inputValue(), draft + '\n')
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
  await afterPaint(page)
  assert.equal(chats.length, 0, 'composition Enter must not send')
  if (configuration.language === 'en') await page.locator('.public-assistant__composer button[type=submit]').click()
  else await input.press('Enter')
  await page.getByText('本地明确发送已完成', { exact: true }).waitFor({ state: 'visible' })
  assert.equal(chats.length, 1, 'an explicit command sends exactly once')
  assert.equal(chats[0].whileBranchPending, false)
  const { body } = chats[0]
  assert.equal(body.sessionId, expectedSession)
  assert.equal(body.message, draft)
  assert.deepEqual(body.intent, {
    kind: 'new-turn', branchId: expectedBranch,
    parentRevisionId: expectedBranch === null ? null : expectedBranch === branchIds[0] ? revisionIds[1] : revisionIds[0],
  })
  assert.deepEqual(body.history, expectedBranch === null ? [] : [
    { role: 'user', content: '本地分支问题' },
    { role: 'assistant', content: '本地分支回答 ' + (expectedBranch === branchIds[0] ? 2 : 1) },
  ])
  assert.equal(await input.inputValue(), '')
  assert.equal(await page.locator('.public-assistant__message.is-user').count(), expectedBranch === null ? 1 : 2)
}

export async function checkPublicAssistantBranchSendGate(browser, base) {
  const url = new URL(base)
  assert.ok(['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'branch UI checks require a local preview')
  let cases = 0
  for (const configuration of configurations) for (const action of ['select', 'continue-from-revision']) for (const outcome of ['success', 'failure', 'retry', 'new-session']) {
    const label = [configuration.width, configuration.theme, configuration.language, action, outcome].join('/')
    const test = await createBranchPage(browser, base, configuration)
    try {
      await startBranch(test, action)
      await assertPendingSendGate(test)
      const expectedAction = action === 'select'
        ? { sessionId, action, branchId: branchIds[1] }
        : { sessionId, action, revisionId: revisionIds[0] }
      assert.deepEqual(test.branches, [expectedAction])
      if (process.env.UI_CHECK_ARTIFACT_DIR && action === 'select' && outcome === 'success') {
        await test.page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'branch-send-pending-' + configuration.width + '-' + configuration.language + '.png') })
      }
      if (outcome === 'new-session') {
        test.stages[0].allowAbort = true
        await test.page.locator('.public-assistant__header-actions').getByRole('button', {
          name: configuration.language === 'en' ? 'New session' : '新建会话', exact: true,
        }).click()
        const newId = await test.page.evaluate(() => JSON.parse(localStorage.getItem('biau-public-assistant-sessions-v2')).currentSessionId)
        assert.notEqual(newId, sessionId)
        await test.page.locator('#public-assistant-input').fill(question)
        assert.equal(await test.page.locator('.public-assistant__composer button[type=submit]').isEnabled(), true, 'new session must release the branch send fence immediately')
        test.stages[0].release.resolve('success')
        await bounded(test.stages[0].settled.promise, 'cancelled branch response did not settle')
        await afterPaint(test.page)
        assert.equal(await test.page.locator('.public-assistant__branch-picker').count(), 0, 'late branch response must not restore an old path')
        await assertExplicitSend(test, configuration, null, newId)
      } else {
        await settleBranch(test, 0, outcome === 'success' ? 'success' : 'failure')
        if (outcome !== 'success') assert.equal(await test.page.locator('.public-assistant__branch-picker select').inputValue(), branchIds[0])
        if (outcome === 'retry') {
          await test.page.locator('.public-assistant__notice button').click()
          await bounded(test.stages[1].started.promise, 'explicit branch retry was not received')
          await assertPendingSendGate(test, question + '，重试时继续编辑')
          assert.deepEqual(test.branches, [expectedAction, expectedAction], 'retry must preserve the exact branch action')
          await settleBranch(test, 1, 'success')
        }
        await assertExplicitSend(test, configuration, outcome === 'failure' ? branchIds[0] : branchIds[1], sessionId,
          outcome === 'retry' ? question + '，重试时继续编辑' : question)
      }
      assert.deepEqual(test.errors, [], 'branch interactions must not cause page errors or external requests')
      cases += 1
    } catch (error) {
      if (process.env.UI_CHECK_ARTIFACT_DIR) {
        await test.page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'branch-send-failure-' + configuration.width + '-' + action + '-' + outcome + '.png') }).catch(() => {})
      }
      throw new Error(label + ': ' + error.message, { cause: error })
    } finally {
      await test.close()
    }
  }
  return { cases, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Public assistant branch send gate passed:', await checkPublicAssistantBranchSendGate(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } finally {
    await browser.close()
  }
}
