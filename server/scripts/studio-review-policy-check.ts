import {
  evaluatePublishExportReadiness,
  evaluateStudioArchiveTransition,
  evaluateStudioDraftEditTransition,
  evaluateStudioDraftVersion,
  evaluateStudioPublishReportTransition,
  evaluateStudioReviewTransition,
  hasStudioDraftContentPatch,
  normalizeStudioPublishReport,
} from '../src/studioReviewPolicy.js'

function expectOk<T extends { ok: boolean }>(value: T, label: string): asserts value is T & { ok: true } {
  if (!value.ok) throw new Error(`${label} should pass: ${JSON.stringify(value)}`)
}

function expectError(value: { ok: boolean; error?: string }, error: string, label: string) {
  if (value.ok || value.error !== error) {
    throw new Error(`${label} should return ${error}: ${JSON.stringify(value)}`)
  }
}

const completeChecklist = { sourceChecked: true, safetyChecked: true, publicReady: true }
const incompleteChecklist = { sourceChecked: true, safetyChecked: true, publicReady: false }

if (hasStudioDraftContentPatch({}) || hasStudioDraftContentPatch({ updatedBy: 'editor' })) {
  throw new Error('empty or audit-only draft patches must not count as content changes')
}
if (!hasStudioDraftContentPatch({ title: 'Revised title', updatedBy: 'editor' })) {
  throw new Error('content draft patches should be detected')
}
const currentDraftVersion = '2026-07-17T00:00:00.000Z'
expectOk(evaluateStudioDraftVersion(currentDraftVersion, currentDraftVersion), 'matching draft version')
expectError(evaluateStudioDraftVersion(currentDraftVersion, ''), 'invalid-draft-version', 'missing draft version')
expectError(
  evaluateStudioDraftVersion(currentDraftVersion, '2026-07-16T23:59:59.000Z'),
  'draft-state-changed',
  'stale draft version',
)

const initialSubmission = evaluateStudioReviewTransition('DRAFT', 'PENDING', incompleteChecklist)
expectOk(initialSubmission, 'initial draft submission')
if (initialSubmission.nextDraftStatus !== 'REVIEW_NEEDED') throw new Error('initial submission should enter review-needed')
expectError(
  evaluateStudioReviewTransition('DRAFT', 'APPROVED', completeChecklist),
  'invalid-review-transition',
  'draft approval before submission',
)
expectError(
  evaluateStudioReviewTransition('REJECTED', 'PENDING', incompleteChecklist),
  'invalid-review-transition',
  'rejected draft resubmission before edit',
)
expectError(
  evaluateStudioReviewTransition('REVIEW_NEEDED', 'APPROVED', completeChecklist, 'NEEDS_CHANGES'),
  'invalid-review-transition',
  'needs-changes approval before resubmission',
)
expectError(
  evaluateStudioReviewTransition('REVIEW_NEEDED', 'PENDING', incompleteChecklist, 'PENDING'),
  'invalid-review-transition',
  'duplicate pending review cycle',
)

const pending = evaluateStudioReviewTransition('REVIEW_NEEDED', 'PENDING', incompleteChecklist, 'NEEDS_CHANGES')
expectOk(pending, 'needs-changes resubmission')
if (pending.nextDraftStatus !== 'REVIEW_NEEDED') throw new Error('pending review should remain review-needed')
expectError(
  evaluateStudioReviewTransition('REVIEW_NEEDED', 'PENDING', incompleteChecklist, 'NEEDS_CHANGES', false),
  'draft-revision-required',
  'needs-changes resubmission without saved revision',
)

const approved = evaluateStudioReviewTransition('REVIEW_NEEDED', 'APPROVED', completeChecklist)
expectOk(approved, 'evidence-complete approval')
if (approved.nextDraftStatus !== 'APPROVED') throw new Error('approved review should approve the draft')

expectError(
  evaluateStudioReviewTransition('REVIEW_NEEDED', 'APPROVED', incompleteChecklist),
  'review-checklist-incomplete',
  'approval without public readiness',
)
expectError(
  evaluateStudioReviewTransition('REVIEW_NEEDED', 'APPROVED', {
    sourceChecked: false,
    safetyChecked: true,
    publicReady: true,
  }),
  'review-checklist-incomplete',
  'approval without source verification',
)
expectError(
  evaluateStudioReviewTransition('ARCHIVED', 'APPROVED', completeChecklist),
  'invalid-review-transition',
  'archived draft approval',
)

const reopened = evaluateStudioReviewTransition('APPROVED', 'NEEDS_CHANGES', incompleteChecklist)
expectOk(reopened, 'approved draft revocation')
if (reopened.nextDraftStatus !== 'REVIEW_NEEDED') throw new Error('revoked approval should return to review-needed')

