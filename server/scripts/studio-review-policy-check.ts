import {
  evaluatePublishExportReadiness,
  evaluateStudioReviewTransition,
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

const pending = evaluateStudioReviewTransition('REVIEW_NEEDED', 'PENDING', incompleteChecklist)
expectOk(pending, 'needs-changes resubmission')
if (pending.nextDraftStatus !== 'REVIEW_NEEDED') throw new Error('pending review should remain review-needed')

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
const validFiles = ['src/data/blog-posts/example.ts', 'src/data/blog.ts']
expectOk(
  normalizeStudioPublishReport({
    exportedFiles: validFiles,
    checks: { status: 'local-export-written', exportedAt, validationNext: ['npm.cmd run blog:check'] },
    exportedBy: 'studio-export-script',
  }),
  'local export report',
)
expectOk(
  normalizeStudioPublishReport({
    exportedFiles: validFiles,
    checks: { status: 'passed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 0 }] },
  }),
  'passed export report',
)
expectOk(
  normalizeStudioPublishReport({
    exportedFiles: validFiles,
    checks: { status: 'failed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 1 }] },
  }),
  'failed export report',
)
expectError(
  normalizeStudioPublishReport({
    exportedFiles: ['../private.txt'],
    checks: { status: 'passed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 0 }] },
  }),
  'invalid-publish-export-files',
  'publish report path traversal',
)
expectError(
  normalizeStudioPublishReport({
    exportedFiles: validFiles,
    checks: { status: 'passed', exportedAt, results: [{ command: 'npm.cmd run build', exitCode: 1 }] },
  }),
  'invalid-publish-export-checks',
  'passed report with failed check',
)
expectError(
  normalizeStudioPublishReport({
    exportedFiles: validFiles,
    checks: { status: 'local-export-written', exportedAt },
  }),
  'invalid-publish-export-checks',
  'local export report without next checks',
)

console.log('Studio review policy check passed')