import {
  type AiDailyCandidateLeadInput,
  type AiDailyDiscoveryAdapter,
  type AiDailyEvidenceCandidate,
  type AiDailySourceFeedDefinition,
  normalizeAiDailyCandidateLead,
  normalizeAiDailySourceFeedDefinition,
  createAiDailyContentHash,
} from './aiDailyIngestion.js'
import type { AiDailyHttpTransport, AiDailyResolvedAddress, AiDailyRobotsChecker } from './aiDailySafeFetch.js'

export const aiDailyFixtureNow = new Date('2026-07-18T00:00:00.000Z')

export function buildAiDailySourceFeedFixture(
  overrides: Partial<Parameters<typeof normalizeAiDailySourceFeedDefinition>[0]> = {},
): AiDailySourceFeedDefinition {
  const result = normalizeAiDailySourceFeedDefinition({
    id: 'feed-openai-releases',
    name: 'OpenAI releases',
    kind: 'RSS',
    url: 'https://openai.com/news/rss.xml',
    locale: 'en-US',
    tier: 'TIER_1',
    topics: ['models', 'platform'],
    officialDomain: 'openai.com',
    lastSuccessfulAt: new Date('2026-07-17T23:45:00.000Z'),
    nextCollectAt: new Date('2026-07-18T00:00:00.000Z'),
    etag: '"fixture-etag"',
    lastModified: 'Fri, 17 Jul 2026 23:45:00 GMT',
    ...overrides,
  })
  if (!result.ok) throw new Error(`invalid source feed fixture: ${result.issues.join(',')}`)
  return result.feed
}

export const aiDailyRssFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>OpenAI News</title>
<item><guid>release-1</guid><title>OpenAI releases a new reasoning model</title><link>https://openai.com/index/new-reasoning-model/?utm_source=rss</link><pubDate>Fri, 17 Jul 2026 23:50:00 GMT</pubDate><description>Model release notes and API details.</description></item>
<item><guid>old-release</guid><title>Old release outside lookback</title><link>https://openai.com/index/old-release</link><pubDate>Fri, 17 Jul 2026 20:00:00 GMT</pubDate></item>
</channel></rss>`

export const aiDailyAtomFixture = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>GitHub Releases</title>
<entry><id>tag:github.com,2026:release-1</id><title>v2.0.0</title><link rel="alternate" href="https://github.com/example/agent/releases/tag/v2.0.0"/><updated>2026-07-17T23:55:00Z</updated><summary>Agent runtime release.</summary></entry>
</feed>`

export const aiDailyOfficialPageFixture = `<!doctype html><html><head><meta property="og:site_name" content="Anthropic News"></head><body><main>
<article><a href="/news/context-systems"><span>Context systems update for agents</span></a><time datetime="2026-07-17T23:40:00Z"></time><p>New context engineering guidance.</p></article>
</main></body></html>`

export const aiDailyEvidenceHtmlFixture = `<!doctype html><html><head>
<title>OpenAI releases a new reasoning model</title>
<meta property="og:site_name" content="OpenAI">
<meta name="author" content="OpenAI Product">
<meta property="article:published_time" content="2026-07-17T23:50:00Z">
</head><body><article><h1>OpenAI releases a new reasoning model</h1><h2>API availability</h2>
<p>The model is available through the Responses API. The release adds stronger tool use, structured output support, and updated safety evaluations for production agent workflows.</p>
<p>Developers can inspect the published model card, migration notes, and latency guidance before changing production traffic.</p>
</article></body></html>`

export function buildAiDailyEvidenceCandidateFixture(input: {
  index: number
  domain?: string
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3'
  topic?: string
  title?: string
  publishedAt?: Date
  leadOnly?: boolean
  evidenceStatus?: AiDailyEvidenceCandidate['evidenceStatus']
  contentHash?: string
}): AiDailyEvidenceCandidate {
  const domain = input.domain ?? `source${input.index}.example.com`
  const title = input.title ?? `AI agent platform update ${input.index}`
  const normalized = normalizeAiDailyCandidateLead({
    id: `candidate-${input.index}`,
    providerKind: 'fixture',
    providerRole: input.leadOnly ? 'signal' : 'stable',
    observationKey: `fixture-${input.index}`,
    observedAt: aiDailyFixtureNow,
    originalUrl: `https://${domain}/news/${input.index}`,
    title,
    publisher: domain,
    publishedAt: input.publishedAt ?? new Date(aiDailyFixtureNow.getTime() - input.index * 5 * 60_000),
    locale: 'en-US',
    sourceTier: input.tier ?? (input.index <= 3 ? 'TIER_1' : 'TIER_2'),
    topics: [input.topic ?? (input.index % 2 === 0 ? 'agents' : 'models')],
    leadOnly: input.leadOnly ?? false,
  })
  if (!normalized.ok) throw new Error(`invalid candidate fixture: ${normalized.issues.join(',')}`)
  const evidenceText = `${title}. This fixture contains evidence about AI models, agents, inference, APIs, evaluation, deployment, and engineering impact. `.repeat(12)
  return {
    ...normalized.candidate,
    fetchStatus: 'FETCHED',
    evidenceStatus: input.evidenceStatus ?? 'READY',
    contentHash: input.contentHash ?? createAiDailyContentHash(evidenceText),
    evidenceText,
    evidenceHeadingCount: 3,
  }
}

export function buildAiDailySelectionFixtureCandidates() {
  const titles = [
    'OpenAI launches reasoning API controls',
    'Anthropic publishes agent safety evaluations',
    'Google releases multimodal inference toolkit',
    'Microsoft adds enterprise agent observability',
    'Meta opens a compact language model family',
    'Hugging Face ships faster transformer runtime',
    'LangChain introduces durable workflow checkpoints',
    'Qdrant improves hybrid vector retrieval',
    'Researchers benchmark long context reliability',
    'Developers discuss local model deployment costs',
  ]
  return Array.from({ length: 10 }, (_, offset) =>
    buildAiDailyEvidenceCandidateFixture({
      index: offset + 1,
      title: titles[offset],
      domain: `publisher${(offset % 5) + 1}.example.com`,
      tier: offset < 3 ? 'TIER_1' : offset < 8 ? 'TIER_2' : 'TIER_3',
      topic: ['models', 'agents', 'research', 'tools'][offset % 4],
    }),
  )
}

export function buildAiDailyDiscoveryAdapterFixture(input: {
  id: string
  slot: AiDailyDiscoveryAdapter['slot']
  candidates?: AiDailyCandidateLeadInput[]
  error?: Error | null
}): AiDailyDiscoveryAdapter {
  return {
    id: input.id,
    slot: input.slot,
    async discover() {
      if (input.error) throw input.error
      return input.candidates ?? []
    },
  }
}

export function buildAiDailyHttpFixture(input: {
  responses: Array<{ status: number; headers?: Record<string, string>; body: string }>
}) {
  const queue = [...input.responses]
  const transport: AiDailyHttpTransport = {
    async request() {
      const response = queue.shift()
      if (!response) throw new Error('fixture-response-missing')
      return {
        status: response.status,
        headers: response.headers ?? { 'content-type': 'text/html; charset=utf-8' },
        body: Buffer.from(response.body),
      }
    },
  }
  const resolveHost = async (): Promise<AiDailyResolvedAddress[]> => [{ address: '93.184.216.34', family: 4 }]
  const robots: AiDailyRobotsChecker = { async allowed() { return true } }
  return { transport, resolveHost, robots }
}
