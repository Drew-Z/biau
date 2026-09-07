import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BlogCard } from '../components/BlogCard'
import { BlogColumnFilter } from '../components/BlogColumnFilter'
import { blogColumnOrder, getBlogEmptyState, type BlogColumn } from '../data/blog'
import { getPublicBlogPosts } from '../data/blogCuration'
import {
  normalizeBlogQuery,
  parseBlogDiscoverySearch,
  resolveBlogDiscovery,
  serializeBlogDiscoveryState,
  type BlogDiscoveryState,
} from '../utils/blogDiscovery'

export function BlogPage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const [, setSearchParams] = useSearchParams()
  const [queryDraft, setQueryDraft] = useState<string | null>(null)

  const publicBlogs = useMemo(() => getPublicBlogPosts(), [])

  const { state, filteredPosts: filteredBlogs, visiblePosts: visibleBlogs, totalPages } = useMemo(
    () => resolveBlogDiscovery(search, publicBlogs),
    [publicBlogs, search],
  )
  const { column: selectedBlogColumn, query: searchQuery, page } = state
  const canonicalSearch = serializeBlogDiscoveryState(state)

  useEffect(() => {
    if (search !== canonicalSearch) setSearchParams(canonicalSearch, { replace: true })
  }, [canonicalSearch, search, setSearchParams])

  useEffect(() => {
    const restoreUrlInput = () => setQueryDraft(null)
    window.addEventListener('popstate', restoreUrlInput)
    return () => window.removeEventListener('popstate', restoreUrlInput)
  }, [])

  const availableColumns = useMemo(() => {
    return blogColumnOrder
  }, [])

  const blogColumnCounts = useMemo(() => {
    const counts: Record<BlogColumn, number> = {
      knowledge: 0,
      'project-notes': 0,
      resources: 0,
      'ai-daily': 0,
      'build-log': 0,
    }

    for (const post of publicBlogs) counts[post.column] += 1
    return counts
  }, [publicBlogs])

  const emptyState = getBlogEmptyState(selectedBlogColumn, searchQuery)

  const updateDiscovery = (patch: Partial<BlogDiscoveryState>, replace = false) => {
    // History is updated before React Router commits its transition. Reading it
    // here keeps fast input from overwriting a just-selected column.
    const currentSearch = window.location.search
    const nextSearch = serializeBlogDiscoveryState({ ...parseBlogDiscoverySearch(currentSearch), ...patch })
    if (nextSearch !== currentSearch) setSearchParams(nextSearch, { replace })
  }

  const handleSelectColumn = (column: BlogColumn | 'all') => {
    updateDiscovery({ column, page: 1 })
  }

  const handleSearchChange = (value: string) => {
    const query = normalizeBlogQuery(value)
    setQueryDraft(query)
    updateDiscovery({ query, page: 1 }, true)
  }

  return (
    <main className="blog-index-page page-stack">
      <section className="section-header page-hero">
        <p className="section-subtitle">KNOWLEDGE BASE</p>
        <h1 className="section-title">知识库</h1>
        <p className="section-description">从实践中提炼项目方法、技术路线和公开内容系统。</p>
      </section>

      <div className="blog-discovery">
        <BlogColumnFilter
          columns={availableColumns}
          counts={blogColumnCounts}
          totalCount={publicBlogs.length}
          selectedColumn={selectedBlogColumn}
          onSelect={handleSelectColumn}
        />

        <section className="blog-tools" aria-label="文章检索">
          <label className="sr-only" htmlFor="blog-search">
            搜索知识库文章
          </label>
          <input
            id="blog-search"
            className="blog-search"
            type="search"
            value={queryDraft ?? searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            onBlur={() => setQueryDraft(null)}
            placeholder="搜索文章、项目方法、技术关键词"
          />
          <p className="blog-result-meta" aria-live="polite">
            公开精选 · {filteredBlogs.length} 篇文章 · 第 {page} / {totalPages} 页
          </p>
        </section>
      </div>

      <div className="blogs-grid">
        {visibleBlogs.map((post) => (
          <BlogCard
            key={post.slug}
            post={post}
            onReadMore={() => {
              const current = resolveBlogDiscovery(window.location.search, publicBlogs)
              navigate(`/blog/${post.slug}${serializeBlogDiscoveryState(current.state)}`)
            }}
          />
        ))}
      </div>

      {visibleBlogs.length === 0 && (
        <section
          className="blog-empty"
          data-blog-empty-column={selectedBlogColumn}
          data-blog-empty-query={searchQuery.trim() ? 'true' : 'false'}
        >
          <h2>{emptyState.title}</h2>
          <p>{emptyState.description}</p>
          {emptyState.note && <p className="blog-empty-note">{emptyState.note}</p>}
        </section>
      )}

      <nav className="blog-pagination" aria-label="文章分页">
        <button
          className="btn"
          type="button"
          disabled={page === 1}
          aria-disabled={page === 1}
          onClick={() => updateDiscovery({ page: page - 1 })}
        >
          上一页
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          className="btn"
          type="button"
          disabled={page === totalPages}
          aria-disabled={page === totalPages}
          onClick={() => updateDiscovery({ page: page + 1 })}
        >
          下一页
        </button>
      </nav>
    </main>
  )
}
