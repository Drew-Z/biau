import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  reliabilityProjects,
  reliabilityStatusOrder,
  siteStatusTargets,
  type ReliabilityStatus,
} from '../src/data/statusTargets'

const statusDir = resolve(process.cwd(), 'public/status')
const allowedSyntheticStatuses = new Set<Exclude<ReliabilityStatus, 'planned'>>([
  'online',
  'degraded',
  'offline',
  'unchecked',
])
const issueKinds = new Set([
  'timeout',
  'dns_error',
  'tls_error',
  'connection_error',
  'network_error',
  'http_status',
  'not_checked',
])
const erpRegistrationStatuses = new Set(['open', 'closed-by-env', 'deploy-stale', 'blocked', 'unchecked'])
const legalDemoAccessStatuses = new Set(['open-demo', 'credential-required', 'blocked-by-login', 'degraded', 'offline'])
const legalProtectedCheckIds = new Set(['legal-rag-qa', 'legal-rag-contract-review', 'legal-rag-observability'])
const xunqiuApkGateStatuses = new Set([
  'not-configured',
  'stage-apk-found',
  'release-like-artifact-found',
  'debug-only',
  'unknown-artifact-found',
  'no-artifact',
  'approved-release',
])
const xunqiuRequiredCheckIds = new Set(['xunqiu-backend-health', 'xunqiu-compat-api', 'xunqiu-apk-gate'])
const playlabRequiredCheckIds = new Set(['biau-playlab-web-builds', 'biau-playlab-mobile-hints'])
const freshnessLabels = ['新鲜', '接近过期', '已过期', '未知']
const disallowedKeys = new Set([
  'token',
  'password',
  'apikey',
  'api_key',
  'databaseurl',
  'database_url',
  'authorization',
  'headers',
  'rawresponse',
  'responsebody',
  'baseurl',
  'api_base_url',
  'apibaseurl',
  'endpoint',
  'privateurl',
  'dashboardurl',
])

const issues: string[] = []

function fail(message: string) {
  issues.push(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeKey(key: string) {
  return key.replace(/[-\s]/gu, '').toLowerCase()
}

function hasSecretLookingString(value: string) {
  return (
    /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/u.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]{8,}\b/iu.test(value) ||
    /https?:\/\/[^\s)]+/iu.test(value) ||
    /[A-Za-z]:\\[^\s)]+/u.test(value)
  )
}

function checkNoSensitiveSnapshotValues(value: unknown, label: string) {
  if (typeof value === 'string') {
    if (hasSecretLookingString(value)) fail(`${label} contains a URL, local path, bearer token, or secret-looking value`)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => checkNoSensitiveSnapshotValues(item, `${label}[${index}]`))
    return
  }

  if (!isRecord(value)) return

  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key)
    if (disallowedKeys.has(normalized)) fail(`${label}.${key} uses a disallowed sensitive field name`)
    checkNoSensitiveSnapshotValues(nested, `${label}.${key}`)
  }
}

function checkUniqueIds(label: string, ids: string[]) {
  const seen = new Set<string>()
  for (const id of ids) {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(id)) fail(`${label} id "${id}" must be a lowercase slug`)
    if (seen.has(id)) fail(`${label} id "${id}" is duplicated`)
    seen.add(id)
  }
}

