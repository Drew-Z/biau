import { normalizeStudioAiDailyWorkspace } from '../../src/data/studio.js'

const issueFixture = {
  id: 'issue-1',
  date: '2026-07-19',
  editionDate: '2026-07-19T00:00:00.000Z',
  title: 'AI Daily fixture',
  status: 'review-needed',
  workflowState: 'review-needed',
  sourceIds: ['source-1'],
  brief: { summary: 'summary', publicAngle: 'angle', keySignals: ['signal'], toVerify: ['verify'] },
  selectionVersion: 2,
  selectedEvidenceVersion: 3,
  generatedRevisionSequence: 1,
  latestGeneratedRevisionId: 'revision-1',
  newEvidenceAvailable: false,
  deployedPublicAt: null,
  draftId: 'draft-1',
  createdAt: '2026-07-19T07:00:00.000Z',
  updatedAt: '2026-07-19T07:30:00.000Z',
}

const fixture = {
  generatedAt: '2026-07-19T08:00:00.000Z',
  selectedIssue: issueFixture,
  issues: [issueFixture],
  sourceFeeds: [
    {
      id: 'feed-1',
      name: 'Official feed',
      kind: 'RSS',
      url: 'https://example.com/feed.xml',
      canonicalKey: 'feed-key',
      locale: 'zh',
      tier: 'official-primary',
      enabled: true,
      intervalMinutes: 60,
      nextCollectAt: null,
      lastAttemptedAt: null,
      lastSuccessfulAt: null,
      consecutiveFailures: 0,
      healthStatus: 'HEALTHY',
      lastLagMs: null,
      lastErrorCategory: null,
      updatedAt: '2026-07-19T07:00:00.000Z',
    },
  ],
  runs: [
    {
      id: 'run-1',
      issueId: 'issue-1',
      editionDate: '2026-07-19',
      profile: 'fixture',
      trigger: 'manual',
      attemptNumber: 1,
      eventSequence: 1,
      status: 'completed',
      currentStage: 'draft',
      configVersion: 'fixture-v1',
      startedAt: null,
      finishedAt: '2026-07-19T07:30:00.000Z',
      newestPublishedAt: null,
      lastCollectedAt: null,
      lastFetchedAt: null,
      pipelineFreshnessAt: null,
      endToEndLagMs: null,
      counters: {},
      finalErrorCategory: null,
      createdAt: '2026-07-19T07:00:00.000Z',
      updatedAt: '2026-07-19T07:30:00.000Z',
      events: [
        {
          id: 'event-1',
          sequence: 1,
          stage: 'DRAFT',
          kind: 'completed',
          outcome: 'success',
          providerRole: null,
          attemptNumber: 1,
          errorCategory: null,
          durationMs: 12,
          createdAt: '2026-07-19T07:30:00.000Z',
        },
      ],
      workItems: [],
      candidates: [
        {
          id: 'candidate-1',
          clusterId: 'cluster-1',
          sourceFeedId: 'feed-1',
          title: 'Candidate fixture',
          evidenceVersion: 2,
          updatedAt: '2026-07-19T07:20:00.000Z',
        },
      ],
      clusters: [
        {
          id: 'cluster-1',
          candidateIds: ['candidate-1', 42, ''],
          stableIdentityKey: 'fixture:cluster',
          updatedAt: '2026-07-19T07:20:00.000Z',
        },
      ],
      overrides: [
        {
          id: 'override-1',
          runId: 'run-1',
          candidateId: 'candidate-1',
          clusterId: null,
          action: 'include',
          actor: 'fixture-editor',
          reason: 'Evidence verified.',
          expectedUpdatedAt: '2026-07-19T07:20:00.000Z',
          observedVersion: 2,
          createdAt: '2026-07-19T07:21:00.000Z',
        },
        { action: 'exclude' },
      ],
    },
  ],
  flashItems: [],
  productionGeneration: {
    status: 'ready',
    enabled: true,
    issue: null,
  },
  edition: {
    issue: issueFixture,
    draft: {
      id: 'draft-1',
      slug: 'ai-daily-2026-07-19',
      title: 'AI Daily fixture',
      status: 'review-needed',
      visibility: 'hidden',
      updatedAt: '2026-07-19T07:30:00.000Z',
      latestReview: {
        status: 'pending',
        reviewedBy: 'fixture-editor',
        reviewedAt: '2026-07-19T07:31:00.000Z',
        checklist: { sourceChecked: true, safetyChecked: false, publicReady: false, ignored: 'drop-me' },
        notes: 'Awaiting safety and public readiness checks.',
      },
    },
    generatedRevisions: [
      {
        id: 'revision-1',
        revisionNumber: 1,
        revisionKind: 'editor-correction',
        sourceRevisionId: 'revision-0',
        selectionVersion: 2,
        evidenceVersion: 3,
        promptVersion: 'fixture-v1',
        schemaVersion: '1',
        modelRole: 'editor',
        modelIdentifier: 'manual-editor',
        applyState: 'pending',
        validationStatus: 'needs-editor-review',
        validationFindingCount: 1,
        validationFindings: [{ severity: 'review', code: 'editor-correction-requires-revalidation', detail: 'drop-me' }],
        projectionDraftId: 'draft-1',
        createdBy: 'fixture-editor',
        createdAt: '2026-07-19T07:25:00.000Z',
        appliedAt: null,
        observedDraftUpdatedAt: '2026-07-19T07:30:00.000Z',
        revalidatedAt: '2026-07-19T07:32:00.000Z',
        validatedBy: 'fixture-reviewer',
        discardedAt: null,
        discardedBy: null,
        discardReason: null,
        contentBlockCount: 6,
        citationCount: 2,
        content: {
          title: 'AI Daily correction fixture',
          subtitle: 'Decoder contract',
          introduction: { text: 'Correction content remains bounded.', claimIds: ['claim-1'] },
          events: [{ eventId: 'event-1', title: 'Fixture event', factSummary: { text: 'Fact', claimIds: ['claim-1'] }, whyItMatters: { text: 'Impact', claimIds: ['claim-1'] }, uncertainty: 'medium', claimIds: ['claim-1'] }],
          trends: [{ text: 'Fixture trend', claimIds: ['claim-1'] }],
        },
      },
      {
        id: 'revision-2',
        revisionNumber: 2,
        revisionKind: 'generated',
        sourceRevisionId: null,
        selectionVersion: 2,
        evidenceVersion: 3,
        promptVersion: 'fixture-v2',
        schemaVersion: '1',
        modelRole: 'composer',
        modelIdentifier: 'fixture-model',
        applyState: 'discarded',
        validationStatus: 'rejected',
        validationFindingCount: 1,
        validationFindings: [{ severity: 'critical', code: 'content-structure-invalid' }],
        projectionDraftId: null,
        createdBy: 'fixture-runner',
        createdAt: '2026-07-19T07:26:00.000Z',
        appliedAt: null,
        observedDraftUpdatedAt: null,
        revalidatedAt: '2026-07-19T07:33:00.000Z',
        validatedBy: 'fixture-reviewer',
        discardedAt: '2026-07-19T07:33:00.000Z',
        discardedBy: 'fixture-reviewer',
        discardReason: 'deterministic-revalidation-rejected',
        contentBlockCount: 0,
        citationCount: 0,
      },
      { revisionNumber: 99 },
    ],
  },
}

