import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { catalogProjects, projects } from '../src/data/portfolio'
import { heroContent } from '../src/data/hero'
import {
  PRODUCT_IDS,
  productRegistry,
  type ProductIdentity,
  type ProductId,
} from '../src/data/productRegistry'
import {
  PUBLIC_PROJECT_IDS,
  getProjectCta,
  getPublishedProjectLinks,
  projectPublications,
  type ProjectCtaProjection,
  type ProjectLinkCandidate,
  type ProjectPublication,
} from '../src/data/projectPublication'
import { reliabilityProjects } from '../src/data/statusTargets'
import type { SiteLanguage } from '../src/utils/siteLanguage'

const issues: string[] = []
const forbiddenPublicReferences = ['duoduo-original', 'aicoding-cookbook']
const statusPaths = new Set(['/status', ...reliabilityProjects.map((project) => `/status/${project.id}`)])

function fail(message: string) {
  issues.push(message)
}

function isNonEmpty(value: string) {
  return value.trim().length > 0
}

function checkUnique(label: string, values: string[]) {
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = value.trim().toLocaleLowerCase('en-US')
    if (seen.has(normalized)) fail(`${label} "${value}" is duplicated`)
    seen.add(normalized)
  }
}

function checkIdentity(identity: ProductIdentity) {
  if (identity.id !== productRegistry[identity.id].id) fail(`${identity.id}: registry key and id differ`)
  if (!isNonEmpty(identity.name.zh)) fail(`${identity.id}: Chinese name is missing`)
  if (!isNonEmpty(identity.name.en)) fail(`${identity.id}: English name is missing`)
  if (!isNonEmpty(identity.descriptor.zh)) fail(`${identity.id}: Chinese descriptor is missing`)
  if (identity.attribution !== 'by BIAU Port / 泊岸') fail(`${identity.id}: attribution is not canonical`)

  const serialized = JSON.stringify(identity).toLocaleLowerCase('en-US')
  for (const forbidden of forbiddenPublicReferences) {
    if (serialized.includes(forbidden)) fail(`${identity.id}: public identity contains forbidden reference "${forbidden}"`)
  }
}

function checkCanonicalName(context: string, productId: ProductIdentity['id'], displayText: string) {
  const identity = productRegistry[productId]
  if (!displayText.includes(identity.name.zh) || !displayText.includes(identity.name.en)) {
    fail(`${context}: must include canonical name "${identity.name.zh} ${identity.name.en}"`)
  }
}

function checkPublication(publication: ProjectPublication) {
  if (publication.projectId !== projectPublications[publication.projectId].projectId) {
    fail(`${publication.projectId}: publication key and projectId differ`)
  }
  if (!productRegistry[publication.productId]) fail(`${publication.projectId}: productId is not registered`)
  if (!isNonEmpty(publication.owner)) fail(`${publication.projectId}: owner is missing`)
  if (!statusPaths.has(publication.statusHref)) {
    fail(`${publication.projectId}: statusHref must reference the status overview or an existing reliability project`)
  }

  const projection = getProjectCta(publication)
  const mustDisable =
    publication.access === 'case-only' ||
    publication.availability === 'planned' ||
    publication.availability === 'unchecked' ||
    publication.availability === 'offline'

  if (mustDisable && (projection.enabled || projection.mode !== 'status-only')) {
    fail(`${publication.projectId}: unavailable/case-only publication exposes a direct CTA`)
  }
  if (!mustDisable && !publication.externalHref) fail(`${publication.projectId}: available publication is missing externalHref`)
  if (
    (publication.availability === 'online' || publication.availability === 'degraded') &&
    (!isNonEmpty(publication.evidenceLabel) || Number.isNaN(Date.parse(publication.verifiedAt)))
  ) {
    fail(`${publication.projectId}: available publication requires evidenceLabel and ISO verifiedAt`)
  }
}

const registeredIdentities = PRODUCT_IDS.map((id) => productRegistry[id])
registeredIdentities.forEach(checkIdentity)
checkUnique('Chinese product name', registeredIdentities.map((identity) => identity.name.zh))
checkUnique('English product name', registeredIdentities.map((identity) => identity.name.en))

