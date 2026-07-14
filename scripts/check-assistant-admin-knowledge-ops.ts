import {
  getAssistantKnowledgeDocumentSyncState,
  normalizeAssistantInternalKnowledgeSyncRun,
  summarizeAssistantKnowledgeOps,
  type AssistantInternalKnowledgeDocument,
} from '../src/data/assistant'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const documents: AssistantInternalKnowledgeDocument[] = [
  {
    id: 'doc-draft',
    slug: 'draft',
    title: 'Draft',
    summary: '',
    body: 'draft body',
    tags: [],
    status: 'DRAFT',
    sourceType: 'manual',
    safetyNotes: '',
    contentHash: 'hash-draft',
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T00:00:00.000Z',
  },
  {
    id: 'doc-reviewed-unsynced',
    slug: 'reviewed-unsynced',
    title: 'Reviewed unsynced',
    summary: '',
    body: 'reviewed body',
    tags: [],
    status: 'REVIEWED',
    sourceType: 'manual',
    safetyNotes: '',
    contentHash: 'hash-reviewed',
    lastSyncedAt: null,
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T01:00:00.000Z',
  },
  {
    id: 'doc-active-stale',
    slug: 'active-stale',
    title: 'Active stale',
    summary: '',
    body: 'active body',
    tags: [],
    status: 'ACTIVE',
    sourceType: 'manual',
    safetyNotes: '',
    contentHash: 'hash-active',
    lastSyncedAt: '2026-07-07T01:00:00.000Z',
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T02:00:00.000Z',
  },
  {
    id: 'doc-reviewed-synced',
    slug: 'reviewed-synced',
    title: 'Reviewed synced',
    summary: '',
    body: 'synced body',
    tags: [],
    status: 'REVIEWED',
    sourceType: 'manual',
    safetyNotes: '',
    contentHash: 'hash-synced',
    lastSyncedAt: '2026-07-07T03:00:00.000Z',
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T02:00:00.000Z',
  },
  {
    id: 'doc-active-synced-equal-timestamps',
    slug: 'active-synced-equal-timestamps',
    title: 'Active synced with equal timestamps',
    summary: '',
    body: 'synced body',
    tags: [],
    status: 'ACTIVE',
    sourceType: 'manual',
    safetyNotes: '',
    contentHash: 'hash-synced-equal',
    lastSyncedAt: '2026-07-07T04:00:00.000Z',
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T04:00:00.000Z',
  },
]

const syncRun = normalizeAssistantInternalKnowledgeSyncRun({
  id: 'sync-1',
  status: 'SKIPPED',
  documentCount: 3,
  chunkCount: 4,
  issueCount: 0,
  startedAt: '2026-07-07T03:10:00.000Z',
  finishedAt: '2026-07-07T03:10:01.000Z',
  diagnostic: {
    mode: 'local-planned',
    scope: 'internal',
    reason: 'rag-sync-not-configured',
    accepted: false,
    documentCount: 3,
    chunkCount: 4,
    issueCount: 0,
    httpStatus: 503,
    sourceName: 'internal-knowledge-documents',
    sourceChecksum: 'public-safe-checksum',
    baseUrl: 'https://private-rag.example.invalid',
    apiKey: 'mock-secret-should-not-survive',
    rawResponse: '{"secret":true}',
  },
})

assert(syncRun, 'sync run should normalize')
assert(syncRun.diagnostic?.reason === 'rag-sync-not-configured', 'allowed reason should remain')
assert(syncRun.diagnostic?.sourceName === 'internal-knowledge-documents', 'allowed sourceName should remain')

const serializedDiagnostic = JSON.stringify(syncRun.diagnostic)
for (const forbidden of ['baseUrl', 'apiKey', 'rawResponse', 'private-rag', 'mock-secret']) {
  assert(!serializedDiagnostic.includes(forbidden), `sync diagnostic leaked forbidden field: ${forbidden}`)
}

const summary = summarizeAssistantKnowledgeOps(documents, syncRun)
assert(getAssistantKnowledgeDocumentSyncState(documents[0]) === 'ineligible', 'draft should be ineligible')
assert(getAssistantKnowledgeDocumentSyncState(documents[1]) === 'pending', 'never-synced reviewed document should be pending')
assert(getAssistantKnowledgeDocumentSyncState(documents[2]) === 'stale', 'newer content should be stale')
assert(getAssistantKnowledgeDocumentSyncState(documents[3]) === 'synced', 'older content timestamp should be synced')
assert(getAssistantKnowledgeDocumentSyncState(documents[4]) === 'synced', 'equal sync and update timestamps should be synced')
assert(summary.total === 5, 'summary should count all documents')
assert(summary.draft === 1, 'summary should count draft documents')
assert(summary.reviewed === 2, 'summary should count reviewed documents')
assert(summary.active === 2, 'summary should count active documents')
assert(summary.eligible === 4, 'summary should count reviewed/active as eligible')
assert(summary.unsyncedEligible === 1, 'summary should count never-synced eligible documents')
assert(summary.staleEligible === 1, 'summary should count stale eligible documents')
assert(summary.syncedEligible === 2, 'summary should count fresh synced eligible documents')
assert(summary.lastSyncStatus === 'SKIPPED', 'summary should expose last sync status')
assert(summary.lastSyncReason === 'rag-sync-not-configured', 'summary should expose sanitized reason')
assert(summary.lastSyncMode === 'local-planned', 'summary should expose sanitized mode')
assert(summary.lastSyncAccepted === false, 'summary should expose accepted flag')
assert(summary.lastSyncIssueCount === 0, 'summary should expose issue count')

console.log('Assistant admin knowledge ops check passed')
