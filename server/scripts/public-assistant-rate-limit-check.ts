import assert from 'node:assert/strict'
import { env } from '../src/env.js'
import {
  consumePublicAssistantRateLimit,
  getPublicAssistantRateLimitBucketCountForTests,
  resetPublicAssistantRateLimitForTests,
} from '../src/publicAssistantRateLimit.js'

const original = {
  publicAssistantRateLimit: env.publicAssistantRateLimit,
  publicAssistantRateWindowMs: env.publicAssistantRateWindowMs,
}

try {
  env.publicAssistantRateLimit = 2
  env.publicAssistantRateWindowMs = 60_000
  resetPublicAssistantRateLimitForTests()

  assert.equal(consumePublicAssistantRateLimit('chat:203.0.113.10', 1_000).allowed, true)
  assert.equal(consumePublicAssistantRateLimit('chat:203.0.113.10', 1_001).allowed, true)
  const blocked = consumePublicAssistantRateLimit('chat:203.0.113.10', 1_002)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.retryAfterSeconds, 60)
  assert.equal(consumePublicAssistantRateLimit('feedback:203.0.113.10', 1_002).allowed, true)

  resetPublicAssistantRateLimitForTests()
  for (let index = 0; index < 1_100; index += 1) {
    assert.equal(consumePublicAssistantRateLimit(`chat:198.51.100.${index}`, 2_000).allowed, true)
  }
  assert.equal(getPublicAssistantRateLimitBucketCountForTests(), 1_000)

  assert.equal(consumePublicAssistantRateLimit('chat:203.0.113.10', 62_001).allowed, true)
  assert(getPublicAssistantRateLimitBucketCountForTests() <= 1_000)
  console.log('Public assistant rate-limit contracts passed.')
} finally {
  resetPublicAssistantRateLimitForTests()
  Object.assign(env, original)
}
