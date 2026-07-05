import express from 'express'
import { Prisma } from '@prisma/client'
import { requireStudioDatabase } from './db.js'
import { env, hasStudioDatabase } from './env.js'

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

interface StudioAuthResult {
  ok: boolean
  status?: number
  error?: string
}

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
        include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
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
        include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
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

      const draft = await prisma.contentDraft.update({
        where: { id: existing.id },
        data: input.data,
        include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
      })
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
      const existing = await prisma.contentDraft.findUnique({ where: { id: req.params.id } })
      if (!existing) {
        res.status(404).json({ error: 'draft-not-found' })
        return
      }

      const checklistJson = readChecklistJson(req.body?.checklist)
      const notes = readString(req.body?.notes, 2000)
      const reviewedBy = readString(req.body?.reviewedBy, 80)
      const nextDraftStatus = reviewStatus === 'APPROVED' ? 'APPROVED' : reviewStatus === 'REJECTED' ? 'REJECTED' : 'REVIEW_NEEDED'

      const [review, draft] = await prisma.$transaction([
        prisma.contentReview.create({
          data: {
            draftId: existing.id,
            status: reviewStatus,
            checklistJson,
            notes,
            reviewedBy,
          },
        }),
        prisma.contentDraft.update({
          where: { id: existing.id },
          data: { status: nextDraftStatus, updatedBy: reviewedBy || undefined },
          include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
        }),
      ])

      res.status(201).json({ review: toReviewResponse(review), draft: toDraftResponse(draft) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/content-drafts/:id/publish-exports', async (req, res, next) => {
    try {
      const prisma = requireStudioDatabase()
      const existing = await prisma.contentDraft.findUnique({ where: { id: req.params.id } })
      if (!existing) {
        res.status(404).json({ error: 'draft-not-found' })
        return
      }
      if (existing.status !== 'APPROVED') {
        res.status(409).json({ error: 'draft-not-approved' })
        return
      }

      const target = readString(req.body?.target, 80) || 'static-blog-data'
      const exportedBy = readString(req.body?.exportedBy, 80)
      const publishExport = await prisma.publishExport.create({
        data: {
          draftId: existing.id,
          target,
          exportedBy,
          exportedFilesJson: [],
          checksJson: { status: 'pending-local-export' },
        },
      })
      res.status(201).json({
        publishExport: {
          id: publishExport.id,
          draftId: publishExport.draftId,
          target: publishExport.target,
          exportedFiles: [],
          checks: { status: 'pending-local-export' },
          createdAt: publishExport.createdAt.toISOString(),
        },
      })
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
      const existing = await prisma.publishExport.findUnique({ where: { id: req.params.id } })
      if (!existing) {
        res.status(404).json({ error: 'publish-export-not-found' })
        return
      }

      const publishExport = await prisma.publishExport.update({
        where: { id: existing.id },
        data: input.data,
      })
      res.json({ publishExport: toPublishExportResponse(publishExport) })
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
      const issue = await prisma.aiDailyIssue.create({ data: input.data })
      res.status(201).json({ issue: toAiDailyIssueResponse(issue) })
    } catch (error) {
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

      const issue = await prisma.aiDailyIssue.update({
        where: { id: existing.id },
        data: input.data,
      })
      const detail = await loadAiDailyIssueDetail(prisma, issue)
      res.json(detail)
    } catch (error) {
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

      const prisma = requireStudioDatabase()
      const issue = await prisma.aiDailyIssue.findUnique({ where: { id: req.params.id } })
      if (!issue) {
        res.status(404).json({ error: 'ai-daily-issue-not-found' })
        return
      }

      const sourceIds = jsonStringArray(issue.sourceIdsJson)
      const sources = await loadSourcesByIds(prisma, sourceIds)
      if (sources.length === 0) {
        res.status(409).json({ error: 'ai-daily-issue-needs-sources' })
        return
      }

      const editorName = readString(req.body?.editorName, 80) || 'studio'
      const slug = slugFromIssueDate(issue.date)
      const linkedDraft = issue.draftId
        ? await prisma.contentDraft.findUnique({
            where: { id: issue.draftId },
            include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
          })
        : null
      const existingSlugDraft = linkedDraft
        ? null
        : await prisma.contentDraft.findUnique({
            where: { slug },
            include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
          })

      if (linkedDraft || existingSlugDraft) {
        const draft = linkedDraft ?? existingSlugDraft
        if (!draft || draft.column !== 'ai-daily') {
          res.status(409).json({ error: 'duplicate-slug' })
          return
        }
        const updatedIssue = await prisma.aiDailyIssue.update({
          where: { id: issue.id },
          data: { draftId: draft.id, status: 'REVIEW_NEEDED' },
        })
        res.json(await loadAiDailyIssueDetail(prisma, updatedIssue))
        return
      }

      const draftData = buildAiDailyDraftInput(issue, sources, editorName)
      const { finalIssue } = await prisma.$transaction(async (tx) => {
        const draft = await tx.contentDraft.create({
          data: draftData,
          include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
        })
        const nextIssue = await tx.aiDailyIssue.update({
          where: { id: issue.id },
          data: { draftId: draft.id, status: 'REVIEW_NEEDED' },
        })
        return { draft, finalIssue: nextIssue }
      })
      res.status(201).json(await loadAiDailyIssueDetail(prisma, finalIssue))
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        res.status(409).json({ error: 'duplicate-slug' })
        return
      }
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

function readBodyJson(value: unknown): Prisma.InputJsonValue {
  if (!isRecord(value) || !Array.isArray(value.blocks)) return { blocks: [] }
  return {
    blocks: value.blocks
      .filter(isRecord)
      .map((block) => ({
        type: readString(block.type, 40) || 'paragraph',
        text: readString(block.text, 6000),
        level: typeof block.level === 'number' ? block.level : undefined,
        items: Array.isArray(block.items) ? block.items.map((item) => readString(item, 1000)).filter(Boolean) : undefined,
        src: readString(block.src, 500) || undefined,
        alt: readString(block.alt, 160) || undefined,
        caption: readString(block.caption, 300) || undefined,
        mermaid: readString(block.mermaid, 6000) || undefined,
        sourceItemId: readString(block.sourceItemId, 120) || undefined,
      })),
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
  | { data: Prisma.ContentDraftUpdateInput }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-draft-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }

  const data: Prisma.ContentDraftUpdateInput = {}
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
  return {
    sourceChecked: value.sourceChecked === true,
    safetyChecked: value.safetyChecked === true,
    publicReady: value.publicReady === true,
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

function readAiDailyIssueInput(value: unknown):
  | { data: Prisma.AiDailyIssueCreateInput }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-issue-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }
  const date = readString(value.date, 10)
  const title = readString(value.title, 180)
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return { error: 'invalid-date' }
  if (!title) return { error: 'missing-title' }

  return {
    data: {
      date,
      title,
      sourceIdsJson: readStringArrayJson(value.sourceIds),
      briefJson: isRecord(value.briefJson) ? (value.briefJson as Prisma.InputJsonValue) : undefined,
    },
  }
}

function readAiDailyIssuePatch(value: unknown):
  | { data: Prisma.AiDailyIssueUpdateInput; sourceIds?: string[] }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-ai-daily-issue-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }

  const data: Prisma.AiDailyIssueUpdateInput = {}
  let sourceIds: string[] | undefined
  if ('date' in value) {
    const date = readString(value.date, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return { error: 'invalid-date' }
    data.date = date
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
    data.briefJson = briefJson
  }
  if ('status' in value) {
    const status = readAiDailyStatus(value.status)
    if (!status) return { error: 'invalid-ai-daily-status' }
    data.status = status
  }
  return { data, sourceIds }
}

function readPublishExportPatch(value: unknown):
  | { data: Prisma.PublishExportUpdateInput }
  | { error: string } {
  if (!isRecord(value)) return { error: 'invalid-publish-export-payload' }
  if (hasSensitiveValue(value)) return { error: 'sensitive-content-detected' }

  const exportedFiles = readStringArray(value.exportedFiles)
    .filter((file) => !file.includes('..') && !file.startsWith('/') && /^[./a-z0-9_-]+(?:\.[a-z0-9]+)?$/iu.test(file))
    .slice(0, 20)
  const checksJson = isRecord(value.checks)
    ? (JSON.parse(JSON.stringify(value.checks)) as Prisma.InputJsonValue)
    : { status: 'local-exported' }
  return {
    data: {
      exportedFilesJson: exportedFiles,
      checksJson,
      exportedBy: readString(value.exportedBy, 80) || undefined,
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
  if (!isRecord(value)) return null
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
  const sourceIds = jsonStringArray(issue.sourceIdsJson)
  const [sources, draft] = await Promise.all([
    loadSourcesByIds(prisma, sourceIds),
    issue.draftId
      ? prisma.contentDraft.findUnique({
          where: { id: issue.draftId },
          include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 } },
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

function toPublishExportResponse(publishExport: Prisma.PublishExportGetPayload<Record<string, never>>) {
  return {
    id: publishExport.id,
    draftId: publishExport.draftId,
    target: publishExport.target,
    exportedFiles: jsonStringArray(publishExport.exportedFilesJson),
    checks: publishExport.checksJson,
    createdAt: publishExport.createdAt.toISOString(),
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
