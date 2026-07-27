import { createServer as createTcpServer } from 'node:net'
import { createApp } from '../src/app.js'
import { env } from '../src/env.js'
import type { AssistantServiceMode, RagRetrieveResponse } from '../src/types.js'

interface EnvSnapshot {
  assistantServiceMode: AssistantServiceMode
  databaseUrl: string
  assistantModelApiKey: string
  assistantRagApiBaseUrl: string
  assistantRagApiKey: string
  openaiApiKey: string
  ragPublicApiKey: string
  ragSyncToken: string
  ragStoreProvider: string
  studioAdminToken: string
  studioDatabaseUrl: string
  qdrantUrl: string
  qdrantApiKey: string
  qdrantPublicCollection: string
  aiDailyPublicFeedEnabled: boolean
  aiDailyProductionGenerationEnabled: boolean
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
    databaseUrl: env.databaseUrl,
    assistantModelApiKey: env.assistantModelApiKey,
    assistantRagApiBaseUrl: env.assistantRagApiBaseUrl,
    assistantRagApiKey: env.assistantRagApiKey,
    openaiApiKey: env.openaiApiKey,
    ragPublicApiKey: env.ragPublicApiKey,
    ragSyncToken: env.ragSyncToken,
    ragStoreProvider: env.ragStoreProvider,
    studioAdminToken: env.studioAdminToken,
    studioDatabaseUrl: env.studioDatabaseUrl,
    qdrantUrl: env.qdrantUrl,
    qdrantApiKey: env.qdrantApiKey,
    qdrantPublicCollection: env.qdrantPublicCollection,
    aiDailyPublicFeedEnabled: env.aiDailyPublicFeedEnabled,
    aiDailyProductionGenerationEnabled: env.aiDailyProductionGenerationEnabled,
  }
}

function restoreEnv(snapshot: EnvSnapshot) {
  env.assistantServiceMode = snapshot.assistantServiceMode
  env.databaseUrl = snapshot.databaseUrl
  env.assistantModelApiKey = snapshot.assistantModelApiKey
  env.assistantRagApiBaseUrl = snapshot.assistantRagApiBaseUrl
  env.assistantRagApiKey = snapshot.assistantRagApiKey
  env.openaiApiKey = snapshot.openaiApiKey
  env.ragPublicApiKey = snapshot.ragPublicApiKey
  env.ragSyncToken = snapshot.ragSyncToken
  env.ragStoreProvider = snapshot.ragStoreProvider
  env.studioAdminToken = snapshot.studioAdminToken
  env.studioDatabaseUrl = snapshot.studioDatabaseUrl
  env.qdrantUrl = snapshot.qdrantUrl
  env.qdrantApiKey = snapshot.qdrantApiKey
  env.qdrantPublicCollection = snapshot.qdrantPublicCollection
  env.aiDailyPublicFeedEnabled = snapshot.aiDailyPublicFeedEnabled
  env.aiDailyProductionGenerationEnabled = snapshot.aiDailyProductionGenerationEnabled
}

