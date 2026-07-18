import {
  Prisma,
  type AiDailyEditorialOverrideAction,
  type PrismaClient,
} from '@prisma/client'
import {
  evaluateAiDailyCandidateSelectionTransition,
  evaluateAiDailyClusterEditorTransition,
  type AiDailyCandidateSelectionStateName,
  type AiDailyClusterEditorStateName,
} from './aiDailyDomain.js'

export interface ApplyAiDailyEditorialOverrideInput {
  action: AiDailyEditorialOverrideAction
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
  now?: Date
}

interface LockedRun {
  id: string
  editionDate: Date
  updatedAt: Date
}

interface LockedCandidate {
  id: string
  runId: string
  sourceFeedId: string | null
  clusterId: string | null
  selectionState: AiDailyCandidateSelectionStateName
  evidenceStatus: string
  evidenceVersion: number
  updatedAt: Date
}

interface LockedCluster {
  id: string
  runId: string
  representativeCandidateId: string | null
  stableIdentityKey: string
  groupingReason: string
  topic: string
  corroborationCount: number
  rank: number | null
  editorState: AiDailyClusterEditorStateName
  updatedAt: Date
}

export async function applyAiDailyEditorialOverride(
  prisma: PrismaClient,
  input: ApplyAiDailyEditorialOverrideInput,
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const run = await lockRun(tx, input.runId)
    switch (input.action) {
      case 'INCLUDE':
      case 'EXCLUDE':
        return applyCandidateSelectionOverride(tx, run, input, now)
      case 'REQUEST_EVIDENCE':
        return applyEvidenceRequestOverride(tx, run, input, now)
      case 'REORDER':
        return applyClusterReorderOverride(tx, run, input, now)
      case 'MERGE':
        return applyClusterMergeOverride(tx, run, input, now)
      case 'SPLIT':
        return applyClusterSplitOverride(tx, run, input, now)
    }
  })
}

async function applyCandidateSelectionOverride(
  tx: Prisma.TransactionClient,
  run: LockedRun,
  input: ApplyAiDailyEditorialOverrideInput,
  now: Date,
) {
  if (!input.candidateId) throw new Error('invalid-ai-daily-editorial-override')
  const candidate = await lockCandidate(tx, input.candidateId)
  assertRunBoundary(candidate.runId, run.id)
  assertExpectedTimestamp(candidate.updatedAt, input.expectedUpdatedAt)
  const nextState = input.action === 'INCLUDE' ? 'SELECTED' : 'REJECTED'
  if (nextState === 'SELECTED' && candidate.evidenceStatus !== 'READY') {
    throw new Error('ai-daily-candidate-evidence-not-ready')
  }
  if (candidate.selectionState !== nextState) {
    const transition = evaluateAiDailyCandidateSelectionTransition(candidate.selectionState, nextState)
    if (!transition.ok) throw new Error(transition.error)
  }
  const updated = await tx.aiDailyCandidate.updateMany({
    where: { id: candidate.id, runId: run.id, updatedAt: candidate.updatedAt },
    data: { selectionState: nextState, updatedAt: now },
  })
  if (updated.count !== 1) throw new Error('ai-daily-editorial-override-conflict')
  await touchRun(tx, run, now)
  const override = await createOverride(tx, input, {
    candidateId: candidate.id,
    observedVersion: candidate.evidenceVersion,
    payload: { selectionState: nextState },
  })
  return {
    override,
    candidate: await tx.aiDailyCandidate.findUniqueOrThrow({ where: { id: candidate.id } }),
    cluster: null,
    secondaryCluster: null,
    workItem: null,
    runUpdatedAt: now,
  }
}

