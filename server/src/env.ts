import type { AssistantServiceMode } from './types.js'
import { getAiDailyTimeZone } from './aiDailyScheduling.js'

function readFirstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return ''
}

function normalizeBaseUrl(value: string) {
  return (value || 'https://api.openai.com/v1').replace(/\/$/, '')
}

function normalizeCorsOrigin(value: string | undefined) {
  const origin = value?.trim() ?? '*'
  if (origin === '*') return origin
  return origin.replace(/\/+$/, '')
}

const assistantModelApiKey = readFirstEnv('ASSISTANT_MODEL_API_KEY', 'OPENAI_API_KEY')
const assistantModelBaseUrl = normalizeBaseUrl(readFirstEnv('ASSISTANT_MODEL_BASE_URL', 'OPENAI_BASE_URL'))
const assistantModelName = readFirstEnv('ASSISTANT_MODEL_NAME', 'OPENAI_MODEL') || 'gpt-4.1-mini'
const assistantModelProvider = readFirstEnv('ASSISTANT_MODEL_PROVIDER', 'OPENAI_PROVIDER') || 'openai-compatible'
const assistantModelChannelsJson = readFirstEnv('ASSISTANT_MODEL_CHANNELS_JSON')
const aiDailyModelRuntimeJson = readFirstEnv('AI_DAILY_MODEL_RUNTIME_JSON')
const aiDailyModelApprovalFile = readFirstEnv('AI_DAILY_MODEL_APPROVAL_FILE')
const aiDailyModelApprovalBundleHash = readFirstEnv('AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH')
const aiDailyModelEvaluationApprovalId = readFirstEnv('AI_DAILY_MODEL_EVALUATION_APPROVAL_ID')
const aiDailyTheNewsApiToken = readFirstEnv('AI_DAILY_THE_NEWS_API_TOKEN')
const publicWebSearchProvider = readFirstEnv('PUBLIC_WEB_SEARCH_PROVIDER').toLowerCase()
const publicWebSearchBaseUrl = normalizeOptionalBaseUrl(readFirstEnv('PUBLIC_WEB_SEARCH_BASE_URL'))
const publicWebSearchApiKey = readFirstEnv('PUBLIC_WEB_SEARCH_API_KEY')
const assistantRagApiBaseUrl = readFirstEnv('ASSISTANT_RAG_API_BASE_URL')
const assistantRagApiKey = readFirstEnv('ASSISTANT_RAG_API_KEY')
const assistantRagTimeoutMs = readPositiveInteger(process.env.ASSISTANT_RAG_TIMEOUT_MS, 3000)
const assistantServiceMode = readServiceMode(process.env.ASSISTANT_SERVICE_MODE)
const adminToken = process.env.ADMIN_TOKEN?.trim() ?? ''
const operatorOwnerEmails = readCsv(process.env.OPERATOR_OWNER_EMAILS)
const aiDailyPublicCorsOrigins = readOriginCsv(process.env.AI_DAILY_PUBLIC_CORS_ORIGINS)

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  renderGitCommit: readFirstEnv('RENDER_GIT_COMMIT'),
  port: Number(process.env.PORT ?? 8787),
  assistantServiceMode,
  databaseUrl: process.env.DATABASE_URL?.trim() ?? '',
  studioDatabaseUrl: process.env.STUDIO_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || '',
  corsOrigin: normalizeCorsOrigin(process.env.CORS_ORIGIN),
  trustProxy: readBoolean(process.env.TRUST_PROXY),
  assistantModelApiKey,
  assistantModelBaseUrl,
  assistantModelName,
  assistantModelProvider,
  assistantModelChannelsJson,
  aiDailyModelRuntimeJson,
  aiDailyModelApprovalFile,
  aiDailyModelApprovalBundleHash,
  aiDailyModelEvaluationApprovalId,
  aiDailyTheNewsApiEnabled: readBoolean(process.env.AI_DAILY_THE_NEWS_API_ENABLED),
  aiDailyTheNewsApiToken,
  aiDailyHotDailyEnabled: readBooleanWithDefault(process.env.AI_DAILY_HOTDAILY_ENABLED, true),
  assistantModelProtocol: readAssistantModelProtocol(process.env.ASSISTANT_MODEL_PROTOCOL),
  publicAssistantRequestTimeoutMs: readBoundedInteger(process.env.PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS, 25000, 5000, 45000),
  publicAssistantRateLimit: readBoundedInteger(process.env.PUBLIC_ASSISTANT_RATE_LIMIT, 20, 1, 120),
  publicAssistantRateWindowMs: readBoundedInteger(process.env.PUBLIC_ASSISTANT_RATE_WINDOW_MS, 60000, 10000, 3600000),
  publicAssistantRetentionDays: readBoundedInteger(process.env.PUBLIC_ASSISTANT_RETENTION_DAYS, 30, 1, 30),
  publicAssistantOperationsToken: readFirstEnv('PUBLIC_ASSISTANT_OPERATIONS_TOKEN'),
  publicWebSearchProvider,
  publicWebSearchBaseUrl,
  publicWebSearchApiKey,
  publicWebSearchTimeoutMs: readBoundedInteger(process.env.PUBLIC_WEB_SEARCH_TIMEOUT_MS, 8000, 2000, 15000),
  publicWebSearchMaxResults: readBoundedInteger(process.env.PUBLIC_WEB_SEARCH_MAX_RESULTS, 5, 1, 8),
  publicWebFetchMaxPages: readBoundedInteger(process.env.PUBLIC_WEB_FETCH_MAX_PAGES, 3, 1, 4),
  assistantRagApiBaseUrl,
  assistantRagApiKey,
  assistantRagTimeoutMs,
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || assistantModelApiKey,
  openaiBaseUrl: normalizeBaseUrl(process.env.OPENAI_BASE_URL?.trim() || assistantModelBaseUrl),
  openaiModel: process.env.OPENAI_MODEL?.trim() || assistantModelName,
  adminToken,
  studioAdminToken: process.env.STUDIO_ADMIN_TOKEN?.trim() || adminToken,
  operatorServiceToken: process.env.OPERATOR_SERVICE_TOKEN?.trim() ?? '',
  operatorOwnerId: process.env.OPERATOR_OWNER_ID?.trim() || 'site-owner',
  operatorDisplayName: process.env.OPERATOR_DISPLAY_NAME?.trim() || '站长',
  operatorOwnerEmails,
  operatorModelChannelId: process.env.OPERATOR_MODEL_CHANNEL_ID?.trim().toLowerCase() || null,
  metricsEnabled: readBoolean(process.env.METRICS_ENABLED),
  aiDailyOperationsMetricsEnabled: readBoolean(process.env.AI_DAILY_OPERATIONS_METRICS_ENABLED),
  aiDailyPublicCorsOrigins,
  aiDailyTimeZone: getAiDailyTimeZone(),
  aiDailyPublicFeedEnabled: readBooleanWithDefault(process.env.AI_DAILY_PUBLIC_FEED_ENABLED, false),
  aiDailyPublicWindowHours: readPositiveInteger(process.env.AI_DAILY_PUBLIC_WINDOW_HOURS, 72),
  aiDailyPublicStaleMinutes: readPositiveInteger(process.env.AI_DAILY_PUBLIC_STALE_MINUTES, 180),
  aiDailyPublicRateLimit: readPositiveInteger(process.env.AI_DAILY_PUBLIC_RATE_LIMIT, 60),
  aiDailyPublicRateWindowMs: readPositiveInteger(process.env.AI_DAILY_PUBLIC_RATE_WINDOW_MS, 60000),
  aiDailyBusinessEvaluationEnabled: readBoolean(process.env.AI_DAILY_BUSINESS_EVALUATION_ENABLED),
  aiDailyProductionGenerationEnabled: readBoolean(process.env.AI_DAILY_PRODUCTION_GENERATION_ENABLED),
  ragStoreProvider: readFirstEnv('RAG_STORE_PROVIDER') || 'local',
  ragDatabaseUrl: readFirstEnv('RAG_DATABASE_URL', 'SUPABASE_DATABASE_URL', 'SUPABASE_DB_URL'),
  supabaseUrl: readFirstEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: readFirstEnv('SUPABASE_SERVICE_ROLE_KEY'),
  ragPublicApiKey: readFirstEnv('RAG_PUBLIC_API_KEY'),
  ragInternalApiKey: readFirstEnv('RAG_INTERNAL_API_KEY'),
  ragSyncToken: readFirstEnv('RAG_SYNC_TOKEN'),
  qdrantUrl: normalizeOptionalBaseUrl(readFirstEnv('QDRANT_URL')),
  qdrantApiKey: readFirstEnv('QDRANT_API_KEY'),
  qdrantPublicCollection: readFirstEnv('QDRANT_PUBLIC_COLLECTION') || 'biau_public_chunks',
  qdrantPublicAlias: readFirstEnv('QDRANT_PUBLIC_ALIAS') || 'biau_public_chunks_active',
  qdrantInternalCollection: readFirstEnv('QDRANT_INTERNAL_COLLECTION') || 'biau_internal_chunks',
  embeddingBaseUrl: normalizeOptionalBaseUrl(readFirstEnv('EMBEDDING_BASE_URL')),
  embeddingApiKey: readFirstEnv('EMBEDDING_API_KEY'),
  embeddingModel: readFirstEnv('EMBEDDING_MODEL') || 'deterministic-local',
  embeddingDimension: readPositiveInteger(process.env.EMBEDDING_DIMENSION, 0),
  embeddingTimeoutMs: readPositiveInteger(process.env.EMBEDDING_TIMEOUT_MS, 20000),
  rerankerBaseUrl: normalizeOptionalBaseUrl(readFirstEnv('RERANKER_BASE_URL')),
  rerankerApiKey: readFirstEnv('RERANKER_API_KEY'),
  rerankerModel: readFirstEnv('RERANKER_MODEL'),
  rerankerTimeoutMs: readBoundedInteger(process.env.RERANKER_TIMEOUT_MS, 10000, 2000, 20000),
}