function readGeneratedRecords(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`)
    return []
  }

  return value.flatMap((item, index) => {
    if (isRecord(item)) return [item]
    fail(`${label}[${index}] must be an object`)
    return []
  })
}

function readGeneratedIds(records: Record<string, unknown>[], label: string) {
  return records.flatMap((record, index) => {
    const id = record.id
    if (isNonEmptyString(id)) return [id]
    fail(`${label}[${index}].id is missing`)
    return []
  })
}

function checkGeneratedIdSet(label: string, expectedIds: string[], actualIds: string[]) {
  checkUniqueIds(label, actualIds)

  const expected = new Set(expectedIds)
  const actual = new Set(actualIds)
  const missing = [...expected].filter((id) => !actual.has(id)).sort()
  const extra = [...actual].filter((id) => !expected.has(id)).sort()

  if (missing.length > 0) fail(`${label}: generated site-status.json is missing ${missing.join(', ')}`)
  if (extra.length > 0) fail(`${label}: generated site-status.json has extra ${extra.join(', ')}`)
}

function checkStaticStatusData() {
  checkUniqueIds(
    'siteStatusTargets',
    siteStatusTargets.map((target) => target.id),
  )
  checkUniqueIds(
    'reliabilityProjects',
    reliabilityProjects.map((project) => project.id),
  )

  const targetIds = new Set(siteStatusTargets.map((target) => target.id))
  const checkIds = new Set<string>()
  const statuses = new Set(reliabilityStatusOrder)

  for (const target of siteStatusTargets) {
    if (!isNonEmptyString(target.url)) fail(`${target.id}: target URL is missing`)
    if (!/^https?:\/\//u.test(target.url)) fail(`${target.id}: target URL must be public http(s)`)
    if (!reliabilityProjects.some((project) => project.checks.some((check) => check.relatedTargetId === target.id))) {
      fail(`${target.id}: no reliability check links this external target through relatedTargetId`)
    }
  }

  for (const project of reliabilityProjects) {
    if (!isNonEmptyString(project.summary)) fail(`${project.id}: summary is missing`)
    if (!Array.isArray(project.checks) || project.checks.length === 0) fail(`${project.id}: checks are missing`)
    if (!Array.isArray(project.gates) || project.gates.length === 0) fail(`${project.id}: gates must list manual/platform boundaries`)
    if (!Array.isArray(project.nextActions) || project.nextActions.length === 0) fail(`${project.id}: nextActions are missing`)

    for (const gate of project.gates) {
      if (!isNonEmptyString(gate)) fail(`${project.id}: gate text is empty`)
    }

    for (const check of project.checks) {
      if (!/^[a-z0-9][a-z0-9-]*$/u.test(check.id)) fail(`${project.id}: check id "${check.id}" must be a lowercase slug`)
      if (checkIds.has(check.id)) fail(`${project.id}: check id "${check.id}" is duplicated across reliability projects`)
      checkIds.add(check.id)
      if (!statuses.has(check.status)) fail(`${check.id}: unsupported status "${check.status}"`)
      if (!isNonEmptyString(check.label)) fail(`${check.id}: label is missing`)
      if (!isNonEmptyString(check.description)) fail(`${check.id}: description is missing`)
      if (!isNonEmptyString(check.evidence)) fail(`${check.id}: evidence is missing`)
      if (!isNonEmptyString(check.ownerHint)) fail(`${check.id}: ownerHint is missing`)
      if (check.relatedTargetId && !targetIds.has(check.relatedTargetId)) {
        fail(`${check.id}: relatedTargetId "${check.relatedTargetId}" does not exist in siteStatusTargets`)
      }
    }
  }

  return checkIds
}

function checkSyntheticCheck(fileName: string, check: unknown, knownCheckIds: Set<string>) {
  if (!isRecord(check)) {
    fail(`${fileName}: a synthetic check is not an object`)
    return
  }

  const id = check.id
  const status = check.status
  if (!isNonEmptyString(id)) fail(`${fileName}: synthetic check is missing id`)
  else if (!knownCheckIds.has(id)) fail(`${fileName}: synthetic check "${id}" is not defined in reliabilityProjects`)
  if (!allowedSyntheticStatuses.has(status as Exclude<ReliabilityStatus, 'planned'>)) {
    fail(`${fileName}:${String(id)} uses unsupported synthetic status "${String(status)}"`)
  }
  if (typeof check.httpStatus !== 'number') fail(`${fileName}:${String(id)} httpStatus must be numeric`)
  if (typeof check.durationMs !== 'number') fail(`${fileName}:${String(id)} durationMs must be numeric`)
  if (!isNonEmptyString(check.checkedAt)) fail(`${fileName}:${String(id)} checkedAt is missing`)
  if (!isNonEmptyString(check.summary)) fail(`${fileName}:${String(id)} summary is missing`)
  if (!Array.isArray(check.issues) || check.issues.some((issue) => typeof issue !== 'string')) {
    fail(`${fileName}:${String(id)} issues must be a string array`)
  }
  if (isNonEmptyString(check.issueKind) && !issueKinds.has(check.issueKind)) {
    fail(`${fileName}:${String(id)} issueKind "${check.issueKind}" is not allowed`)
  }
}

function checkApkGate(fileName: string, payload: Record<string, unknown>) {
  if (!isRecord(payload.apkGate)) return
  const gate = payload.apkGate
  const approved = gate.publicDownloadApproved === true
  const checks = Array.isArray(payload.checks) ? payload.checks.filter(isRecord) : []
  const gateChecks = checks.filter((check) => typeof check.id === 'string' && check.id.endsWith('-apk-gate'))

  if (!approved) {
    for (const check of gateChecks) {
      if (check.status === 'online') fail(`${fileName}:${String(check.id)} cannot be online while publicDownloadApproved=false`)
    }
  }

  const artifacts = Array.isArray(gate.artifacts) ? gate.artifacts.filter(isRecord) : []
  for (const [index, artifact] of artifacts.entries()) {
    const fileNameValue = artifact.fileName
    if (!isNonEmptyString(fileNameValue)) fail(`${fileName}: apkGate.artifacts[${index}].fileName is missing`)
    if (typeof fileNameValue === 'string' && /[\\/]/u.test(fileNameValue)) {
      fail(`${fileName}: apkGate.artifacts[${index}].fileName must not include a path`)
    }
  }
}

function checkErpRegistrationGate(fileName: string, payload: Record<string, unknown>) {
  if (fileName !== 'erp-synthetic.json') return

  const registrationEnabled = payload.registrationEnabled
  const registrationStatus = payload.registrationStatus
  const registrationSummary = payload.registrationSummary
  const checks = Array.isArray(payload.checks) ? payload.checks.filter(isRecord) : []
  const authCheck = checks.find((check) => check.id === 'ozon-erp-auth')

  if (registrationEnabled !== null && typeof registrationEnabled !== 'boolean') {
    fail(`${fileName}: registrationEnabled must be boolean or null`)
  }
  if (!isNonEmptyString(registrationStatus) || !erpRegistrationStatuses.has(registrationStatus)) {
    fail(`${fileName}: registrationStatus "${String(registrationStatus)}" is not allowed`)
  }
  if (!isNonEmptyString(registrationSummary)) fail(`${fileName}: registrationSummary is missing`)
  if (!authCheck) {
    fail(`${fileName}: ozon-erp-auth check is missing`)
    return
  }

  if (registrationEnabled === false && authCheck.status === 'online') {
    fail(`${fileName}: ozon-erp-auth cannot be online while registrationEnabled=false`)
  }
  if (registrationStatus !== 'open' && authCheck.status === 'online') {
    fail(`${fileName}: ozon-erp-auth cannot be online while registrationStatus=${String(registrationStatus)}`)
  }
  if (registrationStatus === 'open' && registrationEnabled !== true) {
    fail(`${fileName}: registrationStatus=open requires registrationEnabled=true`)
  }
}

function checkLegalRagDemoGate(fileName: string, payload: Record<string, unknown>) {
  if (fileName !== 'legal-rag-synthetic.json') return

  const hasCredentials = payload.hasCredentials
  const demoAccessStatus = payload.demoAccessStatus
  const demoAccessSummary = payload.demoAccessSummary
  const checks = Array.isArray(payload.checks) ? payload.checks.filter(isRecord) : []
  const protectedChecks = checks.filter((check) => typeof check.id === 'string' && legalProtectedCheckIds.has(check.id))

  if (typeof hasCredentials !== 'boolean') fail(`${fileName}: hasCredentials must be boolean`)
  if (!isNonEmptyString(demoAccessStatus) || !legalDemoAccessStatuses.has(demoAccessStatus)) {
    fail(`${fileName}: demoAccessStatus "${String(demoAccessStatus)}" is not allowed`)
  }
  if (!isNonEmptyString(demoAccessSummary)) fail(`${fileName}: demoAccessSummary is missing`)
  for (const id of legalProtectedCheckIds) {
    if (!protectedChecks.some((check) => check.id === id)) fail(`${fileName}: protected check "${id}" is missing`)
  }

  const credentialGateActive = demoAccessStatus === 'credential-required' || (hasCredentials === false && demoAccessStatus !== 'open-demo')
  if (credentialGateActive) {
    for (const check of protectedChecks) {
      if (check.status === 'online') {
        fail(`${fileName}:${String(check.id)} cannot be online while protected demo access is ${String(demoAccessStatus)}`)
      }
    }
  }
  if (demoAccessStatus === 'open-demo') {
    for (const check of protectedChecks) {
      if (check.status !== 'online') fail(`${fileName}:${String(check.id)} must be online when demoAccessStatus=open-demo`)
    }
  }
}

function checkXunqiuGate(fileName: string, payload: Record<string, unknown>) {
  if (fileName !== 'xunqiu-synthetic.json') return

  const apiBaseConfigured = payload.apiBaseConfigured
  const checks = Array.isArray(payload.checks) ? payload.checks.filter(isRecord) : []
  const checksById = new Map(checks.map((check) => [String(check.id), check]))
  const apkGate = isRecord(payload.apkGate) ? payload.apkGate : null

  if (typeof apiBaseConfigured !== 'boolean') fail(`${fileName}: apiBaseConfigured must be boolean`)
  if (payload.hasCredentials !== false) fail(`${fileName}: hasCredentials must be false for public-safe Xunqiu checks`)
  for (const id of xunqiuRequiredCheckIds) {
    if (!checksById.has(id)) fail(`${fileName}: required check "${id}" is missing`)
  }

  const backendChecks = ['xunqiu-backend-health', 'xunqiu-compat-api']
  if (apiBaseConfigured === false) {
    for (const id of backendChecks) {
      if (checksById.get(id)?.status === 'online') fail(`${fileName}:${id} cannot be online when apiBaseConfigured=false`)
    }
  }

  if (!apkGate) {
    fail(`${fileName}: apkGate is missing`)
    return
  }

  const apkStatus = apkGate.status
  const publicDownloadApproved = apkGate.publicDownloadApproved
  if (!isNonEmptyString(apkStatus) || !xunqiuApkGateStatuses.has(apkStatus)) {
    fail(`${fileName}: apkGate.status "${String(apkStatus)}" is not allowed`)
  }
  if (typeof publicDownloadApproved !== 'boolean') fail(`${fileName}: apkGate.publicDownloadApproved must be boolean`)

  const countFields = ['stageArtifactCount', 'releaseLikeArtifactCount', 'debugArtifactCount', 'unknownArtifactCount']
  for (const field of countFields) {
    if (typeof apkGate[field] !== 'number') fail(`${fileName}: apkGate.${field} must be numeric`)
  }

  const apkCheck = checksById.get('xunqiu-apk-gate')
  if (publicDownloadApproved !== true && apkCheck?.status === 'online') {
    fail(`${fileName}: xunqiu-apk-gate cannot be online while publicDownloadApproved=false`)
  }
  if (publicDownloadApproved === true) {
    if (apkStatus !== 'approved-release') fail(`${fileName}: publicDownloadApproved=true requires apkGate.status=approved-release`)
    if (apkCheck?.status !== 'online') fail(`${fileName}: publicDownloadApproved=true requires xunqiu-apk-gate to be online`)
  }
}

function numericField(record: Record<string, unknown>, field: string, label: string) {
  const value = record[field]
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail(`${label}.${field} must be a non-negative number`)
    return 0
  }
  return value
}

function checkPlaylabGate(fileName: string, payload: Record<string, unknown>) {
  if (fileName !== 'biau-playlab-synthetic.json') return

  const checks = Array.isArray(payload.checks) ? payload.checks.filter(isRecord) : []
  const checksById = new Map(checks.map((check) => [String(check.id), check]))
  const playableSummary = isRecord(payload.playableSummary) ? payload.playableSummary : null

  if (typeof payload.baseConfigured !== 'boolean') fail(`${fileName}: baseConfigured must be boolean`)
  for (const id of playlabRequiredCheckIds) {
    if (!checksById.has(id)) fail(`${fileName}: required check "${id}" is missing`)
  }

  if (!playableSummary) {
    fail(`${fileName}: playableSummary is missing`)
    return
  }

  const discoveredPlayablePages = numericField(playableSummary, 'discoveredPlayablePages', `${fileName}:playableSummary`)
  const checkedPlayablePages = numericField(playableSummary, 'checkedPlayablePages', `${fileName}:playableSummary`)
  const passedPlayablePages = numericField(playableSummary, 'passedPlayablePages', `${fileName}:playableSummary`)
  const checkedResources = numericField(playableSummary, 'checkedResources', `${fileName}:playableSummary`)
  const passedResources = numericField(playableSummary, 'passedResources', `${fileName}:playableSummary`)
  const webBuilds = checksById.get('biau-playlab-web-builds')

  if (checkedPlayablePages > discoveredPlayablePages) {
    fail(`${fileName}: checkedPlayablePages cannot exceed discoveredPlayablePages`)
  }
  if (passedPlayablePages > checkedPlayablePages) fail(`${fileName}: passedPlayablePages cannot exceed checkedPlayablePages`)
  if (passedResources > checkedResources) fail(`${fileName}: passedResources cannot exceed checkedResources`)

  if (webBuilds?.status === 'online') {
    if (discoveredPlayablePages <= 0 || checkedPlayablePages <= 0) {
      fail(`${fileName}: online web builds require at least one discovered playable page`)
    }
    if (passedPlayablePages !== checkedPlayablePages) {
      fail(`${fileName}: online web builds require all checked playable pages to pass`)
    }
    if (checkedResources > 0 && passedResources !== checkedResources) {
      fail(`${fileName}: online web builds require all checked resources to pass`)
    }
  }
}

function checkPublicLinksGate(fileName: string, payload: Record<string, unknown>) {
  if (fileName !== 'public-links-synthetic.json') return

  const linkCount = payload.linkCount
  const failedCount = payload.failedCount
  const checks = Array.isArray(payload.checks) ? payload.checks.filter(isRecord) : []
  const publicLinksCheck = checks.find((check) => check.id === 'blog-semi-public-links')

  if (typeof linkCount !== 'number' || !Number.isFinite(linkCount) || linkCount < 0) {
    fail(`${fileName}: linkCount must be a non-negative number`)
  }
  if (typeof failedCount !== 'number' || !Number.isFinite(failedCount) || failedCount < 0) {
    fail(`${fileName}: failedCount must be a non-negative number`)
  }
  if (typeof linkCount === 'number' && typeof failedCount === 'number' && failedCount > linkCount) {
    fail(`${fileName}: failedCount cannot exceed linkCount`)
  }
  if (!publicLinksCheck) {
    fail(`${fileName}: blog-semi-public-links check is missing`)
    return
  }

  if (failedCount === 0) {
    if (payload.ok !== true) fail(`${fileName}: ok must be true when failedCount=0`)
    if (linkCount === 0 && publicLinksCheck.status !== 'unchecked') {
      fail(`${fileName}: blog-semi-public-links must be unchecked when linkCount=0`)
    }
    if (linkCount !== 0 && publicLinksCheck.status !== 'online') {
      fail(`${fileName}: blog-semi-public-links must be online when all links pass`)
    }
  }

  if (typeof failedCount === 'number' && failedCount > 0) {
    if (payload.ok !== false) fail(`${fileName}: ok must be false when failedCount>0`)
    if (publicLinksCheck.status === 'online') {
      fail(`${fileName}: blog-semi-public-links cannot be online when failedCount>0`)
    }
    if (!Array.isArray(publicLinksCheck.issues) || publicLinksCheck.issues.length === 0) {
      fail(`${fileName}: blog-semi-public-links must include a low-sensitive issue summary when links fail`)
    }
  }
}

async function checkSyntheticSnapshots(knownCheckIds: Set<string>) {
  let entries: string[]
  try {
    entries = await readdir(statusDir)
  } catch {
    fail('public/status directory is missing')
    return
  }

  const syntheticFiles = entries.filter((entry) => entry.endsWith('-synthetic.json')).sort()
  if (syntheticFiles.length === 0) fail('public/status has no *-synthetic.json snapshots')

  for (const fileName of syntheticFiles) {
    const payload = JSON.parse(await readFile(resolve(statusDir, fileName), 'utf8')) as unknown
    if (!isRecord(payload)) {
      fail(`${fileName}: payload is not an object`)
      continue
    }
    checkNoSensitiveSnapshotValues(payload, fileName)
    if (!isNonEmptyString(payload.checkedAt)) fail(`${fileName}: checkedAt is missing`)
    if (typeof payload.ok !== 'boolean') fail(`${fileName}: ok must be boolean`)
    if (!Array.isArray(payload.checks) || payload.checks.length === 0) {
      fail(`${fileName}: checks must be a non-empty array`)
      continue
    }
    for (const check of payload.checks) checkSyntheticCheck(fileName, check, knownCheckIds)
    checkApkGate(fileName, payload)
    checkErpRegistrationGate(fileName, payload)
    checkLegalRagDemoGate(fileName, payload)
    checkXunqiuGate(fileName, payload)
    checkPlaylabGate(fileName, payload)
    checkPublicLinksGate(fileName, payload)
  }
}

async function checkMergedSiteStatusEvidence() {
  let payload: unknown
  try {
    payload = JSON.parse(await readFile(resolve(statusDir, 'site-status.json'), 'utf8')) as unknown
  } catch {
    fail('site-status.json is missing or unreadable; run npm.cmd run site:status')
    return
  }

  if (!isRecord(payload)) {
    fail('site-status.json: payload is not an object')
    return
  }

  const targets = readGeneratedRecords(payload.targets, 'site-status.json.targets')
  const targetIds = readGeneratedIds(targets, 'site-status.json.targets')
  checkGeneratedIdSet(
    'site-status.json targets',
    siteStatusTargets.map((target) => target.id),
    targetIds,
  )

  const projects = readGeneratedRecords(payload.reliabilityProjects, 'site-status.json.reliabilityProjects')
  const projectIds = readGeneratedIds(projects, 'site-status.json.reliabilityProjects')
  checkGeneratedIdSet(
    'site-status.json reliabilityProjects',
    reliabilityProjects.map((project) => project.id),
    projectIds,
  )

  if (projects.length === 0) {
    fail('site-status.json: reliabilityProjects must be a non-empty array')
    return
  }

  const generatedProjectById = new Map(projects.map((project) => [typeof project.id === 'string' ? project.id : '', project]))
  for (const sourceProject of reliabilityProjects) {
    const generatedProject = generatedProjectById.get(sourceProject.id)
    if (!generatedProject) continue
    const generatedChecks = readGeneratedRecords(
      generatedProject.checks,
      `site-status.json.reliabilityProjects.${sourceProject.id}.checks`,
    )
    const generatedCheckIds = readGeneratedIds(
      generatedChecks,
      `site-status.json.reliabilityProjects.${sourceProject.id}.checks`,
    )
    checkGeneratedIdSet(
      `site-status.json reliabilityProjects.${sourceProject.id}.checks`,
      sourceProject.checks.map((check) => check.id),
      generatedCheckIds,
    )
  }

  for (const project of projects) {
    const projectId = isNonEmptyString(project.id) ? project.id : 'unknown-project'
    const checks = Array.isArray(project.checks) ? project.checks.filter(isRecord) : []
    for (const check of checks) {
      const checkId = isNonEmptyString(check.id) ? check.id : 'unknown-check'
      const evidence = typeof check.evidence === 'string' ? check.evidence : ''
      if (!evidence.includes('最近一次 synthetic 检查')) continue
      if (!evidence.includes('证据时间：')) fail(`site-status.json:${projectId}:${checkId} merged synthetic evidence is missing checked-at context`)
      if (!freshnessLabels.some((label) => evidence.includes(`证据新鲜度：${label}`))) {
        fail(`site-status.json:${projectId}:${checkId} merged synthetic evidence is missing freshness context`)
      }
      if ((evidence.includes('证据新鲜度：已过期') || evidence.includes('证据新鲜度：未知')) && check.status === 'online') {
        fail(`site-status.json:${projectId}:${checkId} stale/unknown synthetic evidence must not remain online`)
      }
    }
  }
}

async function main() {
  const knownCheckIds = checkStaticStatusData()
  await checkSyntheticSnapshots(knownCheckIds)
  await checkMergedSiteStatusEvidence()

  if (issues.length > 0) {
    console.error(`Status contract check failed with ${issues.length} issue(s):`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log(
    `Status contract check passed for ${reliabilityProjects.length} reliability projects, ${siteStatusTargets.length} external targets, and ${knownCheckIds.size} reliability checks.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