async function applyEvidenceRequestOverride(
  tx: Prisma.TransactionClient,
  run: LockedRun,
  input: ApplyAiDailyEditorialOverrideInput,
  now: Date,
) {
  if (!input.candidateId) throw new Error('invalid-ai-daily-editorial-override')
  const candidate = await lockCandidate(tx, input.candidateId)
  assertRunBoundary(candidate.runId, run.id)
  assertExpectedTimestamp(candidate.updatedAt, input.expectedUpdatedAt)
  if (
    input.observedEvidenceVersion !== undefined &&
    input.observedEvidenceVersion !== candidate.evidenceVersion
  ) {
    throw new Error('ai-daily-editorial-override-conflict')
  }
  const idempotencyKey = `manual-evidence:${candidate.id}:v${candidate.evidenceVersion}`
  const existing = await tx.aiDailyWorkItem.findUnique({ where: { idempotencyKey } })
  const workItem = existing
    ? ['FAILED', 'CANCELLED'].includes(existing.status)
      ? await tx.aiDailyWorkItem.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            availableAt: now,
            leaseOwner: null,
            leaseToken: null,
            leaseExpiresAt: null,
            completedAt: null,
            lastErrorCategory: null,
          },
        })
      : existing
    : await tx.aiDailyWorkItem.create({
        data: {
          kind: 'FETCH_SOURCE',
          editionDate: run.editionDate,
          runId: run.id,
          sourceFeedId: candidate.sourceFeedId,
          idempotencyKey,
          priority: 1_000,
          status: 'PENDING',
          availableAt: now,
          maxAttempts: 3,
        },
      })
  const candidateUpdate = await tx.aiDailyCandidate.updateMany({
    where: { id: candidate.id, runId: run.id, updatedAt: candidate.updatedAt },
    data: { updatedAt: now },
  })
  if (candidateUpdate.count !== 1) throw new Error('ai-daily-editorial-override-conflict')
  await touchRun(tx, run, now)
  const override = await createOverride(tx, input, {
    candidateId: candidate.id,
    observedVersion: candidate.evidenceVersion,
    payload: { workItemId: workItem.id, idempotencyKey },
  })
  return {
    override,
    candidate: await tx.aiDailyCandidate.findUniqueOrThrow({ where: { id: candidate.id } }),
    cluster: null,
    secondaryCluster: null,
    workItem,
    runUpdatedAt: now,
  }
}

async function applyClusterReorderOverride(
  tx: Prisma.TransactionClient,
  run: LockedRun,
  input: ApplyAiDailyEditorialOverrideInput,
  now: Date,
) {
  assertExpectedTimestamp(run.updatedAt, input.expectedUpdatedAt)
  const orderedClusterIds = dedupe(input.orderedClusterIds ?? [])
  if (orderedClusterIds.length === 0) throw new Error('invalid-ai-daily-editorial-override')
  const allClusters = await tx.aiDailyCluster.findMany({ where: { runId: run.id } })
  if (allClusters.length !== orderedClusterIds.length) throw new Error('ai-daily-editorial-run-boundary-mismatch')
  const clusters = allClusters.filter((cluster) => orderedClusterIds.includes(cluster.id))
  if (clusters.length !== orderedClusterIds.length) throw new Error('ai-daily-editorial-run-boundary-mismatch')
  const byId = new Map(clusters.map((cluster) => [cluster.id, cluster]))
  for (let index = 0; index < orderedClusterIds.length; index += 1) {
    const cluster = byId.get(orderedClusterIds[index] ?? '')
    if (!cluster) throw new Error('ai-daily-editorial-run-boundary-mismatch')
    assertClusterTransition(cluster.editorState, 'ACCEPTED')
    await tx.aiDailyCluster.update({
      where: { id: cluster.id },
      data: { rank: index + 1, editorState: 'ACCEPTED', editorReason: input.reason, updatedAt: now },
    })
  }
  const runUpdate = await tx.aiDailyRun.updateMany({
    where: { id: run.id, updatedAt: run.updatedAt },
    data: { updatedAt: now },
  })
  if (runUpdate.count !== 1) throw new Error('ai-daily-editorial-override-conflict')
  const override = await createOverride(tx, input, { payload: { orderedClusterIds } })
  return {
    override,
    candidate: null,
    cluster: null,
    secondaryCluster: null,
    workItem: null,
    runUpdatedAt: now,
  }
}

