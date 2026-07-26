import { createServer as createHttpServer } from 'node:http'
import { createServer as createTcpServer } from 'node:net'
import { onRequestPost as publicChat } from '../functions/api/chat/public.ts'
import { onRequestPost as publicFeedback } from '../functions/api/chat/public/feedback.ts'
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

    if (request.method === 'POST' && request.url === '/chat/public/feedback') {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ ok: true }))
      return
    }

    response.writeHead(404, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: 'not-found' }))
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}

function makeRequest(path, payload, headers = {}) {
  return new Request(`https://biau.example${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
}

const missingConfig = await publicChat({
  request: makeRequest('/api/chat/public', { message: 'hello' }),
  env: {},
})
if (missingConfig.status !== 503) throw new Error('Cloudflare proxy must fail closed when upstream is not configured')

const port = await findAvailablePort(9277)
const observed = []
const upstream = await startMockPublicAssistant(port, observed)
const env = { PUBLIC_ASSISTANT_API_BASE_URL: `http://127.0.0.1:${port}` }

try {
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
      message: '请研究本站与公开网页',
      mode: 'auto',
      sessionId: 'public-session-1234',
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
    chatPayload.messageId !== 'turn-1234'
  ) {
    throw new Error('Cloudflare chat proxy did not preserve the public Agentic RAG response')
  }

  const chatObservation = observed.find((entry) => entry.url === '/chat/public')
  const forwardedChat = JSON.parse(chatObservation?.body ?? '{}')
  if (
    forwardedChat.mode !== 'auto' ||
    forwardedChat.history?.[0]?.content !== '上一轮问题' ||
    forwardedChat.pageContext?.path !== '/projects'
  ) {
    throw new Error('Cloudflare chat proxy dropped request contract fields')
  }
  if (chatObservation?.authorization || chatObservation?.cookie) {
    throw new Error('Cloudflare chat proxy must not forward browser credentials')
  }

  const feedbackResponse = await publicFeedback({
    request: makeRequest('/api/chat/public/feedback', {
      sessionId: 'public-session-1234',
      turnId: 'turn-1234',
      rating: 'up',
      reason: 'helpful',
    }),
    env,
  })
  const feedbackPayload = await feedbackResponse.json()
  if (!feedbackResponse.ok || feedbackPayload.ok !== true) {
    throw new Error('Cloudflare feedback proxy did not preserve the upstream response')
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
