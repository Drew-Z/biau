import { createServer as createHttpServer } from 'node:http'
import { createServer as createTcpServer } from 'node:net'
import { onRequestPost as publicChat } from '../functions/api/chat/public.ts'
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
      server.once('listening', () => {
        server.close(() => resolve(port))
      })
      server.listen(port, '127.0.0.1')
    }
    tryPort(startPort)
  })
}

function hasCitation(citations, id) {
  return citations.some((citation) => citation && typeof citation === 'object' && citation.id === id)
}

function startMockModelServer(port, acceptedPath = '/v1/chat/completions') {
  const server = createHttpServer((req, res) => {
    if (req.method !== 'POST' || req.url !== acceptedPath || req.headers.authorization !== 'Bearer cf-smoke-model-key') {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'not-found' }))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '模型增强回答：Cloudflare Pages Function 已经接入公开助手模型通道。',
            },
          },
        ],
      }),
    )
  })

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function readJsonResponse(response) {
  return response.json()
}

function makeChatRequest(message) {
  return new Request('https://biau.example/api/chat/public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
}

const emptyEnv = {}
const healthPayload = await readJsonResponse(await health({ env: emptyEnv }))
if (healthPayload.model !== 'fallback' || healthPayload.provider !== 'local-public-knowledge') {
  throw new Error('Cloudflare assistant health should report local fallback without model env')
}

const fallbackResponse = await publicChat({ request: makeChatRequest('RAG 项目'), env: emptyEnv })
if (!fallbackResponse.ok) throw new Error(`fallback public chat failed: ${fallbackResponse.status}`)
const fallbackPayload = await readJsonResponse(fallbackResponse)
if (
  !fallbackPayload.answer ||
  !Array.isArray(fallbackPayload.citations) ||
  !hasCitation(fallbackPayload.citations, 'project:legal-rag') ||
  fallbackPayload.meta?.mode !== 'fallback' ||
  fallbackPayload.meta?.reason !== 'not_configured'
) {
  throw new Error('Cloudflare public chat fallback payload is invalid')
}

const mockPort = await findAvailablePort(9277)
const mockModelServer = await startMockModelServer(mockPort)
try {
  const modelResponse = await publicChat({
    request: makeChatRequest('RAG 项目'),
    env: {
      ASSISTANT_MODEL_BASE_URL: `http://127.0.0.1:${mockPort}`,
      ASSISTANT_MODEL_API_KEY: 'cf-smoke-model-key',
      ASSISTANT_MODEL_NAME: 'glm-cf-smoke-model',
      ASSISTANT_MODEL_PROVIDER: 'glm-compatible',
    },
  })
  if (!modelResponse.ok) throw new Error(`model public chat failed: ${modelResponse.status}`)
  const modelPayload = await readJsonResponse(modelResponse)
  if (
    !modelPayload.answer?.includes('Cloudflare Pages Function') ||
    modelPayload.meta?.mode !== 'model' ||
    modelPayload.meta?.model !== 'glm-cf-smoke-model' ||
    modelPayload.meta?.provider !== 'glm-compatible'
  ) {
    throw new Error('Cloudflare public chat did not use configured model provider')
  }
} finally {
  await new Promise((resolve) => mockModelServer.close(() => resolve()))
}

const failureResponse = await publicChat({
  request: makeChatRequest('RAG 项目'),
  env: {
    ASSISTANT_MODEL_BASE_URL: 'http://127.0.0.1:9',
    ASSISTANT_MODEL_API_KEY: 'cf-smoke-model-key',
    ASSISTANT_MODEL_NAME: 'glm-cf-failure-model',
    ASSISTANT_MODEL_PROVIDER: 'glm-compatible',
  },
})
if (!failureResponse.ok) throw new Error(`provider failure public chat failed: ${failureResponse.status}`)
const failurePayload = await readJsonResponse(failureResponse)
if (
  !failurePayload.answer ||
  failurePayload.meta?.mode !== 'fallback' ||
  failurePayload.meta?.reason !== 'provider_error' ||
  failurePayload.meta?.model !== 'glm-cf-failure-model' ||
  failurePayload.meta?.diagnostic?.kind !== 'network_error' ||
  failurePayload.meta?.diagnostic?.attemptedEndpoints !== 1 ||
  failurePayload.meta?.diagnostic?.timeoutMs !== 20000
) {
  throw new Error('Cloudflare public chat provider failure did not fall back safely')
}

console.log('Cloudflare public assistant function smoke passed')
