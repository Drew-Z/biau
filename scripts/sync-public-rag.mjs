import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const DEFAULT_POLL_INTERVAL_MS = 15_000
const DEFAULT_MAX_ATTEMPTS = 60

export async function syncPublicRagAfterDeployment(input) {
  const baseUrl = normalizeBaseUrl(input.baseUrl)
  const token = String(input.token ?? '').trim()
  const expectedCommit = String(input.expectedCommit ?? '').trim()
  const expectedChecksum = String(input.expectedChecksum ?? '').trim().toLowerCase()
  if (!baseUrl || !token || !expectedCommit || !/^[a-f0-9]{64}$/u.test(expectedChecksum)) {
    throw new Error('public-rag-sync-config-invalid')
  }

  const fetcher = input.fetcher ?? fetch
  const sleep = input.sleep ?? ((durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs)))
  const maxAttempts = boundedInteger(input.maxAttempts, DEFAULT_MAX_ATTEMPTS, 1, 120)
  const pollIntervalMs = boundedInteger(input.pollIntervalMs, DEFAULT_POLL_INTERVAL_MS, 100, 60_000)

  let matchedHealth = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetcher(`${baseUrl}/health`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })
      const payload = await response.json().catch(() => null)
      if (
        response.ok &&
        isRecord(payload) &&
        payload.ok === true &&
        payload.buildCommit === expectedCommit &&
        payload.publicSourceChecksum === expectedChecksum
      ) {
        matchedHealth = payload
        break
      }
    } catch {
      // Render may still be deploying or waking; retry within the bounded window.
    }
    if (attempt < maxAttempts) await sleep(pollIntervalMs)
  }

  if (!matchedHealth) throw new Error('public-rag-deployment-not-ready')

  const response = await fetcher(`${baseUrl}/v1/sync/public`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
    signal: AbortSignal.timeout(120_000),
  })
  const payload = await response.json().catch(() => null)
  if (
    !response.ok ||
    !isRecord(payload) ||
    payload.accepted !== true ||
    payload.scope !== 'public' ||
    !isRecord(payload.diagnostics) ||
    payload.diagnostics.sourceChecksum !== expectedChecksum
  ) {
    throw new Error('public-rag-sync-rejected')
  }
  return payload
}

export async function readPublicKnowledgeChecksum(filePath = new URL('../server/data/public-knowledge-v2.json', import.meta.url)) {
  const raw = await readFile(filePath, 'utf8')
  return createHash('sha256').update(JSON.stringify(JSON.parse(raw))).digest('hex')
}

function normalizeBaseUrl(value) {
  const normalized = String(value ?? '').trim().replace(/\/+$/u, '')
  if (!normalized) return ''
  try {
    const url = new URL(normalized)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.toString().replace(/\/+$/u, '') : ''
  } catch {
    return ''
  }
}

function boundedInteger(value, fallback, minimum, maximum) {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.trunc(value))) : fallback
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

async function main() {
  const expectedChecksum = process.env.EXPECTED_SOURCE_CHECKSUM?.trim() || await readPublicKnowledgeChecksum()
  const result = await syncPublicRagAfterDeployment({
    baseUrl: process.env.PUBLIC_RAG_API_BASE_URL,
    token: process.env.RAG_SYNC_TOKEN,
    expectedCommit: process.env.EXPECTED_GIT_COMMIT || process.env.GITHUB_SHA,
    expectedChecksum,
  })
  const diagnostics = isRecord(result.diagnostics) ? result.diagnostics : {}
  console.log(JSON.stringify({
    ok: true,
    accepted: true,
    scope: 'public',
    sourceChecksum: diagnostics.sourceChecksum,
    documentCount: diagnostics.documentCount,
    chunkCount: diagnostics.chunkCount,
  }))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'public-rag-sync-failed')
    process.exitCode = 1
  })
}
