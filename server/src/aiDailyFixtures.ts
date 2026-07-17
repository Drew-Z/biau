import type { AiDailyCitationSnapshotV2, AiDailyConfigurationInput } from './aiDailyDomain.js'

export function buildAiDailyConfigurationFixture(
  overrides: Partial<AiDailyConfigurationInput> = {},
): AiDailyConfigurationInput {
  return {
    database: true,
    fixtureData: true,
    officialFeeds: true,
    search: true,
    pageExtraction: true,
    factExtractionModel: true,
    compositionModel: true,
    verificationModel: true,
    ...overrides,
  }
}

export function buildAiDailyCitationSnapshotFixture(
  overrides: Partial<AiDailyCitationSnapshotV2> = {},
): AiDailyCitationSnapshotV2 {
  return {
    version: 2,
    sourceItemId: 'source-fixture-1',
    evidenceId: 'evidence-fixture-1',
    title: 'Fixture model release notes',
    publisher: 'Example AI Lab',
    originalUrl: 'https://example.com/releases/model?utm_source=fixture',
    canonicalUrl: 'https://example.com/releases/model',
    publishedAt: '2026-07-17T01:00:00.000Z',
    retrievedAt: '2026-07-17T02:00:00.000Z',
    excerpt: 'The fixture release adds a documented capability with a source-backed limitation.',
    locator: { heading: 'Release notes', startChar: 120, endChar: 240 },
    contentHash: 'fixture-content-hash',
    ...overrides,
  }
}

export function buildAiDailySourceFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'source-fixture-1',
    title: 'Fixture model release notes',
    url: 'https://example.com/releases/model',
    sourceName: 'Example AI Lab',
    sourceTier: 'official-primary',
    language: 'en',
    publishedAt: new Date('2026-07-17T01:00:00.000Z'),
    capturedAt: new Date('2026-07-17T02:00:00.000Z'),
    rawExcerpt: 'The fixture release adds a documented capability.',
    summary: 'A deterministic source fixture for AI Daily domain checks.',
    ...overrides,
  }
}

export function buildAiDailyIssueFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'issue-fixture-2026-07-17',
    date: '2026-07-17',
    title: 'AI Daily · 2026-07-17',
    selectionVersion: 1,
    selectedEvidenceVersion: 1,
    workflowState: 'EVIDENCE_READY',
    ...overrides,
  }
}
