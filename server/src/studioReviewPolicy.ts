export type StudioDraftPolicyStatus =
  | 'DRAFT'
  | 'REVIEW_NEEDED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED'

export type StudioReviewPolicyStatus = 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES' | 'REJECTED'

type StudioReviewPolicyError =
  | 'invalid-review-transition'
  | 'review-checklist-incomplete'
  | 'draft-revision-required'
type StudioDraftEditPolicyError = 'archived-draft-read-only' | 'invalid-draft-status'
export type StudioDraftVersionError = 'invalid-draft-version' | 'draft-state-changed'
type StudioArchivePolicyError =
  | 'draft-already-archived'
  | 'published-draft-archive-requires-withdrawal'
  | 'invalid-draft-status'
type StudioPublishPolicyError =
  | 'draft-not-approved'
  | 'publish-review-not-approved'
  | 'publish-review-checklist-incomplete'
export type StudioPublishReportError =
  | 'invalid-publish-export-draft'
  | 'invalid-publish-export-version'
  | 'invalid-publish-export-files'
  | 'invalid-publish-export-checks'
export type StudioPublishReportTransitionError = 'invalid-publish-export-transition'

export interface StudioLatestReviewPolicyInput {
  status: string
  checklist: unknown
}

export interface StudioPublishReportCheckResult {
  command: string
  exitCode: number | null
}

export interface StudioPublishReportChecks {
  status: 'local-export-written' | 'passed' | 'failed'
  exportedAt: string
  validationNext?: string[]
  results?: StudioPublishReportCheckResult[]
}

