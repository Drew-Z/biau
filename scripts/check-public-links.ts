import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { heroContent } from '../src/data/hero'
import { projects, type ProjectDetailSection, type ProjectVisualBlock } from '../src/data/portfolio'
import { MAIN_SITE_URL } from '../src/data/siteLinks'
import {
  findProjectPublication,
  getProjectCta,
  getPublishedProjectLinks,
  type ProjectLinkCandidate,
} from '../src/data/projectPublication'
import {
  buildPublicFailureSummary,
  classifyHttpResult,
  classifyNetworkFailure,
  normalizePublicIssueKinds,
  shouldRetryNetworkResult,
} from './lib/network-diagnostics.mjs'
import { resolveDiagnosticsOutput, resolveStatusOutput, writeJsonAtomically } from './lib/status-output.mjs'

type LinkIssueKind = '' | 'timeout' | 'dns_error' | 'tls_error' | 'connection_error' | 'network_error' | 'http_status'

interface LinkTarget {
  url: string
  contexts: string[]
}

interface CheckResult extends LinkTarget {
  ok: boolean
  status: number
  method: 'HEAD' | 'GET'
  durationMs: number
  finalUrl: string
  issue: string
  issueKind: LinkIssueKind
  attempts: LinkAttempt[]
  fallbackUsed: boolean
  recovered: boolean
}

interface LinkAttempt {
  method: 'HEAD' | 'GET'
  reason: 'initial' | 'method-fallback' | 'transient-retry'
  status: number
  durationMs: number
  issueKind: LinkIssueKind
}

