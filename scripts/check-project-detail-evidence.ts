import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import sharp from 'sharp'
import {
  projects,
  type Project,
  type ProjectDetailContentKey,
  type ProjectDetailSection,
  type ProjectLink,
  type ProjectVisualBlock,
} from '../src/data/portfolio'

interface ProjectEvidenceSummary {
  id: string
  sections: number
  visuals: number
}

const MIN_DETAIL_SECTIONS = 5
const MIN_BODY_VISUALS = 3
const MIN_SECTION_DETAIL_CHARS = 60
const MIN_VISUAL_ALT_CHARS = 16
const MIN_VISUAL_CAPTION_CHARS = 30
const MIN_ASSET_WIDTH = 320
const MIN_ASSET_HEIGHT = 240
const MIN_ASSET_AREA = 120_000
const REQUIRED_DETAIL_GROUPS: ProjectDetailContentKey[] = [
  'overview',
  'workflow',
  'architecture',
  'quality',
  'limitations',
  'roadmap',
]
const STRUCTURAL_VISUAL_TYPES = new Set<ProjectVisualBlock['type']>(['workflow', 'architecture', 'data-flow', 'diagram'])
const SENSITIVE_SOURCE_PATTERNS = [
  /^[A-Za-z]:[\\/]/u,
  /^file:/iu,
  /^\/\//u,
  /localhost/iu,
  /127\.0\.0\.1/u,
  /192\.168\./u,
  /10\.\d{1,3}\./u,
  /(?:token|key|secret|password|passwd|pwd)=/iu,
]

const issues: string[] = []
const summaries: ProjectEvidenceSummary[] = []
const globalVisualIds = new Map<string, string>()
const assetQualityChecks: Array<{
  projectId: string
  context: string
  image: string
  publicPath: string
}> = []

function fail(projectId: string, message: string) {
  issues.push(`${projectId}: ${message}`)
}

function flattenSections(sections: Record<string, ProjectDetailSection[] | undefined> | undefined) {
  return Object.values(sections ?? {}).flatMap((items) => items ?? [])
}

function hasSensitivePattern(value: string) {
  if (SENSITIVE_SOURCE_PATTERNS.some((pattern) => pattern.test(value))) return false
  return true
}

