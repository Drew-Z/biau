import { getPublicBlogPosts } from '../src/data/blogCuration'
import { getBlogPost } from '../src/data/blogContent'
import type { BlogPost } from '../src/data/blogShared'

const MIN_KNOWLEDGE_POINTS = 5
const MIN_SCENARIOS = 4
const MIN_CHECKLIST_ITEMS = 5
const MIN_SECTIONS = 8
const MIN_TAKEAWAYS = 4
const MIN_SECTION_BODY_CHARS = 80
const MIN_TOTAL_SECTION_CHARS = 1800

const evidenceTitlePattern = /(资料来源|来源|参考|依据|证据边界|evidence|references|sources)/iu
const evidenceBodyPattern =
  /(src\/data\/|scripts\/|docs\/|public\/status\/|package\.json|README|CONTEXT\.md|\.trellis\/|eval\/|apps\/|packages\/|公开材料|公开安全材料|低敏)/iu
const followUpPattern = /(后续|下一阶段|roadmap|gate|门禁|人工|release|发布|验收|credentialed|synthetic)/iu
const sensitivePatterns = [
  { label: 'Windows absolute path', pattern: /(^|[\s"'([{])[A-Za-z]:[\\/]/u },
  { label: 'file URL', pattern: /file:\/\//iu },
  { label: 'localhost', pattern: /localhost|127\.0\.0\.1|0\.0\.0\.0/iu },
  { label: 'private IPv4 address', pattern: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/u },
  { label: 'secret-like query string', pattern: /(?:token|key|secret|password|passwd|pwd)=/iu },
  { label: 'secret literal', pattern: /\b(?:sk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{12,}|postgres(?:ql)?:\/\/[^"'\s]+)\b/iu },
]

const issues: string[] = []
const summaries: string[] = []

function fail(slug: string, message: string) {
  issues.push(`${slug}: ${message}`)
}

function nonEmptyStrings(items: string[] | undefined) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean)
}

function sectionBody(section: BlogPost['sections'][number]) {
  return typeof section.body === 'string' ? section.body.trim() : ''
}

function combinedPostText(post: BlogPost) {
  return [
    post.title,
    post.detail,
    post.tag,
    post.series,
    ...nonEmptyStrings(post.knowledgePoints),
    ...nonEmptyStrings(post.scenarios),
    ...nonEmptyStrings(post.practiceChecklist),
    ...post.sections.flatMap((section) => [section.title, sectionBody(section)]),
    ...post.takeaways,
  ]
    .filter(Boolean)
    .join('\n')
}

function hasEvidenceSection(post: BlogPost) {
  return post.sections.some((section) => evidenceTitlePattern.test(section.title) && evidenceBodyPattern.test(sectionBody(section)))
}

function checkPost(post: BlogPost) {
  const slug = post.slug
  const knowledgePoints = nonEmptyStrings(post.knowledgePoints)
  const scenarios = nonEmptyStrings(post.scenarios)
  const checklist = nonEmptyStrings(post.practiceChecklist)
  const takeaways = nonEmptyStrings(post.takeaways)
  const fullText = combinedPostText(post)
  const totalSectionChars = post.sections.reduce((total, section) => total + sectionBody(section).length, 0)

  if (knowledgePoints.length < MIN_KNOWLEDGE_POINTS) {
    fail(slug, `needs at least ${MIN_KNOWLEDGE_POINTS} knowledgePoints, got ${knowledgePoints.length}`)
  }
  if (scenarios.length < MIN_SCENARIOS) {
    fail(slug, `needs at least ${MIN_SCENARIOS} scenarios, got ${scenarios.length}`)
  }
  if (checklist.length < MIN_CHECKLIST_ITEMS) {
    fail(slug, `needs at least ${MIN_CHECKLIST_ITEMS} practiceChecklist items, got ${checklist.length}`)
  }
  if (post.sections.length < MIN_SECTIONS) {
    fail(slug, `needs at least ${MIN_SECTIONS} sections, got ${post.sections.length}`)
  }
  if (takeaways.length < MIN_TAKEAWAYS) {
    fail(slug, `needs at least ${MIN_TAKEAWAYS} takeaways, got ${takeaways.length}`)
  }
  if (totalSectionChars < MIN_TOTAL_SECTION_CHARS) {
    fail(slug, `section bodies are too thin; expected >= ${MIN_TOTAL_SECTION_CHARS} chars, got ${totalSectionChars}`)
  }

  for (const [index, section] of post.sections.entries()) {
    if (!section.title.trim()) fail(slug, `section ${index + 1} is missing a title`)
    if (sectionBody(section).length < MIN_SECTION_BODY_CHARS) {
      fail(slug, `section "${section.title || index + 1}" body is too thin`)
    }
  }

  if (!hasEvidenceSection(post)) {
    fail(slug, 'needs an evidence/source-boundary section citing safe public materials or repo paths')
  }
  if (!followUpPattern.test(fullText)) {
    fail(slug, 'needs explicit follow-up, roadmap, gate, or acceptance boundary language')
  }

  for (const { label, pattern } of sensitivePatterns) {
    if (pattern.test(fullText)) fail(slug, `matches sensitive public-content pattern: ${label}`)
  }

  summaries.push(
    `${slug}: kp=${knowledgePoints.length}, scenarios=${scenarios.length}, checklist=${checklist.length}, sections=${post.sections.length}, takeaways=${takeaways.length}, sectionChars=${totalSectionChars}`,
  )
}

async function main() {
  const projectNoteSummaries = getPublicBlogPosts().filter((post) => post.column === 'project-notes')

  if (projectNoteSummaries.length === 0) {
    console.log('Blog project-notes quality check skipped: no public project notes.')
    return
  }

  for (const summary of projectNoteSummaries) {
    const post = await getBlogPost(summary.slug)
    if (!post) {
      fail(summary.slug, 'public project note is missing a loadable runtime article')
      continue
    }
    checkPost(post)
  }

  if (issues.length > 0) {
    console.error(`Blog project-notes quality check failed (${issues.length} issues):`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log(`Blog project-notes quality check passed for ${projectNoteSummaries.length} public project notes.`)
  console.log(summaries.join('\n'))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
