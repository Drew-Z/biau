import { dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { heroContent } from '../src/data/hero'
import { projects, type ProjectDetailSection, type ProjectLink, type ProjectVisualBlock } from '../src/data/portfolio'
import { MAIN_SITE_URL } from '../src/data/siteLinks'
import {
  buildPublicFailureSummary,
  classifyHttpResult,
  classifyNetworkFailure,
  normalizePublicIssueKinds,
  shouldRetryNetworkResult,
} from './lib/network-diagnostics.mjs'
import { resolveStatusOutput, writeJsonAtomically } from './lib/status-output.mjs'

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
  if (failed.length === 0) return []

  const issueKinds = normalizePublicIssueKinds(failed.map(classifyIssueKind).filter(Boolean))
  return [buildPublicFailureSummary(failed.length, issueKinds, 'npm.cmd run public-links:check')]
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

function pushProjectLink(targets: Map<string, Set<string>>, projectId: string, link: ProjectLink, context: string) {
  pushTarget(targets, link.href, `${projectId}: ${context} / ${link.label}`)
}

function pushVisualSource(targets: Map<string, Set<string>>, projectId: string, visual: ProjectVisualBlock | undefined) {
  if (!visual?.sourceUrl) return
  pushTarget(targets, visual.sourceUrl, `${projectId}: visual ${visual.id} / ${visual.sourceLabel ?? 'source'}`)
}

function collectTargets() {
  const targets = new Map<string, Set<string>>()

  for (const project of heroContent.projects) {
    pushTarget(targets, project.externalLink, `home hero: ${project.id} / ${project.action}`)
  }

  for (const project of projects) {
    if (project.detailLink) pushProjectLink(targets, project.id, project.detailLink, 'detailLink')
    for (const link of project.links) pushProjectLink(targets, project.id, link, 'project link')

    for (const section of flattenSections(project.detailContent)) {
      for (const link of section.links ?? []) pushProjectLink(targets, project.id, link, `section ${section.title}`)
      pushVisualSource(targets, project.id, section.visual)
    }
  }

  return Array.from(targets.entries())
    .map<LinkTarget>(([url, contexts]) => ({ url, contexts: Array.from(contexts).sort() }))
    .sort((a, b) => a.url.localeCompare(b.url))
}

function shouldFallbackToGet(status: number) {
  return status === 405 || status === 501
}

async function fetchOnce(url: string, method: 'HEAD' | 'GET', timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'biau-public-link-check/1.0',
        Accept: method === 'HEAD' ? '*/*' : 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
      },
    })
    if (method === 'GET') await response.arrayBuffer().catch(() => null)
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

async function checkTarget(target: LinkTarget, timeoutMs: number): Promise<CheckResult> {
  let method: 'HEAD' | 'GET' = 'HEAD'
  let result = await fetchOnce(target.url, method, timeoutMs)

  if (shouldFallbackToGet(result.status)) {
    method = 'GET'
    result = await fetchOnce(target.url, method, timeoutMs)
  }

  if (shouldRetryNetworkResult(result.status, result.issueKind)) {
    await delay(750)
    const retry = await fetchOnce(target.url, method, timeoutMs)
    result = {
      ...retry,
      durationMs: result.durationMs + retry.durationMs,
    }
  }

  const httpResult = classifyHttpResult(result.status)
  const ok = !result.issue && httpResult.ok
  const issue = result.issue || (ok ? '' : `HTTP ${result.status || 'request failed'}`)
  return {
    ...target,
    ok,
    status: result.status,
    method,
    durationMs: result.durationMs,
    finalUrl: result.finalUrl,
    issue,
    issueKind: result.issueKind || (httpResult.issueKind as 'http_status'),
  }
}

function printMarkdown(checkedAt: string, results: CheckResult[]) {
  const failed = results.filter((result) => !result.ok)
  console.log('# Public link check')
  console.log('')
  console.log(`- checkedAt: ${checkedAt}`)
  console.log(`- links: ${results.length}`)
  console.log(`- failed: ${failed.length}`)
  console.log('')
  console.log('| status | method | target | contexts | ms | issue |')
  console.log('|---|---|---|---:|---:|---|')
  for (const result of results) {
    console.log(
      `| ${result.ok ? 'PASS' : 'FAIL'} | ${result.method} | ${result.url} | ${result.contexts.length} | ${result.durationMs} | ${result.issue} |`,
    )
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)
  const statusOutput = resolveStatusOutput(argv, {
    repoRoot,
    defaultRelativePath: 'public/status/public-links-synthetic.json',
    allowReliabilityTemp: true,
  })
  const checkedAt = new Date().toISOString()
  const targets = collectTargets().slice(0, args.maxLinks)
  const results: CheckResult[] = []

  for (const target of targets) {
    results.push(await checkTarget(target, args.timeoutMs))
  }

  const payload = {
    ok: results.every((result) => result.ok),
    checkedAt,
    linkCount: results.length,
    failedCount: results.filter((result) => !result.ok).length,
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
