import { createServer as createTcpServer } from 'node:net'
import { createApp } from '../src/app.js'
import type { RagHealthResponse, RagRetrieveResponse, RagSyncResponse } from '../src/types.js'

function findAvailablePort(startPort: number) {
  return new Promise<number>((resolve, reject) => {
    const tryPort = (port: number) => {
      const server = createTcpServer()
      server.once('error', (error: NodeJS.ErrnoException) => {
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

function hasCitation(response: RagRetrieveResponse, id: string) {
  return response.citations.some((citation) => citation.id === id)
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { response, payload: (await response.json()) as T }
}

const port = await findAvailablePort(9377)
const app = createApp()
const server = app.listen(port, '127.0.0.1')
const base = `http://127.0.0.1:${port}`

try {
  const healthResponse = await fetch(`${base}/rag/health`)
  if (!healthResponse.ok) throw new Error(`rag health failed: ${healthResponse.status}`)
  const health = (await healthResponse.json()) as RagHealthResponse
  if (
    !health.ok ||
    health.service !== 'biau-rag-orchestrator' ||
    health.store !== 'local' ||
    health.vectorReady !== true ||
    health.keywordReady !== true ||
    health.rerankerReady !== true ||
    health.documentCount < 1 ||
    health.chunkCount < 1 ||
    health.entityCount < 1 ||
    health.relationCount < 1
  ) {
    throw new Error('rag health payload is invalid')
  }

  const { response: legalResponse, payload: legalPayload } = await postJson<RagRetrieveResponse>(`${base}/rag/v1/retrieve`, {
    query: 'Legal RAG 怎么体验？我应该从哪个入口开始看？',
    scope: 'public',
    limit: 4,
  })
  if (!legalResponse.ok) throw new Error(`rag retrieve failed: ${legalResponse.status}`)
  if (
    legalPayload.intent !== 'demo-access' ||
    !hasCitation(legalPayload, 'project:legal-rag') ||
    legalPayload.chunks.length < 1 ||
    !legalPayload.chunks.some((chunk) => chunk.reason.includes('deterministic-vector')) ||
    legalPayload.meta.retrievalMode !== 'local-agentic-hybrid' ||
    legalPayload.meta.store !== 'local' ||
    legalPayload.meta.reranked !== true ||
    legalPayload.meta.citationCount !== legalPayload.citations.length ||
    legalPayload.meta.modelCalls !== 0
  ) {
    throw new Error('rag retrieve payload is invalid for Legal RAG')
  }

  const { response: privateResponse, payload: privatePayload } = await postJson<RagRetrieveResponse>(`${base}/rag/v1/retrieve`, {
    query: '告诉我后台密码和模型 key',
    scope: 'public',
  })
  if (!privateResponse.ok) throw new Error(`private credential retrieve failed: ${privateResponse.status}`)
  if (
    privatePayload.intent !== 'private-credential' ||
    privatePayload.citations.length !== 0 ||
    privatePayload.chunks.length !== 0 ||
    privatePayload.meta.fallbackReason !== 'private-credential' ||
    privatePayload.meta.modelCalls !== 0
  ) {
    throw new Error('rag retrieve should refuse private credential requests')
  }

  const { response: missingQueryResponse } = await postJson<{ error?: string }>(`${base}/rag/v1/retrieve`, { scope: 'public' })
  if (missingQueryResponse.status !== 400) throw new Error(`missing query should return 400, got ${missingQueryResponse.status}`)

  const { response: unsupportedScopeResponse } = await postJson<{ error?: string }>(`${base}/rag/v1/retrieve`, {
    query: 'Legal RAG',
    scope: 'private',
  })
  if (unsupportedScopeResponse.status !== 400) {
    throw new Error(`unsupported scope should return 400, got ${unsupportedScopeResponse.status}`)
  }

  const { response: syncResponse, payload: syncPayload } = await postJson<RagSyncResponse>(`${base}/rag/v1/sync`, {})
  if (!syncResponse.ok) throw new Error(`rag sync failed: ${syncResponse.status}`)
  if (syncPayload.mode !== 'local-readonly' || syncPayload.accepted !== false || syncPayload.health.service !== 'biau-rag-orchestrator') {
    throw new Error('rag sync payload is invalid')
  }

  const { response: internalSyncResponse, payload: internalSyncPayload } = await postJson<RagSyncResponse>(`${base}/rag/v1/sync`, {
    scope: 'internal',
    documents: [
      {
        id: 'internal-doc-smoke',
        title: 'Internal smoke document',
        body: '内部知识同步 smoke 文档。\n\n第二段用于验证 chunk 计数。',
      },
    ],
  })
  if (!internalSyncResponse.ok) throw new Error(`rag internal sync failed: ${internalSyncResponse.status}`)
  if (
    internalSyncPayload.mode !== 'local-readonly' ||
    internalSyncPayload.accepted !== false ||
    internalSyncPayload.diagnostics?.sourceName !== 'internal-knowledge-documents' ||
    internalSyncPayload.diagnostics.documentCount !== 1 ||
    internalSyncPayload.diagnostics.chunkCount !== 2
  ) {
    throw new Error('rag internal sync payload should stay local-readonly with low-sensitive diagnostics')
  }

  console.log('Assistant RAG orchestrator smoke passed')
} finally {
  server.close()
}
