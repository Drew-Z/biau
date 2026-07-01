import fs from 'node:fs'
import path from 'node:path'
import { blogPosts } from '../src/data/blog'
import {
  blogCuration,
  getAssistantBlogPosts,
  getBlogCatalog,
  getFeaturedBlogPosts,
  getProjectBlogPosts,
  getPublicBlogPosts,
} from '../src/data/blogCuration'
import { getLoadableBlogPostSlugs } from '../src/data/blogContent'
import { projects } from '../src/data/portfolio'

const blogPostsDir = path.resolve('src/data/blog-posts')
const legacyBlogArchiveDir = path.resolve('content-archive/legacy-blog')
const legacyBlogPostsDir = path.join(legacyBlogArchiveDir, 'posts')
const legacyRewriteQueuePath = path.join(legacyBlogArchiveDir, 'rewrite-queue.json')
const requiredProjectIds = ['legal-rag', 'pet-workspace', 'ozon-erp', 'biau-playlab', 'blog-semi', 'xunqiu']

interface LegacyRewriteQueue {
  counts?: {
    legacyPosts?: number
    runtimeFeaturedPosts?: number
  }
  entries?: Array<{
    slug?: string
    archivePath?: string
    status?: string
  }>
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

function sortCountMap(counts: Record<string, number>) {
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
}

function readTsFileSlugs(directory: string) {
  if (!fs.existsSync(directory)) return new Set<string>()
  return new Set(
    fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => file.replace(/\.ts$/, '')),
  )
}

function readLegacyRewriteQueue(): LegacyRewriteQueue | null {
  if (!fs.existsSync(legacyRewriteQueuePath)) return null
  return JSON.parse(fs.readFileSync(legacyRewriteQueuePath, 'utf8')) as LegacyRewriteQueue
}

