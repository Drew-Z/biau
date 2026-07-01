import { blogColumnMeta, blogPosts, type BlogColumn, type BlogPostSummary } from './blog'
import type { Project } from './portfolio'

export type BlogVisibility = 'featured' | 'archive' | 'hidden'
export type BlogContentRole = 'case-study' | 'technical-method' | 'resource' | 'roadmap'

export interface BlogCuration {
  visibility: BlogVisibility
  role: BlogContentRole
  priority: number
  projectIds?: Project['id'][]
}

export type CuratedBlogPost = BlogPostSummary & BlogCuration

export const blogVisibilityLabels: Record<BlogVisibility, string> = {
  featured: '精选',
  archive: '归档',
  hidden: '暂不展示',
}

export const blogRoleLabels: Record<BlogContentRole, string> = {
  'case-study': '项目案例',
  'technical-method': '技术方法',
  resource: '资源清单',
  roadmap: '迭代路线',
}

const defaultCuration: BlogCuration = {
  visibility: 'hidden',
  role: 'technical-method',
  priority: 999,
}

export const blogCuration: Partial<Record<string, BlogCuration>> = {
  'legal-rag-review': {
    visibility: 'featured',
    role: 'case-study',
    priority: 10,
    projectIds: ['legal-rag'],
  },
  'legal-rag-production-upgrade-plan': {
    visibility: 'featured',
    role: 'roadmap',
    priority: 20,
    projectIds: ['legal-rag'],
  },
  'ozon-erp-architecture': {
    visibility: 'featured',
    role: 'case-study',
    priority: 30,
    projectIds: ['ozon-erp'],
  },
  'pet-workspace-pipeline': {
    visibility: 'featured',
    role: 'case-study',
    priority: 40,
    projectIds: ['pet-workspace'],
  },
  'xunqiu-android64-rebuild': {
    visibility: 'featured',
    role: 'case-study',
    priority: 50,
    projectIds: ['xunqiu'],
  },
  'game-showcase-standard': {
    visibility: 'featured',
    role: 'case-study',
    priority: 60,
    projectIds: [
      'biau-playlab',
      'game-first-tetris',
      'game-next-spacewar',
      'intespace',
      'raiden-prototype',
      'space-war',
      'spacewar-ii',
    ],
  },
  'content-modeling-project-site': {
    visibility: 'featured',
    role: 'resource',
    priority: 70,
    projectIds: ['blog-semi'],
  },
  'public-content-governance': {
    visibility: 'featured',
    role: 'resource',
    priority: 80,
    projectIds: ['blog-semi'],
  },
  'static-site-release-verification': {
    visibility: 'featured',
    role: 'technical-method',
    priority: 90,
    projectIds: ['blog-semi'],
  },
  'blog-content-system-build-log': {
    visibility: 'featured',
    role: 'technical-method',
    priority: 100,
    projectIds: ['blog-semi'],
  },
}

const sourceOrder = new Map(blogPosts.map((post, index) => [post.slug, index]))

function byCurationPriority(a: CuratedBlogPost, b: CuratedBlogPost) {
  const visibilityRank: Record<BlogVisibility, number> = {
    featured: 0,
    archive: 1,
    hidden: 2,
  }
  const visibilityDelta = visibilityRank[a.visibility] - visibilityRank[b.visibility]
  if (visibilityDelta !== 0) return visibilityDelta

  const priorityDelta = a.priority - b.priority
  if (priorityDelta !== 0) return priorityDelta

  const dateDelta = b.date.localeCompare(a.date)
  if (dateDelta !== 0) return dateDelta

  return (sourceOrder.get(a.slug) ?? 0) - (sourceOrder.get(b.slug) ?? 0)
}

export function getBlogCuration(slug: string): BlogCuration {
  return blogCuration[slug] ?? defaultCuration
}

export function getBlogCatalog(): CuratedBlogPost[] {
  return blogPosts
    .map((post) => ({ ...post, ...getBlogCuration(post.slug) }))
    .sort(byCurationPriority)
}

export function getPublicBlogPosts() {
  return getBlogCatalog().filter((post) => post.visibility !== 'hidden')
}

export function getPublicBlogPostSummary(slug: string) {
  return getPublicBlogPosts().find((post) => post.slug === slug)
}

export function getFeaturedBlogPosts() {
  return getBlogCatalog().filter((post) => post.visibility === 'featured')
}

export function getAssistantBlogPosts() {
  return getPublicBlogPosts()
}

export function getProjectBlogPosts(projectId: Project['id']) {
  return getPublicBlogPosts().filter((post) => post.projectIds?.includes(projectId))
}

export function getBlogProjectIds(slug: string) {
  return getBlogCuration(slug).projectIds ?? []
}

export function getBlogAssistantTags(post: CuratedBlogPost) {
  const column = blogColumnMeta[post.column]
  return Array.from(new Set([
    post.tag,
    post.column,
    column.titleZh,
    column.titleEn,
    post.series ?? '',
    blogVisibilityLabels[post.visibility],
    blogRoleLabels[post.role],
    post.visibility === 'featured' ? '精选知识' : '',
    ...(post.knowledgePoints ?? []),
  ].filter(Boolean)))
}

export function filterBlogPosts(
  posts: CuratedBlogPost[],
  options: { column: BlogColumn | 'all'; query: string },
) {
  const normalizedQuery = options.query.trim().toLowerCase()

  return posts.filter((post) => {
    const matchesColumn = options.column === 'all' || post.column === options.column
    if (!matchesColumn) return false
    if (!normalizedQuery) return true
    const column = blogColumnMeta[post.column]

    return [
      post.title,
      post.detail,
      post.tag,
      post.series,
      column.titleZh,
      column.titleEn,
      column.description,
      blogVisibilityLabels[post.visibility],
      blogRoleLabels[post.role],
      ...(post.knowledgePoints ?? []),
      ...(post.projectIds ?? []),
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedQuery))
  })
}

export function getRelatedBlogPosts(post: Pick<BlogPostSummary, 'slug' | 'column' | 'series'>, limit = 3) {
  const currentProjectIds = new Set(getBlogProjectIds(post.slug))

  return getPublicBlogPosts()
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      let score = 0
      if (candidate.projectIds?.some((projectId) => currentProjectIds.has(projectId))) score += 40
      if (post.series && candidate.series === post.series) score += 20
      if (candidate.column === post.column) score += 10
      if (candidate.visibility === 'featured') score += 5
      return { candidate, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.priority - b.candidate.priority)
    .slice(0, limit)
    .map((entry) => entry.candidate)
}