const publications = PUBLIC_PROJECT_IDS.map((id) => projectPublications[id])
publications.forEach(checkPublication)

const publicationIds = new Set(PUBLIC_PROJECT_IDS)
for (const project of catalogProjects) {
  if (!publicationIds.has(project.id as (typeof PUBLIC_PROJECT_IDS)[number])) {
    fail(`${project.id}: catalog project is missing a publication record`)
  }
  const publication = projectPublications[project.id as (typeof PUBLIC_PROJECT_IDS)[number]]
  if (publication) checkCanonicalName(`catalog ${project.id}`, publication.productId, project.title)
}
for (const project of heroContent.projects) {
  if (!publicationIds.has(project.id as (typeof PUBLIC_PROJECT_IDS)[number])) {
    fail(`${project.id}: hero project is missing a publication record`)
  }
  const publication = projectPublications[project.id]
  checkCanonicalName(`hero ${project.id}`, publication.productId, project.title)
}

const reliabilityProductIds: Record<string, ProductId> = {
  'blog-semi': 'biau-port',
  'legal-rag': 'legal-rag',
  chatus: 'chatus',
  'anchor-learning': 'anchor-learning',
  'ozon-erp': 'ozon-erp',
  xunqiu: 'xunqiu',
  'pet-gamer': 'pet-workspace',
  'biau-playlab': 'biau-playlab',
}

for (const project of reliabilityProjects) {
  const productId = reliabilityProductIds[project.id]
  if (!productId) {
    fail(`reliability ${project.id}: product identity mapping is missing`)
    continue
  }
  checkCanonicalName(`reliability ${project.id}`, productId, project.title)
}

for (const project of projects) {
  for (const link of project.links) {
    if (link.type === 'external' && !link.intent) fail(`${project.id}: external link "${link.label}" has no intent`)
  }
  if (project.detailLink?.type === 'external' && !project.detailLink.intent) {
    fail(`${project.id}: external detail link has no intent`)
  }
  for (const sections of Object.values(project.detailContent ?? {})) {
    for (const section of sections ?? []) {
      const source = section.visual
      if (source?.sourceUrl && !source.sourceIntent) {
        fail(`${project.id}:${source.id}: visual source URL has no intent`)
      }
    }
  }
}

const canvas = projectPublications.canvas
if (canvas.availability !== 'planned' || canvas.access !== 'case-only' || canvas.externalHref) {
  fail('canvas: must remain planned + case-only without an external URL')
}

function ctaNavigation(cta: ProjectCtaProjection) {
  return { mode: cta.mode, enabled: cta.enabled, href: cta.href, statusHref: cta.statusHref }
}