const workspace = normalizeStudioAiDailyWorkspace(fixture)
if (!workspace) throw new Error('workspace fixture should normalize')
if (workspace.selectedIssue?.selectionVersion !== 2) throw new Error('issue versions should be preserved')
if (workspace.runs[0]?.events[0]?.stage !== 'DRAFT') throw new Error('run event stage should be preserved')
if (workspace.runs[0]?.candidates[0]?.clusterId !== 'cluster-1') {
  throw new Error('candidate cluster membership should normalize')
}
if (JSON.stringify(workspace.runs[0]?.clusters[0]?.candidateIds) !== JSON.stringify(['candidate-1'])) {
  throw new Error('cluster candidate ids should be bounded to valid strings')
}
if (workspace.runs[0]?.overrides.length !== 1 || workspace.runs[0]?.overrides[0]?.action !== 'include') {
  throw new Error('editorial overrides should filter invalid audit entries')
}
if (workspace.sourceFeeds[0]?.healthStatus !== 'HEALTHY') throw new Error('source health should be preserved')
if (workspace.productionGeneration.status !== 'ready' || !workspace.productionGeneration.enabled) {
  throw new Error('production generation readiness should normalize')
}
if (workspace.edition?.issue.id !== 'issue-1') throw new Error('valid edition issue should normalize')
if (workspace.edition.draft?.id !== 'draft-1' || workspace.edition.draft.status !== 'review-needed') {
  throw new Error('edition draft summary should normalize')
}
const review = workspace.edition.draft.latestReview
if (!review || review.status !== 'pending' || !review.checklist.sourceChecked || review.checklist.safetyChecked) {
  throw new Error('edition latest review checklist should normalize to bounded booleans')
}
if ('ignored' in review.checklist) throw new Error('unknown review checklist keys must be dropped')
if (workspace.edition.generatedRevisions.length !== 2) throw new Error('invalid generated revisions should be filtered')
const revision = workspace.edition.generatedRevisions[0]
if (
  revision?.revisionNumber !== 1 ||
  revision.revisionKind !== 'editor-correction' ||
  revision.sourceRevisionId !== 'revision-0' ||
  revision.projectionDraftId !== 'draft-1' ||
  revision.contentBlockCount !== 6 ||
  revision.citationCount !== 2 ||
  revision.validationFindings[0]?.code !== 'editor-correction-requires-revalidation' ||
  revision.content?.events[0]?.eventId !== 'event-1' ||
  revision.revalidatedAt !== '2026-07-19T07:32:00.000Z' ||
  revision.validatedBy !== 'fixture-reviewer'
) {
  throw new Error('generated correction should preserve bounded lifecycle and content fields')
}
if ('detail' in revision.validationFindings[0]) throw new Error('unknown validation finding fields must be dropped')
const discardedRevision = workspace.edition.generatedRevisions[1]
if (
  discardedRevision?.applyState !== 'discarded' ||
  discardedRevision.discardedBy !== 'fixture-reviewer' ||
  discardedRevision.discardReason !== 'deterministic-revalidation-rejected'
) {
  throw new Error('discarded revision lifecycle should normalize')
}

console.log('Studio AI Daily workspace check passed')
