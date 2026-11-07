import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DAILY_INDEX_MAX_BYTES, DAILY_MARKDOWN_MAX_BYTES, dailySha256, decodeDailyDetail, decodeDailyIndex, isDailyEditionId, isDailyRecord, type DailyEdition, type DailyEditionDetail, type DailyEditionIndex } from '../../src/data/aiDailyEditions.ts'

const here = dirname(fileURLToPath(import.meta.url))
export const contentBranch = 'codex/ai-daily-content'
export const emptyIndex: DailyEditionIndex = { schemaVersion: 1, latestEditionId: null, editions: [] }

export async function configurationHash() {
  const relative = ['config.json', 'budget.json', ...(await readdir(join(here, 'profiles'), { recursive: true })).filter((p) => p.includes('.')).map((p) => `profiles/${p.replaceAll('\\', '/')}`)].sort()
  const hash = createHash('sha256')
  for (const path of relative) hash.update(path).update('\0').update((await readFile(join(here, path), 'utf8')).replaceAll('\r\n', '\n')).update('\0')
  return hash.digest('hex')
}

function requireCondition(condition: unknown, error: string): asserts condition {
  if (!condition) throw new Error(error)
}

export async function packageEdition(raw: unknown, publishedAt: string): Promise<DailyEditionDetail> {
  requireCondition(isDailyRecord(raw) && isDailyRecord(raw.checks) && isDailyRecord(raw.runtime), 'invalid-bundle')
  const budget = JSON.parse(await readFile(join(here, 'budget.json'), 'utf8'))
  const upstream = JSON.parse(await readFile(join(here, 'upstream.json'), 'utf8'))
  const config = JSON.parse(await readFile(join(here, 'config.json'), 'utf8'))
  const c = raw.checks
  requireCondition(raw.schemaVersion === 1 && typeof raw.editionId === 'string' && isDailyEditionId(raw.editionId), 'invalid-edition')
  requireCondition(Array.isArray(raw.sourceLinks) && raw.sourceLinks.length > 0 && raw.sourceLinks.length <= budget.maxPublishedItems, 'invalid-source-count')
  requireCondition(['raw', 'scored', 'scoreFailed', 'selected', 'enriched', 'failed', 'itemsUsed'].every((key) => Number.isSafeInteger(c[key]) && Number(c[key]) >= 0), 'invalid-stage-counts')
  requireCondition(c.fetchStatus === 'success' && c.failedSources === 0 && Number(c.raw) > 0 && Number(c.raw) <= budget.maxFetchedItems && Number(c.scored) + Number(c.scoreFailed) === c.raw, 'incomplete-fetch-or-score')
  requireCondition(c.enrichmentStatus === (Number(c.failed) > 0 ? 'partial' : 'success') && c.summaryStage === 'enriched' && c.language === 'zh', 'incomplete-enrichment-or-summary')
  requireCondition(c.enriched === raw.sourceLinks.length && Number(c.selected) <= Number(c.scored) && Number(c.selected) <= budget.maxPublishedItems && Number(c.enriched) + Number(c.failed) === c.selected && c.itemsUsed === c.enriched, 'incomplete-items')
  requireCondition(Number(c.scored) / Number(c.raw) >= budget.minStageCompletionRatio && Number(c.enriched) / Number(c.selected) >= budget.minStageCompletionRatio, 'insufficient-stage-coverage')
  const omissions = raw.runtime.omissions
  const items = raw.runtime.items
  requireCondition(raw.runtime.stopped === false && Array.isArray(omissions) && omissions.length === Number(c.scoreFailed) + Number(c.failed) && omissions.length < budget.maxItemFailures, 'invalid-omissions')
  requireCondition(omissions.every((item) => isDailyRecord(item) && typeof item.id === 'string' && item.id && (item.stage === 'score' || item.stage === 'enrich')), 'invalid-omissions')
  requireCondition(new Set(omissions.map((item) => item.id)).size === omissions.length && omissions.filter((item) => item.stage === 'score').length === c.scoreFailed && omissions.filter((item) => item.stage === 'enrich').length === c.failed, 'invalid-omissions')
  const omittedIds = new Set(omissions.map((item) => item.id))
  const sourceUrls = raw.sourceLinks.map((item) => isDailyRecord(item) ? item.url : null)
  requireCondition(Array.isArray(items) && items.length === c.enriched && items.every((item, index) => isDailyRecord(item) && typeof item.id === 'string' && item.id && !omittedIds.has(item.id) && item.url === sourceUrls[index] && typeof item.score === 'number' && Number.isFinite(item.score) && item.score >= config.processing.profile_settings['ai-news'].threshold && item.score <= 10) && new Set(items.map((item) => item.id)).size === items.length, 'incomplete-published-items')
  requireCondition(raw.runtime.engineRevision === upstream.revision && raw.runtime.configurationHash === await configurationHash(), 'runtime-drift')
  requireCondition(Number.isSafeInteger(raw.runtime.requests) && Number(raw.runtime.requests) > 0 && Number(raw.runtime.requests) <= budget.maxModelRequests, 'request-budget-invalid')
  requireCondition(typeof raw.markdown === 'string' && raw.markdown.trim() && Buffer.byteLength(raw.markdown) <= DAILY_MARKDOWN_MAX_BYTES, 'invalid-markdown')
  // This is a publication check, independent of the browser's element/URL allowlist.
  requireCondition(!/(?:\bsk-[\w-]{12,}|Bearer\s+[\w.-]{12,}|-----BEGIN .*PRIVATE KEY|[A-Za-z]:[\\/](?:Users|workspace)|\b(?:API_KEY|BASE_URL)\s*[=:])/iu.test(JSON.stringify(raw.sourceLinks) + raw.markdown), 'private-content-rejected')
  requireCondition(!/<\s*\/?\s*(?:script|iframe|object|embed|svg|img|style|form)\b|(?:javascript|vbscript|data):/iu.test(raw.markdown), 'unsafe-markdown-rejected')
  const markdown = omissions.length ? `${raw.markdown.trimEnd()}\n\n> 本期采集 ${c.raw} 条，完成评分 ${c.scored} 条，收录 ${c.enriched} 条。另有 ${c.scoreFailed} 条未完成评分、${c.failed} 条未完成摘要，均未收录。\n` : raw.markdown
  requireCondition(Buffer.byteLength(markdown) <= DAILY_MARKDOWN_MAX_BYTES, 'invalid-markdown')
  const date = raw.editionId.slice(0, 10)
  const slot = raw.editionId.slice(11)
  const contentSha256 = await dailySha256(markdown)
  const edition = {
    schemaVersion: 1, editionId: raw.editionId, editionDate: date, slot, timezone: 'Asia/Shanghai', language: 'zh',
    title: `${date} AI 日报 · ${slot === 'morning' ? '早报' : '晚报'}`, itemCount: raw.sourceLinks.length,
    scheduledFor: raw.scheduledFor, generatedAt: raw.generatedAt, publishedAt, updatedAt: publishedAt,
    windowStart: raw.windowStart, windowEnd: raw.windowEnd, revision: 1, sourceLinks: raw.sourceLinks,
    markdownPath: `editions/${raw.editionId}/${contentSha256}.md`, contentSha256,
  }
  const detail = await decodeDailyDetail({ edition, markdown })
  requireCondition(detail, 'edition-contract-invalid')
  return detail
}

