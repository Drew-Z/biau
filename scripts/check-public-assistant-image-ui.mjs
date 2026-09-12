import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { tsImport } from 'tsx/esm/api'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const { normalizePublicAssistantSessionHistory } = await tsImport('../src/utils/publicAssistantApi.ts', import.meta.url)
const { publicAssistantInterfaceCopy } = await tsImport('../src/data/publicAssistantInterfaceCopy.ts', import.meta.url)
const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const registryKey = 'biau-public-assistant-sessions-v2'
const sessionIds = ['image-ui-session-a', 'image-ui-session-b']
const configurations = [
  { width: 1440, theme: 'morning', language: 'zh' },
  { width: 320, theme: 'stellar', language: 'en' },
  { width: 390, theme: 'nature', language: 'zh' },
  { width: 430, theme: 'morning', language: 'en' },
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
    branches: [{
      id: branchId, ordinal: 1, headRevisionId: revisionId, preview: '图片隔离测试',
      turnCount: 1, hasEarlierTurns: false, lastActiveAt: date,
    }],
    turns: [{
      id: id + '-turn', question: '图片隔离测试', mode: 'site', parentRevisionId: null,
      selectedRevisionId: revisionId, createdAt: date,
      revisions: [{
        id: revisionId, revisionNo: 1, basedOnRevisionId: null, answer: '本地历史夹具 ' + id,
        status: 'answered', claims: [], citations: [], suggestions: [], route: 'site',
        meta: { mode: 'model', citationCount: 0 }, createdAt: date, feedback: null,
      }],
    }],
    hasEarlierTurns: false, revisionsTruncated: false, branchesTruncated: false, truncated: false,
  }
}

for (const id of sessionIds) assert.ok(normalizePublicAssistantSessionHistory(historyFixture(id)), 'image history fixture must satisfy the production decoder')

async function afterPaint(page) {
  await page.evaluate(() => new Promise(resolvePaint => requestAnimationFrame(() => requestAnimationFrame(resolvePaint))))
}

async function selectImage(page, name) {
  const index = await page.evaluate(() => window.__assistantImageReads.length)
  await page.locator('.public-assistant__composer input[type=file]').setInputFiles({ name, mimeType: 'image/png', buffer: imageBytes })
  await page.waitForFunction(expected => window.__assistantImageReads.length === expected + 1, index)
  assert.equal(await page.locator('.public-assistant__composer .is-attach').isDisabled(), true, 'image preparation must expose its pending state')
  return index
}

async function finishImage(page, index, outcome = 'success') {
  await page.evaluate(({ index: target, outcome: result }) => {
    const read = window.__assistantImageReads[target]
    if (!read || read.released) throw new Error('image read is missing or already released')
    read.released = true
    if (result === 'success') read.start()
    else {
      read.reader.dispatchEvent(new ProgressEvent('error'))
      read.reader.dispatchEvent(new ProgressEvent('loadend'))
    }
  }, { index, outcome })
  await page.waitForFunction(target => window.__assistantImageReads[target]?.settled, index)
  await afterPaint(page)
}

