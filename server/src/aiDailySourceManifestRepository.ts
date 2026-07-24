import type { PrismaClient } from '@prisma/client'
import { loadAiDailySourceManifest } from './aiDailySourceManifest.js'
import { upsertAiDailySourceFeed } from './aiDailyIngestionRepository.js'

export async function syncAiDailySourceManifest(prisma: PrismaClient) {
  const manifest = await loadAiDailySourceManifest()
  let created = 0
  let updated = 0
  const feeds = []

  for (const source of manifest.sources) {
    const existing = await prisma.aiDailySourceFeed.findUnique({
      where: { kind_canonicalKey: { kind: source.kind, canonicalKey: source.canonicalKey } },
      select: { id: true, etag: true, lastModified: true },
    })
    const feed = await upsertAiDailySourceFeed(prisma, {
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
      // Manifest sync owns editorial configuration only. Preserve transport
      // validators learned from previous fetches so conditional requests keep
      // working across every refresh and service restart.
      etag: existing?.etag ?? null,
      lastModified: existing?.lastModified ?? null,
    })
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
  }
}