function main() {
  const issues: string[] = []
  const catalog = getBlogCatalog()
  const publicPosts = getPublicBlogPosts()
  const assistantPosts = getAssistantBlogPosts()
  const featuredPosts = getFeaturedBlogPosts()
  const summarySlugs = new Set(blogPosts.map((post) => post.slug))
  const loadableSlugs = new Set(getLoadableBlogPostSlugs())
  const fileSlugs = readTsFileSlugs(blogPostsDir)
  const legacyFileSlugs = readTsFileSlugs(legacyBlogPostsDir)
  const legacyRewriteQueue = readLegacyRewriteQueue()
  const legacyEntries = legacyRewriteQueue?.entries ?? []
  const legacyEntrySlugs = new Set(legacyEntries.map((entry) => entry.slug).filter((slug): slug is string => Boolean(slug)))
  const projectIds = new Set(projects.map((project) => project.id))

  const missingPublicLoaders = publicPosts.filter((post) => !loadableSlugs.has(post.slug)).map((post) => post.slug)
  const missingFiles = blogPosts.filter((post) => !fileSlugs.has(post.slug)).map((post) => post.slug)
  const orphanLoaders = [...loadableSlugs].filter((slug) => !summarySlugs.has(slug))
  const hiddenLoaders = catalog
    .filter((post) => post.visibility === 'hidden' && loadableSlugs.has(post.slug))
    .map((post) => post.slug)
  const orphanFiles = [...fileSlugs].filter((slug) => !summarySlugs.has(slug))
  const invalidCurationSlugs = Object.keys(blogCuration).filter((slug) => !summarySlugs.has(slug))

  if (missingPublicLoaders.length > 0) issues.push(`missing public blogContent loaders: ${missingPublicLoaders.join(', ')}`)
  if (missingFiles.length > 0) issues.push(`missing blog post files: ${missingFiles.join(', ')}`)
  if (orphanLoaders.length > 0) issues.push(`orphan blogContent loaders: ${orphanLoaders.join(', ')}`)
  if (hiddenLoaders.length > 0) issues.push(`hidden posts still have public loaders: ${hiddenLoaders.join(', ')}`)
  if (orphanFiles.length > 0) issues.push(`orphan blog post files: ${orphanFiles.join(', ')}`)
  if (invalidCurationSlugs.length > 0) issues.push(`curation references unknown slugs: ${invalidCurationSlugs.join(', ')}`)

  if (!legacyRewriteQueue) {
    issues.push('missing legacy rewrite queue: content-archive/legacy-blog/rewrite-queue.json')
  }

  if (legacyRewriteQueue?.counts?.legacyPosts !== legacyEntries.length) {
    issues.push('legacy rewrite queue count does not match entries length')
  }

  if (legacyRewriteQueue?.counts?.runtimeFeaturedPosts !== featuredPosts.length) {
    issues.push('legacy rewrite queue runtimeFeaturedPosts count does not match featured posts')
  }

  const legacyEntriesWithoutFiles = [...legacyEntrySlugs].filter((slug) => !legacyFileSlugs.has(slug))
  const legacyFilesWithoutEntries = [...legacyFileSlugs].filter((slug) => !legacyEntrySlugs.has(slug))
  const legacyRuntimeOverlap = [...legacyFileSlugs].filter((slug) => summarySlugs.has(slug))

  if (legacyEntriesWithoutFiles.length > 0) {
    issues.push(`legacy rewrite queue entries missing archive files: ${legacyEntriesWithoutFiles.join(', ')}`)
  }
  if (legacyFilesWithoutEntries.length > 0) {
    issues.push(`legacy archive files missing rewrite queue entries: ${legacyFilesWithoutEntries.join(', ')}`)
  }
  if (legacyRuntimeOverlap.length > 0) {
    issues.push(`legacy archive overlaps runtime blog catalog: ${legacyRuntimeOverlap.join(', ')}`)
  }

  for (const post of featuredPosts) {
    if (!Number.isFinite(post.priority) || post.priority <= 0) {
      issues.push(`featured post has invalid priority: ${post.slug}`)
    }
    if (!post.role) issues.push(`featured post has no role: ${post.slug}`)
  }

  for (const post of catalog) {
    for (const projectId of post.projectIds ?? []) {
      if (!projectIds.has(projectId)) issues.push(`${post.slug} references unknown project: ${projectId}`)
    }
  }

  for (const projectId of requiredProjectIds) {
    if (getProjectBlogPosts(projectId).length === 0) {
      issues.push(`required project has no related blog posts: ${projectId}`)
    }
  }

  const hiddenPublicSlugs = publicPosts.filter((post) => post.visibility === 'hidden').map((post) => post.slug)
  if (hiddenPublicSlugs.length > 0) issues.push(`hidden posts leaked into public selector: ${hiddenPublicSlugs.join(', ')}`)

  const hiddenAssistantSlugs = assistantPosts.filter((post) => post.visibility === 'hidden').map((post) => post.slug)
  if (hiddenAssistantSlugs.length > 0) {
    issues.push(`hidden posts leaked into assistant selector: ${hiddenAssistantSlugs.join(', ')}`)
  }

  const hiddenCount = catalog.filter((post) => post.visibility === 'hidden').length
  if (publicPosts.length > featuredPosts.length) {
    issues.push('archive posts are public; current cleanup policy only allows curated featured posts to be public')
  }

  const report = {
    totalPosts: blogPosts.length,
    publicContentLoaders: loadableSlugs.size,
    runtimeContentFiles: fileSlugs.size,
    legacyArchiveFiles: legacyFileSlugs.size,
    legacyRewriteQueueEntries: legacyEntries.length,
    visibility: sortCountMap(countBy(catalog, (post) => post.visibility)),
    columns: sortCountMap(countBy(catalog, (post) => post.column)),
    tags: sortCountMap(countBy(catalog, (post) => post.tag)),
    topSeries: Object.fromEntries(
      Object.entries(countBy(catalog, (post) => post.series ?? '(none)'))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
    ),
    dates: sortCountMap(countBy(catalog, (post) => post.date)),
    featuredSlugs: featuredPosts.map((post) => post.slug),
    publicSlugs: publicPosts.map((post) => post.slug),
    hiddenCount,
    requiredProjectCoverage: Object.fromEntries(
      requiredProjectIds.map((projectId) => [
        projectId,
        getProjectBlogPosts(projectId).map((post) => post.slug),
      ]),
    ),
    missingPublicLoaders,
    missingFiles,
    orphanLoaders,
    hiddenLoaders,
    orphanFiles,
    invalidCurationSlugs,
    legacyEntriesWithoutFiles,
    legacyFilesWithoutEntries,
    legacyRuntimeOverlap,
  }

  console.log(JSON.stringify(report, null, 2))

  if (issues.length > 0) {
    console.error(`博客目录审计失败，共 ${issues.length} 个问题：`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log('博客目录审计通过：策展状态、项目关联和正文索引一致。')
}

main()
