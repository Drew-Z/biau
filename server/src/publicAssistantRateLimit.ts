import { randomBytes } from 'node:crypto'
import { sha256 } from './crypto.js'
import { env } from './env.js'

interface RateBucket {
  count: number
  resetAt: number
}

const salt = randomBytes(24).toString('base64url')
const buckets = new Map<string, RateBucket>()
const MAX_BUCKETS = 1_000

export function consumePublicAssistantRateLimit(identity: string, now = Date.now()) {
  const key = sha256(`${salt}:${identity}`)
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    makeBucketRoom(now, key)
    buckets.set(key, { count: 1, resetAt: now + env.publicAssistantRateWindowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  if (current.count >= env.publicAssistantRateLimit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)) }
  }
  current.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

function makeBucketRoom(now: number, incomingKey: string) {
  if (buckets.has(incomingKey)) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value
    if (typeof oldest !== 'string') break
    buckets.delete(oldest)
  }
}

export function resetPublicAssistantRateLimitForTests() {
  buckets.clear()
}

export function getPublicAssistantRateLimitBucketCountForTests() {
  return buckets.size
}