async function assertNoPersistedImages(page) {
  assert.equal(await page.evaluate(() =>
    [localStorage, sessionStorage].some(storage =>
      Object.keys(storage).some(key => /data:image\//u.test(storage.getItem(key) ?? ''))),
  ), false, 'image bytes must not enter browser storage')
}

async function createImagePage(browser, base, configuration, expireCurrentSession = false) {
  const page = await browser.newPage({
    viewport: { width: configuration.width, height: 900 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  })
  page.setDefaultTimeout(10_000)
  const errors = []
  const chats = []
  const requests = []
  let currentSessionRestores = 0
  await installLocalNetworkGuard(page, base, ({ resourceType }) => errors.push('external_request_blocked: ' + resourceType), { allowLoopback: false })
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(({ language, theme, ids, key }) => {
    localStorage.setItem('biau-port-language', language)
    localStorage.setItem('biau-port-theme', theme)
    localStorage.setItem(key, JSON.stringify({ version: 2, currentSessionId: ids[0], sessionIds: ids }))
    const nativeRead = FileReader.prototype.readAsDataURL
    window.__assistantImageReads = []
    FileReader.prototype.readAsDataURL = function (blob) {
      const read = { reader: this, released: false, settled: false, start: () => nativeRead.call(this, blob) }
      this.addEventListener('loadend', () => { read.settled = true }, { once: true })
      window.__assistantImageReads.push(read)
    }
  }, { ...configuration, ids: sessionIds, key: registryKey })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    requests.push(request.method() + ' ' + path)
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/health') return reply({ ok: true, database: true, modelConfigured: true, webSearchConfigured: true })
    if (path === '/api/chat/public/sessions') return reply({ sessions: sessionIds.map(id => historyFixture(id).session) })
    if (path === '/api/chat/public/session') {
      if (request.method() === 'DELETE') return reply({ ok: true })
      const id = request.postDataJSON().sessionId
      if (id === sessionIds[0]) currentSessionRestores += 1
      if (expireCurrentSession && id === sessionIds[0] && currentSessionRestores > 1) return reply({ error: 'session-not-found' }, 404)
      return sessionIds.includes(id) ? reply(historyFixture(id)) : reply({ error: 'session-not-found' }, 404)
    }
    if (path === '/api/chat/public/stream') {
      const body = request.postDataJSON()
      chats.push(body)
      const answer = {
        contractVersion: 1, requestId: body.requestId, answer: '本地图片请求已完成',
        status: 'answered', claims: [], citations: [], suggestions: [],
        meta: { mode: 'model', citationCount: 0 },
      }
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: result\ndata: ' + JSON.stringify(answer) + '\n\n' })
    }
    errors.push('unexpected fixture request: ' + request.method() + ' ' + path)
    return reply({ error: 'unexpected-image-fixture-request' }, 500)
  })
  try {
    await page.goto(base + '/blog', { waitUntil: 'load' })
    await page.locator('.public-assistant__trigger').click()
    await page.locator('.public-assistant__message.is-assistant').waitFor({ state: 'visible' })
    await page.waitForFunction(() => !document.querySelector('.public-assistant__composer .is-attach')?.disabled)
    await page.evaluate(() => document.fonts.ready)
    return { page, errors, chats, requests }
  } catch (error) {
    await page.close()
    throw error
  }
}

async function resetImageOwner(page, kind, language) {
  if (kind === 'new-session') {
    await page.locator('.public-assistant__header-actions').getByRole('button', { name: language === 'en' ? 'New session' : '新建会话', exact: true }).click()
  } else if (kind === 'remove') {
    await page.locator('.public-assistant__image-preview button').click()
  } else {
    await page.locator('.public-assistant__header-actions button').first().click()
    const targetId = kind === 'history' ? sessionIds[1] : sessionIds[0]
    const entry = page.locator('.public-assistant__history-list article').filter({ has: page.getByText(targetId, { exact: true }) })
    await entry.waitFor({ state: 'visible' })
    if (kind === 'history' || kind === 'expired-current') {
      await entry.locator('.public-assistant__history-open').click()
      if (kind === 'history') {
        await page.waitForFunction(({ key, target }) => JSON.parse(localStorage.getItem(key)).currentSessionId === target, { key: registryKey, target: targetId })
      } else {
        await page.waitForFunction(({ key, previous }) => JSON.parse(localStorage.getItem(key)).currentSessionId !== previous, { key: registryKey, previous: targetId })
        await page.locator('.public-assistant__history header button').click()
      }
    } else {
      page.once('dialog', dialog => dialog.accept())
      await entry.locator('.public-assistant__history-delete').click()
      await page.waitForFunction(({ key, previous }) => JSON.parse(localStorage.getItem(key)).currentSessionId !== previous, { key: registryKey, previous: targetId })
      await page.locator('.public-assistant__history header button').click()
    }
  }
  await afterPaint(page)
  assert.equal(await page.locator('.public-assistant__image-preview').count(), 0, kind + ': reset must clear the old preview')
  assert.equal(await page.locator('.public-assistant__composer .is-attach').isEnabled(), true, kind + ': reset must release image preparation immediately')
}

async function checkSendGate(page, chats) {
  const input = page.locator('#public-assistant-input')
  const question = '图片尚未准备完成时保留的问题'
  await input.fill(question)
  const read = await selectImage(page, 'send-gate.png')
  assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isDisabled(), true)
  await input.press('Enter')
  await afterPaint(page)
  assert.equal(chats.length, 0, 'Enter must not submit while the selected image is still being prepared')
  assert.equal(await input.inputValue(), question)
  await finishImage(page, read)
  await page.locator('.public-assistant__image-preview').waitFor({ state: 'visible' })
  await input.press('Shift+Enter')
  assert.equal(await input.inputValue(), question + '\n', 'Shift+Enter keeps the composer newline')
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
  await afterPaint(page)
  assert.equal(chats.length, 0, 'composition Enter must not submit')
  await input.press('Enter')
  await page.getByText('本地图片请求已完成', { exact: true }).waitFor({ state: 'visible' })
  assert.equal(chats.length, 1)
  assert.equal(chats[0].message, question)
  assert.equal(chats[0].attachment?.name, 'send-gate.png')
  assert.match(chats[0].attachment?.dataUrl ?? '', /^data:image\/(?:png|jpeg|webp);base64,/u)
  assert.equal(await input.inputValue(), '')
  assert.equal(await page.locator('.public-assistant__image-preview').count(), 0)
}

