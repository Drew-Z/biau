import type { PrismaClient } from '@prisma/client'
import { loadAiDailySourceManifest } from './aiDailySourceManifest.js'
import { updateAiDailySourceFeed, upsertAiDailySourceFeed } from './aiDailyIngestionRepository.js'

export async function syncAiDailySourceManifest(prisma: PrismaClient) {
  const manifest = await loadAiDailySourceManifest()
  let created = 0
  let updated = 0
  const feeds = []

  for (const source of manifest.sources) {
    const [byIdentity, byManifestId, byName] = await Promise.all([
      prisma.aiDailySourceFeed.findUnique({
        where: { kind_canonicalKey: { kind: source.kind, canonicalKey: source.canonicalKey } },
        select: { id: true, etag: true, lastModified: true },
      }),
      prisma.aiDailySourceFeed.findUnique({
        where: { id: source.id },
        select: { id: true, etag: true, lastModified: true },
      }),
      prisma.aiDailySourceFeed.findMany({
        where: { name: source.name },
        select: { id: true, etag: true, lastModified: true },
        take: 2,
      }),
    ])
    if (byIdentity && byManifestId && byIdentity.id !== byManifestId.id) {
      throw new Error(`ai-daily-manifest-source-identity-conflict:${source.id}`)
    }
    const existing = byIdentity ?? byManifestId ?? (byName.length === 1 ? byName[0] : null)
    const definition = {
      id: source.id,
      name: source.name,
      kind: source.kind,
      url: source.url,
      locale: source.locale,
      tier: source.tier,
      topics: source.topics,
      enabled: source.enabled,
      intervalMinutes: source.intervalMinutes,
      lookbackMinutes: source.lookbackMinutes,
      officialDomain: source.officialDomain,
    } as const
    const feed = existing
      ? await updateAiDailySourceFeed(prisma, { id: existing.id, patch: definition })
      : await upsertAiDailySourceFeed(prisma, definition)
    if (existing) updated += 1
    else created += 1
    feeds.push(feed)
  }

  return {
    schemaVersion: manifest.schemaVersion,
    readiness: manifest.readiness,
    sourceCount: manifest.sources.length,
    enabledSourceCount: manifest.sources.filter((source) => source.enabled).length,
    queryGroupCount: manifest.queryGroups.length,
    enabledQueryGroupCount: manifest.queryGroups.filter((group) => group.enabled).length,
    created,
    updated,
    feeds,
    queryGroups: manifest.queryGroups.filter((group) => group.enabled),
  }
}