export function hasDatabase() {
  return env.databaseUrl.length > 0
}

export function hasStudioDatabase() {
  return env.studioDatabaseUrl.length > 0
}

export function hasModelProvider() {
  return (env.assistantModelApiKey || env.openaiApiKey).length > 0
}

function readBoolean(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

function readBooleanWithDefault(value: string | undefined, fallback: boolean) {
  if (!value?.trim()) return fallback
  return readBoolean(value)
}

function readServiceMode(value: string | undefined): AssistantServiceMode {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'public' || normalized === 'operator' || normalized === 'rag' || normalized === 'studio') return normalized
  return 'all'
}

function readAssistantModelProtocol(value: string | undefined): 'responses' | 'chat-completions' {
  return value?.trim().toLowerCase() === 'chat-completions' ? 'chat-completions' : 'responses'
}

function readCsv(value: string | undefined) {
  return Array.from(new Set((value ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)))
}

function readOriginCsv(value: string | undefined) {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((item) => item.trim().replace(/\/+$/u, ''))
        .filter((item) => /^https?:\/\/[^\s/]+(?::\d+)?$/iu.test(item)),
    ),
  )
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}

function readBoundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

function normalizeOptionalBaseUrl(value: string) {
  return value ? value.replace(/\/$/, '') : ''
}
