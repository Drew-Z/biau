import { createServer as createHttpServer } from 'node:http'
import { createServer as createTcpServer } from 'node:net'
import { onRequestPost as publicChat } from '../functions/api/chat/public.ts'
import { onRequestPost as publicBranch } from '../functions/api/chat/public/branch.ts'
import { onRequestPost as cancelPublicChat } from '../functions/api/chat/public/cancel.ts'
import { onRequestPost as publicFeedback } from '../functions/api/chat/public/feedback.ts'
import {
  onRequestDelete as deletePublicSession,
  onRequestPost as publicSession,
} from '../functions/api/chat/public/session.ts'
import { onRequestPost as publicSessions } from '../functions/api/chat/public/sessions.ts'
import { onRequestPost as publicChatStream } from '../functions/api/chat/public/stream.ts'
import { onRequestGet as health } from '../functions/api/health.ts'

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = createTcpServer()
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          tryPort(port + 1)
          return
        }
        reject(error)
      })
      server.once('listening', () => server.close(() => resolve(port)))
      server.listen(port, '127.0.0.1')
    }
    tryPort(startPort)
  })
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function startMockPublicAssistant(port, observed) {
  const server = createHttpServer(async (request, response) => {
    const body = request.method === 'GET' ? '' : await readRequestBody(request)
    observed.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      cookie: request.headers.cookie,
      body,
    })

    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ ok: true, service: 'biau-public-assistant', mode: 'public' }))
      return
    }

    if (request.method === 'POST' && request.url === '/chat/public') {
      const payload = JSON.parse(body)
      if (payload.message === 'rate limit') {
        response.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '15' })
        response.end(JSON.stringify({ error: 'public-assistant-rate-limited' }))
        return
      }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({
        contractVersion: 2,
        requestId: payload.requestId,
        answer: '这是由权威公开助手服务返回的研究回答。',
        status: 'answered',
        claims: [{ id: 'claim-1', text: '已验证。', citationIds: ['site-1'] }],
        citations: [{
          id: 'site-1',
          title: '公开资料',
          summary: '公开摘要',
          href: '/projects',
          source: 'site',
          section: '项目',
          excerpt: '已验证。',
          evidenceStatus: 'verified',
        }],
        suggestions: ['继续了解'],
        sessionId: payload.sessionId,
        messageId: 'turn-1234',
        conversation: {
          branchId: 'branch-1234',
          branchOrdinal: 1,
          turnId: 'turn-1234',
          revisionId: 'revision-1234',
          revisionNo: 1,
          basedOnRevisionId: null,
          activated: true,
        },
        meta: {
          mode: 'model',
          citationCount: 1,
          research: {
            requestedMode: payload.mode,
            route: 'combined',
            status: 'answered',
            evidenceCount: 1,
            siteEvidenceCount: 1,
            webEvidenceCount: 0,
            retryCount: 0,
            searchAvailable: true,
            durationMs: 12,
          },
        },
      }))
      return
    }

    if (request.method === 'POST' && request.url === '/chat/public/stream') {
      const payload = JSON.parse(body)
      response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
      })
      response.write('event: ready\ndata: {"version":1}\n\n')
      response.write('event: progress\ndata: {"stage":"researching"}\n\n')
      response.end(`event: result\ndata: ${JSON.stringify({
        contractVersion: 2,
        requestId: payload.requestId,
        answer: '流式研究回答。',
        status: 'answered',
        claims: [],
        citations: [],
        suggestions: [],
        sessionId: payload.sessionId,
        messageId: 'turn-stream-1234',
        conversation: {
          branchId: 'branch-stream-1234',
          branchOrdinal: 2,
          turnId: 'turn-stream-1234',
          revisionId: 'revision-stream-1234',
          revisionNo: 1,
          basedOnRevisionId: null,
          activated: true,
        },
        meta: { mode: 'model', citationCount: 0 },
      })}\n\nevent: done\ndata: {"ok":true}\n\n`)
      return
    }

    if (request.method === 'POST' && request.url === '/chat/public/cancel') {
      const payload = JSON.parse(body)
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ ok: true, requestId: payload.requestId, status: 'cancelled' }))
      return
    }

    if (request.method === 'POST' && request.url === '/chat/public/feedback') {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ ok: true }))
      return
    }

    if (request.method === 'POST' && request.url === '/chat/public/sessions') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      response.end(JSON.stringify({
        sessions: [{
          id: 'public-session-1234',
          title: '公开会话',
          turnCount: 1,
          createdAt: '2026-07-27T08:00:00.000Z',
          lastActiveAt: '2026-07-27T08:01:00.000Z',
          expiresAt: '2026-08-26T08:00:00.000Z',
        }],
      }))
      return
    }

    if (request.method === 'POST' && request.url === '/chat/public/session') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      response.end(JSON.stringify({
        session: {
          id: 'public-session-1234',
          activeBranchId: 'branch-1234',
          title: '公开会话',
          turnCount: 1,
          createdAt: '2026-07-27T08:00:00.000Z',
          lastActiveAt: '2026-07-27T08:01:00.000Z',
          expiresAt: '2026-08-26T08:00:00.000Z',
        },
        branches: [{
          id: 'branch-1234',
          ordinal: 1,
          headRevisionId: 'revision-1234',
          preview: '公开会话',
          turnCount: 1,
          hasEarlierTurns: false,
          lastActiveAt: '2026-07-27T08:01:00.000Z',
        }],
        turns: [{
          id: 'turn-1234',
          question: '公开会话',
          mode: 'auto',
          parentRevisionId: null,
          selectedRevisionId: 'revision-1234',
          revisions: [{
            id: 'revision-1234',
            revisionNo: 1,
            basedOnRevisionId: null,
            answer: '这是由权威公开助手服务返回的研究回答。',
            status: 'answered',
            route: 'site',
            claims: [],
            citations: [],
            suggestions: [],
            meta: { mode: 'model', citationCount: 0 },
            feedback: null,
            createdAt: '2026-07-27T08:01:00.000Z',
          }],
          createdAt: '2026-07-27T08:01:00.000Z',
        }],
        hasEarlierTurns: false,
        revisionsTruncated: false,
        branchesTruncated: false,
        truncated: false,
      }))
      return
    }

    if (request.method === 'POST' && request.url === '/chat/public/branch') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      response.end(JSON.stringify({
        session: {
          id: 'public-session-1234',
          activeBranchId: 'branch-1234',
          title: '公开会话',
          turnCount: 1,
          createdAt: '2026-07-27T08:00:00.000Z',
          lastActiveAt: '2026-07-27T08:01:00.000Z',
          expiresAt: '2026-08-26T08:00:00.000Z',
          hasEarlierTurns: false,
        },
        branches: [],
        turns: [],
        hasEarlierTurns: false,
        revisionsTruncated: false,
        branchesTruncated: false,
        truncated: false,
      }))
      return
    }

    if (request.method === 'DELETE' && request.url === '/chat/public/session') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      response.end(JSON.stringify({ ok: true }))
      return
    }

    response.writeHead(404, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: 'not-found' }))
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}

