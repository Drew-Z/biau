import { normalizeAssistantAnswerMeta, normalizeAssistantMessage } from '../src/data/assistant'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const safeArtifact = {
  kind: 'studio-draft',
  id: 'draft_safe_01',
  slug: 'legal-rag-project-notes',
  title: 'Legal RAG 项目详情草稿',
  column: 'project-notes',
  status: 'review-needed',
  visibility: 'hidden',
  reviewRequired: true,
  href: '/studio?draft=draft_safe_01',
}

const meta = normalizeAssistantAnswerMeta({
  mode: 'fallback',
  model: 'fallback',
  provider: 'local',
  reason: 'not_configured',
  citationCount: 0,
  baseUrl: 'https://private-relay.example.invalid',
  apiKey: 'sk-secret-should-not-survive',
  prompt: 'raw prompt should not survive',
  agent: {
    mode: 'agentic-workspace',
    planner: 'mock',
    status: 'degraded',
    steps: ['plan', 'execute', 'leak-step', 'sanitize'],
    toolCount: 2,
    durationMs: 12,
    endpoint: 'https://private-agent.example.invalid',
  },
  tools: [
    {
      id: 'studio.draft',
      label: 'Studio Draft',
      permission: 'draft-write',
      status: 'completed',
      durationMs: 3,
      summary: 'Created a review-needed hidden draft.',
      errorClass: 'not_configured',
      baseUrl: 'https://private-studio.example.invalid',
      apiKey: 'sk-tool-secret-should-not-survive',
      artifacts: [
        safeArtifact,
        { ...safeArtifact, id: 'draft_other', href: '/studio?draft=draft_safe_01' },
        { ...safeArtifact, href: 'https://private.example.invalid/studio?draft=draft_safe_01' },
        { ...safeArtifact, apiKey: 'sk-artifact-secret-should-not-survive' },
      ],
    },
    {
      id: 'admin.delete-member',
      label: 'Unsafe Tool',
      permission: 'admin-write',
      status: 'completed',
      durationMs: 1,
      summary: 'This unknown tool should be dropped.',
    },
  ],
  guardrails: {
    status: 'warned',
    allowedPermissions: ['read', 'draft-write', 'root'],
    blockedPermissions: ['external-live', 'secret'],
    citationSufficiency: 'weak',
    sensitiveOutputBlocked: false,
    issues: ['Needs review', 123, 'Do not publish automatically'],
  },
})

assert(meta, 'meta should normalize')
assert(meta.agent?.steps.join(',') === 'plan,execute,sanitize', 'agent steps should use a known-step allowlist')
assert(meta.tools?.length === 1, 'unknown tools should be dropped')
assert(meta.tools?.[0]?.id === 'studio.draft', 'safe studio.draft trace should remain')
assert(meta.tools?.[0]?.artifacts?.length === 2, 'only matching same-site Studio draft artifacts should remain')
assert(meta.tools?.[0]?.artifacts?.[0]?.href === '/studio?draft=draft_safe_01', 'safe deep link should remain')
assert(meta.guardrails?.allowedPermissions.join(',') === 'read,draft-write', 'unknown allowed permissions should be dropped')
assert(meta.guardrails?.blockedPermissions.join(',') === 'external-live', 'unknown blocked permissions should be dropped')

const message = normalizeAssistantMessage({
  id: 'message-1',
  role: 'assistant',
  content: 'done',
  timestamp: new Date(0).toISOString(),
  citations: [],
  meta,
})
assert(message?.meta?.tools?.[0]?.artifacts?.[0]?.href === '/studio?draft=draft_safe_01', 'message meta should use same safe normalizer')

const serialized = JSON.stringify(meta)
for (const forbidden of [
  'baseUrl',
  'apiKey',
  'raw prompt',
  'private-relay',
  'private-agent',
  'private-studio',
  'sk-secret',
  'sk-tool-secret',
  'sk-artifact-secret',
  'admin.delete-member',
  'leak-step',
]) {
  assert(!serialized.includes(forbidden), `normalized assistant meta leaked forbidden token: ${forbidden}`)
}

console.log('Assistant meta normalizer check passed')