async function withService(
  mode: AssistantServiceMode,
  run: (base: string) => Promise<void>,
  options: { publicFeedEnabled?: boolean } = {},
) {
  env.assistantServiceMode = mode
  env.databaseUrl = ''
  env.assistantModelApiKey = ''
  env.openaiApiKey = ''
  env.assistantRagApiBaseUrl = ''
  env.assistantRagApiKey = ''
  env.ragPublicApiKey = 'public-rag-smoke-key'
  env.ragSyncToken = 'sync-rag-smoke-token'
  env.ragStoreProvider = 'local'
  env.studioAdminToken = 'studio-smoke-token'
  env.studioDatabaseUrl = ''
  env.qdrantUrl = ''
  env.qdrantApiKey = ''
  env.qdrantPublicCollection = 'biau_public_chunks'
  env.aiDailyPublicFeedEnabled = true
  env.aiDailyProductionGenerationEnabled = false

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

const snapshot = snapshotEnv()

try {
  await withService('public', async (base) => {
    const health = await getJson<{ serviceMode?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.serviceMode !== 'public') throw new Error('public mode health is invalid')

    const publicChat = await postJson<{ answer?: string }>(`${base}/chat/public`, { message: 'RAG 项目' })
    if (!publicChat.response.ok || !publicChat.payload?.answer) throw new Error('public mode should expose public chat')

    const publicStream = await fetch(`${base}/chat/public/stream`, {
      method: 'POST',
      headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'RAG 项目', mode: 'site' }),
    })
    const publicStreamText = await publicStream.text()
    if (
      !publicStream.ok ||
      !publicStream.headers.get('Content-Type')?.includes('text/event-stream') ||
      !publicStreamText.includes('event: progress') ||
      !publicStreamText.includes('event: result')
    ) {
      throw new Error('public mode should expose the public assistant SSE transport')
    }

    const publicHistory = await postJson(`${base}/chat/public/sessions`, { sessionIds: ['public-session-1234'] })
    if (publicHistory.response.status !== 503) {
      throw new Error(`public mode should expose history and report missing persistence, got ${publicHistory.response.status}`)
    }

    const operatorMe = await fetch(`${base}/operator/me`)
    if (operatorMe.status !== 404) throw new Error(`public mode should not expose operator routes, got ${operatorMe.status}`)

    const ragHealth = await fetch(`${base}/rag/health`)
    if (ragHealth.status !== 404) throw new Error(`public mode should not expose /rag, got ${ragHealth.status}`)

    const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
    if (publicFeed.status !== 404) throw new Error(`public mode should not expose AI Daily public feed, got ${publicFeed.status}`)
  })

  await withService('rag', async (base) => {
    const health = await getJson<{ service?: string; store?: string }>(`${base}/health`)
    if (!health.response.ok || health.payload?.service !== 'biau-rag-orchestrator' || !health.payload.store) {
      throw new Error('rag mode health is invalid')
    }

    const publicChat = await postJson(`${base}/chat/public`, { message: 'RAG 项目' })
    if (publicChat.response.status !== 404) throw new Error(`rag mode should not expose chat, got ${publicChat.response.status}`)

    const publicHistory = await postJson(`${base}/chat/public/sessions`, { sessionIds: ['public-session-1234'] })
    if (publicHistory.response.status !== 404) throw new Error(`rag mode should not expose public history, got ${publicHistory.response.status}`)

    const operatorMe = await fetch(`${base}/operator/me`)
    if (operatorMe.status !== 404) throw new Error(`rag mode should not expose operator routes, got ${operatorMe.status}`)

    const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
    if (publicFeed.status !== 404) throw new Error(`rag mode should not expose AI Daily public feed, got ${publicFeed.status}`)

    const unauthorizedRetrieve = await postJson(`${base}/v1/retrieve`, { query: 'RAG 项目', scope: 'public' })
    if (unauthorizedRetrieve.response.status !== 401) throw new Error(`rag mode should require retrieve key, got ${unauthorizedRetrieve.response.status}`)

    const publicRetrieve = await postJson(`${base}/v1/retrieve`, { query: 'RAG 项目', scope: 'public' }, 'public-rag-smoke-key')
    if (!publicRetrieve.response.ok) throw new Error(`rag mode public retrieve failed: ${publicRetrieve.response.status}`)

    const internalScope = await postJson(
      `${base}/v1/retrieve`,
      { query: 'RAG 项目', scope: 'internal' },
      'public-rag-smoke-key',
    )
    if (internalScope.response.status !== 400) {
      throw new Error(`rag mode must reject retired internal scope, got ${internalScope.response.status}`)
    }

    const unauthorizedSync = await postJson(`${base}/v1/sync/public`, {})
    if (unauthorizedSync.response.status !== 401) {
      throw new Error(`rag mode should require the public sync token, got ${unauthorizedSync.response.status}`)
    }

    const forbiddenPublicPayload = await postJson(
      `${base}/v1/sync/public`,
      { scope: 'internal', documents: [{ id: 'private', title: 'Private', body: 'Private' }] },
      'sync-rag-smoke-token',
    )
    if (forbiddenPublicPayload.response.status !== 400) {
      throw new Error(`public sync must reject caller-supplied scope/documents, got ${forbiddenPublicPayload.response.status}`)
    }

    const sync = await postJson(`${base}/v1/sync/public`, {}, 'sync-rag-smoke-token')
    if (!sync.response.ok) throw new Error(`rag mode public sync failed: ${sync.response.status}`)

    env.ragSyncToken = ''
    const unconfiguredSync = await postJson(`${base}/v1/sync/public`, {}, 'sync-rag-smoke-token')
    env.ragSyncToken = 'sync-rag-smoke-token'
    if (unconfiguredSync.response.status !== 503) {
      throw new Error(`rag mode should fail closed without a sync token, got ${unconfiguredSync.response.status}`)
    }

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

    const publicHistory = await postJson(`${base}/chat/public/sessions`, { sessionIds: ['public-session-1234'] })
    if (publicHistory.response.status !== 404) throw new Error(`studio mode should not expose public history, got ${publicHistory.response.status}`)

    const operatorMe = await fetch(`${base}/operator/me`)
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

    const ingestionMissingToken = await postJson(`${base}/studio/api/ai-daily/ingestion/refresh`, {})
    if (ingestionMissingToken.response.status !== 401) {
      throw new Error(`studio ingestion refresh should require admin token, got ${ingestionMissingToken.response.status}`)
    }
    const ingestionWithoutDb = await postJson(
      `${base}/studio/api/ai-daily/ingestion/refresh`,
      {},
      'studio-smoke-token',
    )
    if (ingestionWithoutDb.response.status !== 503) {
      throw new Error(`studio ingestion refresh should report missing persistence, got ${ingestionWithoutDb.response.status}`)
    }

    const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
    if (publicFeed.status !== 503) throw new Error(`studio mode should mount AI Daily feed and report missing database, got ${publicFeed.status}`)

    const operationsMissingToken = await fetch(`${base}/studio/api/ai-daily/operations`)
    if (operationsMissingToken.status !== 401) {
      throw new Error(`studio AI Daily operations should require admin token, got ${operationsMissingToken.status}`)
    }
    const operationsWithoutDb = await fetch(`${base}/studio/api/ai-daily/operations`, {
      headers: { Authorization: 'Bearer studio-smoke-token' },
    })
    if (operationsWithoutDb.status !== 503) {
      throw new Error(`studio AI Daily operations should report missing database, got ${operationsWithoutDb.status}`)
    }

    const retentionMissingToken = await fetch(`${base}/studio/api/ai-daily/retention/dry-run`)
    if (retentionMissingToken.status !== 401) {
      throw new Error(`studio retention dry-run should require admin token, got ${retentionMissingToken.status}`)
    }
    const retentionWithoutDb = await fetch(`${base}/studio/api/ai-daily/retention/dry-run`, {
      headers: { Authorization: 'Bearer studio-smoke-token' },
    })
    if (retentionWithoutDb.status !== 503) {
      throw new Error(`studio retention dry-run should report missing database, got ${retentionWithoutDb.status}`)
    }
    const retentionMutation = await fetch(`${base}/studio/api/ai-daily/retention/dry-run?mutate=true`, {
      headers: { Authorization: 'Bearer studio-smoke-token' },
    })
    if (retentionMutation.status !== 400) {
      throw new Error(`studio retention dry-run should reject mutation requests, got ${retentionMutation.status}`)
    }

    const liveRunMissingToken = await postJson(
      `${base}/studio/api/ai-daily/issues/issue-smoke/live-run`,
      {
        actor: 'smoke-editor',
        expectedIssueUpdatedAt: '2026-07-24T00:00:00.000Z',
        confirmation: 'RUN_APPROVED_PRODUCTION_EDITION',
      },
    )
    if (liveRunMissingToken.response.status !== 401) {
      throw new Error(`studio live run should require admin token, got ${liveRunMissingToken.response.status}`)
    }
    const invalidLiveRun = await postJson(
      `${base}/studio/api/ai-daily/issues/issue-smoke/live-run`,
      { actor: 'smoke-editor', expectedIssueUpdatedAt: '2026-07-24T00:00:00.000Z', confirmation: 'NO' },
      'studio-smoke-token',
    )
    if (invalidLiveRun.response.status !== 400) {
      throw new Error(`studio live run should require explicit confirmation, got ${invalidLiveRun.response.status}`)
    }
    const liveRunWithoutDb = await postJson(
      `${base}/studio/api/ai-daily/issues/issue-smoke/live-run`,
      {
        actor: 'smoke-editor',
        expectedIssueUpdatedAt: '2026-07-24T00:00:00.000Z',
        confirmation: 'RUN_APPROVED_PRODUCTION_EDITION',
      },
      'studio-smoke-token',
    )
    if (liveRunWithoutDb.response.status !== 503) {
      throw new Error(`studio live run should report unavailable persistence, got ${liveRunWithoutDb.response.status}`)
    }
  })

  await withService(
    'studio',
    async (base) => {
      const publicFeed = await fetch(`${base}/public/ai-daily/feed`)
      if (publicFeed.status !== 404) throw new Error(`disabled public feed should return 404, got ${publicFeed.status}`)
    },
    { publicFeedEnabled: false },
  )

  console.log('Assistant service mode smoke passed with public, Studio, and public-only RAG isolation')
} finally {
  restoreEnv(snapshot)
}
