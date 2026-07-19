import express from 'express'
import { Prisma, type AiDailySourceFeed } from '@prisma/client'
import { requireStudioDatabase } from './db.js'
import { env, hasStudioDatabase } from './env.js'
import { buildAiDailyIssueReadinessIssues } from './studioAiDailyReadiness.js'
import { normalizeAiDailyCitationSnapshotV2, parseAiDailyEditionDate } from './aiDailyDomain.js'
import {
  loadAiDailyIssueSources,
  approveAiDailyFlashRevision,
  createAiDailyFlashCorrection,
  rejectAiDailyFlashRevision,
  replaceAiDailyIssueSelectionInTransaction,
  toAiDailyCitationSnapshotJson,
  transitionAiDailyFlashLifecycle,
} from './aiDailyRepository.js'
import {
  aiDailySourceFeedKinds,
  aiDailySourceTiers,
  type AiDailySourceFeedKindName,
  type AiDailySourceTierName,
} from './aiDailyIngestion.js'
import {
  listAiDailySourceFeeds,
  updateAiDailySourceFeed,
  upsertAiDailySourceFeed,
} from './aiDailyIngestionRepository.js'
import { loadAiDailyWorkspace } from './studioAiDailyWorkspace.js'
import { loadAiDailyOperationsSnapshot, toAiDailyOperationsDiagnostics } from './aiDailyOperations.js'
import { loadAiDailyRetentionDryRun, parseAiDailyRetentionDryRunLimit } from './aiDailyRetention.js'
import { applyAiDailyEditorialOverride } from './aiDailyEditorialOverrideRepository.js'
import {
  applyAiDailyGeneratedRevision,
  createAiDailyGeneratedCorrection,
  discardAiDailyGeneratedRevision,
  readAiDailyEditableContent,
  revalidateAiDailyGeneratedRevision,
} from './aiDailyEditionRepository.js'
import {
  evaluatePublishExportReadiness,
  evaluateStudioArchiveTransition,
  evaluateStudioDraftEditTransition,
  evaluateStudioDraftVersion,
  evaluateStudioPublishReportTransition,
  evaluateStudioReviewTransition,
  hasStudioDraftContentPatch,
  normalizeStudioPublishReport,
  type StudioPublishReport,
} from './studioReviewPolicy.js'

const blogColumns = new Set(['knowledge', 'project-notes', 'resources', 'ai-daily', 'build-log'])
const sourceTiers = new Set([
  'official-primary',
  'official-secondary',
  'trusted-aggregator',
  'community-generated',
  'manual-candidate',
])

const draftStatusToApi = {
  DRAFT: 'draft',
  REVIEW_NEEDED: 'review-needed',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
} as const

const reviewStatusToApi = {
  PENDING: 'pending',
  APPROVED: 'approved',
  NEEDS_CHANGES: 'needs-changes',
  REJECTED: 'rejected',
} as const

const aiDailyStatusToApi = {
  SOURCE_COLLECTED: 'source-collected',
  EXTRACTED: 'extracted',
  SUMMARIZED: 'summarized',
  SYNTHESIZED: 'synthesized',
  REVIEW_NEEDED: 'review-needed',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  NEEDS_MORE_EVIDENCE: 'needs-more-evidence',
} as const

const visibilityToApi = {
  HIDDEN: 'hidden',
  FEATURED: 'featured',
  ARCHIVE: 'archive',
} as const

type StudioDraftStatus = keyof typeof draftStatusToApi
type StudioReviewStatus = keyof typeof reviewStatusToApi
type StudioVisibility = keyof typeof visibilityToApi
type StudioAiDailyStatus = keyof typeof aiDailyStatusToApi
type StudioAiDailyEditorialOverrideAction =
  | 'INCLUDE'
  | 'EXCLUDE'
  | 'REORDER'
  | 'MERGE'
  | 'SPLIT'
  | 'REQUEST_EVIDENCE'

const aiDailyEditorialOverrideActions = new Set<StudioAiDailyEditorialOverrideAction>([
  'INCLUDE',
  'EXCLUDE',
  'REORDER',
  'MERGE',
  'SPLIT',
  'REQUEST_EVIDENCE',
])

interface StudioAuthResult {
  ok: boolean
  status?: number
  error?: string
}

const reviewReadyAiDailyStatuses = new Set<StudioAiDailyStatus>(['REVIEW_NEEDED', 'APPROVED', 'PUBLISHED'])
const latestReviewQuery = {
  orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
  take: 1,
} satisfies Prisma.ContentReviewFindManyArgs