function checkProjectInterfaceLanguage() {
  const available = {
    ...projectPublications['pet-workspace'],
    externalHref: 'https://example.test/project',
    evidenceLabel: 'Local contract fixture',
  } as const
  const authoredReason = '项目专属原文：入口尚待验收。'
  const cases: Array<{
    name: string
    publication: ProjectPublication
    label: string
    compact: string
    mode: ProjectCtaProjection['mode']
    href: string
    explanationLanguage?: SiteLanguage
  }> = [
    { name: 'online public', publication: available, label: 'Open project', compact: 'Open', mode: 'direct', href: available.externalHref },
    { name: 'online controlled', publication: { ...available, access: 'login-gated' }, label: 'Open controlled access', compact: 'Access', mode: 'direct', href: available.externalHref, explanationLanguage: 'en' },
    { name: 'degraded public', publication: { ...available, availability: 'degraded' }, label: 'Visit with caution', compact: 'Caution', mode: 'caution', href: available.externalHref, explanationLanguage: 'en' },
    { name: 'degraded controlled', publication: { ...available, availability: 'degraded', access: 'login-gated' }, label: 'Open controlled access', compact: 'Caution', mode: 'caution', href: available.externalHref, explanationLanguage: 'en' },
    { name: 'online case only', publication: { ...available, access: 'case-only' }, label: 'View current status', compact: 'Status', mode: 'status-only', href: available.statusHref, explanationLanguage: 'en' },
    { name: 'missing external entry', publication: { ...available, externalHref: undefined }, label: 'View current status', compact: 'Status', mode: 'status-only', href: available.statusHref, explanationLanguage: 'en' },
    { name: 'unchecked controlled', publication: { ...available, availability: 'unchecked', access: 'login-gated', unavailableReason: authoredReason }, label: 'View current status', compact: 'Status', mode: 'status-only', href: available.statusHref, explanationLanguage: 'zh' },
    { name: 'offline public', publication: { ...available, availability: 'offline', unavailableReason: authoredReason }, label: 'View current status', compact: 'Status', mode: 'status-only', href: available.statusHref, explanationLanguage: 'zh' },
    { name: 'planned with an entry candidate', publication: { ...available, availability: 'planned', unavailableReason: authoredReason }, label: 'View project plan', compact: 'Plan', mode: 'status-only', href: '/projects/pet-workspace', explanationLanguage: 'zh' },
  ]
  for (const test of cases) {
    const before = JSON.stringify(test.publication)
    Object.freeze(test.publication)
    const zh = getProjectCta(test.publication, 'zh')
    const en = getProjectCta(test.publication, 'en')
    assert.equal(en.label, test.label, `${test.name}: English action label`)
    assert.equal(en.compactLabel, test.compact, `${test.name}: explicit compact label`)
    assert.equal(en.labelLanguage, 'en')
    assert.equal(en.explanationLanguage, test.explanationLanguage)
    assert.equal(en.mode, test.mode)
    assert.equal(en.enabled, test.mode !== 'status-only')
    assert.equal(en.href, test.href)
    assert.deepEqual(ctaNavigation(en), ctaNavigation(zh), `${test.name}: language cannot change access`)
    assert.deepEqual(getProjectCta(test.publication), zh, 'omitted language keeps the Chinese default')
    if ('unavailableReason' in test.publication) assert.equal(en.explanation, authoredReason)
    else if (en.explanation) assert.ok(!/[\p{Script=Han}]/u.test(en.explanation), 'generic access copy translates')
    assert.equal(JSON.stringify(test.publication), before)
  }

  const candidates: ProjectLinkCandidate[] = [
    { label: '在线工作台', href: 'https://example.test/entry', type: 'external', intent: 'entry' },
    { label: '第二入口原文', href: 'https://example.test/alternate', type: 'external', intent: 'entry' },
    { label: '技术文档', href: '/guide', type: 'internal', intent: 'documentation' },
    { label: '项目专属原文链接', href: '/original', type: 'internal' },
    { label: 'GitHub', href: 'https://example.test/repository', type: 'external', intent: 'repository' },
  ]
  candidates.forEach((candidate) => Object.freeze(candidate))
  Object.freeze(candidates)
  const source = JSON.stringify(candidates)
  const blocked = getPublishedProjectLinks(projectPublications['legal-rag'], candidates, 'en')
  assert.deepEqual(blocked.map((link) => link.label), ['View current status', 'Technical documentation', '项目专属原文链接', 'GitHub'])
  assert.deepEqual(blocked.map(({ href, type, intent }) => ({ href, type, intent })), [
    { href: '/status/legal-rag', type: 'internal', intent: 'status' },
    { href: '/guide', type: 'internal', intent: 'documentation' },
    { href: '/original', type: 'internal', intent: 'evidence' },
    { href: 'https://example.test/repository', type: 'external', intent: 'repository' },
  ], 'unavailable entries collapse once while evidence and order survive')
  assert.equal(blocked[0].explanation, projectPublications['legal-rag'].unavailableReason)
  assert.equal(blocked[0].explanationLanguage, 'zh')
  assert.equal(blocked[2].labelLanguage, 'zh', 'unknown labels retain authored Chinese')
  for (const publication of [undefined, available]) {
    const zh = getPublishedProjectLinks(publication, candidates, 'zh')
    const en = getPublishedProjectLinks(publication, candidates, 'en')
    assert.equal(en.length, candidates.length)
    assert.deepEqual(en.map(({ href, type, intent }) => ({ href, type, intent })), zh.map(({ href, type, intent }) => ({ href, type, intent })))
    assert.deepEqual(en.map((link) => link.label), ['Online workspace', '第二入口原文', 'Technical documentation', '项目专属原文链接', 'GitHub'])
    assert.equal(zh[0].label, candidates[0].label)
    assert.equal(en[0].labelLanguage, 'en')
  }
  assert.equal(JSON.stringify(candidates), source, 'link projection never mutates candidates')
  for (const label of ['__proto__', 'toString', '尚未翻译的作者标签']) {
    const [link] = getPublishedProjectLinks(undefined, [{ label, href: '/original', type: 'internal' }], 'en')
    assert.equal(link.label, label)
    assert.equal(link.labelLanguage, 'zh')
  }
  const publicationSource = JSON.stringify(projectPublications)
  for (const publication of publications) {
    const zh = getProjectCta(publication)
    const en = getProjectCta(publication, 'en')
    assert.deepEqual(ctaNavigation(en), ctaNavigation(zh))
    if ('unavailableReason' in publication) assert.equal(en.explanation, publication.unavailableReason)
  }
  assert.equal(JSON.stringify(projectPublications), publicationSource)
  let linkSets = 0
  for (const project of projects) {
    const candidateSets: Array<readonly ProjectLinkCandidate[]> = [project.links]
    for (const sections of Object.values(project.detailContent ?? {})) {
      for (const section of sections ?? []) {
        if (section.links?.length) candidateSets.push(section.links)
        const visual = section.visual
        if (visual?.sourceUrl) candidateSets.push([{
          label: visual.sourceLabel ?? '查看来源',
          href: visual.sourceUrl,
          type: visual.sourceUrl.startsWith('/') ? 'internal' : 'external',
          intent: visual.sourceIntent,
        }])
      }
    }
    const publication = publications.find((item) => item.projectId === project.id)
    for (const links of candidateSets) {
      const input = JSON.stringify(links)
      const zh = getPublishedProjectLinks(publication, links, 'zh')
      const en = getPublishedProjectLinks(publication, links, 'en')
      assert.deepEqual(en.map(({ href, type, intent }) => ({ href, type, intent })), zh.map(({ href, type, intent }) => ({ href, type, intent })), `${project.id}: real candidate routing is language independent`)
      for (const link of en) {
        assert.equal(link.labelLanguage, 'en', `${project.id}: current shared interface label needs a mapping: ${link.label}`)
        assert.ok(!/[\p{Script=Han}]/u.test(link.label))
      }
      assert.equal(JSON.stringify(links), input)
      linkSets += 1
    }
  }
  console.log(`Project interface contract passed (${cases.length} CTA cases, ${publications.length} real publications, ${linkSets} real link sets, fallback/deduplication/immutability).`)
}

checkProjectInterfaceLanguage()

const sourceProjectionChecks = [
  {
    file: 'src/components/PublicAssistantWidget.tsx',
    required: "formatProductName('public-assistant')",
    forbidden: '泊岸研究助手',
  },
  {
    file: 'src/pages/AiDailyPublicPage.tsx',
    required: "formatProductName('ai-daily')",
    forbidden: '<h1 className="section-title">AI 日报</h1>',
  },
]

for (const check of sourceProjectionChecks) {
  const source = readFileSync(join(process.cwd(), check.file), 'utf8')
  if (!source.includes(check.required)) fail(`${check.file}: registry projection is missing`)
  if (source.includes(check.forbidden)) fail(`${check.file}: stale public display name remains`)
}

if (issues.length > 0) {
  console.error(`Product registry contract failed with ${issues.length} issue(s):`)
  issues.forEach((issue) => console.error(`- ${issue}`))
  process.exit(1)
}

console.log(
  `Product registry contract passed (${registeredIdentities.length} identities, ${publications.length} publication records).`,
)