export function planPublication(index: DailyEditionIndex, detail: DailyEditionDetail, correction = false) {
  requireCondition(decodeDailyIndex(index), 'existing-index-invalid')
  const previous = index.editions.find((item) => item.editionId === detail.edition.editionId)
  if (previous?.contentSha256 === detail.edition.contentSha256) return { changed: false, index, edition: previous }
  requireCondition(!previous || correction, 'edition-already-published')
  const edition: DailyEdition = previous ? { ...detail.edition, revision: previous.revision + 1, publishedAt: previous.publishedAt, updatedAt: detail.edition.updatedAt } : detail.edition
  // Corrected content can be generated after its first publication.
  const editions = [...index.editions.filter((item) => item.editionId !== edition.editionId), edition].sort((a, b) => Date.parse(b.scheduledFor) - Date.parse(a.scheduledFor))
  const next = decodeDailyIndex({ schemaVersion: 1, latestEditionId: editions[0].editionId, editions })
  requireCondition(next && Buffer.byteLength(JSON.stringify(next, null, 2) + '\n') <= DAILY_INDEX_MAX_BYTES, 'next-index-invalid-or-full')
  return { changed: true, index: next, edition }
}

export async function requirePublicationGate(detail: DailyEditionDetail, index: DailyEditionIndex, gate: unknown) {
  requireCondition(isDailyRecord(gate) && gate.enabled === true && gate.configurationHash === await configurationHash(), 'first-edition-not-accepted')
  const accepted = index.editions.find((item) => item.editionId === gate.firstEditionId)
  requireCondition((accepted && (accepted.contentSha256 === gate.firstContentSha256 || accepted.revision > 1)) ||
    (index.editions.length === 0 && detail.edition.editionId === gate.firstEditionId && detail.edition.contentSha256 === gate.firstContentSha256), 'accepted-first-edition-missing')
}