async function checkResetRace(page, chats, kind, outcome, language) {
  if (kind === 'remove') {
    const initial = await selectImage(page, 'existing.png')
    await finishImage(page, initial)
    await page.locator('.public-assistant__image-preview').waitFor({ state: 'visible' })
  }
  const oldRead = await selectImage(page, 'old-selection.png')
  await resetImageOwner(page, kind, language)
  const input = page.locator('#public-assistant-input')
  await input.fill('新的草稿不得被旧图片回调覆盖')
  const newRead = await selectImage(page, 'current-selection.png')
  await finishImage(page, oldRead, outcome)
  assert.equal(await page.locator('.public-assistant__image-preview').count(), 0, 'stale success must not show an old image')
  assert.equal(await page.locator('.public-assistant__image-issue').count(), 0, 'stale failure must not show an old error')
  assert.equal(await page.locator('.public-assistant__composer .is-attach').isDisabled(), true, 'stale finally must not release the current preparation')
  assert.equal(await page.locator('.public-assistant__composer input[type=file]').evaluate(node => node.files?.[0]?.name), 'current-selection.png', 'stale finally must not clear the current file input')
  assert.equal(await input.inputValue(), '新的草稿不得被旧图片回调覆盖')
  await input.press('Enter')
  await afterPaint(page)
  assert.equal(chats.length, 0, 'the newer image must keep submission blocked after the older one settles')
  await finishImage(page, newRead)
  await page.locator('.public-assistant__image-preview strong').filter({ hasText: 'current-selection.png' }).waitFor({ state: 'visible' })
  assert.equal(await page.locator('.public-assistant__composer .is-attach').isEnabled(), true)
  assert.equal(await page.locator('.public-assistant__image-preview').count(), 1)
}

async function checkCurrentFailure(page) {
  const failed = await selectImage(page, 'read-failure.png')
  await finishImage(page, failed, 'failure')
  await page.locator('.public-assistant__image-issue').waitFor({ state: 'visible' })
  assert.equal(await page.locator('.public-assistant__composer .is-attach').isEnabled(), true)
  const retry = await selectImage(page, 'retry.png')
  await finishImage(page, retry)
  await page.locator('.public-assistant__image-preview strong').filter({ hasText: 'retry.png' }).waitFor({ state: 'visible' })
  assert.equal(await page.locator('.public-assistant__image-issue').count(), 0)
}

