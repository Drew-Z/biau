import { blogColumnOrder, type BlogColumn } from '../data/blog'
import { filterBlogPosts, type CuratedBlogPost } from '../data/blogCuration'

export const BLOG_PAGE_SIZE = 12
export const MAX_BLOG_QUERY_LENGTH = 120

export interface BlogDiscoveryState {
  column: BlogColumn | 'all'
  query: string
  page: number
}

export function normalizeBlogQuery(value: string) {
  // Preserve word separators while typing; matching trims the query separately.
  return Array.from(value).slice(0, MAX_BLOG_QUERY_LENGTH).join('')
}

export function parseBlogDiscoverySearch(search: string): BlogDiscoveryState {
  const params = new URLSearchParams(search)
  const rawColumn = params.get('column')
  const rawPage = params.get('page') ?? ''
  const page = /^[1-9]\d*$/u.test(rawPage) ? Number(rawPage) : 1
  return {
    column: blogColumnOrder.find((column) => column === rawColumn) ?? 'all',
    query: normalizeBlogQuery(params.get('q') ?? ''),
    page: Number.isSafeInteger(page) ? page : 1,
  }
}

export function serializeBlogDiscoveryState(state: BlogDiscoveryState) {
  const params = new URLSearchParams()
  if (state.column !== 'all') params.set('column', state.column)
  const query = normalizeBlogQuery(state.query)
  if (query) params.set('q', query)
  if (Number.isSafeInteger(state.page) && state.page > 1) params.set('page', String(state.page))
  const search = params.toString()
  return search ? `?${search}` : ''
}

export function resolveBlogDiscovery(search: string, posts: CuratedBlogPost[]) {
  const requested = parseBlogDiscoverySearch(search)
  const filteredPosts = filterBlogPosts(posts, requested)
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / BLOG_PAGE_SIZE))
  const state = { ...requested, page: Math.min(requested.page, totalPages) }
  return {
    state,
    filteredPosts,
    totalPages,
    visiblePosts: filteredPosts.slice((state.page - 1) * BLOG_PAGE_SIZE, state.page * BLOG_PAGE_SIZE),
  }
}

export function getBlogListHref(state: BlogDiscoveryState) {
  return `/blog${serializeBlogDiscoveryState(state)}`
}