function makeRequest(path, payload, headers = {}, method = 'POST') {
  return new Request(`https://biau.example${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
}

const missingConfig = await publicChat({
  request: makeRequest('/api/chat/public', { message: 'hello' }),
  env: {},
})
if (missingConfig.status !== 503) throw new Error('Cloudflare proxy must fail closed when upstream is not configured')

const missingStreamConfig = await publicChatStream({
  request: makeRequest('/api/chat/public/stream', { message: 'hello' }),
  env: {},
})
if (missingStreamConfig.status !== 503) throw new Error('Cloudflare stream proxy must fail closed when upstream is not configured')

const missingBranchConfig = await publicBranch({
  request: makeRequest('/api/chat/public/branch', {
    sessionId: 'public-session-1234',
    action: 'select',
    branchId: 'branch-1234',
  }),
  env: {},
})
if (missingBranchConfig.status !== 503) throw new Error('Cloudflare branch proxy must fail closed when upstream is not configured')

const port = await findAvailablePort(9277)
const observed = []
const upstream = await startMockPublicAssistant(port, observed)
const env = { PUBLIC_ASSISTANT_API_BASE_URL: `http://127.0.0.1:${port}` }

try {
  const requestId = '11111111-1111-4111-8111-111111111111'
  const healthResponse = await health({
    request: new Request('https://biau.example/api/health'),
    env,
  })
  const healthPayload = await healthResponse.json()
  if (!healthResponse.ok || healthPayload.ok !== true || healthPayload.service !== 'biau-public-assistant') {
    throw new Error('Cloudflare health proxy did not preserve the upstream health contract')
  }

  const chatResponse = await publicChat({
    request: makeRequest('/api/chat/public', {
      contractVersion: 2,
      requestId,
      message: '请研究本站与公开网页',
      mode: 'auto',
      sessionId: 'public-session-1234',
      intent: { kind: 'new-turn', branchId: null, parentRevisionId: null },
      history: [{ role: 'user', content: '上一轮问题' }],
      pageContext: { path: '/projects', title: '项目', description: '公开项目' },
    }, {
      Authorization: 'Bearer browser-secret-must-not-forward',
      Cookie: 'session=browser-secret-must-not-forward',
    }),
    env,
  })
  const chatPayload = await chatResponse.json()
  if (
    !chatResponse.ok ||
    chatPayload.status !== 'answered' ||
    chatPayload.meta?.research?.route !== 'combined' ||
    chatPayload.messageId !== 'turn-1234' ||
    chatPayload.contractVersion !== 2 ||
    chatPayload.conversation?.revisionId !== 'revision-1234'
  ) {
    throw new Error('Cloudflare chat proxy did not preserve the public Agentic RAG response')
  }

  const chatObservation = observed.find((entry) => entry.url === '/chat/public')
  const forwardedChat = JSON.parse(chatObservation?.body ?? '{}')
  if (
    forwardedChat.mode !== 'auto' ||
    forwardedChat.contractVersion !== 2 ||
    forwardedChat.requestId !== requestId ||
    forwardedChat.intent?.kind !== 'new-turn' ||
    forwardedChat.history?.[0]?.content !== '上一轮问题' ||
    forwardedChat.pageContext?.path !== '/projects'
  ) {
    throw new Error('Cloudflare chat proxy dropped request contract fields')
  }
  if (chatObservation?.authorization || chatObservation?.cookie) {
    throw new Error('Cloudflare chat proxy must not forward browser credentials')
  }

  const streamResponse = await publicChatStream({
    request: makeRequest('/api/chat/public/stream', {
      contractVersion: 2,
      requestId,
      message: '请以流式连接研究公开网页',
      mode: 'web',
      sessionId: 'public-session-1234',
      intent: { kind: 'new-turn', branchId: null, parentRevisionId: null },
      history: [],
      pageContext: { path: '/blog', title: '博客', description: '公开文章' },
    }, {
      Authorization: 'Bearer browser-secret-must-not-forward',
      Cookie: 'session=browser-secret-must-not-forward',
    }),
    env,
  })
  const streamText = await streamResponse.text()
  if (
    !streamResponse.ok ||
    !streamResponse.headers.get('Content-Type')?.includes('text/event-stream') ||
    !streamText.includes('event: progress') ||
    !streamText.includes('turn-stream-1234') ||
    !streamText.includes('revision-stream-1234')
  ) {
    throw new Error('Cloudflare stream proxy did not preserve the upstream SSE contract')
  }
  const streamObservation = observed.find((entry) => entry.url === '/chat/public/stream')
  const forwardedStream = JSON.parse(streamObservation?.body ?? '{}')
  if (
    streamObservation?.authorization ||
    streamObservation?.cookie ||
    forwardedStream.requestId !== requestId ||
    forwardedStream.contractVersion !== 2 ||
    forwardedStream.intent?.kind !== 'new-turn'
  ) {
    throw new Error('Cloudflare stream proxy must not forward browser credentials')
  }

  const cancelResponse = await cancelPublicChat({
    request: makeRequest('/api/chat/public/cancel', { requestId, sessionId: 'public-session-1234' }),
    env,
  })
  const cancelPayload = await cancelResponse.json()
  if (!cancelResponse.ok || cancelPayload.status !== 'cancelled' || cancelPayload.requestId !== requestId) {
    throw new Error('Cloudflare cancel proxy did not preserve the idempotent request contract')
  }

  const feedbackResponse = await publicFeedback({
    request: makeRequest('/api/chat/public/feedback', {
      sessionId: 'public-session-1234',
      revisionId: 'revision-1234',
      rating: 'up',
      reason: 'helpful',
    }),
    env,
  })
  const feedbackPayload = await feedbackResponse.json()
  if (!feedbackResponse.ok || feedbackPayload.ok !== true) {
    throw new Error('Cloudflare feedback proxy did not preserve the upstream response')
  }

  const feedbackObservation = observed.find((entry) => entry.url === '/chat/public/feedback')
  const forwardedFeedback = JSON.parse(feedbackObservation?.body ?? '{}')
  if (forwardedFeedback.revisionId !== 'revision-1234' || 'turnId' in forwardedFeedback) {
    throw new Error('Cloudflare feedback proxy must preserve revision-bound feedback')
  }

  const sessionHeaders = {
    Authorization: 'Bearer browser-secret-must-not-forward',
    Cookie: 'session=browser-secret-must-not-forward',
  }
  const sessionsResponse = await publicSessions({
    request: makeRequest('/api/chat/public/sessions', { sessionIds: ['public-session-1234'] }, sessionHeaders),
    env,
  })
  const sessionsPayload = await sessionsResponse.json()
  if (!sessionsResponse.ok || sessionsPayload.sessions?.[0]?.title !== '公开会话') {
    throw new Error('Cloudflare session-list proxy did not preserve the upstream response')
  }

  const sessionResponse = await publicSession({
    request: makeRequest('/api/chat/public/session', { sessionId: 'public-session-1234' }, sessionHeaders),
    env,
  })
  const sessionPayload = await sessionResponse.json()
  if (!sessionResponse.ok || sessionPayload.session?.id !== 'public-session-1234') {
    throw new Error('Cloudflare session proxy did not preserve the upstream response')
  }

  const branchResponse = await publicBranch({
    request: makeRequest('/api/chat/public/branch', {
      sessionId: 'public-session-1234',
      action: 'select',
      branchId: 'branch-1234',
    }, sessionHeaders),
    env,
  })
  const branchPayload = await branchResponse.json()
  if (!branchResponse.ok || branchPayload.session?.activeBranchId !== 'branch-1234') {
    throw new Error('Cloudflare branch proxy did not preserve the authoritative history response')
  }

  const deleteResponse = await deletePublicSession({
    request: makeRequest('/api/chat/public/session', { sessionId: 'public-session-1234' }, sessionHeaders, 'DELETE'),
    env,
  })
  const deletePayload = await deleteResponse.json()
  if (!deleteResponse.ok || deletePayload.ok !== true) {
    throw new Error('Cloudflare session-delete proxy did not preserve the upstream response')
  }

  const historyObservations = observed.filter((entry) => (
    entry.url === '/chat/public/session' ||
    entry.url === '/chat/public/sessions' ||
    entry.url === '/chat/public/branch'
  ))
  if (historyObservations.length !== 4 || historyObservations.some((entry) => entry.authorization || entry.cookie)) {
    throw new Error('Cloudflare history and branch proxies must not forward browser credentials')
  }
  if (
    sessionsResponse.headers.get('Cache-Control') !== 'no-store' ||
    sessionResponse.headers.get('Cache-Control') !== 'no-store' ||
    branchResponse.headers.get('Cache-Control') !== 'no-store'
  ) {
    throw new Error('Cloudflare history and branch proxies must remain non-cacheable')
  }

  const limitedResponse = await publicChat({
    request: makeRequest('/api/chat/public', { message: 'rate limit', mode: 'auto' }),
    env,
  })
  if (limitedResponse.status !== 429 || limitedResponse.headers.get('Retry-After') !== '15') {
    throw new Error('Cloudflare proxy must preserve rate-limit status and Retry-After')
  }

  const invalidContentType = await publicChat({
    request: new Request('https://biau.example/api/chat/public', { method: 'POST', body: 'not-json' }),
    env,
  })
  if (invalidContentType.status !== 415) throw new Error('Cloudflare proxy must require JSON request bodies')
} finally {
  await new Promise((resolve) => upstream.close(() => resolve()))
}

const unreachable = await publicChat({
  request: makeRequest('/api/chat/public', { message: 'hello' }),
  env: { PUBLIC_ASSISTANT_API_BASE_URL: 'http://127.0.0.1:9', PUBLIC_ASSISTANT_PROXY_TIMEOUT_MS: '5000' },
})
if (unreachable.status !== 502) throw new Error('Cloudflare proxy must return a stable unreachable category')

console.log('Cloudflare public assistant thin-proxy contracts passed.')