const approvedEdit = evaluateStudioDraftEditTransition('APPROVED')
expectOk(approvedEdit, 'approved draft edit')
if (approvedEdit.nextDraftStatus !== 'REVIEW_NEEDED' || !approvedEdit.createPendingReview) {
  throw new Error('approved draft edit should invalidate approval and create a pending review')
}
const reviewNeededEdit = evaluateStudioDraftEditTransition('REVIEW_NEEDED')
expectOk(reviewNeededEdit, 'review-needed draft edit')
if (reviewNeededEdit.nextDraftStatus !== 'REVIEW_NEEDED' || reviewNeededEdit.createPendingReview) {
  throw new Error('review-needed edit should preserve the current review cycle')
}
for (const status of ['REJECTED', 'PUBLISHED'] as const) {
  const edited = evaluateStudioDraftEditTransition(status)
  expectOk(edited, `${status.toLowerCase()} draft edit`)
  if (edited.nextDraftStatus !== 'REVIEW_NEEDED' || !edited.createPendingReview) {
    throw new Error(`${status.toLowerCase()} draft edit should create a new pending review`)
  }
}
expectError(evaluateStudioDraftEditTransition('ARCHIVED'), 'archived-draft-read-only', 'archived draft edit')
for (const status of ['DRAFT', 'REVIEW_NEEDED', 'APPROVED', 'REJECTED'] as const) {
  expectOk(evaluateStudioArchiveTransition(status), `${status.toLowerCase()} archive`)
}
expectError(evaluateStudioArchiveTransition('ARCHIVED'), 'draft-already-archived', 'already archived draft')
expectError(
  evaluateStudioArchiveTransition('PUBLISHED'),
  'published-draft-archive-requires-withdrawal',
  'published draft archive',
)

expectError(evaluatePublishExportReadiness('REVIEW_NEEDED', null), 'draft-not-approved', 'unapproved export')
expectError(
  evaluatePublishExportReadiness('APPROVED', { status: 'PENDING', checklist: completeChecklist }),
  'publish-review-not-approved',
  'export with pending latest review',
)
expectError(
  evaluatePublishExportReadiness('APPROVED', { status: 'APPROVED', checklist: incompleteChecklist }),
  'publish-review-checklist-incomplete',
  'export with incomplete approved review',
)
expectOk(
  evaluatePublishExportReadiness('APPROVED', { status: 'APPROVED', checklist: completeChecklist }),
  'approved export',
)

const exportedAt = '2026-07-17T00:00:00.000Z'
const draftId = 'studio-policy-draft'
const reviewId = 'studio-policy-review'
const draftUpdatedAt = '2026-07-16T23:00:00.000Z'
const validFiles = ['src/data/blog-posts/example.ts', 'src/data/blog.ts']
expectOk(
  normalizeStudioPublishReport({
    draftId,
    reviewId,
    draftUpdatedAt,
    exportedFiles: validFiles,
    checks: { status: 'local-export-written', exportedAt, validationNext: ['npm.cmd run blog:check'] },
    exportedBy: 'studio-export-script',
  }),
  'local export report',
)
expectOk(
  normalizeStudioPublishReport({
    draftId,
    reviewId,
    draftUpdatedAt,
    exportedFiles: validFiles,
    checks: { status: 'passed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 0 }] },
  }),
  'passed export report',
)
expectOk(
  normalizeStudioPublishReport({
    draftId,
    reviewId,
    draftUpdatedAt,
    exportedFiles: validFiles,
    checks: { status: 'failed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 1 }] },
  }),
  'failed export report',
)
expectError(
  normalizeStudioPublishReport({
    draftId,
    reviewId,
    draftUpdatedAt,
    exportedFiles: ['../private.txt'],
    checks: { status: 'passed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 0 }] },
  }),
  'invalid-publish-export-files',
  'publish report path traversal',
)
expectError(
  normalizeStudioPublishReport({
    draftId,
    reviewId,
    draftUpdatedAt,
    exportedFiles: validFiles,
    checks: { status: 'passed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 1 }] },
  }),
  'invalid-publish-export-checks',
  'passed report with failed check',
)
expectError(
  normalizeStudioPublishReport({
    draftId,
    reviewId,
    draftUpdatedAt,
    exportedFiles: validFiles,
    checks: { status: 'local-export-written', exportedAt },
  }),
  'invalid-publish-export-checks',
  'local export report without next checks',
)
expectError(
  normalizeStudioPublishReport({
    exportedFiles: validFiles,
    checks: { status: 'passed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 0 }] },
  }),
  'invalid-publish-export-draft',
  'publish report without draft binding',
)
expectError(
  normalizeStudioPublishReport({
    draftId,
    exportedFiles: validFiles,
    checks: { status: 'passed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 0 }] },
  }),
  'invalid-publish-export-version',
  'publish report without version binding',
)

expectOk(
  evaluateStudioPublishReportTransition({ status: 'pending-local-export' }, 'passed'),
  'pending export direct passed report',
)
expectOk(
  evaluateStudioPublishReportTransition({ status: 'failed' }, 'local-export-written'),
  'failed export retry',
)
expectError(
  evaluateStudioPublishReportTransition({ status: 'passed' }, 'passed'),
  'invalid-publish-export-transition',
  'passed export terminal report',
)
expectError(
  evaluateStudioPublishReportTransition({ status: 'passed' }, 'failed'),
  'invalid-publish-export-transition',
  'passed export regression',
)

console.log('Studio review policy check passed')