export function createStudioRouter() {
  const router = express.Router()

  router.use((req, res, next) => {
    const auth = readStudioAuth(req.headers.authorization)
    if (!auth.ok) {
      res.status(auth.status ?? 401).json({ error: auth.error ?? 'missing-studio-token' })
      return
    }
    next()
  })

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'biau-content-studio-api',
      database: hasStudioDatabase(),
      auth: 'admin-token',
      publishMode: 'static-export',
      databaseRole: env.studioDatabaseUrl && env.studioDatabaseUrl !== env.databaseUrl ? 'studio-dedicated' : 'shared-or-fallback',
    })
  })

  router.get('/content-drafts', async (_req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const drafts = await prisma.contentDraft.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 60,
        include: { reviews: latestReviewQuery },
      })
      res.json({ drafts: drafts.map(toDraftResponse) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/content-drafts', async (req, res, next) => {
    try {
      const input = readDraftInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }

      const prisma = requireStudioDatabase()
      const draft = await prisma.contentDraft.create({
        data: input.data,
        include: { reviews: latestReviewQuery },
      })
      res.status(201).json({ draft: toDraftResponse(draft) })
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        res.status(409).json({ error: 'duplicate-slug' })
        return
      }
      next(error)
    }
  })

  router.patch('/content-drafts/:id', async (req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const existing = await prisma.contentDraft.findUnique({ where: { id: req.params.id } })
      if (!existing) {
        res.status(404).json({ error: 'draft-not-found' })
        return
      }

      const input = readDraftPatch(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      if (!hasStudioDraftContentPatch(req.body)) {
        res.status(400).json({ error: 'missing-draft-content-change' })
        return
      }
      const version = evaluateStudioDraftVersion(existing.updatedAt.toISOString(), req.body?.expectedUpdatedAt)
      if (!version.ok) {
        res.status(version.error === 'invalid-draft-version' ? 400 : 409).json({ error: version.error })
        return
      }
      const transition = evaluateStudioDraftEditTransition(existing.status)
      if (!transition.ok) {
        res.status(409).json({ error: transition.error })
        return
      }
      const reviewedBy = readString(req.body?.updatedBy, 80)
      const draft = await prisma.$transaction(async (tx) => {
        const updated = await tx.contentDraft.updateMany({
          where: { id: existing.id, status: existing.status, updatedAt: new Date(version.expectedUpdatedAt) },
          data: { ...input.data, status: transition.nextDraftStatus },
        })
        if (updated.count !== 1) return null
        if (transition.createPendingReview) {
          await tx.contentReview.create({
            data: {
              draftId: existing.id,
              status: 'PENDING',
              checklistJson: { sourceChecked: false, safetyChecked: false, publicReady: false },
              notes: 'Content changed after a terminal review; a new approval is required.',
              reviewedBy,
            },
          })
        }
        return tx.contentDraft.findUnique({
          where: { id: existing.id },
          include: { reviews: latestReviewQuery },
        })
      })
      if (!draft) {
        res.status(409).json({ error: 'draft-state-changed' })
        return
      }
      res.json({ draft: toDraftResponse(draft) })
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        res.status(409).json({ error: 'duplicate-slug' })
        return
      }
      next(error)
    }
  })
  router.post('/content-drafts/:id/reviews', async (req, res, next) => {
    try {
      const reviewStatus = readReviewStatus(req.body?.status)
      if (!reviewStatus) {
        res.status(400).json({ error: 'invalid-review-status' })
        return
      }

      const prisma = requireStudioDatabase()
      const existing = await prisma.contentDraft.findUnique({
        where: { id: req.params.id },
        include: { reviews: latestReviewQuery },
      })
      if (!existing) {
        res.status(404).json({ error: 'draft-not-found' })
        return
      }

      const version = evaluateStudioDraftVersion(existing.updatedAt.toISOString(), req.body?.expectedUpdatedAt)
      if (!version.ok) {
        res.status(version.error === 'invalid-draft-version' ? 400 : 409).json({ error: version.error })
        return
      }

      const checklistJson = readChecklistJson(req.body?.checklist)
      const notes = readString(req.body?.notes, 2000)
      const reviewedBy = readString(req.body?.reviewedBy, 80)
      const latestReview = existing.reviews[0]
      const transition = evaluateStudioReviewTransition(
        existing.status,
        reviewStatus,
        checklistJson,
        latestReview?.status,
        !latestReview || existing.updatedAt.getTime() > latestReview.reviewedAt.getTime(),
      )
      if (!transition.ok) {
        res.status(409).json({ error: transition.error })
        return
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.contentDraft.updateMany({
          where: { id: existing.id, status: existing.status, updatedAt: new Date(version.expectedUpdatedAt) },
          data: { status: transition.nextDraftStatus, updatedBy: reviewedBy || undefined },
        })
        if (updated.count !== 1) return null
        const review = await tx.contentReview.create({
          data: {
            draftId: existing.id,
            status: reviewStatus,
            checklistJson,
            notes,
            reviewedBy,
          },
        })
        const draft = await tx.contentDraft.findUnique({
          where: { id: existing.id },
          include: { reviews: latestReviewQuery },
        })
        return draft ? { review, draft } : null
      })
      if (!result) {
        res.status(409).json({ error: 'draft-state-changed' })
        return
      }

      res.status(201).json({ review: toReviewResponse(result.review), draft: toDraftResponse(result.draft) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/content-drafts/:id/archive', async (req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const existing = await prisma.contentDraft.findUnique({ where: { id: req.params.id } })
      if (!existing) {
        res.status(404).json({ error: 'draft-not-found' })
        return
      }
      const version = evaluateStudioDraftVersion(existing.updatedAt.toISOString(), req.body?.expectedUpdatedAt)
      if (!version.ok) {
        res.status(version.error === 'invalid-draft-version' ? 400 : 409).json({ error: version.error })
        return
      }
      const transition = evaluateStudioArchiveTransition(existing.status)
      if (!transition.ok) {
        res.status(409).json({ error: transition.error })
        return
      }
      const updatedBy = readString(req.body?.updatedBy, 80)
      const draft = await prisma.$transaction(async (tx) => {
        const updated = await tx.contentDraft.updateMany({
          where: { id: existing.id, status: existing.status, updatedAt: new Date(version.expectedUpdatedAt) },
          data: { status: 'ARCHIVED', visibility: 'HIDDEN', updatedBy: updatedBy || undefined },
        })
        if (updated.count !== 1) return null
        return tx.contentDraft.findUnique({
          where: { id: existing.id },
          include: { reviews: latestReviewQuery },
        })
      })
      if (!draft) {
        res.status(409).json({ error: 'draft-state-changed' })
        return
      }
      res.json({ draft: toDraftResponse(draft) })
    } catch (error) {
      next(error)
    }
  })
  router.post('/content-drafts/:id/publish-exports', async (req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const existing = await prisma.contentDraft.findUnique({
        where: { id: req.params.id },
        include: { reviews: latestReviewQuery },
      })
      if (!existing) {
        res.status(404).json({ error: 'draft-not-found' })
        return
      }
      const version = evaluateStudioDraftVersion(existing.updatedAt.toISOString(), req.body?.expectedUpdatedAt)
      if (!version.ok) {
        res.status(version.error === 'invalid-draft-version' ? 400 : 409).json({ error: version.error })
        return
      }
      const latestReview = existing.reviews[0]
      const readiness = evaluatePublishExportReadiness(
        existing.status,
        latestReview ? { status: latestReview.status, checklist: latestReview.checklistJson } : null,
      )
      if (!readiness.ok) {
        res.status(409).json({ error: readiness.error })
        return
      }

      const target = readString(req.body?.target, 80) || 'static-blog-data'
      const exportedBy = readString(req.body?.exportedBy, 80)
      const publishExport = await prisma.$transaction(async (tx) => {
        const locked = await tx.contentDraft.updateMany({
          where: { id: existing.id, status: existing.status, updatedAt: new Date(version.expectedUpdatedAt) },
          data: { updatedAt: new Date(version.expectedUpdatedAt) },
        })
        if (locked.count !== 1) return null
        return tx.publishExport.create({
          data: {
            draftId: existing.id,
            reviewId: latestReview!.id,
            draftUpdatedAt: existing.updatedAt,
            target,
            exportedBy,
            exportedFilesJson: [],
            checksJson: { status: 'pending-local-export' },
          },
          include: { draft: true },
        })
      })
      if (!publishExport) {
        res.status(409).json({ error: 'draft-state-changed' })
        return
      }
      res.status(201).json({
        publishExport: toPublishExportResponse(publishExport),
      })
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        res.status(409).json({ error: 'publish-export-already-exists' })
        return
      }
      next(error)
    }
  })

  router.get('/publish-exports', async (_req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const publishExports = await prisma.publishExport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
        include: { draft: true },
      })
      res.json({ publishExports: publishExports.map(toPublishExportResponse) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/publish-exports/:id', async (req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const publishExport = await prisma.publishExport.findUnique({
        where: { id: req.params.id },
        include: { draft: true },
      })
      if (!publishExport) {
        res.status(404).json({ error: 'publish-export-not-found' })
        return
      }
      res.json({ publishExport: toPublishExportResponse(publishExport) })
    } catch (error) {
      next(error)
    }
  })

  router.patch('/publish-exports/:id', async (req, res, next) => {
    try {
      const input = readPublishExportPatch(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }

      const prisma = requireStudioDatabase()
      const existing = await prisma.publishExport.findUnique({
        where: { id: req.params.id },
        include: { draft: { include: { reviews: latestReviewQuery } } },
      })
      if (!existing) {
        res.status(404).json({ error: 'publish-export-not-found' })
        return
      }
      if (input.report.draftId !== existing.draftId) {
        res.status(409).json({ error: 'publish-export-draft-mismatch' })
        return
      }
      const boundReviewId = existing.reviewId
      const boundDraftUpdatedAt = existing.draftUpdatedAt
      if (!boundReviewId || !boundDraftUpdatedAt) {
        res.status(409).json({ error: 'publish-export-version-missing' })
        return
      }
      if (
        input.report.reviewId !== boundReviewId ||
        input.report.draftUpdatedAt !== boundDraftUpdatedAt.toISOString()
      ) {
        res.status(409).json({ error: 'publish-export-version-mismatch' })
        return
      }

      const latestReview = existing.draft.reviews[0]
      if (
        existing.draft.updatedAt.getTime() !== boundDraftUpdatedAt.getTime() ||
        latestReview?.id !== boundReviewId
      ) {
        res.status(409).json({ error: 'publish-export-stale-draft' })
        return
      }
      const readiness = evaluatePublishExportReadiness(
        existing.draft.status,
        latestReview ? { status: latestReview.status, checklist: latestReview.checklistJson } : null,
      )
      if (!readiness.ok) {
        res.status(409).json({ error: readiness.error })
        return
      }

      const result = await prisma.$transaction(async (tx) => {
        const locked = await tx.contentDraft.updateMany({
          where: {
            id: existing.draft.id,
            status: existing.draft.status,
            updatedAt: boundDraftUpdatedAt,
          },
          data: { updatedAt: boundDraftUpdatedAt },
        })
        if (locked.count !== 1) return { error: 'publish-export-stale-draft' as const }

        const current = await tx.publishExport.findUnique({ where: { id: existing.id } })
        if (!current) return { error: 'publish-export-not-found' as const }
        if (current.draftId !== input.report.draftId) return { error: 'publish-export-draft-mismatch' as const }
        if (!current.reviewId || !current.draftUpdatedAt) {
          return { error: 'publish-export-version-missing' as const }
        }
        if (
          current.reviewId !== input.report.reviewId ||
          current.draftUpdatedAt.toISOString() !== input.report.draftUpdatedAt
        ) {
          return { error: 'publish-export-version-mismatch' as const }
        }

        const currentDraft = await tx.contentDraft.findUnique({
          where: { id: current.draftId },
          include: { reviews: latestReviewQuery },
        })
        if (
          !currentDraft ||
          currentDraft.updatedAt.getTime() !== current.draftUpdatedAt.getTime() ||
          currentDraft.reviews[0]?.id !== current.reviewId
        ) {
          return { error: 'publish-export-stale-draft' as const }
        }
        const currentReadiness = evaluatePublishExportReadiness(
          currentDraft.status,
          currentDraft.reviews[0]
            ? { status: currentDraft.reviews[0].status, checklist: currentDraft.reviews[0].checklistJson }
            : null,
        )
        if (!currentReadiness.ok) return { error: currentReadiness.error }

        const reportTransition = evaluateStudioPublishReportTransition(
          current.checksJson,
          input.report.checks.status,
        )
        if (!reportTransition.ok) return { error: reportTransition.error }

        const publishExport = await tx.publishExport.update({
          where: { id: current.id },
          data: input.data,
          include: { draft: true },
        })
        return { publishExport }
      })
      if ('error' in result) {
        res.status(result.error === 'publish-export-not-found' ? 404 : 409).json({ error: result.error })
        return
      }
      res.json({ publishExport: toPublishExportResponse(result.publishExport) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/source-items', async (_req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const sources = await prisma.sourceItem.findMany({ orderBy: { updatedAt: 'desc' }, take: 80 })
      res.json({ sources: sources.map(toSourceResponse) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/source-items', async (req, res, next) => {
    try {
      const input = readSourceInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const source = await prisma.sourceItem.create({ data: input.data })
      res.status(201).json({ source: toSourceResponse(source) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/ai-daily/source-feeds', async (req, res, next) => {
    try {
      const enabled = readOptionalBooleanQuery(req.query.enabled)
      if (enabled === 'invalid') {
        res.status(400).json({ error: 'invalid-enabled-filter' })
        return
      }
      const prisma = requireStudioDatabase()
      const feeds = await listAiDailySourceFeeds(prisma, { enabled })
      res.json({ feeds: feeds.map(toAiDailySourceFeedResponse) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/ai-daily/operations', async (_req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const snapshot = await loadAiDailyOperationsSnapshot(prisma)
      res.json(toAiDailyOperationsDiagnostics(snapshot))
    } catch (error) {
      next(error)
    }
  })

  router.get('/ai-daily/retention/dry-run', async (req, res, next) => {
    try {
      if (req.query.mutate !== undefined) {
        res.status(400).json({ error: 'retention-mutation-not-supported' })
        return
      }
      const limit = parseAiDailyRetentionDryRunLimit(req.query.limit)
      const prisma = requireStudioDatabase()
      res.json(await loadAiDailyRetentionDryRun(prisma, new Date(), limit))
    } catch (error) {
      if (isErrorMessage(error, 'invalid-ai-daily-retention-limit')) {
        res.status(400).json({ error: 'invalid-ai-daily-retention-limit' })
        return
      }
      next(error)
    }
  })

  router.post('/ai-daily/source-feeds', async (req, res, next) => {
    try {
      const input = readAiDailySourceFeedInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error, issues: input.issues })
        return
      }
      const prisma = requireStudioDatabase()
      const feed = await upsertAiDailySourceFeed(prisma, input.data)
      res.status(201).json({ feed: toAiDailySourceFeedResponse(feed) })
    } catch (error) {
      if (handleAiDailySourceFeedWriteError(res, error)) return
      next(error)
    }
  })

  router.patch('/ai-daily/source-feeds/:id', async (req, res, next) => {
    try {
      const input = readAiDailySourceFeedPatch(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error, issues: input.issues })
        return
      }
      const prisma = requireStudioDatabase()
      const feed = await updateAiDailySourceFeed(prisma, { id: req.params.id, patch: input.patch })
      res.json({ feed: toAiDailySourceFeedResponse(feed) })
    } catch (error) {
      if (handleAiDailySourceFeedWriteError(res, error)) return
      next(error)
    }
  })

  router.get('/ai-daily/workspace', async (req, res, next) => {
    try {
      const issueId = readString(req.query.issueId, 120) || undefined
      const limit = readOptionalPositiveIntQuery(req.query.limit)
      if (limit === 'invalid') {
        res.status(400).json({ error: 'invalid-ai-daily-workspace-limit' })
        return
      }
      const prisma = requireStudioDatabase()
      res.json(await loadAiDailyWorkspace(prisma, { issueId, limit }))
    } catch (error) {
      if (isErrorMessage(error, 'ai-daily-issue-not-found')) {
        res.status(404).json({ error: 'ai-daily-issue-not-found' })
        return
      }
      next(error)
    }
  })

  router.post('/ai-daily/editorial-overrides', async (req, res, next) => {
    try {
      const input = readAiDailyEditorialOverrideInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const result = await applyAiDailyEditorialOverride(prisma, input.data)
      res.status(201).json(toAiDailyEditorialOverrideMutationResponse(result))
    } catch (error) {
      if (handleAiDailyEditorialOverrideError(res, error)) return
      next(error)
    }
  })

  router.post('/ai-daily/issues/:id/generated-revisions/:revisionId/corrections', async (req, res, next) => {
    try {
      const input = readAiDailyGeneratedCorrectionInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const result = await createAiDailyGeneratedCorrection(prisma, {
        issueId: readRouteParam(req.params.id),
        sourceRevisionId: readRouteParam(req.params.revisionId),
        ...input.data,
      })
      res.status(result.reused ? 200 : 201).json({ revision: toAiDailyGeneratedRevisionMutationResponse(result.revision), reused: result.reused })
    } catch (error) {
      if (handleAiDailyGeneratedRevisionWriteError(res, error)) return
      next(error)
    }
  })

  router.post('/ai-daily/issues/:id/generated-revisions/:revisionId/revalidate', async (req, res, next) => {
    try {
      const input = readAiDailyGeneratedRevisionActionInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const result = await revalidateAiDailyGeneratedRevision(prisma, {
        issueId: readRouteParam(req.params.id),
        revisionId: readRouteParam(req.params.revisionId),
        expectedRevisionNumber: input.data.expectedRevisionNumber,
        expectedIssueUpdatedAt: input.data.expectedIssueUpdatedAt,
        actor: input.data.actor,
      })
      res.json({ revision: toAiDailyGeneratedRevisionMutationResponse(result.revision) })
    } catch (error) {
      if (handleAiDailyGeneratedRevisionWriteError(res, error)) return
      next(error)
    }
  })

  router.post('/ai-daily/issues/:id/generated-revisions/:revisionId/apply', async (req, res, next) => {
    try {
      const input = readAiDailyGeneratedRevisionActionInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const result = await applyAiDailyGeneratedRevision(prisma, {
        issueId: readRouteParam(req.params.id),
        revisionId: readRouteParam(req.params.revisionId),
        expectedRevisionNumber: input.data.expectedRevisionNumber,
        expectedIssueUpdatedAt: input.data.expectedIssueUpdatedAt,
        expectedDraftUpdatedAt: input.data.expectedDraftUpdatedAt,
        actor: input.data.actor,
      })
      if (result.blocked) {
        res.status(409).json({ error: 'ai-daily-generated-revision-draft-conflict', revision: toAiDailyGeneratedRevisionMutationResponse(result.revision) })
        return
      }
      res.json({ revision: toAiDailyGeneratedRevisionMutationResponse(result.revision), draftId: result.draft.id })
    } catch (error) {
      if (handleAiDailyGeneratedRevisionWriteError(res, error)) return
      next(error)
    }
  })

  router.post('/ai-daily/issues/:id/generated-revisions/:revisionId/discard', async (req, res, next) => {
    try {
      const input = readAiDailyGeneratedRevisionActionInput(req.body, { reasonRequired: true })
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const result = await discardAiDailyGeneratedRevision(prisma, {
        issueId: readRouteParam(req.params.id),
        revisionId: readRouteParam(req.params.revisionId),
        expectedRevisionNumber: input.data.expectedRevisionNumber,
        expectedIssueUpdatedAt: input.data.expectedIssueUpdatedAt,
        actor: input.data.actor,
        reason: input.data.reason,
      })
      res.json({ revision: toAiDailyGeneratedRevisionMutationResponse(result.revision) })
    } catch (error) {
      if (handleAiDailyGeneratedRevisionWriteError(res, error)) return
      next(error)
    }
  })

  router.post('/ai-daily/flash-revisions/:id/approve', async (req, res, next) => {
    try {
      const input = readAiDailyFlashRevisionActionInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const revision = await approveAiDailyFlashRevision(prisma, {
        flashRevisionId: readRouteParam(req.params.id),
        ...input.data,
      })
      const item = await prisma.aiDailyFlashItem.findUniqueOrThrow({ where: { id: revision.flashItemId } })
      res.json({
        flashRevision: toAiDailyFlashRevisionMutationResponse(revision),
        flashItem: toAiDailyFlashItemMutationResponse(item),
      })
    } catch (error) {
      if (handleAiDailyFlashWriteError(res, error)) return
      next(error)
    }
  })

  router.post('/ai-daily/flash-revisions/:id/reject', async (req, res, next) => {
    try {
      const input = readAiDailyFlashRevisionActionInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const revision = await rejectAiDailyFlashRevision(prisma, {
        flashRevisionId: readRouteParam(req.params.id),
        ...input.data,
      })
      const item = await prisma.aiDailyFlashItem.findUniqueOrThrow({ where: { id: revision.flashItemId } })
      res.json({
        flashRevision: toAiDailyFlashRevisionMutationResponse(revision),
        flashItem: toAiDailyFlashItemMutationResponse(item),
      })
    } catch (error) {
      if (handleAiDailyFlashWriteError(res, error)) return
      next(error)
    }
  })

  router.post('/ai-daily/flash-items/:id/hold', createAiDailyFlashLifecycleHandler('HELD'))
  router.post('/ai-daily/flash-items/:id/release', createAiDailyFlashLifecycleHandler('ACTIVE'))
  router.post('/ai-daily/flash-items/:id/withdraw', createAiDailyFlashLifecycleHandler('WITHDRAWN'))

  router.post('/ai-daily/flash-items/:id/corrections', async (req, res, next) => {
    try {
      const input = readAiDailyFlashCorrectionInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const revision = await createAiDailyFlashCorrection(prisma, {
        flashItemId: readRouteParam(req.params.id),
        ...input.data,
      })
      const item = await prisma.aiDailyFlashItem.findUniqueOrThrow({ where: { id: revision.flashItemId } })
      res.status(201).json({
        flashRevision: toAiDailyFlashRevisionMutationResponse(revision),
        flashItem: toAiDailyFlashItemMutationResponse(item),
      })
    } catch (error) {
      if (handleAiDailyFlashWriteError(res, error)) return
      next(error)
    }
  })

  router.get('/ai-daily/issues', async (_req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const issues = await prisma.aiDailyIssue.findMany({ orderBy: { date: 'desc' }, take: 60 })
      res.json({ issues: issues.map(toAiDailyIssueResponse) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/ai-daily/issues', async (req, res, next) => {
    try {
      const input = readAiDailyIssueInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      if (input.sourceIds.length > 0) {
        const matchedSources = await prisma.sourceItem.count({ where: { id: { in: input.sourceIds } } })
        if (matchedSources !== input.sourceIds.length) {
          res.status(400).json({ error: 'invalid-source-ids' })
          return
        }
      }
      const issue = await prisma.$transaction(async (tx) => {
        const created = await tx.aiDailyIssue.create({
          data: { ...input.data, sourceIdsJson: [] },
        })
        if (input.sourceIds.length > 0) {
          await replaceAiDailyIssueSelectionInTransaction(tx, {
            issueId: created.id,
            sourceIds: input.sourceIds,
            selectedBy: 'studio',
            selectionReason: 'initial Studio issue selection',
          })
        }
        return tx.aiDailyIssue.findUniqueOrThrow({ where: { id: created.id } })
      })
      res.status(201).json({ issue: toAiDailyIssueResponse(issue) })
    } catch (error) {
      if (isErrorMessage(error, 'ai-daily-selection-version-conflict')) {
        res.status(409).json({ error: 'ai-daily-selection-version-conflict' })
        return
      }
      if (isPrismaError(error, 'P2002')) {
        res.status(409).json({ error: 'duplicate-ai-daily-date' })
        return
      }
      next(error)
    }
  })

  router.get('/ai-daily/issues/:id', async (req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const issue = await prisma.aiDailyIssue.findUnique({ where: { id: req.params.id } })
      if (!issue) {
        res.status(404).json({ error: 'ai-daily-issue-not-found' })
        return
      }

      const detail = await loadAiDailyIssueDetail(prisma, issue)
      res.json(detail)
    } catch (error) {
      next(error)
    }
  })

  router.patch('/ai-daily/issues/:id', async (req, res, next) => {
    try {
      const input = readAiDailyIssuePatch(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }

      const prisma = requireStudioDatabase()
      const existing = await prisma.aiDailyIssue.findUnique({ where: { id: req.params.id } })
      if (!existing) {
        res.status(404).json({ error: 'ai-daily-issue-not-found' })
        return
      }

      if (input.sourceIds) {
        const matchedSources = await prisma.sourceItem.count({ where: { id: { in: input.sourceIds } } })
        if (matchedSources !== input.sourceIds.length) {
          res.status(400).json({ error: 'invalid-source-ids' })
          return
        }
      }

      if (input.targetStatus && reviewReadyAiDailyStatuses.has(input.targetStatus)) {
        const nextSourceIds = input.sourceIds ?? jsonStringArray(existing.sourceIdsJson)
        const nextBriefJson = input.briefJson ?? existing.briefJson
        const sources = await loadSourcesByIds(prisma, nextSourceIds)
        const readinessIssues = buildAiDailyIssueReadinessIssues(nextBriefJson, sources)
        if (readinessIssues.length > 0) {
          res.status(409).json({ error: 'ai-daily-issue-not-ready', issues: readinessIssues })
          return
        }
      }

      const issue = await prisma.$transaction(async (tx) => {
        if (input.sourceIds) {
          await replaceAiDailyIssueSelectionInTransaction(tx, {
            issueId: existing.id,
            sourceIds: input.sourceIds,
            selectedBy: readString(req.body?.editorName, 80) || 'studio',
            selectionReason: 'Studio issue source update',
          })
        }
        return tx.aiDailyIssue.update({
          where: { id: existing.id },
          data: input.data,
        })
      })
      const detail = await loadAiDailyIssueDetail(prisma, issue)
      res.json(detail)
    } catch (error) {
      if (isErrorMessage(error, 'ai-daily-selection-version-conflict')) {
        res.status(409).json({ error: 'ai-daily-selection-version-conflict' })
        return
      }
      if (isPrismaError(error, 'P2002')) {
        res.status(409).json({ error: 'duplicate-ai-daily-date' })
        return
      }
      next(error)
    }
  })

  router.post('/ai-daily/issues/:id/content-draft', async (req, res, next) => {
    try {
      if (hasSensitiveValue(req.body)) {
        res.status(400).json({ error: 'sensitive-content-detected' })
        return
      }
      const expectedIssueUpdatedAt = readRequiredDate(req.body?.expectedIssueUpdatedAt)
      if (!expectedIssueUpdatedAt) {
        res.status(400).json({ error: 'invalid-ai-daily-content-draft-action' })
        return
      }
      const editorName = readString(req.body?.editorName, 80) || 'studio'
      const prisma = requireStudioDatabase()
      const issueId = readRouteParam(req.params.id)
      const { finalIssue, created } = await prisma.$transaction(async (tx) => {
        const [lockedIssue] = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "AiDailyIssue"
          WHERE "id" = ${issueId}
          FOR UPDATE
        `
        if (!lockedIssue) throw new Error('ai-daily-issue-not-found')
        const issue = await tx.aiDailyIssue.findUnique({ where: { id: issueId } })
        if (!issue) throw new Error('ai-daily-issue-not-found')
        if (issue.updatedAt.getTime() !== expectedIssueUpdatedAt.getTime()) {
          throw new Error('ai-daily-generated-issue-conflict')
        }
        const sources = (await loadAiDailyIssueSources(tx, issue.id)).sources
        if (sources.length === 0) throw new Error('ai-daily-issue-needs-sources')
        const readinessIssues = buildAiDailyIssueReadinessIssues(issue.briefJson, sources)
        if (readinessIssues.length > 0) {
          const error = new Error('ai-daily-issue-not-ready') as Error & { readinessIssues?: unknown }
          error.readinessIssues = readinessIssues
          throw error
        }
        const slug = slugFromIssueDate(issue.date)
        const linkedDraft = issue.draftId ? await tx.contentDraft.findUnique({ where: { id: issue.draftId } }) : null
        const existingSlugDraft = linkedDraft ? null : await tx.contentDraft.findUnique({ where: { slug } })
        if (linkedDraft || existingSlugDraft) {
          const draft = linkedDraft ?? existingSlugDraft
          if (!draft || draft.column !== 'ai-daily') throw new Error('duplicate-slug')
          const updatedIssue = await tx.aiDailyIssue.update({
            where: { id: issue.id },
            data: { draftId: draft.id, status: 'REVIEW_NEEDED', workflowState: 'REVIEW_NEEDED' },
          })
          return { finalIssue: updatedIssue, created: false }
        }
        const draftData = buildAiDailyDraftInput(issue, sources, editorName)
        const draft = await tx.contentDraft.create({
          data: draftData,
        })
        const nextIssue = await tx.aiDailyIssue.update({
          where: { id: issue.id },
          data: { draftId: draft.id, status: 'REVIEW_NEEDED', workflowState: 'REVIEW_NEEDED' },
        })
        return { finalIssue: nextIssue, created: true }
      })
      res.status(created ? 201 : 200).json(await loadAiDailyIssueDetail(prisma, finalIssue))
    } catch (error) {
      if (isErrorMessage(error, 'ai-daily-issue-needs-sources')) {
        res.status(409).json({ error: 'ai-daily-issue-needs-sources' })
        return
      }
      if (isErrorMessage(error, 'ai-daily-issue-not-ready')) {
        const readinessIssues = error instanceof Error && 'readinessIssues' in error
          ? (error as Error & { readinessIssues?: unknown }).readinessIssues
          : undefined
        res.status(409).json({ error: 'ai-daily-issue-not-ready', ...(readinessIssues ? { issues: readinessIssues } : {}) })
        return
      }
      if (isErrorMessage(error, 'duplicate-slug')) {
        res.status(409).json({ error: 'duplicate-slug' })
        return
      }
      if (isPrismaError(error, 'P2002')) {
        res.status(409).json({ error: 'duplicate-slug' })
        return
      }
      if (handleAiDailyGeneratedRevisionWriteError(res, error)) return
      next(error)
    }
  })

  return router
}

function readStudioAuth(header: string | undefined): StudioAuthResult {
  if (!env.studioAdminToken) return { ok: false, status: 503, error: 'studio-auth-not-configured' }
  if (!header?.startsWith('Bearer ')) return { ok: false, status: 401, error: 'missing-studio-token' }
  const token = header.slice('Bearer '.length).trim()
  if (token !== env.studioAdminToken) return { ok: false, status: 401, error: 'missing-studio-token' }
  return { ok: true }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) && value.length >= 3 && value.length <= 96
}

function isPublicUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function readStringArrayJson(value: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(value)) return []
  return value.map((item) => readString(item, 80)).filter(Boolean)
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => readString(item, 240)).filter(Boolean)
}

function readOptionalBooleanQuery(value: unknown): boolean | undefined | 'invalid' {
  if (value === undefined) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  return 'invalid'
}

function readOptionalPositiveIntQuery(value: unknown): number | undefined | 'invalid' {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !/^\d+$/u.test(value)) return 'invalid'
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 40 ? parsed : 'invalid'
}

function readRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function readBodyJson(value: unknown): Prisma.InputJsonValue {
  if (!isRecord(value) || !Array.isArray(value.blocks)) return { blocks: [] }
  return {
    blocks: value.blocks
      .filter(isRecord)
      .map((block) => {
        const citationSnapshot = normalizeAiDailyCitationSnapshotV2(block.citationSnapshot)
        return {
          type: readString(block.type, 40) || 'paragraph',
          text: readString(block.text, 6000),
          level: typeof block.level === 'number' ? block.level : undefined,
          items: Array.isArray(block.items) ? block.items.map((item) => readString(item, 1000)).filter(Boolean) : undefined,
          src: readString(block.src, 500) || undefined,
          alt: readString(block.alt, 160) || undefined,
          caption: readString(block.caption, 300) || undefined,
          mermaid: readString(block.mermaid, 6000) || undefined,
          sourceItemId: readString(block.sourceItemId, 120) || undefined,
          citationSnapshot: citationSnapshot.ok
            ? toAiDailyCitationSnapshotJson(citationSnapshot.snapshot)
            : undefined,
        }
      }),
  }
}

function hasSensitiveValue(value: unknown) {
  const text = JSON.stringify(value).toLowerCase()
  return /(api[_-]?key|secret|bearer\s+[a-z0-9._-]+|database_url|postgres:\/\/|mysql:\/\/|mongodb:\/\/|-----begin [a-z ]*private key|sk-[a-z0-9]{12,})/iu.test(text)
}

function readDraftInput(value: unknown):
  | { data: Prisma.ContentDraftCreateInput }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-draft-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }

  const slug = readString(value.slug, 96)
  const title = readString(value.title, 160)
  const column = readString(value.column, 40)
  const tag = readString(value.tag, 40) || '知识积累'
  const detail = readString(value.detail, 600)
  if (!isValidSlug(slug)) return { error: 'invalid-slug' }
  if (!title) return { error: 'missing-title' }
  if (!blogColumns.has(column)) return { error: 'invalid-column' }
  if (!detail) return { error: 'missing-detail' }

  return {
    data: {
      slug,
      title,
      column,
      tag,
      detail,
      readTime: readString(value.readTime, 24) || '8 min',
      bodyJson: readBodyJson(value.bodyJson),
      knowledgePoints: readStringArrayJson(value.knowledgePoints),
      projectIds: readStringArrayJson(value.projectIds),
      visibility: readVisibility(value.visibility),
      aiAssistance: readString(value.aiAssistance, 40) || 'none',
      createdBy: readString(value.createdBy, 80) || undefined,
      updatedBy: readString(value.updatedBy, 80) || undefined,
    },
  }
}

function readDraftPatch(value: unknown):
  | { data: Prisma.ContentDraftUpdateManyMutationInput }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-draft-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }

  const data: Prisma.ContentDraftUpdateManyMutationInput = {}
  if ('slug' in value) {
    const slug = readString(value.slug, 96)
    if (!isValidSlug(slug)) return { error: 'invalid-slug' }
    data.slug = slug
  }
  if ('title' in value) {
    const title = readString(value.title, 160)
    if (!title) return { error: 'missing-title' }
    data.title = title
  }
  if ('column' in value) {
    const column = readString(value.column, 40)
    if (!blogColumns.has(column)) return { error: 'invalid-column' }
    data.column = column
  }
  if ('tag' in value) data.tag = readString(value.tag, 40) || '知识积累'
  if ('detail' in value) {
    const detail = readString(value.detail, 600)
    if (!detail) return { error: 'missing-detail' }
    data.detail = detail
  }
  if ('readTime' in value) data.readTime = readString(value.readTime, 24) || '8 min'
  if ('bodyJson' in value) data.bodyJson = readBodyJson(value.bodyJson)
  if ('knowledgePoints' in value) data.knowledgePoints = readStringArrayJson(value.knowledgePoints)
  if ('projectIds' in value) data.projectIds = readStringArrayJson(value.projectIds)
  if ('visibility' in value) data.visibility = readVisibility(value.visibility)
  if ('aiAssistance' in value) data.aiAssistance = readString(value.aiAssistance, 40) || 'none'
  if ('updatedBy' in value) data.updatedBy = readString(value.updatedBy, 80) || undefined
  return { data }
}

function readVisibility(value: unknown): StudioVisibility {
  if (value === 'featured' || value === 'FEATURED') return 'FEATURED'
  if (value === 'archive' || value === 'ARCHIVE') return 'ARCHIVE'
  return 'HIDDEN'
}

function readReviewStatus(value: unknown): StudioReviewStatus | null {
  if (value === 'approved' || value === 'APPROVED') return 'APPROVED'
  if (value === 'needs-changes' || value === 'NEEDS_CHANGES') return 'NEEDS_CHANGES'
  if (value === 'rejected' || value === 'REJECTED') return 'REJECTED'
  if (value === 'pending' || value === 'PENDING') return 'PENDING'
  return null
}

function readChecklistJson(value: unknown): Prisma.InputJsonValue {
  if (!isRecord(value)) return { sourceChecked: false, safetyChecked: false, publicReady: false }
  const pageKind = readString(value.pageKind, 60)
  const pageExportTarget = readString(value.pageExportTarget, 120)
  const pageChecks = jsonStringArray(value.pageChecks).slice(0, 12)
  return {
    sourceChecked: value.sourceChecked === true,
    safetyChecked: value.safetyChecked === true,
    publicReady: value.publicReady === true,
    ...(pageKind ? { pageKind } : {}),
    ...(pageExportTarget ? { pageExportTarget } : {}),
    ...(pageChecks.length > 0 ? { pageChecks } : {}),
  }
}

function readSourceInput(value: unknown):
  | { data: Prisma.SourceItemCreateInput }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-source-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }

  const title = readString(value.title, 180)
  const url = readString(value.url, 500)
  const sourceName = readString(value.sourceName, 120)
  const sourceTier = readString(value.sourceTier, 60)
  if (!title) return { error: 'missing-title' }
  if (!isPublicUrl(url)) return { error: 'invalid-url' }
  if (!sourceName) return { error: 'missing-source-name' }
  if (!sourceTiers.has(sourceTier)) return { error: 'invalid-source-tier' }

  return {
    data: {
      title,
      url,
      sourceName,
      sourceTier,
      language: readString(value.language, 20) || 'zh',
      publishedAt: readOptionalDate(value.publishedAt),
      rawExcerpt: readString(value.rawExcerpt, 3000) || undefined,
      summary: readString(value.summary, 1200),
      tagsJson: readStringArrayJson(value.tags),
      riskFlagsJson: readStringArrayJson(value.riskFlags),
    },
  }
}

function readAiDailySourceFeedInput(value: unknown):
  | {
      data: Parameters<typeof upsertAiDailySourceFeed>[1]
    }
  | { error: string; issues: string[] } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-source-feed', issues: ['payload-invalid'] }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected', issues: [] }
  const kind = readAiDailySourceFeedKind(value.kind)
  const tier = readAiDailySourceTier(value.tier)
  const intervalMinutes = readOptionalInteger(value.intervalMinutes)
  const lookbackMinutes = readOptionalInteger(value.lookbackMinutes)
  const issues: string[] = []
  if (!kind) issues.push('kind-invalid')
  if (!tier) issues.push('tier-invalid')
  if (intervalMinutes === 'invalid') issues.push('interval-minutes-invalid')
  if (lookbackMinutes === 'invalid') issues.push('lookback-minutes-invalid')
  if (typeof value.enabled !== 'undefined' && typeof value.enabled !== 'boolean') issues.push('enabled-invalid')
  if (issues.length > 0 || !kind || !tier) return { error: 'invalid-ai-daily-source-feed', issues }
  return {
    data: {
      name: readString(value.name, 160),
      kind,
      url: readString(value.url, 500),
      locale: readString(value.locale, 20) || undefined,
      tier,
      topics: dedupeStrings(readStringArray(value.topics)).slice(0, 12),
      enabled: typeof value.enabled === 'boolean' ? value.enabled : undefined,
      intervalMinutes: intervalMinutes === 'invalid' ? undefined : intervalMinutes,
      lookbackMinutes: lookbackMinutes === 'invalid' ? undefined : lookbackMinutes,
      officialDomain: 'officialDomain' in value ? readString(value.officialDomain, 253) || null : undefined,
    },
  }
}

function readAiDailySourceFeedPatch(value: unknown):
  | { patch: Partial<Parameters<typeof upsertAiDailySourceFeed>[1]> }
  | { error: string; issues: string[] } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-source-feed-patch', issues: ['payload-invalid'] }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected', issues: [] }
  const allowed = new Set([
    'name',
    'kind',
    'url',
    'locale',
    'tier',
    'topics',
    'enabled',
    'intervalMinutes',
    'lookbackMinutes',
    'officialDomain',
  ])
  const present = Object.keys(value).filter((key) => allowed.has(key))
  if (present.length === 0) return { error: 'invalid-ai-daily-source-feed-patch', issues: ['patch-empty'] }
  const patch: Partial<Parameters<typeof upsertAiDailySourceFeed>[1]> = {}
  const issues: string[] = []
  if ('name' in value) patch.name = readString(value.name, 160)
  if ('kind' in value) {
    const kind = readAiDailySourceFeedKind(value.kind)
    if (kind) patch.kind = kind
    else issues.push('kind-invalid')
  }
  if ('url' in value) patch.url = readString(value.url, 500)
  if ('locale' in value) patch.locale = readString(value.locale, 20)
  if ('tier' in value) {
    const tier = readAiDailySourceTier(value.tier)
    if (tier) patch.tier = tier
    else issues.push('tier-invalid')
  }
  if ('topics' in value) patch.topics = dedupeStrings(readStringArray(value.topics)).slice(0, 12)
  if ('enabled' in value) {
    if (typeof value.enabled === 'boolean') patch.enabled = value.enabled
    else issues.push('enabled-invalid')
  }
  if ('intervalMinutes' in value) {
    const intervalMinutes = readOptionalInteger(value.intervalMinutes)
    if (intervalMinutes === 'invalid' || intervalMinutes === undefined) issues.push('interval-minutes-invalid')
    else patch.intervalMinutes = intervalMinutes
  }
  if ('lookbackMinutes' in value) {
    const lookbackMinutes = readOptionalInteger(value.lookbackMinutes)
    if (lookbackMinutes === 'invalid' || lookbackMinutes === undefined) issues.push('lookback-minutes-invalid')
    else patch.lookbackMinutes = lookbackMinutes
  }
  if ('officialDomain' in value) patch.officialDomain = readString(value.officialDomain, 253) || null
  return issues.length > 0 ? { error: 'invalid-ai-daily-source-feed-patch', issues } : { patch }
}

function readAiDailySourceFeedKind(value: unknown): AiDailySourceFeedKindName | null {
  const kind = readString(value, 40).toUpperCase() as AiDailySourceFeedKindName
  return aiDailySourceFeedKinds.includes(kind) ? kind : null
}

function readAiDailySourceTier(value: unknown): AiDailySourceTierName | null {
  const tier = readString(value, 40).toUpperCase() as AiDailySourceTierName
  return aiDailySourceTiers.includes(tier) ? tier : null
}

function readOptionalInteger(value: unknown): number | undefined | 'invalid' {
  if (value === undefined) return undefined
  return typeof value === 'number' && Number.isInteger(value) ? value : 'invalid'
}

function toAiDailySourceFeedResponse(feed: AiDailySourceFeed) {
  return {
    id: feed.id,
    name: feed.name,
    kind: feed.kind,
    url: feed.url,
    locale: feed.locale,
    tier: feed.tier,
    topics: jsonStringArray(feed.topicsJson),
    enabled: feed.enabled,
    intervalMinutes: feed.intervalMinutes,
    lookbackMinutes: feed.lookbackMinutes,
    officialDomain: feed.officialDomain,
    healthStatus: feed.healthStatus.toLowerCase(),
    lastAttemptedAt: feed.lastAttemptedAt?.toISOString() ?? null,
    lastSuccessfulAt: feed.lastSuccessfulAt?.toISOString() ?? null,
    nextCollectAt: feed.nextCollectAt?.toISOString() ?? null,
    consecutiveFailures: feed.consecutiveFailures,
    lastLagMs: feed.lastLagMs,
    lastErrorCategory: feed.lastErrorCategory,
    updatedAt: feed.updatedAt.toISOString(),
  }
}

function handleAiDailySourceFeedWriteError(res: express.Response, error: unknown) {
  if (isErrorMessage(error, 'ai-daily-source-feed-not-found')) {
    res.status(404).json({ error: 'ai-daily-source-feed-not-found' })
    return true
  }
  if (isErrorMessage(error, 'invalid-ai-daily-source-feed')) {
    const issues = error instanceof Error ? error.message.split(':')[1]?.split(',').filter(Boolean) ?? [] : []
    res.status(400).json({ error: 'invalid-ai-daily-source-feed', issues })
    return true
  }
  if (isPrismaError(error, 'P2002')) {
    res.status(409).json({ error: 'duplicate-ai-daily-source-feed' })
    return true
  }
  return false
}

function readAiDailyEditorialOverrideInput(value: unknown):
  | {
      data: {
        action: StudioAiDailyEditorialOverrideAction
        runId: string
        actor: string
        reason?: string
        expectedUpdatedAt: Date
        candidateId?: string
        clusterId?: string
        secondaryClusterId?: string
        secondaryExpectedUpdatedAt?: Date
        orderedClusterIds?: string[]
        splitCandidateIds?: string[]
        splitStableIdentityKey?: string
        observedEvidenceVersion?: number
      }
    }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-editorial-override' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }
  const actionValue = readString(value.action, 40).toUpperCase() as StudioAiDailyEditorialOverrideAction
  const runId = readString(value.runId, 120)
  const actor = readString(value.actor, 80)
  const reason = readString(value.reason, 1000)
  const expectedUpdatedAt = readRequiredDate(value.expectedUpdatedAt)
  const candidateId = readString(value.candidateId, 120)
  const clusterId = readString(value.clusterId, 120)
  const secondaryClusterId = readString(value.secondaryClusterId, 120)
  const secondaryExpectedUpdatedAt = value.secondaryExpectedUpdatedAt === undefined
    ? undefined
    : readRequiredDate(value.secondaryExpectedUpdatedAt)
  const observedEvidenceVersion = readOptionalNonNegativeInteger(value.observedEvidenceVersion)
  const orderedClusterIds = readBoundedStringArray(value.orderedClusterIds, 40, 120)
  const splitCandidateIds = readBoundedStringArray(value.splitCandidateIds, 40, 120)
  const splitStableIdentityKey = readString(value.splitStableIdentityKey, 160)
  if (
    !aiDailyEditorialOverrideActions.has(actionValue) ||
    !runId ||
    !actor ||
    !expectedUpdatedAt ||
    secondaryExpectedUpdatedAt === null ||
    observedEvidenceVersion === 'invalid'
  ) {
    return { error: 'invalid-ai-daily-editorial-override' }
  }
  if (['INCLUDE', 'EXCLUDE', 'REQUEST_EVIDENCE'].includes(actionValue) && !candidateId) {
    return { error: 'invalid-ai-daily-editorial-override' }
  }
  if (actionValue === 'REORDER' && orderedClusterIds.length === 0) {
    return { error: 'invalid-ai-daily-editorial-override' }
  }
  if (
    actionValue === 'MERGE' &&
    (!clusterId || !secondaryClusterId || !secondaryExpectedUpdatedAt)
  ) {
    return { error: 'invalid-ai-daily-editorial-override' }
  }
  if (
    actionValue === 'SPLIT' &&
    (!clusterId || splitCandidateIds.length === 0 || !/^[a-z0-9][a-z0-9:_-]{2,159}$/u.test(splitStableIdentityKey))
  ) {
    return { error: 'invalid-ai-daily-editorial-override' }
  }
  return {
    data: {
      action: actionValue,
      runId,
      actor,
      reason: reason || undefined,
      expectedUpdatedAt,
      candidateId: candidateId || undefined,
      clusterId: clusterId || undefined,
      secondaryClusterId: secondaryClusterId || undefined,
      secondaryExpectedUpdatedAt: secondaryExpectedUpdatedAt ?? undefined,
      orderedClusterIds: orderedClusterIds.length > 0 ? orderedClusterIds : undefined,
      splitCandidateIds: splitCandidateIds.length > 0 ? splitCandidateIds : undefined,
      splitStableIdentityKey: splitStableIdentityKey || undefined,
      observedEvidenceVersion: observedEvidenceVersion === undefined ? undefined : observedEvidenceVersion,
    },
  }
}

function readRequiredDate(value: unknown) {
  const text = readString(value, 40)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function readOptionalNonNegativeInteger(value: unknown): number | undefined | 'invalid' {
  if (value === undefined) return undefined
  return readRequiredNonNegativeInteger(value) ?? 'invalid'
}

function readBoundedStringArray(value: unknown, limit: number, maxLength: number) {
  if (!Array.isArray(value)) return []
  return dedupeStrings(value.map((item) => readString(item, maxLength)).filter(Boolean)).slice(0, limit)
}

function readAiDailyGeneratedCorrectionInput(value: unknown):
  | {
      data: {
        actor: string
        reason?: string
        expectedRevisionNumber: number
        expectedIssueUpdatedAt: Date
        idempotencyKey: string
        content: NonNullable<ReturnType<typeof readAiDailyEditableContent>>
      }
    }
  | { error: string } {
  if (!isRecord(value) || hasSensitiveValue(value)) return { error: 'invalid-ai-daily-generated-correction' }
  const actor = readString(value.actor, 80)
  const reason = readString(value.reason, 1000)
  const expectedRevisionNumber = readRequiredNonNegativeInteger(value.expectedRevisionNumber)
  const expectedIssueUpdatedAt = readRequiredDate(value.expectedIssueUpdatedAt)
  const idempotencyKey = readString(value.idempotencyKey, 120)
  const content = readAiDailyEditableContent(value.content)
  if (
    !actor ||
    expectedRevisionNumber === null ||
    expectedRevisionNumber < 1 ||
    !expectedIssueUpdatedAt ||
    !/^[a-z0-9][a-z0-9:_-]{7,119}$/iu.test(idempotencyKey) ||
    !content
  ) {
    return { error: 'invalid-ai-daily-generated-correction' }
  }
  return { data: { actor, reason: reason || undefined, expectedRevisionNumber, expectedIssueUpdatedAt, idempotencyKey, content } }
}

function readAiDailyGeneratedRevisionActionInput(
  value: unknown,
  options: { reasonRequired?: boolean } = {},
):
  | {
      data: {
        actor: string
        reason?: string
        expectedRevisionNumber: number
        expectedIssueUpdatedAt: Date
        expectedDraftUpdatedAt?: Date
      }
    }
  | { error: string } {
  if (!isRecord(value) || hasSensitiveValue(value)) return { error: 'invalid-ai-daily-generated-revision-action' }
  const actor = readString(value.actor, 80)
  const reason = readString(value.reason, 1000)
  const expectedRevisionNumber = readRequiredNonNegativeInteger(value.expectedRevisionNumber)
  const expectedIssueUpdatedAt = readRequiredDate(value.expectedIssueUpdatedAt)
  const expectedDraftUpdatedAt = value.expectedDraftUpdatedAt === undefined
    ? undefined
    : readRequiredDate(value.expectedDraftUpdatedAt)
  if (
    !actor ||
    expectedRevisionNumber === null ||
    expectedRevisionNumber < 1 ||
    !expectedIssueUpdatedAt ||
    expectedDraftUpdatedAt === null ||
    (options.reasonRequired && !reason)
  ) {
    return { error: 'invalid-ai-daily-generated-revision-action' }
  }
  return {
    data: {
      actor,
      reason: reason || undefined,
      expectedRevisionNumber,
      expectedIssueUpdatedAt,
      expectedDraftUpdatedAt: expectedDraftUpdatedAt ?? undefined,
    },
  }
}

function readRequiredNonNegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

function readAiDailyFlashRevisionActionInput(value: unknown):
  | {
      data: {
        actor: string
        reason?: string
        observedRevisionNumber: number
        expectedPublicRevision: number
      }
    }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-flash-action' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }
  const actor = readString(value.actor, 80)
  const reason = readString(value.reason, 1000)
  const observedRevisionNumber = readRequiredNonNegativeInteger(value.observedRevisionNumber)
  const expectedPublicRevision = readRequiredNonNegativeInteger(value.expectedPublicRevision)
  if (!actor || observedRevisionNumber === null || observedRevisionNumber < 1 || expectedPublicRevision === null) {
    return { error: 'invalid-ai-daily-flash-action' }
  }
  return {
    data: {
      actor,
      reason: reason || undefined,
      observedRevisionNumber,
      expectedPublicRevision,
    },
  }
}

function readAiDailyFlashLifecycleInput(value: unknown):
  | { data: { actor: string; reason?: string; expectedPublicRevision: number } }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-flash-lifecycle-action' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }
  const actor = readString(value.actor, 80)
  const reason = readString(value.reason, 1000)
  const expectedPublicRevision = readRequiredNonNegativeInteger(value.expectedPublicRevision)
  if (!actor || expectedPublicRevision === null) return { error: 'invalid-ai-daily-flash-lifecycle-action' }
  return { data: { actor, reason: reason || undefined, expectedPublicRevision } }
}

function readAiDailyFlashCorrectionInput(value: unknown):
  | {
      data: {
        sourceRevisionId: string
        expectedPublicRevision: number
        expectedRevisionSequence: number
        title: string
        factSummary: string
        whyItMatters: string
        uncertainty: string | null
        editor: string | null
        actor: string
        reason?: string
      }
    }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-flash-correction' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }
  const sourceRevisionId = readString(value.sourceRevisionId, 120)
  const expectedPublicRevision = readRequiredNonNegativeInteger(value.expectedPublicRevision)
  const expectedRevisionSequence = readRequiredNonNegativeInteger(value.expectedRevisionSequence)
  const title = readString(value.title, 240)
  const factSummary = readString(value.factSummary, 6000)
  const whyItMatters = readString(value.whyItMatters, 6000)
  const uncertainty = readString(value.uncertainty, 2000) || null
  const editor = readString(value.editor, 80) || null
  const actor = readString(value.actor, 80)
  const reason = readString(value.reason, 1000)
  if (
    !sourceRevisionId ||
    expectedPublicRevision === null ||
    expectedRevisionSequence === null ||
    !title ||
    !factSummary ||
    !whyItMatters ||
    !actor
  ) {
    return { error: 'invalid-ai-daily-flash-correction' }
  }
  return {
    data: {
      sourceRevisionId,
      expectedPublicRevision,
      expectedRevisionSequence,
      title,
      factSummary,
      whyItMatters,
      uncertainty,
      editor,
      actor,
      reason: reason || undefined,
    },
  }
}

function createAiDailyFlashLifecycleHandler(nextState: 'HELD' | 'ACTIVE' | 'WITHDRAWN') {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const input = readAiDailyFlashLifecycleInput(req.body)
      if ('error' in input) {
        res.status(400).json({ error: input.error })
        return
      }
      const prisma = requireStudioDatabase()
      const item = await transitionAiDailyFlashLifecycle(prisma, {
        flashItemId: readRouteParam(req.params.id),
        next: nextState,
        ...input.data,
      })
      res.json({ flashItem: toAiDailyFlashItemMutationResponse(item) })
    } catch (error) {
      if (handleAiDailyFlashWriteError(res, error)) return
      next(error)
    }
  }
}

function handleAiDailyFlashWriteError(res: express.Response, error: unknown) {
  const notFoundErrors = ['ai-daily-flash-item-not-found', 'ai-daily-flash-revision-not-found']
  if (notFoundErrors.some((message) => isErrorMessage(error, message)) || isPrismaError(error, 'P2025')) {
    const code = isErrorMessage(error, 'ai-daily-flash-revision-not-found')
      ? 'ai-daily-flash-revision-not-found'
      : 'ai-daily-flash-item-not-found'
    res.status(404).json({ error: code })
    return true
  }
  const conflictErrors = [
    'ai-daily-flash-item-conflict',
    'ai-daily-flash-revision-conflict',
    'ai-daily-flash-revision-item-mismatch',
    'ai-daily-flash-correction-source-not-current',
    'ai-daily-flash-item-withdrawn',
    'invalid-ai-daily-transition',
  ]
  const conflict = conflictErrors.find((message) => isErrorMessage(error, message))
  if (conflict) {
    res.status(409).json({ error: conflict })
    return true
  }
  if (isPrismaError(error, 'P2002')) {
    res.status(409).json({ error: 'ai-daily-flash-item-conflict' })
    return true
  }
  return false
}

function handleAiDailyEditorialOverrideError(res: express.Response, error: unknown) {
  if (isErrorMessage(error, 'invalid-ai-daily-editorial-override')) {
    res.status(400).json({ error: 'invalid-ai-daily-editorial-override' })
    return true
  }
  const notFoundErrors = [
    'ai-daily-run-not-found',
    'ai-daily-candidate-not-found',
    'ai-daily-cluster-not-found',
  ]
  const notFound = notFoundErrors.find((message) => isErrorMessage(error, message))
  if (notFound) {
    res.status(404).json({ error: notFound })
    return true
  }
  const conflictErrors = [
    'ai-daily-editorial-override-conflict',
    'ai-daily-editorial-run-boundary-mismatch',
    'ai-daily-candidate-evidence-not-ready',
    'invalid-ai-daily-transition',
  ]
  const conflict = conflictErrors.find((message) => isErrorMessage(error, message))
  if (conflict) {
    res.status(409).json({ error: conflict })
    return true
  }
  if (isPrismaError(error, 'P2002')) {
    res.status(409).json({ error: 'ai-daily-editorial-override-conflict' })
    return true
  }
  return false
}

function handleAiDailyGeneratedRevisionWriteError(res: express.Response, error: unknown) {
  const notFoundErrors = ['ai-daily-issue-not-found', 'ai-daily-generated-revision-not-found']
  const notFound = notFoundErrors.find((message) => isErrorMessage(error, message))
  if (notFound) {
    res.status(404).json({ error: notFound })
    return true
  }
  const badRequestErrors = ['invalid-ai-daily-generated-correction', 'invalid-ai-daily-generated-revision-action', 'ai-daily-generated-revision-content-invalid']
  const badRequest = badRequestErrors.find((message) => isErrorMessage(error, message))
  if (badRequest) {
    res.status(400).json({ error: badRequest })
    return true
  }
  const conflictErrors = [
    'ai-daily-generated-issue-conflict',
    'ai-daily-generated-revision-conflict',
    'ai-daily-generated-revision-stale-evidence',
    'ai-daily-generated-revision-draft-conflict',
    'ai-daily-generated-revision-draft-protected',
    'ai-daily-generated-revision-not-valid',
    'invalid-ai-daily-generated-apply-transition',
    'invalid-ai-daily-transition',
  ]
  const conflict = conflictErrors.find((message) => isErrorMessage(error, message))
  if (conflict) {
    res.status(409).json({ error: conflict })
    return true
  }
  if (isPrismaError(error, 'P2002')) {
    res.status(409).json({ error: 'ai-daily-generated-revision-conflict' })
    return true
  }
  return false
}

function toAiDailyEditorialOverrideMutationResponse(result: {
  override: {
    id: string
    runId: string
    candidateId: string | null
    clusterId: string | null
    action: string
    actor: string
    reason: string | null
    expectedUpdatedAt: Date | null
    observedVersion: number | null
    createdAt: Date
  }
  candidate: {
    id: string
    selectionState: string
    evidenceStatus: string
    evidenceVersion: number
    updatedAt: Date
  } | null
  cluster: {
    id: string
    stableIdentityKey: string
    rank: number | null
    editorState: string
    editorReason: string | null
    updatedAt: Date
  } | null
  secondaryCluster: {
    id: string
    stableIdentityKey: string
    rank: number | null
    editorState: string
    editorReason: string | null
    updatedAt: Date
  } | null
  workItem: {
    id: string
    kind: string
    status: string
    attemptCount: number
    maxAttempts: number
    updatedAt: Date
  } | null
  runUpdatedAt: Date
}) {
  return {
    override: {
      id: result.override.id,
      runId: result.override.runId,
      candidateId: result.override.candidateId,
      clusterId: result.override.clusterId,
      action: result.override.action.toLowerCase(),
      actor: readString(result.override.actor, 80),
      reason: readString(result.override.reason, 420) || null,
      expectedUpdatedAt: result.override.expectedUpdatedAt?.toISOString() ?? null,
      observedVersion: result.override.observedVersion,
      createdAt: result.override.createdAt.toISOString(),
    },
    candidate: result.candidate
      ? {
          id: result.candidate.id,
          selectionState: result.candidate.selectionState.toLowerCase(),
          evidenceStatus: result.candidate.evidenceStatus.toLowerCase(),
          evidenceVersion: result.candidate.evidenceVersion,
          updatedAt: result.candidate.updatedAt.toISOString(),
        }
      : null,
    cluster: result.cluster
      ? {
          id: result.cluster.id,
          stableIdentityKey: readString(result.cluster.stableIdentityKey, 160),
          rank: result.cluster.rank,
          editorState: result.cluster.editorState.toLowerCase(),
          editorReason: readString(result.cluster.editorReason, 420) || null,
          updatedAt: result.cluster.updatedAt.toISOString(),
        }
      : null,
    secondaryCluster: result.secondaryCluster
      ? {
          id: result.secondaryCluster.id,
          stableIdentityKey: readString(result.secondaryCluster.stableIdentityKey, 160),
          rank: result.secondaryCluster.rank,
          editorState: result.secondaryCluster.editorState.toLowerCase(),
          editorReason: readString(result.secondaryCluster.editorReason, 420) || null,
          updatedAt: result.secondaryCluster.updatedAt.toISOString(),
        }
      : null,
    workItem: result.workItem
      ? {
          id: result.workItem.id,
          kind: result.workItem.kind.toLowerCase(),
          status: result.workItem.status.toLowerCase(),
          attemptCount: result.workItem.attemptCount,
          maxAttempts: result.workItem.maxAttempts,
          updatedAt: result.workItem.updatedAt.toISOString(),
        }
      : null,
    runUpdatedAt: result.runUpdatedAt.toISOString(),
  }
}

function toAiDailyGeneratedRevisionMutationResponse(revision: {
  id: string
  issueId: string
  revisionNumber: number
  revisionKind: string
  sourceRevisionId: string | null
  selectionVersion: number
  evidenceVersion: number
  applyState: string
  validationStatus: string
  validationFindingsJson: Prisma.JsonValue | null
  projectionDraftId: string | null
  createdBy: string
  createdAt: Date
  appliedAt: Date | null
  revalidatedAt: Date | null
  validatedBy: string | null
  discardedAt: Date | null
  discardedBy: string | null
  discardReason: string | null
}) {
  const findings = Array.isArray(revision.validationFindingsJson)
    ? revision.validationFindingsJson.slice(0, 40).flatMap((item) =>
        isRecord(item)
          ? [{ severity: readString(item.severity, 24), code: readString(item.code, 120) }]
          : [],
      )
    : []
  return {
    id: revision.id,
    issueId: revision.issueId,
    revisionNumber: revision.revisionNumber,
    revisionKind: revision.revisionKind.toLowerCase().replaceAll('_', '-'),
    sourceRevisionId: revision.sourceRevisionId,
    selectionVersion: revision.selectionVersion,
    evidenceVersion: revision.evidenceVersion,
    applyState: revision.applyState.toLowerCase().replaceAll('_', '-'),
    validationStatus: revision.validationStatus.toLowerCase().replaceAll('_', '-'),
    validationFindings: findings,
    projectionDraftId: revision.projectionDraftId,
    createdBy: readString(revision.createdBy, 80),
    createdAt: revision.createdAt.toISOString(),
    appliedAt: revision.appliedAt?.toISOString() ?? null,
    revalidatedAt: revision.revalidatedAt?.toISOString() ?? null,
    validatedBy: readString(revision.validatedBy, 80) || null,
    discardedAt: revision.discardedAt?.toISOString() ?? null,
    discardedBy: readString(revision.discardedBy, 80) || null,
    discardReason: readString(revision.discardReason, 420) || null,
  }
}

function toAiDailyFlashRevisionMutationResponse(revision: {
  id: string
  flashItemId: string
  revisionNumber: number
  status: string
  correctionState: string
  approvedAt: Date | null
  correctedAt: Date | null
  supersededRevisionId: string | null
  createdAt: Date
}) {
  return {
    id: revision.id,
    flashItemId: revision.flashItemId,
    revisionNumber: revision.revisionNumber,
    status: revision.status.toLowerCase(),
    correctionState: readString(revision.correctionState, 80),
    approvedAt: revision.approvedAt?.toISOString() ?? null,
    correctedAt: revision.correctedAt?.toISOString() ?? null,
    supersededRevisionId: revision.supersededRevisionId,
    createdAt: revision.createdAt.toISOString(),
  }
}

function toAiDailyFlashItemMutationResponse(item: {
  id: string
  lifecycleState: string
  currentApprovedRevisionId: string | null
  revisionSequence: number
  publicRevision: number
  lastApprovedAt: Date | null
  withdrawnAt: Date | null
  projectionUpdatedAt: Date | null
}) {
  return {
    id: item.id,
    lifecycleState: item.lifecycleState.toLowerCase(),
    currentApprovedRevisionId: item.currentApprovedRevisionId,
    revisionSequence: item.revisionSequence,
    publicRevision: item.publicRevision,
    lastApprovedAt: item.lastApprovedAt?.toISOString() ?? null,
    withdrawnAt: item.withdrawnAt?.toISOString() ?? null,
    projectionUpdatedAt: item.projectionUpdatedAt?.toISOString() ?? null,
  }
}

function readAiDailyIssueInput(value: unknown):
  | { data: Prisma.AiDailyIssueCreateInput; sourceIds: string[] }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-issue-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }
  const date = readString(value.date, 10)
  const title = readString(value.title, 180)
  const editionDate = parseAiDailyEditionDate(date)
  if (!editionDate) return { error: 'invalid-date' }
  if (!title) return { error: 'missing-title' }

  return {
    data: {
      date,
      title,
      editionDate: editionDate.value,
      sourceIdsJson: [],
      briefJson: isRecord(value.briefJson) ? (value.briefJson as Prisma.InputJsonValue) : undefined,
    },
    sourceIds: dedupeStrings(readStringArray(value.sourceIds)).slice(0, 80),
  }
}

function readAiDailyIssuePatch(value: unknown):
  | { data: Prisma.AiDailyIssueUpdateInput; sourceIds?: string[]; briefJson?: Prisma.InputJsonValue; targetStatus?: StudioAiDailyStatus }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-issue-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }

  const data: Prisma.AiDailyIssueUpdateInput = {}
  let sourceIds: string[] | undefined
  let briefJsonInput: Prisma.InputJsonValue | undefined
  let targetStatus: StudioAiDailyStatus | undefined
  if ('date' in value) {
    const date = readString(value.date, 10)
    const editionDate = parseAiDailyEditionDate(date)
    if (!editionDate) return { error: 'invalid-date' }
    data.date = date
    data.editionDate = editionDate.value
  }
  if ('title' in value) {
    const title = readString(value.title, 180)
    if (!title) return { error: 'missing-title' }
    data.title = title
  }
  if ('sourceIds' in value) {
    sourceIds = dedupeStrings(readStringArray(value.sourceIds)).slice(0, 80)
    data.sourceIdsJson = sourceIds
  }
  if ('briefJson' in value) {
    const briefJson = readBriefJson(value.briefJson)
    if (!briefJson) return { error: 'invalid-brief-json' }
    briefJsonInput = briefJson
    data.briefJson = briefJson
  }
  if ('status' in value) {
    const status = readAiDailyStatus(value.status)
    if (!status) return { error: 'invalid-ai-daily-status' }
    targetStatus = status
    data.status = status
  }
  return { data, sourceIds, briefJson: briefJsonInput, targetStatus }
}

function readPublishExportPatch(value: unknown):
  | { data: Prisma.PublishExportUpdateInput; report: StudioPublishReport }
  | { error: string } {
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }
  const normalized = normalizeStudioPublishReport(value)
  if (!normalized.ok) return { error: normalized.error }
  return {
    report: normalized.report,
    data: {
      exportedFilesJson: normalized.report.exportedFiles,
      checksJson: normalized.report.checks as unknown as Prisma.InputJsonValue,
      exportedBy: normalized.report.exportedBy,
    },
  }
}
function readOptionalDate(value: unknown) {
  const text = readString(value, 40)
  if (!text) return undefined
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function readAiDailyStatus(value: unknown): StudioAiDailyStatus | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/-/gu, '_').toUpperCase()
  return Object.prototype.hasOwnProperty.call(aiDailyStatusToApi, normalized) ? (normalized as StudioAiDailyStatus) : null
}

function readBriefJson(value: unknown): Prisma.InputJsonValue | null {
  if (!isRecord(value) || Array.isArray(value)) return null
  const serialized = JSON.stringify(value)
  if (serialized.length > 12000) return null
  return JSON.parse(serialized) as Prisma.InputJsonValue
}

function jsonStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function dedupeStrings(items: string[]) {
  return Array.from(new Set(items))
}

function slugFromIssueDate(date: string) {
  return `ai-daily-${date}`
}

async function loadSourcesByIds(
  prisma: ReturnType<typeof requireStudioDatabase>,
  sourceIds: string[],
) {
  if (sourceIds.length === 0) return []
  const sources = await prisma.sourceItem.findMany({ where: { id: { in: sourceIds } } })
  return sortSourcesByIds(sources, sourceIds)
}

function sortSourcesByIds(
  sources: Prisma.SourceItemGetPayload<Record<string, never>>[],
  sourceIds: string[],
) {
  const byId = new Map(sources.map((source) => [source.id, source]))
  return sourceIds.map((sourceId) => byId.get(sourceId)).filter((source): source is (typeof sources)[number] => Boolean(source))
}

async function loadAiDailyIssueDetail(
  prisma: ReturnType<typeof requireStudioDatabase>,
  issue: Prisma.AiDailyIssueGetPayload<Record<string, never>>,
) {
  const [sources, draft] = await Promise.all([
    loadAiDailyIssueSources(prisma, issue.id).then((selection) => selection.sources),
    issue.draftId
      ? prisma.contentDraft.findUnique({
          where: { id: issue.draftId },
          include: { reviews: latestReviewQuery },
        })
      : Promise.resolve(null),
  ])
  return {
    issue: toAiDailyIssueResponse(issue),
    sources: sources.map(toSourceResponse),
    draft: draft ? toDraftResponse(draft) : null,
  }
}

function buildAiDailyDraftInput(
  issue: Prisma.AiDailyIssueGetPayload<Record<string, never>>,
  sources: Prisma.SourceItemGetPayload<Record<string, never>>[],
  editorName: string,
): Prisma.ContentDraftCreateInput {
  const brief = isRecord(issue.briefJson) ? issue.briefJson : {}
  const summary =
    readString(brief.summary, 600) ||
    `本期 AI 日报基于 ${sources.length} 条公开来源整理，当前处于人工审核前的 review-needed 草稿。`
  const publicAngle =
    readString(brief.publicAngle, 800) ||
    '用来源摘要解释当天值得关注的模型、工具、研究和工程实践信号，不做无来源的“最新/最强”判断。'
  const keySignals = readStringArray(brief.keySignals).slice(0, 8)
  const toVerify = readStringArray(brief.toVerify).slice(0, 8)
  const sourceTags = dedupeStrings(sources.flatMap((source) => jsonStringArray(source.tagsJson))).slice(0, 8)

  return {
    slug: slugFromIssueDate(issue.date),
    title: issue.title,
    column: 'ai-daily',
    tag: 'AI 日报',
    detail: summary,
    readTime: '6 min',
    bodyJson: buildAiDailyDraftBody(issue, sources, summary, publicAngle, keySignals, toVerify),
    knowledgePoints: ['AI Daily', ...sourceTags] as Prisma.InputJsonValue,
    projectIds: [] as Prisma.InputJsonValue,
    status: 'REVIEW_NEEDED',
    visibility: 'HIDDEN',
    aiAssistance: 'none',
    createdBy: editorName,
    updatedBy: editorName,
  }
}

function buildAiDailyDraftBody(
  issue: Prisma.AiDailyIssueGetPayload<Record<string, never>>,
  sources: Prisma.SourceItemGetPayload<Record<string, never>>[],
  summary: string,
  publicAngle: string,
  keySignals: string[],
  toVerify: string[],
): Prisma.InputJsonValue {
  const sourceSignals =
    keySignals.length > 0
      ? keySignals
      : sources.map((source) => `${source.title}：${source.summary || '需要编辑补充影响判断。'}`).slice(0, 8)
  const verifyItems =
    toVerify.length > 0
      ? toVerify
      : [
          '逐条打开来源链接，复核发布日期、原文语境和是否存在后续更正。',
          '确认摘要为转述，不复制来源长段原文。',
          '删除没有来源支撑的“最新、首个、最强、颠覆”等判断。',
        ]

  return {
    blocks: [
      { type: 'heading', level: 2, text: '今日摘要 / Daily Brief' },
      { type: 'paragraph', text: summary },
      { type: 'paragraph', text: publicAngle },
      { type: 'heading', level: 2, text: '来源速览 / Source Cards' },
      ...sources.map((source) => ({
        type: 'source-card',
        sourceItemId: source.id,
        caption: `${source.title} · ${source.sourceName}`,
        citationSnapshot: {
          version: 2,
          sourceItemId: source.id,
          evidenceId: null,
          title: source.title,
          publisher: source.sourceName,
          originalUrl: source.url,
          canonicalUrl: source.canonicalUrl || source.url,
          publishedAt: source.publishedAt?.toISOString() ?? null,
          retrievedAt: source.capturedAt.toISOString(),
          excerpt: (source.rawExcerpt || source.summary || source.title).slice(0, 1024),
          ...(source.contentHash ? { contentHash: source.contentHash } : {}),
        },
      })),
      { type: 'heading', level: 2, text: '影响判断 / Why It Matters' },
      { type: 'list', items: sourceSignals },
      { type: 'heading', level: 2, text: '待核查事项 / To Verify' },
      { type: 'list', items: verifyItems },
      { type: 'heading', level: 2, text: '发布 Gate' },
      {
        type: 'list',
        items: [
          `本期 issue id：${issue.id}`,
          '保持 draft/review-needed，人工审核通过后再创建公开导出记录。',
          '发布前运行 blog:check、lint 和 build。',
        ],
      },
    ],
  }
}

function toDraftResponse(
  draft: Prisma.ContentDraftGetPayload<{ include: { reviews: true } }>,
) {
  return {
    id: draft.id,
    slug: draft.slug,
    title: draft.title,
    column: draft.column,
    tag: draft.tag,
    detail: draft.detail,
    readTime: draft.readTime,
    bodyJson: draft.bodyJson,
    knowledgePoints: jsonStringArray(draft.knowledgePoints),
    projectIds: jsonStringArray(draft.projectIds),
    status: draftStatusToApi[draft.status as StudioDraftStatus],
    visibility: visibilityToApi[draft.visibility as StudioVisibility],
    aiAssistance: draft.aiAssistance,
    createdBy: draft.createdBy,
    updatedBy: draft.updatedBy,
    publishedAt: draft.publishedAt?.toISOString() ?? null,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    latestReview: draft.reviews[0] ? toReviewResponse(draft.reviews[0]) : null,
  }
}

function toReviewResponse(review: Prisma.ContentReviewGetPayload<Record<string, never>>) {
  return {
    id: review.id,
    draftId: review.draftId,
    status: reviewStatusToApi[review.status as StudioReviewStatus],
    checklist: review.checklistJson,
    notes: review.notes,
    reviewedBy: review.reviewedBy,
    reviewedAt: review.reviewedAt.toISOString(),
  }
}

function toPublishExportResponse(
  publishExport:
    | Prisma.PublishExportGetPayload<Record<string, never>>
    | Prisma.PublishExportGetPayload<{ include: { draft: true } }>,
) {
  const draft = 'draft' in publishExport ? publishExport.draft : null
  return {
    id: publishExport.id,
    draftId: publishExport.draftId,
    reviewId: publishExport.reviewId,
    draftUpdatedAt: publishExport.draftUpdatedAt?.toISOString() ?? null,
    target: publishExport.target,
    exportedFiles: jsonStringArray(publishExport.exportedFilesJson),
    checks: publishExport.checksJson,
    exportedBy: publishExport.exportedBy,
    createdAt: publishExport.createdAt.toISOString(),
    updatedAt: publishExport.updatedAt.toISOString(),
    draft: draft
      ? {
          id: draft.id,
          slug: draft.slug,
          title: draft.title,
          status: draftStatusToApi[draft.status as StudioDraftStatus],
        }
      : null,
  }
}

function toSourceResponse(source: Prisma.SourceItemGetPayload<Record<string, never>>) {
  return {
    id: source.id,
    title: source.title,
    url: source.url,
    sourceName: source.sourceName,
    sourceTier: source.sourceTier,
    language: source.language,
    publishedAt: source.publishedAt?.toISOString() ?? null,
    capturedAt: source.capturedAt.toISOString(),
    rawExcerpt: source.rawExcerpt,
    summary: source.summary,
    tags: jsonStringArray(source.tagsJson),
    riskFlags: jsonStringArray(source.riskFlagsJson),
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  }
}

function toAiDailyIssueResponse(issue: Prisma.AiDailyIssueGetPayload<Record<string, never>>) {
  return {
    id: issue.id,
    date: issue.date,
    title: issue.title,
    status: aiDailyStatusToApi[issue.status as keyof typeof aiDailyStatusToApi],
    sourceIds: jsonStringArray(issue.sourceIdsJson),
    briefJson: issue.briefJson,
    draftId: issue.draftId,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  }
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

function isErrorMessage(error: unknown, message: string) {
  return error instanceof Error && error.message === message
}