async function checkImageErrorLanguage(test, configuration, scenario) {
  const { page, chats, requests } = test
  const input = page.locator('#public-assistant-input')
  const notice = page.locator('.public-assistant__image-issue')
  const draft = '图片错误切换语言时保留的草稿'
  await input.fill(draft)
  const before = {
    url: page.url(),
    registry: await page.evaluate(key => localStorage.getItem(key), registryKey),
    branch: await page.locator('.public-assistant__branch-picker select').inputValue(),
    mode: await page.locator('.public-assistant__modes select').inputValue(),
    messages: await page.locator('.public-assistant__message.is-user > p, .public-assistant__message.is-assistant > .public-assistant-markdown').allTextContents(),
    requests: [...requests],
  }
  assert.equal(before.messages.length, 2, 'the language fixture must expose its question and answer content')
  let pendingRead = null
  try {
    if (scenario.kind === 'language-read-failure') {
      pendingRead = await selectImage(page, 'language-read-failure.png')
      if (scenario.timing === 'after-error') await finishImage(page, pendingRead, 'failure')
    } else {
      if (scenario.kind === 'language-output-too-large') {
        await page.evaluate(() => {
          const nativeToBlob = HTMLCanvasElement.prototype.toBlob
          window.__assistantImageEncodingRestore = () => { HTMLCanvasElement.prototype.toBlob = nativeToBlob }
          HTMLCanvasElement.prototype.toBlob = function (callback, type) {
            callback(new Blob([new Uint8Array(256_001)], { type }))
          }
        })
      } else if (scenario.kind === 'language-unknown-error') {
        await page.evaluate(() => {
          const nativeRead = FileReader.prototype.readAsDataURL
          window.__assistantImageReadRestore = () => { FileReader.prototype.readAsDataURL = nativeRead }
          FileReader.prototype.readAsDataURL = function () { throw new Error('controlled image-reader failure') }
        })
      }
      await page.locator('.public-assistant__composer input[type=file]').setInputFiles({
        name: scenario.kind === 'language-unsupported' ? 'unsupported.gif' : 'language-error.png',
        mimeType: scenario.kind === 'language-unsupported' ? 'image/gif' : 'image/png',
        buffer: scenario.kind === 'language-source-too-large' ? Buffer.alloc(8_000_001) : imageBytes,
      })
    }
    if (scenario.timing !== 'during-read') {
      await notice.waitFor({ state: 'visible' })
      assert.equal(await notice.textContent(), publicAssistantInterfaceCopy[configuration.language].image[scenario.copyKey], 'the fixture must reach the intended image error')
    }
  } finally {
    await page.evaluate(() => {
      window.__assistantImageEncodingRestore?.()
      window.__assistantImageReadRestore?.()
      delete window.__assistantImageEncodingRestore
      delete window.__assistantImageReadRestore
    })
  }

  for (const language of [configuration.language === 'zh' ? 'en' : 'zh', configuration.language]) {
    await page.locator('.public-assistant__header-actions button').last().click()
    await page.locator('.nav-lang-toggle').click()
    await page.locator('.public-assistant__trigger').click()
    await afterPaint(page)
    assert.equal(await page.evaluate(() => localStorage.getItem('biau-port-language')), language)
    if (scenario.timing === 'during-read' && pendingRead !== null) {
      assert.equal(await notice.count(), 0, 'language changes must not finish the pending image read')
      assert.equal(await page.locator('.public-assistant__composer .is-attach').isDisabled(), true)
      await finishImage(page, pendingRead, 'failure')
      pendingRead = null
    }
    await notice.waitFor({ state: 'visible' })
    assert.equal(await notice.textContent(), publicAssistantInterfaceCopy[language].image[scenario.copyKey], 'image errors must follow the current language even when a read began in another language')
    assert.equal(await input.inputValue(), draft)
    assert.equal(await page.locator('.public-assistant__modes select').inputValue(), before.mode)
    assert.equal(await page.evaluate(key => localStorage.getItem(key), registryKey), before.registry)
    assert.equal(await page.locator('.public-assistant__branch-picker select').inputValue(), before.branch)
    assert.deepEqual(await page.locator('.public-assistant__message.is-user > p, .public-assistant__message.is-assistant > .public-assistant-markdown').allTextContents(), before.messages)
    assert.equal(page.url(), before.url)
    assert.deepEqual(requests, before.requests, 'language changes must not restore history or submit requests')
    assert.equal(chats.length, 0)
    assert.equal(await page.locator('.public-assistant__composer .is-attach').isEnabled(), true)
    assert.equal(await page.locator('.public-assistant__composer button[type=submit]').isEnabled(), true)
    assert.equal(await page.locator('.public-assistant__composer input[type=file]').evaluate(node => node.files.length), 0)
    const contained = await notice.evaluate(node => {
      const rect = node.getBoundingClientRect()
      const panel = node.closest('.public-assistant__panel').getBoundingClientRect()
      return rect.left >= panel.left - 1 && rect.right <= panel.right + 1 && rect.bottom <= panel.bottom + 1 && node.scrollWidth <= node.clientWidth + 1
    })
    assert.equal(contained, true, 'translated image errors must remain within the assistant panel')
    if (process.env.UI_CHECK_ARTIFACT_DIR && scenario.timing === 'during-read' && language !== configuration.language) {
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'image-error-language-' + configuration.width + '-' + language + '.png') })
    }
  }
  const retry = await selectImage(page, 'language-retry.png')
  await finishImage(page, retry)
  await page.locator('.public-assistant__image-preview strong').filter({ hasText: 'language-retry.png' }).waitFor({ state: 'visible' })
  assert.equal(await notice.count(), 0, 'a successful new selection clears the retained image error')
  assert.equal(await input.inputValue(), draft)
  assert.deepEqual(requests, before.requests)
}

