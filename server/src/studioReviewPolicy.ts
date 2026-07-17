export type StudioDraftPolicyStatus =
  | 'DRAFT'
  | 'REVIEW_NEEDED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED'

export type StudioReviewPolicyStatus = 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES' | 'REJECTED'

type StudioReviewPolicyError = 'invalid-review-transition' | 'review-checklist-incomplete'
type StudioPublishPolicyError =
  | 'draft-not-approved'
  | 'publish-review-not-approved'
  | 'publish-review-checklist-incomplete'
export type StudioPublishReportError = 'invalid-publish-export-files' | 'invalid-publish-export-checks'

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

export function evaluateStudioReviewTransition(
  draftStatus: string,
  reviewStatus: StudioReviewPolicyStatus,
  checklist: unknown,
): { ok: true; nextDraftStatus: StudioDraftPolicyStatus } | { ok: false; error: StudioReviewPolicyError } {
  const isReviewNeededTransition = draftStatus === 'REVIEW_NEEDED'
  const isApprovedRevocation = draftStatus === 'APPROVED' && (reviewStatus === 'NEEDS_CHANGES' || reviewStatus === 'REJECTED')
  if (!isReviewNeededTransition && !isApprovedRevocation) {
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

export function normalizeStudioPublishReport(
  value: unknown,
): { ok: true; report: StudioPublishReport } | { ok: false; error: StudioPublishReportError } {
  if (!isRecord(value)) return { ok: false, error: 'invalid-publish-export-checks' }

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