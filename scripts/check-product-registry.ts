import { readFileSync } from 'node:fs'
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
  projectPublications,
  type ProjectPublication,
} from '../src/data/projectPublication'
import { reliabilityProjects } from '../src/data/statusTargets'

const issues: string[] = []
const forbiddenPublicReferences = ['duoduo-original', 'aicoding-cookbook']

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
  if (!publication.statusHref.startsWith('/status')) fail(`${publication.projectId}: statusHref must use the status route`)

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