function git(args: string[], input?: string, env?: NodeJS.ProcessEnv) {
  return execFileSync('git', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024, env: { ...process.env, ...env } }).trim()
}

function remoteSnapshot() {
  const ref = `refs/heads/${contentBranch}`
  const result = git(['ls-remote', '--heads', 'origin', ref])
  if (!result) return { parent: null, index: emptyIndex }
  git(['fetch', '--no-tags', 'origin', ref])
  const parent = git(['rev-parse', 'FETCH_HEAD'])
  const paths = git(['ls-tree', '-r', '--name-only', parent]).split('\n')
  requireCondition(paths.every((path) => path === 'index.json' || /^editions\/\d{4}-\d{2}-\d{2}-(morning|evening)\/[a-f0-9]{64}(?:\.r\d+\.json|\.md)$/u.test(path)), 'unexpected-content-branch-files')
  const index = decodeDailyIndex(JSON.parse(git(['show', `${parent}:index.json`])))
  requireCondition(index, 'remote-index-invalid')
  return { parent, index }
}

export async function publish(detail: DailyEditionDetail, gate: unknown, indexFile: string, correction = false) {
  // Fetch again immediately before publication; one non-force push is atomic.
  // A conflict stops here. Retrying publication reuses the same generated bundle.
  const { parent, index } = remoteSnapshot()
  await requirePublicationGate(detail, index, gate)
  const plan = planPublication(index, detail, correction)
  if (!plan.changed) return { published: false, reason: 'already-published' }
  const env = { GIT_INDEX_FILE: resolve(indexFile) }
  if (parent) git(['read-tree', parent], undefined, env)
  else git(['read-tree', '--empty'], undefined, env)
  const files = new Map([
    [plan.edition.markdownPath, detail.markdown],
    [plan.edition.markdownPath.replace(/\.md$/u, `.r${plan.edition.revision}.json`), JSON.stringify(plan.edition, null, 2) + '\n'],
    ['index.json', JSON.stringify(plan.index, null, 2) + '\n'],
  ])
  for (const [path, body] of files) {
    const blob = git(['hash-object', '-w', '--stdin'], body)
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${path}`], undefined, env)
  }
  const tree = git(['write-tree'], undefined, env)
  const commit = git(['-c', 'user.name=AI Daily Publisher', '-c', 'user.email=ai-daily@users.noreply.github.com', 'commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `Publish ${detail.edition.editionId}`])
  git(['push', 'origin', `${commit}:refs/heads/${contentBranch}`])
  return { published: true, editionId: plan.edition.editionId, commit }
}

async function main() {
  const [operation, ...args] = process.argv.slice(2)
  const value = (name: string) => args[args.indexOf(name) + 1]
  if (operation === 'exists') {
    const editionId = value('--edition-id')
    requireCondition(isDailyEditionId(editionId ?? ''), 'invalid-edition')
    console.log(JSON.stringify({ exists: remoteSnapshot().index.editions.some((e) => e.editionId === editionId) }))
    return
  }
  requireCondition(operation === 'preview' || operation === 'publish', 'expected-preview-or-publish')
  requireCondition(args.includes('--bundle'), 'bundle-required')
  const detail = await packageEdition(JSON.parse(await readFile(value('--bundle'), 'utf8')), new Date().toISOString())
  if (operation === 'preview') {
    requireCondition(args.includes('--output'), 'preview-output-required')
    const output = resolve(value('--output'))
    const plan = planPublication(emptyIndex, detail)
    await mkdir(join(output, dirname(detail.edition.markdownPath)), { recursive: true })
    await writeFile(join(output, detail.edition.markdownPath), detail.markdown, { flag: 'wx' })
    await writeFile(join(output, 'index.json'), JSON.stringify(plan.index, null, 2) + '\n', { flag: 'wx' })
    console.log(JSON.stringify({ preview: true, editionId: detail.edition.editionId, contentSha256: detail.edition.contentSha256 }))
  } else {
    requireCondition(args.includes('--index-file'), 'isolated-git-index-required')
    console.log(JSON.stringify(await publish(detail, JSON.parse(await readFile(join(here, 'publication.json'), 'utf8')), value('--index-file'), args.includes('--correction'))))
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('AI Daily publication stopped; existing public index is unchanged.'); process.exitCode = 1 })
}