export interface StudioPublishReport {
  draftId: string
  reviewId: string
  draftUpdatedAt: string
  exportedFiles: string[]
  checks: StudioPublishReportChecks
  exportedBy?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readBoundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function isApprovalChecklistComplete(checklist: unknown) {
  if (!isRecord(checklist)) return false
  return checklist.sourceChecked === true && checklist.safetyChecked === true && checklist.publicReady === true
}

const studioDraftContentPatchFields = [
  'slug',
  'title',
  'column',
  'tag',
  'detail',
  'readTime',
  'bodyJson',
  'knowledgePoints',
  'projectIds',
  'visibility',
  'aiAssistance',
] as const

export function hasStudioDraftContentPatch(value: unknown) {
  return isRecord(value) && studioDraftContentPatchFields.some((field) => Object.hasOwn(value, field))
}

export function evaluateStudioDraftVersion(
  currentUpdatedAt: string,
  expectedUpdatedAt: unknown,
): { ok: true; expectedUpdatedAt: string } | { ok: false; error: StudioDraftVersionError } {
  const expected = readBoundedString(expectedUpdatedAt, 40)
  const expectedTime = Date.parse(expected)
  if (!expected || Number.isNaN(expectedTime)) return { ok: false, error: 'invalid-draft-version' }

  const currentTime = Date.parse(currentUpdatedAt)
  if (Number.isNaN(currentTime) || currentTime !== expectedTime) {
    return { ok: false, error: 'draft-state-changed' }
  }
  return { ok: true, expectedUpdatedAt: new Date(expectedTime).toISOString() }
}

export function evaluateStudioReviewTransition(
  draftStatus: string,
  reviewStatus: StudioReviewPolicyStatus,
  checklist: unknown,
  latestReviewStatus?: string | null,
  draftChangedSinceLatestReview = true,
): { ok: true; nextDraftStatus: StudioDraftPolicyStatus } | { ok: false; error: StudioReviewPolicyError } {
  if (draftStatus === 'DRAFT') {
    return reviewStatus === 'PENDING'
      ? { ok: true, nextDraftStatus: 'REVIEW_NEEDED' }
      : { ok: false, error: 'invalid-review-transition' }
  }

  const isReviewNeededTransition = draftStatus === 'REVIEW_NEEDED'
  const isApprovedRevocation = draftStatus === 'APPROVED' && (reviewStatus === 'NEEDS_CHANGES' || reviewStatus === 'REJECTED')
  if (!isReviewNeededTransition && !isApprovedRevocation) {
    return { ok: false, error: 'invalid-review-transition' }
  }

  if (isReviewNeededTransition && reviewStatus === 'PENDING') {
    if (latestReviewStatus !== 'NEEDS_CHANGES') return { ok: false, error: 'invalid-review-transition' }
    if (!draftChangedSinceLatestReview) return { ok: false, error: 'draft-revision-required' }
  }
  if (
    isReviewNeededTransition &&
    latestReviewStatus === 'NEEDS_CHANGES' &&
    reviewStatus !== 'PENDING' &&
    reviewStatus !== 'REJECTED'
  ) {
    return { ok: false, error: 'invalid-review-transition' }
  }
  if (reviewStatus === 'APPROVED' && !isApprovalChecklistComplete(checklist)) {
    return { ok: false, error: 'review-checklist-incomplete' }
  }

  if (isReviewNeededTransition) {
    return {
      ok: true,
      nextDraftStatus: reviewStatus === 'APPROVED' ? 'APPROVED' : reviewStatus === 'REJECTED' ? 'REJECTED' : 'REVIEW_NEEDED',
    }
  }

  return { ok: true, nextDraftStatus: reviewStatus === 'REJECTED' ? 'REJECTED' : 'REVIEW_NEEDED' }
}

export function evaluateStudioDraftEditTransition(
  draftStatus: string,
):
  | { ok: true; nextDraftStatus: StudioDraftPolicyStatus; createPendingReview: boolean }
  | { ok: false; error: StudioDraftEditPolicyError } {
  if (draftStatus === 'DRAFT' || draftStatus === 'REVIEW_NEEDED') {
    return { ok: true, nextDraftStatus: draftStatus, createPendingReview: false }
  }
  if (draftStatus === 'APPROVED' || draftStatus === 'PUBLISHED' || draftStatus === 'REJECTED') {
    return { ok: true, nextDraftStatus: 'REVIEW_NEEDED', createPendingReview: true }
  }
  if (draftStatus === 'ARCHIVED') return { ok: false, error: 'archived-draft-read-only' }
  return { ok: false, error: 'invalid-draft-status' }
}

export function evaluateStudioArchiveTransition(
  draftStatus: string,
): { ok: true } | { ok: false; error: StudioArchivePolicyError } {
  if (draftStatus === 'ARCHIVED') return { ok: false, error: 'draft-already-archived' }
  if (draftStatus === 'PUBLISHED') return { ok: false, error: 'published-draft-archive-requires-withdrawal' }
  if (draftStatus === 'DRAFT' || draftStatus === 'REVIEW_NEEDED' || draftStatus === 'APPROVED' || draftStatus === 'REJECTED') {
    return { ok: true }
  }
  return { ok: false, error: 'invalid-draft-status' }
}
export function evaluatePublishExportReadiness(
  draftStatus: string,
  latestReview: StudioLatestReviewPolicyInput | null,
): { ok: true } | { ok: false; error: StudioPublishPolicyError } {
  if (draftStatus !== 'APPROVED') return { ok: false, error: 'draft-not-approved' }
  if (!latestReview || latestReview.status !== 'APPROVED') {
    return { ok: false, error: 'publish-review-not-approved' }
  }
  if (!isApprovalChecklistComplete(latestReview.checklist)) {
    return { ok: false, error: 'publish-review-checklist-incomplete' }
  }
  return { ok: true }
}

export function evaluateStudioPublishReportTransition(
  currentChecks: unknown,
  nextStatus: StudioPublishReportChecks['status'],
): { ok: true } | { ok: false; error: StudioPublishReportTransitionError } {
  if (nextStatus !== 'local-export-written' && nextStatus !== 'passed' && nextStatus !== 'failed') {
    return { ok: false, error: 'invalid-publish-export-transition' }
  }
  if (!isRecord(currentChecks) || typeof currentChecks.status !== 'string') {
    return { ok: false, error: 'invalid-publish-export-transition' }
  }

  const currentStatus = currentChecks.status
  if (currentStatus === 'passed') {
    return { ok: false, error: 'invalid-publish-export-transition' }
  }
  if (
    currentStatus === 'pending-local-export' ||
    currentStatus === 'local-export-written' ||
    currentStatus === 'failed'
  ) {
    return { ok: true }
  }
  return { ok: false, error: 'invalid-publish-export-transition' }
}

export function normalizeStudioPublishReport(
  value: unknown,
): { ok: true; report: StudioPublishReport } | { ok: false; error: StudioPublishReportError } {
  if (!isRecord(value)) return { ok: false, error: 'invalid-publish-export-checks' }

  const draftId = readBoundedString(value.draftId, 120)
  if (!draftId) return { ok: false, error: 'invalid-publish-export-draft' }
  const reviewId = readBoundedString(value.reviewId, 120)
  const draftUpdatedAt = readBoundedString(value.draftUpdatedAt, 40)
  if (!reviewId || !draftUpdatedAt || Number.isNaN(new Date(draftUpdatedAt).getTime())) {
    return { ok: false, error: 'invalid-publish-export-version' }
  }

  const rawExportedFiles = readStringArray(value.exportedFiles)
  const exportedFiles = rawExportedFiles
    .map((file) => file.trim())
    .filter((file) => !file.includes('..') && !file.startsWith('/') && /^[./a-z0-9_-]+(?:\.[a-z0-9]+)?$/iu.test(file))
    .slice(0, 20)
  if (exportedFiles.length === 0 || exportedFiles.length !== rawExportedFiles.length) {
    return { ok: false, error: 'invalid-publish-export-files' }
  }

  if (!isRecord(value.checks)) return { ok: false, error: 'invalid-publish-export-checks' }
  const status = readBoundedString(value.checks.status, 40)
  if (status !== 'local-export-written' && status !== 'passed' && status !== 'failed') {
    return { ok: false, error: 'invalid-publish-export-checks' }
  }
  const exportedAt = readBoundedString(value.checks.exportedAt, 40)
  if (!exportedAt || Number.isNaN(new Date(exportedAt).getTime())) {
    return { ok: false, error: 'invalid-publish-export-checks' }
  }

  const validationNext = readStringArray(value.checks.validationNext)
    .map((command) => readBoundedString(command, 160))
    .filter(Boolean)
    .slice(0, 20)
  const results = Array.isArray(value.checks.results)
    ? value.checks.results
        .filter(isRecord)
        .map((result) => ({
          command: readBoundedString(result.command, 160),
          exitCode: typeof result.exitCode === 'number' && Number.isInteger(result.exitCode) ? result.exitCode : null,
        }))
        .filter((result) => result.command)
        .slice(0, 20)
    : []

  if (status === 'local-export-written' && validationNext.length === 0) {
    return { ok: false, error: 'invalid-publish-export-checks' }
  }
  if (status === 'passed' && (results.length === 0 || results.some((result) => result.exitCode !== 0))) {
    return { ok: false, error: 'invalid-publish-export-checks' }
  }
  if (status === 'failed' && (results.length === 0 || results.every((result) => result.exitCode === 0))) {
    return { ok: false, error: 'invalid-publish-export-checks' }
  }

  return {
    ok: true,
    report: {
      draftId,
      reviewId,
      draftUpdatedAt,
      exportedFiles,
      checks: {
        status,
        exportedAt,
        ...(validationNext.length > 0 ? { validationNext } : {}),
        ...(results.length > 0 ? { results } : {}),
      },
      exportedBy: readBoundedString(value.exportedBy, 80) || undefined,
    },
  }
}
