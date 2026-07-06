import { createServer as createTcpServer } from 'node:net'
import { createApp } from '../src/app.js'
import { env } from '../src/env.js'
import type { AssistantServiceMode, RagRetrieveResponse } from '../src/types.js'

interface EnvSnapshot {
  assistantServiceMode: AssistantServiceMode
  assistantModelApiKey: string
  assistantModelChannelsJson: string
  assistantRagApiBaseUrl: string
  assistantRagApiKey: string
  openaiApiKey: string
  ragPublicApiKey: string
  ragInternalApiKey: string
  ragSyncToken: string
  ragStoreProvider: string
  studioAdminToken: string
  studioDatabaseUrl: string
  qdrantUrl: string
  qdrantApiKey: string
  qdrantPublicCollection: string
  qdrantInternalCollection: string
}

let nextServicePort = 9577

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

function snapshotEnv(): EnvSnapshot {
  return {
    assistantServiceMode: env.assistantServiceMode,
    assistantModelApiKey: env.assistantModelApiKey,
    assistantModelChannelsJson: env.assistantModelChannelsJson,
    assistantRagApiBaseUrl: env.assistantRagApiBaseUrl,
    assistantRagApiKey: env.assistantRagApiKey,
    openaiApiKey: env.openaiApiKey,
    ragPublicApiKey: env.ragPublicApiKey,
    ragInternalApiKey: env.ragInternalApiKey,
    ragSyncToken: env.ragSyncToken,
    ragStoreProvider: env.ragStoreProvider,
    studioAdminToken: env.studioAdminToken,
    studioDatabaseUrl: env.studioDatabaseUrl,
    qdrantUrl: env.qdrantUrl,
    qdrantApiKey: env.qdrantApiKey,
    qdrantPublicCollection: env.qdrantPublicCollection,
    qdrantInternalCollection: env.qdrantInternalCollection,
  }
}

function restoreEnv(snapshot: EnvSnapshot) {
  env.assistantServiceMode = snapshot.assistantServiceMode
  env.assistantModelApiKey = snapshot.assistantModelApiKey
  env.assistantModelChannelsJson = snapshot.assistantModelChannelsJson
  env.assistantRagApiBaseUrl = snapshot.assistantRagApiBaseUrl
  env.assistantRagApiKey = snapshot.assistantRagApiKey
  env.openaiApiKey = snapshot.openaiApiKey
  env.ragPublicApiKey = snapshot.ragPublicApiKey
  env.ragInternalApiKey = snapshot.ragInternalApiKey
  env.ragSyncToken = snapshot.ragSyncToken
  env.ragStoreProvider = snapshot.ragStoreProvider
  env.studioAdminToken = snapshot.studioAdminToken
  env.studioDatabaseUrl = snapshot.studioDatabaseUrl
  env.qdrantUrl = snapshot.qdrantUrl
  env.qdrantApiKey = snapshot.qdrantApiKey
  env.qdrantPublicCollection = snapshot.qdrantPublicCollection
  env.qdrantInternalCollection = snapshot.qdrantInternalCollection
}