async function applyClusterMergeOverride(
  tx: Prisma.TransactionClient,
  run: LockedRun,
  input: ApplyAiDailyEditorialOverrideInput,
  now: Date,
) {
  if (!input.clusterId || !input.secondaryClusterId || input.clusterId === input.secondaryClusterId) {
    throw new Error('invalid-ai-daily-editorial-override')
  }
  const ids = [input.clusterId, input.secondaryClusterId].sort()
  const locked = new Map<string, LockedCluster>()
  for (const id of ids) locked.set(id, await lockCluster(tx, id))
  const primary = locked.get(input.clusterId)
  const secondary = locked.get(input.secondaryClusterId)
  if (!primary || !secondary) throw new Error('ai-daily-cluster-not-found')
  assertRunBoundary(primary.runId, run.id)
  assertRunBoundary(secondary.runId, run.id)
  assertExpectedTimestamp(primary.updatedAt, input.expectedUpdatedAt)
  if (!input.secondaryExpectedUpdatedAt) throw new Error('invalid-ai-daily-editorial-override')
  assertExpectedTimestamp(secondary.updatedAt, input.secondaryExpectedUpdatedAt)
  assertClusterTransition(primary.editorState, 'ACCEPTED')
  assertClusterTransition(secondary.editorState, 'REJECTED')
  await tx.aiDailyCandidate.updateMany({
    where: { runId: run.id, clusterId: secondary.id },
    data: { clusterId: primary.id, updatedAt: now },
  })
  const corroborationCount = await tx.aiDailyCandidate.count({ where: { runId: run.id, clusterId: primary.id } })
  const cluster = await tx.aiDailyCluster.update({
    where: { id: primary.id },
    data: {
      corroborationCount,
      editorState: 'ACCEPTED',
      editorReason: input.reason,
      updatedAt: now,
    },
  })
  const secondaryCluster = await tx.aiDailyCluster.update({
    where: { id: secondary.id },
    data: {
      representativeCandidateId: null,
      corroborationCount: 0,
      editorState: 'REJECTED',
      editorReason: input.reason,
      updatedAt: now,
    },
  })
  await touchRun(tx, run, now)
  const override = await createOverride(tx, input, {
    clusterId: primary.id,
    payload: { secondaryClusterId: secondary.id },
  })
  return { override, candidate: null, cluster, secondaryCluster, workItem: null, runUpdatedAt: now }
}

