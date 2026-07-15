import { Prisma } from '@prisma/client'
import { disconnectPrisma, getPrisma } from '../src/db.js'
import { env } from '../src/env.js'

type LegacyMemorySummaryRow = {
  memberId: string
  activeCount: bigint
  latestUpdatedAt: Date | null
}

type LegacyMemoryRow = {
  id: string
  memberId: string
  kind: 'PREFERENCE' | 'PROJECT' | 'WORKFLOW' | 'CONTEXT'
  title: string
  content: string
  contentHash: string
  status: 'ACTIVE' | 'ARCHIVED'
  createdAt: Date
  updatedAt: Date
}

const mode = process.argv.includes('--apply') ? 'apply' : 'check'
const legacyMemberId = process.env.OPERATOR_MIGRATION_MEMBER_ID?.trim() ?? ''
const selectedMemoryIds = readCsv(process.env.OPERATOR_MIGRATION_MEMORY_IDS)

async function main() {
  const prisma = getPrisma()
  if (!prisma) throw new Error('DATABASE_URL is required for the Operator memory migration report.')

  if (!legacyMemberId) {
    const summaries = await prisma.$queryRaw<LegacyMemorySummaryRow[]>(Prisma.sql`
      SELECT
        "memberId",
        COUNT(*)::bigint AS "activeCount",
        MAX("updatedAt") AS "latestUpdatedAt"
      FROM "AgentMemory"
      WHERE "status" = 'ACTIVE'
      GROUP BY "memberId"
      ORDER BY MAX("updatedAt") DESC
    `)

    printJson({
      mode: 'check',
      ready: false,
      reason: 'operator-migration-member-id-required',
      candidates: summaries.map((row) => ({
        memberId: row.memberId,
        activeMemoryCount: Number(row.activeCount),
        latestUpdatedAt: row.latestUpdatedAt?.toISOString() ?? null,
      })),
      next: 'Set OPERATOR_MIGRATION_MEMBER_ID to the confirmed legacy owner member id, then run the check again.',
    })
    return
  }

  const memories = await prisma.$queryRaw<LegacyMemoryRow[]>(Prisma.sql`
    SELECT
      "id",
      "memberId",
      "kind",
      "title",
      "content",
      "contentHash",
      "status",
      "createdAt",
      "updatedAt"
    FROM "AgentMemory"
    WHERE "memberId" = ${legacyMemberId} AND "status" = 'ACTIVE'
    ORDER BY "updatedAt" DESC
  `)

  const redactedMemories = memories.map((memory) => ({
    id: memory.id,
    kind: memory.kind,
    status: memory.status,
    contentHashPrefix: memory.contentHash.slice(0, 12),
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  }))

  if (mode === 'check') {
    printJson({
      mode,
      ready: memories.length > 0,
      legacyMemberId,
      operatorOwnerId: env.operatorOwnerId,
      activeMemoryCount: memories.length,
      memories: redactedMemories,
      next:
        memories.length > 0
          ? 'Review the redacted ids, set OPERATOR_MIGRATION_MEMORY_IDS to the approved comma-separated ids, then run --apply.'
          : 'No ACTIVE legacy memories were found for this member id; do not run --apply.',
    })
    return
  }

  if (selectedMemoryIds.length === 0) {
    throw new Error('OPERATOR_MIGRATION_MEMORY_IDS is required in --apply mode.')
  }

  const approved = memories.filter((memory) => selectedMemoryIds.includes(memory.id))
  const missingIds = selectedMemoryIds.filter((id) => !approved.some((memory) => memory.id === id))
  if (missingIds.length > 0) {
    throw new Error(`Selected memory ids are not ACTIVE records owned by OPERATOR_MIGRATION_MEMBER_ID: ${missingIds.join(', ')}`)
  }

  const migrated = await prisma.$transaction(async (tx) => {
    let inserted = 0
    for (const memory of approved) {
      inserted += await tx.$executeRaw(Prisma.sql`
        INSERT INTO "OperatorMemory" (
          "id",
          "ownerId",
          "sessionId",
          "sourceMessageId",
          "kind",
          "title",
          "content",
          "contentHash",
          "status",
          "archivedAt",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${memory.id},
          ${env.operatorOwnerId},
          NULL,
          NULL,
          ${memory.kind}::"AgentMemoryKind",
          ${memory.title},
          ${memory.content},
          ${memory.contentHash},
          'ACTIVE'::"AgentMemoryStatus",
          NULL,
          ${memory.createdAt},
          ${memory.updatedAt}
        )
        ON CONFLICT ("ownerId", "contentHash") DO NOTHING
      `)
    }
    return inserted
  })

  printJson({
    mode,
    legacyMemberId,
    operatorOwnerId: env.operatorOwnerId,
    approvedMemoryIds: selectedMemoryIds,
    inserted: migrated,
    skippedAsExisting: selectedMemoryIds.length - migrated,
    destructiveCleanupPerformed: false,
  })
}

function readCsv(value: string | undefined) {
  return Array.from(new Set((value ?? '').split(',').map((item) => item.trim()).filter(Boolean)))
}

function printJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : 'operator-memory-migration-failed'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
