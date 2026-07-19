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
  operatorServiceToken: string
  operatorOwnerId: string
  operatorOwnerEmails: string[]
  operatorDisplayName: string
  operatorModelChannelId: string | null
  aiDailyPublicFeedEnabled: boolean
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
    operatorServiceToken: env.operatorServiceToken,
    operatorOwnerId: env.operatorOwnerId,
    operatorOwnerEmails: [...env.operatorOwnerEmails],
    operatorDisplayName: env.operatorDisplayName,
    operatorModelChannelId: env.operatorModelChannelId,
    aiDailyPublicFeedEnabled: env.aiDailyPublicFeedEnabled,
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
  env.operatorServiceToken = snapshot.operatorServiceToken
  env.operatorOwnerId = snapshot.operatorOwnerId
  env.operatorOwnerEmails = [...snapshot.operatorOwnerEmails]
  env.operatorDisplayName = snapshot.operatorDisplayName
  env.operatorModelChannelId = snapshot.operatorModelChannelId
  env.aiDailyPublicFeedEnabled = snapshot.aiDailyPublicFeedEnabled
}

async function withService(
  mode: AssistantServiceMode,
  run: (base: string) => Promise<void>,
  options: { publicFeedEnabled?: boolean } = {},
) {
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
  env.operatorServiceToken = 'operator-service-smoke-token'
  env.operatorOwnerId = 'site-owner'
  env.operatorOwnerEmails = ['owner@example.invalid']
  env.operatorDisplayName = 'Smoke Owner'
  env.operatorModelChannelId = null
  env.aiDailyPublicFeedEnabled = true

  const port = await findAvailablePort(nextServicePort)
  nextServicePort = port + 20
  const app = createApp(options)
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

const operatorHeaders = {
  Authorization: 'Bearer operator-service-smoke-token',
  'X-Biau-Operator-Id': 'site-owner',
  'X-Biau-Operator-Email': 'owner@example.invalid',
  'X-Biau-Operator-Name': 'Smoke Owner',
}

const snapshot = snapshotEnv()

try {
  await withService('public', async (base) => {
    const health = await getJson<{ serviceMode?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.serviceMode !== 'public') throw new Error('public mode health is invalid')

    const publicChat = await postJson<{ answer?: string }>(`${base}/chat/public`, { message: 'RAG 项目' })
    if (!publicChat.response.ok || !publicChat.payload?.answer) throw new Error('public mode should expose public chat')

    const operatorMe = await fetch(`${base}/operator/me`, { headers: operatorHeaders })
    if (operatorMe.status !== 404) throw new Error(`public mode should not expose operator routes, got ${operatorMe.status}`)

    const ragHealth = await fetch(`${base}/rag/health`)
    if (ragHealth.status !== 404) throw new Error(`public mode should not expose /rag, got ${ragHealth.status}`)

    const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
    if (publicFeed.status !== 404) throw new Error(`public mode should not expose AI Daily public feed, got ${publicFeed.status}`)
  })

  await withService('operator', async (base) => {
    const health = await getJson<{ serviceMode?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.serviceMode !== 'operator') throw new Error('operator mode health is invalid')

    const publicChat = await postJson(`${base}/chat/public`, { message: 'RAG 项目' })
    if (publicChat.response.status !== 404) throw new Error(`operator mode should not expose public chat, got ${publicChat.response.status}`)

    const missingAuth = await postJson(`${base}/operator/chat`, { message: '站务任务' })
    if (missingAuth.response.status !== 401) throw new Error(`operator mode should require service auth, got ${missingAuth.response.status}`)

    const missingIdentity = await fetch(`${base}/operator/me`, {
      headers: { Authorization: 'Bearer operator-service-smoke-token' },
    })
    if (missingIdentity.status !== 403) {
      throw new Error(`operator mode should require sanitized owner identity, got ${missingIdentity.status}`)
    }

    const operatorMe = await fetch(`${base}/operator/me`, { headers: operatorHeaders })
    if (!operatorMe.ok) throw new Error(`operator mode owner identity failed: ${operatorMe.status}`)

    const operatorSessions = await fetch(`${base}/operator/sessions`, { headers: operatorHeaders })
    if (operatorSessions.status !== 503) {
      throw new Error(`operator sessions should report missing database, got ${operatorSessions.status}`)
    }

    const legacyInternalChat = await postJson(`${base}/chat/internal`, { message: '旧内部助手' })
    if (legacyInternalChat.response.status !== 404) {
      throw new Error(`operator mode must not expose legacy internal chat, got ${legacyInternalChat.response.status}`)
    }

    const legacyInviteRedeem = await postJson(`${base}/auth/redeem-invite`, { code: 'legacy' })
    if (legacyInviteRedeem.response.status !== 404) {
      throw new Error(`operator mode must not expose invite redemption, got ${legacyInviteRedeem.response.status}`)
    }

    const legacyAdmin = await fetch(`${base}/admin/invites`)
    if (legacyAdmin.status !== 404) throw new Error(`operator mode must not expose legacy admin routes, got ${legacyAdmin.status}`)

    const ragHealth = await fetch(`${base}/rag/health`)
    if (ragHealth.status !== 404) throw new Error(`operator mode should not expose /rag, got ${ragHealth.status}`)

    const studioHealth = await fetch(`${base}/studio/api/health`)
    if (studioHealth.status !== 404) throw new Error(`operator mode should not expose Studio API routes, got ${studioHealth.status}`)

    const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
    if (publicFeed.status !== 404) throw new Error(`operator mode should not expose AI Daily public feed, got ${publicFeed.status}`)
  })

  await withService('rag', async (base) => {
    const health = await getJson<{ service?: string; store?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.service !== 'biau-rag-orchestrator' || !health.payload.store) {
      throw new Error('rag mode health is invalid')
    }

    const publicChat = await postJson(`${base}/chat/public`, { message: 'RAG 项目' })
    if (publicChat.response.status !== 404) throw new Error(`rag mode should not expose chat, got ${publicChat.response.status}`)

    const operatorMe = await fetch(`${base}/operator/me`, { headers: operatorHeaders })
    if (operatorMe.status !== 404) throw new Error(`rag mode should not expose operator routes, got ${operatorMe.status}`)

    const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
    if (publicFeed.status !== 404) throw new Error(`rag mode should not expose AI Daily public feed, got ${publicFeed.status}`)

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

    const operatorMe = await fetch(`${base}/operator/me`, { headers: operatorHeaders })
    if (operatorMe.status !== 404) throw new Error(`studio mode should not expose operator routes, got ${operatorMe.status}`)

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

    const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
    if (publicFeed.status !== 503) throw new Error(`studio mode should mount AI Daily feed and report missing database, got ${publicFeed.status}`)
  })

  await withService(
    'studio',
    async (base) => {
      const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
      if (publicFeed.status !== 404) throw new Error(`disabled public feed should return 404, got ${publicFeed.status}`)
    },
    { publicFeedEnabled: false },
  )

  console.log('Assistant service mode smoke passed with owner-only Operator isolation')
} finally {
  restoreEnv(snapshot)
}