async function withService(mode: AssistantServiceMode, run: (base: string) => Promise<void>) {
  env.assistantServiceMode = mode
  env.assistantModelApiKey = ''
  env.assistantModelChannelsJson = ''
  env.openaiApiKey = ''
  env.assistantRagApiBaseUrl = ''
  env.assistantRagApiKey = ''
  env.ragPublicApiKey = 'public-rag-smoke-key'
  env.ragInternalApiKey = 'internal-rag-smoke-key'
  env.ragSyncToken = 'sync-rag-smoke-token'
  env.ragStoreProvider = 'local'
  env.studioAdminToken = 'studio-smoke-token'
  env.studioDatabaseUrl = ''
  env.qdrantUrl = ''
  env.qdrantApiKey = ''
  env.qdrantPublicCollection = 'biau_public_chunks'
  env.qdrantInternalCollection = 'biau_internal_chunks'

  const port = await findAvailablePort(nextServicePort)
  nextServicePort = port + 20
  const app = createApp()
  const server = app.listen(port, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

async function getJson<T>(url: string) {
  const response = await fetch(url)
  return { response, payload: (await response.json().catch(() => null)) as T | null }
}

async function postJson<T>(url: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return { response, payload: (await response.json().catch(() => null)) as T | null }
}

const snapshot = snapshotEnv()

try {
  await withService('public', async (base) => {
    const health = await getJson<{ serviceMode?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.serviceMode !== 'public') throw new Error('public mode health is invalid')

    const publicChat = await postJson<{ answer?: string }>(`${base}/chat/public`, { message: 'RAG 项目' })
    if (!publicChat.response.ok || !publicChat.payload?.answer) throw new Error('public mode should expose public chat')

    const internalChat = await postJson(`${base}/chat/internal`, { message: '内部助手' })
    if (internalChat.response.status !== 404) throw new Error(`public mode should not expose internal chat, got ${internalChat.response.status}`)

    const internalSessions = await fetch(`${base}/chat/internal/sessions`)
    if (internalSessions.status !== 404) {
      throw new Error(`public mode should not expose internal sessions, got ${internalSessions.status}`)
    }

    const adminInvites = await fetch(`${base}/admin/invites`)
    if (adminInvites.status !== 404) {
      throw new Error(`public mode should not expose admin invite routes, got ${adminInvites.status}`)
    }

    const adminKnowledge = await fetch(`${base}/admin/knowledge-documents`)
    if (adminKnowledge.status !== 404) {
      throw new Error(`public mode should not expose admin knowledge routes, got ${adminKnowledge.status}`)
    }

    const ragHealth = await fetch(`${base}/rag/health`)
    if (ragHealth.status !== 404) throw new Error(`public mode should not expose /rag, got ${ragHealth.status}`)
  })

  await withService('internal', async (base) => {
    const health = await getJson<{ serviceMode?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.serviceMode !== 'internal') throw new Error('internal mode health is invalid')

    const publicChat = await postJson(`${base}/chat/public`, { message: 'RAG 项目' })
    if (publicChat.response.status !== 404) throw new Error(`internal mode should not expose public chat, got ${publicChat.response.status}`)

    const internalChat = await postJson(`${base}/chat/internal`, { message: '内部助手' })
    if (internalChat.response.status !== 401) throw new Error(`internal mode should require auth, got ${internalChat.response.status}`)

    const internalSessions = await fetch(`${base}/chat/internal/sessions`)
    if (internalSessions.status !== 401) {
      throw new Error(`internal mode should expose protected internal sessions, got ${internalSessions.status}`)
    }

    const adminSummary = await fetch(`${base}/admin/summary`)
    if (adminSummary.status !== 401) throw new Error(`internal mode should expose protected admin routes, got ${adminSummary.status}`)

    const adminInvites = await fetch(`${base}/admin/invites`)
    if (adminInvites.status !== 401) throw new Error(`internal mode should expose protected admin invite routes, got ${adminInvites.status}`)

    const adminKnowledge = await fetch(`${base}/admin/knowledge-documents`)
    if (adminKnowledge.status !== 401) throw new Error(`internal mode should expose protected admin knowledge routes, got ${adminKnowledge.status}`)

    const ragHealth = await fetch(`${base}/rag/health`)
    if (ragHealth.status !== 404) throw new Error(`internal mode should not expose /rag, got ${ragHealth.status}`)
  })

  await withService('rag', async (base) => {
    const health = await getJson<{ service?: string; store?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.service !== 'biau-rag-orchestrator' || !health.payload.store) {
      throw new Error('rag mode health is invalid')
    }

    const publicChat = await postJson(`${base}/chat/public`, { message: 'RAG 项目' })
    if (publicChat.response.status !== 404) throw new Error(`rag mode should not expose chat, got ${publicChat.response.status}`)

    const internalSessions = await fetch(`${base}/chat/internal/sessions`)
    if (internalSessions.status !== 404) {
      throw new Error(`rag mode should not expose internal sessions, got ${internalSessions.status}`)
    }

    const adminInvites = await fetch(`${base}/admin/invites`)
    if (adminInvites.status !== 404) {
      throw new Error(`rag mode should not expose admin invite routes, got ${adminInvites.status}`)
    }

    const adminKnowledge = await fetch(`${base}/admin/knowledge-documents`)
    if (adminKnowledge.status !== 404) {
      throw new Error(`rag mode should not expose admin knowledge routes, got ${adminKnowledge.status}`)
    }

    const unauthorizedRetrieve = await postJson(`${base}/v1/retrieve`, { query: 'RAG 项目', scope: 'public' })
    if (unauthorizedRetrieve.response.status !== 401) throw new Error(`rag mode should require retrieve key, got ${unauthorizedRetrieve.response.status}`)

    const publicRetrieve = await postJson(`${base}/v1/retrieve`, { query: 'RAG 项目', scope: 'public' }, 'public-rag-smoke-key')
    if (!publicRetrieve.response.ok) throw new Error(`rag mode public retrieve failed: ${publicRetrieve.response.status}`)

    const mismatchedRetrieve = await postJson(`${base}/v1/retrieve`, { query: 'RAG 项目', scope: 'internal' }, 'public-rag-smoke-key')
    if (mismatchedRetrieve.response.status !== 401) {
      throw new Error(`rag mode should reject scope-mismatched key, got ${mismatchedRetrieve.response.status}`)
    }

    const internalRetrieve = await postJson(`${base}/v1/retrieve`, { query: 'RAG 项目', scope: 'internal' }, 'internal-rag-smoke-key')
    if (!internalRetrieve.response.ok) throw new Error(`rag mode internal retrieve failed: ${internalRetrieve.response.status}`)

    const sync = await postJson(`${base}/v1/sync`, {}, 'sync-rag-smoke-token')
    if (!sync.response.ok) throw new Error(`rag mode sync failed: ${sync.response.status}`)

    env.ragStoreProvider = 'qdrant'
    const qdrantHealth = await getJson<{ store?: string; vectorReady?: boolean }>(`${base}/health`)
    if (!qdrantHealth.response.ok || qdrantHealth.payload?.store !== 'qdrant' || qdrantHealth.payload.vectorReady !== false) {
      throw new Error('rag mode qdrant health without config should be low-sensitive and not ready')
    }

    const qdrantFallbackRetrieve = await postJson<RagRetrieveResponse>(
      `${base}/v1/retrieve`,
      { query: 'Legal RAG 怎么体验？', scope: 'public' },
      'public-rag-smoke-key',
    )
    if (!qdrantFallbackRetrieve.response.ok || qdrantFallbackRetrieve.payload?.meta.store !== 'local') {
      throw new Error('rag mode qdrant without config should fall back to local retrieval')
    }
  })

  await withService('studio', async (base) => {
    const health = await getJson<{ serviceMode?: string; service?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.serviceMode !== 'studio' || health.payload.service !== 'biau-content-studio-api') {
      throw new Error('studio mode health is invalid')
    }

    const publicChat = await postJson(`${base}/chat/public`, { message: 'RAG 项目' })
    if (publicChat.response.status !== 404) throw new Error(`studio mode should not expose public chat, got ${publicChat.response.status}`)

    const internalChat = await postJson(`${base}/chat/internal`, { message: '内部助手' })
    if (internalChat.response.status !== 404) throw new Error(`studio mode should not expose internal chat, got ${internalChat.response.status}`)

    const internalSessions = await fetch(`${base}/chat/internal/sessions`)
    if (internalSessions.status !== 404) {
      throw new Error(`studio mode should not expose internal sessions, got ${internalSessions.status}`)
    }

    const adminInvites = await fetch(`${base}/admin/invites`)
    if (adminInvites.status !== 404) {
      throw new Error(`studio mode should not expose admin invite routes, got ${adminInvites.status}`)
    }

    const adminKnowledge = await fetch(`${base}/admin/knowledge-documents`)
    if (adminKnowledge.status !== 404) {
      throw new Error(`studio mode should not expose admin knowledge routes, got ${adminKnowledge.status}`)
    }

    const ragHealth = await fetch(`${base}/rag/health`)
    if (ragHealth.status !== 404) throw new Error(`studio mode should not expose /rag, got ${ragHealth.status}`)

    const studioMissingToken = await fetch(`${base}/studio/api/health`)
    if (studioMissingToken.status !== 401) throw new Error(`studio mode should protect studio api, got ${studioMissingToken.status}`)

    const studioHealth = await fetch(`${base}/studio/api/health`, {
      headers: { Authorization: 'Bearer studio-smoke-token' },
    })
    if (!studioHealth.ok) throw new Error(`studio mode health with token failed: ${studioHealth.status}`)
    const studioHealthPayload = (await studioHealth.json()) as { service?: string; database?: boolean }
    if (studioHealthPayload.service !== 'biau-content-studio-api' || studioHealthPayload.database !== false) {
      throw new Error('studio mode studio api health payload is invalid')
    }
  })

  console.log('Assistant service mode smoke passed')
} finally {
  restoreEnv(snapshot)
}