const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_MAX_LINKS = 200
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv: string[]) {
  const args = {
    json: false,
    timeoutMs: Number(process.env.PUBLIC_LINKS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    maxLinks: Number(process.env.PUBLIC_LINKS_MAX || DEFAULT_MAX_LINKS),
  }

  const readValue = (index: number) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--json') {
      args.json = true
      continue
    }
    if (item === '--timeout') {
      args.timeoutMs = Number(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--timeout=')) {
      args.timeoutMs = Number(item.slice('--timeout='.length))
      continue
    }
    if (item === '--max-links') {
      args.maxLinks = Number(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--max-links=')) {
      args.maxLinks = Number(item.slice('--max-links='.length))
    }
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) args.timeoutMs = DEFAULT_TIMEOUT_MS
  if (!Number.isFinite(args.maxLinks) || args.maxLinks <= 0) args.maxLinks = DEFAULT_MAX_LINKS
  return args
}

function classifyIssueKind(result: CheckResult) {
  return result.ok ? '' : result.issueKind
}

function buildStatusIssues(results: CheckResult[]) {
  const failed = results.filter((result) => !result.ok)
  const recovered = results.filter((result) => result.recovered).length
  const issues = recovered ? [`${recovered} public project links recovered after a transient retry; initial failures are retained in diagnostics.`] : []
  if (failed.length === 0) return issues

  const issueKinds = normalizePublicIssueKinds(failed.map(classifyIssueKind).filter(Boolean))
  return [buildPublicFailureSummary(failed.length, issueKinds, 'npm.cmd run public-links:check'), ...issues]
}

function buildStatusPayload(checkedAt: string, results: CheckResult[]) {
  const failed = results.filter((result) => !result.ok)
  const passedCount = results.length - failed.length
  const firstFailedHttpStatus = failed.find((result) => result.status > 0)?.status ?? 0
  const firstIssueKind = failed.length > 0 ? classifyIssueKind(failed[0]) : ''
  const status =
    results.length === 0 ? 'unchecked' : failed.length === 0 ? 'online' : failed.length < results.length ? 'degraded' : 'offline'

  return {
    checkedAt,
    baseConfigured: true,
    ok: failed.length === 0,
    linkCount: results.length,
    failedCount: failed.length,
    checks: [
      {
        id: 'blog-semi-public-links',
        status,
        httpStatus: failed.length === 0 ? 200 : firstFailedHttpStatus,
        durationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
        checkedAt,
        summary: `${passedCount}/${results.length} public project links returned expected responses`,
        issues: buildStatusIssues(results),
        ...(firstIssueKind ? { issueKind: firstIssueKind } : {}),
      },
    ],
  }
}

function normalizePublicUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/')) return new URL(trimmed, MAIN_SITE_URL).toString()

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function pushTarget(targets: Map<string, Set<string>>, href: string | undefined, context: string) {
  if (!href) return
  const url = normalizePublicUrl(href)
  if (!url) return
  const contexts = targets.get(url) ?? new Set<string>()
  contexts.add(context)
  targets.set(url, contexts)
}

function flattenSections(sections: Record<string, ProjectDetailSection[] | undefined> | undefined) {
  return Object.values(sections ?? {}).flatMap((items) => items ?? [])
}

function pushProjectLink(targets: Map<string, Set<string>>, projectId: string, link: ProjectLinkCandidate, context: string) {
  pushTarget(targets, link.href, `${projectId}: ${context} / ${link.label}`)
}

function pushPublishedLinks(
  targets: Map<string, Set<string>>,
  projectId: string,
  publication: ReturnType<typeof findProjectPublication>,
  links: readonly ProjectLinkCandidate[],
  context: string,
) {
  for (const link of getPublishedProjectLinks(publication, links)) {
    pushProjectLink(targets, projectId, link, context)
  }
}

function visualSourceCandidate(visual: ProjectVisualBlock | undefined): ProjectLinkCandidate | undefined {
  if (!visual?.sourceUrl) return undefined
  return {
    label: visual.sourceLabel ?? '查看来源',
    href: visual.sourceUrl,
    type: visual.sourceUrl.startsWith('/') ? 'internal' : 'external',
    intent: visual.sourceIntent,
  }
}

export function collectTargets() {
  const targets = new Map<string, Set<string>>()

  for (const project of heroContent.projects) {
    const publication = findProjectPublication(project.id)
    if (!publication) {
      pushTarget(targets, project.externalLink, `home hero: ${project.id} / ${project.action}`)
      continue
    }

    const action = getProjectCta(publication)
    pushTarget(targets, action.href, `home hero: ${project.id} / ${project.action}`)
  }

  for (const project of projects) {
    const publication = findProjectPublication(project.id)
    pushPublishedLinks(targets, project.id, publication, project.links, 'project link')

    for (const section of flattenSections(project.detailContent)) {
      pushPublishedLinks(targets, project.id, publication, section.links ?? [], `section ${section.title}`)
      const visualSource = visualSourceCandidate(section.visual)
      if (visualSource) {
        pushPublishedLinks(targets, project.id, publication, [visualSource], `visual ${section.visual?.id ?? 'source'}`)
      }
    }
  }

  return Array.from(targets.entries())
    .map<LinkTarget>(([url, contexts]) => ({ url, contexts: Array.from(contexts).sort() }))
    .sort((a, b) => a.url.localeCompare(b.url))
}

function shouldFallbackToGet(status: number) {
  return status === 405 || status === 501
}

async function fetchOnce(url: string, method: 'HEAD' | 'GET', timeoutMs: number, fetcher: typeof fetch) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetcher(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'biau-public-link-check/1.0',
        Accept: method === 'HEAD' ? '*/*' : 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
      },
    })
    // This probe checks HTTP reachability. Do not download an unbounded body.
    void response.body?.cancel().catch(() => {})
    return {
      status: response.status,
      finalUrl: response.url,
      durationMs: Date.now() - startedAt,
      issue: '',
      issueKind: '' as const,
    }
  } catch (error) {
    const issue =
      error instanceof Error && error.name === 'AbortError'
        ? 'timeout'
        : error instanceof Error
          ? error.message
          : String(error)
    return {
      status: 0,
      finalUrl: url,
      durationMs: Date.now() - startedAt,
      issue,
      issueKind: classifyNetworkFailure(error) as Exclude<LinkIssueKind, '' | 'http_status'>,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkTarget(target: LinkTarget, timeoutMs: number, fetcher: typeof fetch = fetch): Promise<CheckResult> {
  const startedAt = Date.now()
  const attempts: LinkAttempt[] = []
  const attempt = async (method: 'HEAD' | 'GET', reason: LinkAttempt['reason']) => {
    const response = await fetchOnce(target.url, method, timeoutMs, fetcher)
    attempts.push({ method, reason, status: response.status, durationMs: response.durationMs,
      issueKind: response.issueKind || classifyHttpResult(response.status).issueKind as LinkIssueKind })
    return response
  }
  let method: 'HEAD' | 'GET' = 'HEAD'
  let result = await attempt(method, 'initial')
  const fallbackUsed = shouldFallbackToGet(result.status)

  if (fallbackUsed) {
    method = 'GET'
    result = await attempt(method, 'method-fallback')
  }

  const retried = shouldRetryNetworkResult(result.status, result.issueKind)
  if (retried) {
    await delay(750)
    result = await attempt(method, 'transient-retry')
  }

  const httpResult = classifyHttpResult(result.status)
  const ok = !result.issue && httpResult.ok
  const issue = result.issue || (ok ? '' : `HTTP ${result.status || 'request failed'}`)
  return {
    ...target,
    ok,
    status: result.status,
    method,
    durationMs: Date.now() - startedAt,
    finalUrl: result.finalUrl,
    issue,
    issueKind: result.issueKind || (httpResult.issueKind as 'http_status'),
    attempts,
    fallbackUsed,
    recovered: ok && retried,
  }
}

const knownProjectIds = new Set(projects.map((project) => project.id))

export function buildLinkDiagnostics(checkedAt: string, targetCount: number, results: CheckResult[]) {
  return {
    schemaVersion: 1,
    checkedAt,
    sourceRevision: /^[a-f0-9]{40}$/u.test(process.env.GITHUB_SHA ?? '') ? process.env.GITHUB_SHA : null,
    complete: results.length === targetCount,
    targetCount,
    checkedCount: results.length,
    failedCount: results.filter((result) => !result.ok).length,
    recoveredCount: results.filter((result) => result.recovered).length,
    results: results.map((result) => ({
      targetId: createHash('sha256').update(result.url).digest('hex'),
      projectIds: [...new Set(result.contexts.map((context) => context.startsWith('home hero: ')
        ? context.slice(11).split(' / ')[0] : context.split(': ')[0]).filter((id) => knownProjectIds.has(id)))],
      ok: result.ok,
      status: result.status,
      method: result.method,
      issueKind: result.issueKind,
      durationMs: result.durationMs,
      fallbackUsed: result.fallbackUsed,
      recovered: result.recovered,
      attempts: result.attempts.map(({ method, reason, status, durationMs, issueKind }) => ({ method, reason, status, durationMs, issueKind })),
    })),
  }
}

export async function checkTargets(targets: LinkTarget[], timeoutMs: number, options: {
  checkedAt?: string
  diagnosticsFile?: string
  fetcher?: typeof fetch
} = {}) {
  const checkedAt = options.checkedAt ?? new Date().toISOString()
  const results: CheckResult[] = []
  const persist = async () => {
    if (options.diagnosticsFile) {
      await writeJsonAtomically(options.diagnosticsFile, buildLinkDiagnostics(checkedAt, targets.length, results))
    }
  }
  await persist()
  for (const target of targets) {
    results.push(await checkTarget(target, timeoutMs, options.fetcher))
    await persist()
  }
  return results
}

function printMarkdown(checkedAt: string, results: CheckResult[]) {
  const failed = results.filter((result) => !result.ok)
  console.log('# Public link check')
  console.log('')
  console.log(`- checkedAt: ${checkedAt}`)
  console.log(`- links: ${results.length}`)
  console.log(`- failed: ${failed.length}`)
  console.log('')
  console.log('| status | method | target | contexts | ms | issue / attempts |')
  console.log('|---|---|---|---:|---:|---|')
  for (const result of results) {
    console.log(
      `| ${result.ok ? result.recovered ? 'RECOVERED' : 'PASS' : 'FAIL'} | ${result.method} | ${result.url} | ${result.contexts.length} | ${result.durationMs} | ${result.issue} ${result.attempts.map((attempt) => `${attempt.method}:${attempt.status || attempt.issueKind}`).join(' → ')} |`,
    )
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)
  const diagnosticsFile = resolveDiagnosticsOutput(argv, { repoRoot })
  const statusOutput = resolveStatusOutput(argv, {
    repoRoot,
    defaultRelativePath: 'public/status/public-links-synthetic.json',
    allowReliabilityTemp: true,
  })
  const checkedAt = new Date().toISOString()
  const targets = collectTargets().slice(0, args.maxLinks)
  const results = await checkTargets(targets, args.timeoutMs, { checkedAt, diagnosticsFile })

  const payload = {
    ok: results.every((result) => result.ok),
    checkedAt,
    linkCount: results.length,
    failedCount: results.filter((result) => !result.ok).length,
    recoveredCount: results.filter((result) => result.recovered).length,
    results,
  }

  if (statusOutput.enabled) {
    const statusPayload = buildStatusPayload(checkedAt, results)
    await writeJsonAtomically(statusOutput.filePath, statusPayload)
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printMarkdown(checkedAt, results)
  }

  if (!payload.ok) process.exitCode = 1
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