export async function checkPublicAssistantImageLifecycle(browser, base) {
  const url = new URL(base)
  assert.ok(['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'image UI checks require a local preview')
  const scenarios = [
    { kind: 'language-read-failure', timing: 'after-error', copyKey: 'unreadable' },
    { kind: 'language-read-failure', timing: 'during-read', copyKey: 'unreadable' },
    { kind: 'language-unsupported', copyKey: 'unsupported' },
    { kind: 'language-source-too-large', copyKey: 'sourceTooLarge' },
    { kind: 'language-output-too-large', copyKey: 'outputTooLarge' },
    { kind: 'language-unknown-error', copyKey: 'unreadable' },
    { kind: 'send-gate' },
    ...['new-session', 'history', 'delete', 'remove', 'expired-current'].flatMap(kind => ['success', 'failure'].map(outcome => ({ kind, outcome }))),
    { kind: 'current-failure' },
  ]
  let cases = 0
  for (const configuration of configurations) {
    for (const scenario of scenarios) {
      const label = [configuration.width, configuration.theme, configuration.language, scenario.kind, scenario.timing, scenario.outcome].filter(Boolean).join('/')
      const test = await createImagePage(browser, base, configuration, scenario.kind === 'expired-current')
      const { page, errors, chats } = test
      try {
        if (scenario.kind.startsWith('language-')) await checkImageErrorLanguage(test, configuration, scenario)
        else if (scenario.kind === 'send-gate') await checkSendGate(page, chats)
        else if (scenario.kind === 'current-failure') await checkCurrentFailure(page)
        else await checkResetRace(page, chats, scenario.kind, scenario.outcome, configuration.language)
        await assertNoPersistedImages(page)
        assert.deepEqual(errors, [], 'image interactions must not cause page errors or external requests')
        if (scenario.kind !== 'send-gate') assert.equal(chats.length, 0, 'image preparation and session controls must not send a question')
        if (process.env.UI_CHECK_ARTIFACT_DIR && scenario.kind === 'new-session' && scenario.outcome === 'success') {
          await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'image-lifecycle-' + configuration.width + '-' + configuration.language + '.png') })
        }
        cases += 1
      } catch (error) {
        if (process.env.UI_CHECK_ARTIFACT_DIR) {
          await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'image-lifecycle-failure-' + configuration.width + '-' + scenario.kind + (scenario.timing ? '-' + scenario.timing : '') + '.png') }).catch(() => {})
        }
        throw new Error(label + ': ' + error.message, { cause: error })
      } finally {
        await page.close()
      }
    }
  }
  return { cases, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Public assistant image lifecycle passed:', await checkPublicAssistantImageLifecycle(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } finally {
    await browser.close()
  }
}