async function applyClusterSplitOverride(
  tx: Prisma.TransactionClient,
  run: LockedRun,
  input: ApplyAiDailyEditorialOverrideInput,
  now: Date,
) {
  if (!input.clusterId || !input.splitStableIdentityKey) {
    throw new Error('invalid-ai-daily-editorial-override')
  }
  const sourceCluster = await lockCluster(tx, input.clusterId)
  assertRunBoundary(sourceCluster.runId, run.id)
  assertExpectedTimestamp(sourceCluster.updatedAt, input.expectedUpdatedAt)
  const candidateIds = dedupe(input.splitCandidateIds ?? [])
  if (candidateIds.length === 0) throw new Error('invalid-ai-daily-editorial-override')
  const members = await tx.aiDailyCandidate.findMany({
    where: { id: { in: candidateIds }, runId: run.id, clusterId: sourceCluster.id },
  })
  if (members.length !== candidateIds.length) throw new Error('ai-daily-editorial-run-boundary-mismatch')
  const maxRank = await tx.aiDailyCluster.aggregate({ where: { runId: run.id }, _max: { rank: true } })
  const cluster = await tx.aiDailyCluster.create({
    data: {
      runId: run.id,
      stableIdentityKey: input.splitStableIdentityKey,
      representativeCandidateId: candidateIds[0],
      groupingReason: 'manual-split',
      topic: sourceCluster.topic,
      corroborationCount: candidateIds.length,
      rank: (maxRank._max.rank ?? 0) + 1,
      editorState: 'PROPOSED',
      editorReason: input.reason,
    },
  })
  await tx.aiDailyCandidate.updateMany({
    where: { id: { in: candidateIds }, runId: run.id, clusterId: sourceCluster.id },
    data: { clusterId: cluster.id, updatedAt: now },
  })
  const remainingMembers = await tx.aiDailyCandidate.findMany({
    where: { runId: run.id, clusterId: sourceCluster.id },
    orderBy: [{ scoreTotal: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
    select: { id: true },
  })
  assertClusterTransition(sourceCluster.editorState, 'PROPOSED')
  const secondaryCluster = await tx.aiDailyCluster.update({
    where: { id: sourceCluster.id },
    data: {
      representativeCandidateId: remainingMembers[0]?.id ?? null,
      corroborationCount: remainingMembers.length,
      editorState: 'PROPOSED',
      editorReason: input.reason,
      updatedAt: now,
    },
  })
  await touchRun(tx, run, now)
  const override = await createOverride(tx, input, {
    clusterId: sourceCluster.id,
    payload: { newClusterId: cluster.id, splitCandidateIds: candidateIds },
  })
  return { override, candidate: null, cluster, secondaryCluster, workItem: null, runUpdatedAt: now }
}

async function lockRun(tx: Prisma.TransactionClient, runId: string) {
  const [run] = await tx.$queryRaw<LockedRun[]>`
    SELECT "id", "editionDate", "updatedAt"
    FROM "AiDailyRun"
    WHERE "id" = ${runId}
    FOR UPDATE
  `
  if (!run) throw new Error('ai-daily-run-not-found')
  return run
}

async function lockCandidate(tx: Prisma.TransactionClient, candidateId: string) {
  const [candidate] = await tx.$queryRaw<LockedCandidate[]>`
    SELECT "id", "runId", "sourceFeedId", "clusterId", "selectionState", "evidenceStatus", "evidenceVersion", "updatedAt"
    FROM "AiDailyCandidate"
    WHERE "id" = ${candidateId}
    FOR UPDATE
  `
  if (!candidate) throw new Error('ai-daily-candidate-not-found')
  return candidate
}

async function lockCluster(tx: Prisma.TransactionClient, clusterId: string) {
  const [cluster] = await tx.$queryRaw<LockedCluster[]>`
    SELECT "id", "runId", "representativeCandidateId", "stableIdentityKey", "groupingReason", "topic", "corroborationCount", "rank", "editorState", "updatedAt"
    FROM "AiDailyCluster"
    WHERE "id" = ${clusterId}
    FOR UPDATE
  `
  if (!cluster) throw new Error('ai-daily-cluster-not-found')
  return cluster
}

async function touchRun(tx: Prisma.TransactionClient, run: LockedRun, now: Date) {
  const updated = await tx.aiDailyRun.updateMany({
    where: { id: run.id, updatedAt: run.updatedAt },
    data: { updatedAt: now },
  })
  if (updated.count !== 1) throw new Error('ai-daily-editorial-override-conflict')
}

async function createOverride(
  tx: Prisma.TransactionClient,
  input: ApplyAiDailyEditorialOverrideInput,
  target: {
    candidateId?: string
    clusterId?: string
    observedVersion?: number
    payload?: Prisma.InputJsonValue
  },
) {
  return tx.aiDailyEditorialOverride.create({
    data: {
      runId: input.runId,
      candidateId: target.candidateId,
      clusterId: target.clusterId,
      action: input.action,
      actor: input.actor,
      reason: input.reason,
      expectedUpdatedAt: input.expectedUpdatedAt,
      observedVersion: target.observedVersion,
      payloadJson: target.payload,
    },
  })
}

function assertExpectedTimestamp(actual: Date, expected: Date) {
  if (actual.getTime() !== expected.getTime()) throw new Error('ai-daily-editorial-override-conflict')
}

function assertRunBoundary(actualRunId: string, expectedRunId: string) {
  if (actualRunId !== expectedRunId) throw new Error('ai-daily-editorial-run-boundary-mismatch')
}

function assertClusterTransition(current: AiDailyClusterEditorStateName, next: AiDailyClusterEditorStateName) {
  if (current === next) return
  const transition = evaluateAiDailyClusterEditorTransition(current, next)
  if (!transition.ok) throw new Error(transition.error)
}

function dedupe(items: string[]) {
  return Array.from(new Set(items))
}