function isPublicHref(value: string) {
  if (!hasSensitivePattern(value)) return false
  if (value.startsWith('/')) return true

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function checkPublicText(projectId: string, context: string, value: string | undefined) {
  if (typeof value !== 'string' || !value.trim()) return
  if (!hasSensitivePattern(value)) fail(projectId, `${context} contains a local/private path or secret-like query string`)
}

function checkAsset(projectId: string, context: string, image: string | undefined) {
  if (!image?.trim()) {
    fail(projectId, `${context} is missing an image`)
    return
  }
  if (!image.startsWith('/images/projects/')) {
    fail(projectId, `${context} must use a public /images/projects/ asset`)
    return
  }

  const publicPath = join(process.cwd(), 'public', image.replace(/^\//u, ''))
  if (!existsSync(publicPath)) {
    fail(projectId, `${context} references a missing asset: ${image}`)
    return
  }
  assetQualityChecks.push({ projectId, context, image, publicPath })
}

function checkLink(projectId: string, link: ProjectLink, context: string) {
  if (!link.label.trim()) fail(projectId, `${context} link is missing a label`)
  if (!link.href.trim()) {
    fail(projectId, `${context} link "${link.label}" is missing an href`)
    return
  }
  if (!isPublicHref(link.href)) fail(projectId, `${context} link "${link.label}" must use a public same-site route or https URL`)
}

function checkProjectShell(project: Project) {
  checkPublicText(project.id, 'title', project.title)
  checkPublicText(project.id, 'summary', project.summary)
  checkPublicText(project.id, 'role', project.role)
  for (const item of project.highlights) checkPublicText(project.id, 'highlight', item)
  for (const item of project.stack) checkPublicText(project.id, 'stack item', item)
  for (const item of project.assistantContext ?? []) checkPublicText(project.id, 'assistantContext item', item)

  checkAsset(project.id, 'hero image', project.image)
  for (const link of project.links) checkLink(project.id, link, 'project')
  if (project.detailLink) checkLink(project.id, project.detailLink, 'detailLink')
}

function checkRequiredGroups(project: Project) {
  for (const key of REQUIRED_DETAIL_GROUPS) {
    const group = project.detailContent?.[key]
    if (!Array.isArray(group) || group.length === 0) fail(project.id, `missing required detailContent group: ${key}`)
  }
}

function sectionTextLength(section: ProjectDetailSection) {
  return [section.body ?? '', ...(section.items ?? [])].join(' ').trim().length
}

function checkVisual(projectId: string, visual: ProjectVisualBlock) {
  const existingProjectId = globalVisualIds.get(visual.id)
  if (existingProjectId) {
    fail(projectId, `visual ${visual.id} duplicates an id already used by ${existingProjectId}`)
  } else {
    globalVisualIds.set(visual.id, projectId)
  }

  if (!visual.title.trim()) fail(projectId, `visual ${visual.id} is missing a title`)
  if (!visual.description.trim()) fail(projectId, `visual ${visual.id} is missing a description`)
  checkPublicText(projectId, `visual ${visual.id} title`, visual.title)
  checkPublicText(projectId, `visual ${visual.id} description`, visual.description)
  checkPublicText(projectId, `visual ${visual.id} alt`, visual.alt)
  checkPublicText(projectId, `visual ${visual.id} caption`, visual.caption)
  checkPublicText(projectId, `visual ${visual.id} sourceLabel`, visual.sourceLabel)

  if (visual.sourceUrl || visual.sourceLabel) {
    if (!visual.sourceUrl?.trim()) fail(projectId, `visual ${visual.id} has sourceLabel but no sourceUrl`)
    if (!visual.sourceLabel?.trim()) fail(projectId, `visual ${visual.id} has sourceUrl but no sourceLabel`)
  }

  if (visual.sourceUrl && !isPublicHref(visual.sourceUrl)) {
    fail(projectId, `visual ${visual.id} sourceUrl must be a public route or https URL`)
  }

  if (!visual.image) return
  if (!visual.image.startsWith('/images/projects/')) {
    fail(projectId, `visual ${visual.id} must use a public /images/projects/ asset`)
    return
  }
  if (!visual.alt?.trim()) fail(projectId, `visual ${visual.id} image is missing alt text`)
  if (!visual.caption?.trim()) fail(projectId, `visual ${visual.id} image is missing a public-safe caption`)
  if (visual.alt?.trim() && visual.alt.trim().length < MIN_VISUAL_ALT_CHARS) {
    fail(projectId, `visual ${visual.id} image alt is too terse for a visitor-readable case page`)
  }
  if (visual.caption?.trim() && visual.caption.trim().length < MIN_VISUAL_CAPTION_CHARS) {
    fail(projectId, `visual ${visual.id} image caption is too terse for a visitor-readable case page`)
  }
  if (visual.type === 'screenshot' && !visual.sourceUrl?.trim()) {
    fail(projectId, `visual ${visual.id} screenshot is missing sourceUrl evidence`)
  }

  const publicPath = join(process.cwd(), 'public', visual.image.replace(/^\//u, ''))
  if (!existsSync(publicPath)) {
    fail(projectId, `visual ${visual.id} references a missing asset: ${visual.image}`)
    return
  }
  assetQualityChecks.push({ projectId, context: `visual ${visual.id}`, image: visual.image, publicPath })
}

function isRasterNeedingWebpSidecar(image: string) {
  const extension = extname(image).toLowerCase()
  return extension === '.png' || extension === '.jpg' || extension === '.jpeg'
}

function webpSidecarPath(publicPath: string) {
  return publicPath.replace(/\.[^.\\/]+$/u, '.webp')
}

async function checkAssetQuality() {
  const metadataCache = new Map<string, Awaited<ReturnType<typeof sharp.prototype.metadata>>>()

  for (const check of assetQualityChecks) {
    let metadata = metadataCache.get(check.publicPath)
    if (!metadata) {
      try {
        metadata = await sharp(check.publicPath).metadata()
        metadataCache.set(check.publicPath, metadata)
      } catch {
        fail(check.projectId, `${check.context} asset is not parseable by the image pipeline: ${check.image}`)
        continue
      }
    }

    const width = metadata.width ?? 0
    const height = metadata.height ?? 0
    if (width <= 0 || height <= 0) {
      fail(check.projectId, `${check.context} asset is missing image dimensions: ${check.image}`)
      continue
    }
    if (width < MIN_ASSET_WIDTH || height < MIN_ASSET_HEIGHT || width * height < MIN_ASSET_AREA) {
      fail(
        check.projectId,
        `${check.context} asset is too small for a visitor-readable case page: ${check.image} (${width}x${height})`,
      )
    }

    if (isRasterNeedingWebpSidecar(check.image) && !existsSync(webpSidecarPath(check.publicPath))) {
      fail(check.projectId, `${check.context} raster asset is missing a matching WebP sidecar: ${check.image}`)
    }
  }
}

for (const project of projects) {
  checkProjectShell(project)

  if (!project.detailContent) {
    fail(project.id, 'missing detailContent')
    continue
  }

  checkRequiredGroups(project)

  const sections = flattenSections(project.detailContent)
  const visuals = sections.map((section) => section.visual).filter((visual): visual is ProjectVisualBlock => Boolean(visual))
  summaries.push({ id: project.id, sections: sections.length, visuals: visuals.length })

  if (sections.length < MIN_DETAIL_SECTIONS) {
    fail(project.id, `needs at least ${MIN_DETAIL_SECTIONS} detail sections, got ${sections.length}`)
  }
  if (visuals.length < MIN_BODY_VISUALS) {
    fail(project.id, `needs at least ${MIN_BODY_VISUALS} in-body visuals, got ${visuals.length}`)
  }
  if (!visuals.some((visual) => visual.type === 'screenshot')) {
    fail(project.id, 'needs at least one in-body screenshot visual for runtime evidence')
  }
  if (!visuals.some((visual) => STRUCTURAL_VISUAL_TYPES.has(visual.type))) {
    fail(project.id, 'needs at least one workflow/architecture/data-flow/diagram visual for structural explanation')
  }

  const bodyVisualImages = visuals.map((visual) => visual.image).filter((image): image is string => Boolean(image))
  const uniqueBodyVisualImages = new Set(bodyVisualImages)
  if (uniqueBodyVisualImages.size !== bodyVisualImages.length) {
    fail(project.id, 'in-body visuals should not reuse the same image within one project detail page')
  }
  if (project.image && bodyVisualImages.length > 0 && bodyVisualImages.every((image) => image === project.image)) {
    fail(project.id, 'in-body visuals should include evidence beyond the hero image')
  }

  for (const section of sections) {
    const hasBody = typeof section.body === 'string' && section.body.trim().length > 0
    const hasItems = Array.isArray(section.items) && section.items.length > 0
    if (!section.title.trim()) fail(project.id, 'a detail section is missing a title')
    if (!hasBody && !hasItems) fail(project.id, `section "${section.title}" needs body text or bullet items`)
    if (sectionTextLength(section) < MIN_SECTION_DETAIL_CHARS) {
      fail(project.id, `section "${section.title}" is too thin for a visitor-readable case study`)
    }
    checkPublicText(project.id, `section "${section.title}" title`, section.title)
    checkPublicText(project.id, `section "${section.title}" body`, section.body)
    for (const item of section.items ?? []) checkPublicText(project.id, `section "${section.title}" item`, item)
    for (const link of section.links ?? []) checkLink(project.id, link, `section "${section.title}"`)
  }

  for (const visual of visuals) checkVisual(project.id, visual)
}

await checkAssetQuality()

if (issues.length > 0) {
  console.error('Project detail evidence check failed:')
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  const compact = summaries.map((item) => `${item.id}:${item.sections}/${item.visuals}`).join(', ')
  console.log(`Project detail evidence check passed for ${projects.length} projects.`)
  console.log(`sections/visuals: ${compact}`)
}
