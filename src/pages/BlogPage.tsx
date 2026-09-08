import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BlogCard } from '../components/BlogCard'
import { BlogColumnFilter } from '../components/BlogColumnFilter'
import { blogColumnOrder, getBlogEmptyState, type BlogColumn } from '../data/blog'
import { getPublicBlogPosts } from '../data/blogCuration'
import { catalogCopy } from '../data/catalogCopy'
import { useCatalogReadingNavigation } from '../hooks/useReadingNavigation'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'
import {
  getBlogListHref,
  normalizeBlogQuery,
  parseBlogDiscoverySearch,
  resolveBlogDiscovery,
  serializeBlogDiscoveryState,
  type BlogDiscoveryState,
} from '../utils/blogDiscovery'

export function BlogPage() {
  const language = useSiteLanguage()
  const copy = catalogCopy[language]
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
  const rememberReadingEntry = useCatalogReadingNavigation(getBlogListHref(state))

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

  const emptyState = getBlogEmptyState(selectedBlogColumn, searchQuery, language)

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
    <main className="blog-index-page page-stack" lang={SITE_LANGUAGE_TAGS[language]}>
      <section className="section-header page-hero">
        <p className="section-subtitle" lang="en">KNOWLEDGE BASE</p>
        <h1 className="section-title" tabIndex={-1} data-reading-heading>{copy.blogTitle}</h1>
        <p className="section-description">{copy.blogDescription}</p>
      </section>

      <div className="blog-discovery">
        <BlogColumnFilter
          columns={availableColumns}
          counts={blogColumnCounts}
          totalCount={publicBlogs.length}
          selectedColumn={selectedBlogColumn}
          onSelect={handleSelectColumn}
        />

        <section className="blog-tools" aria-label={copy.searchRegion}>
          <label className="sr-only" htmlFor="blog-search">
            {copy.searchLabel}
          </label>
          <input
            id="blog-search"
            className="blog-search"
            type="search"
            value={queryDraft ?? searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            onBlur={() => setQueryDraft(null)}
            placeholder={copy.searchPlaceholder}
          />
          <p className="blog-result-meta" aria-live="polite">
            {copy.resultSummary(filteredBlogs.length, page, totalPages)}
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
              navigate(`/blog/${post.slug}${serializeBlogDiscoveryState(current.state)}`, {
                state: rememberReadingEntry(`blog:${post.slug}`, getBlogListHref(current.state)),
              })
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

      <nav className="blog-pagination" aria-label={copy.pagination}>
        <button
          className="btn"
          type="button"
          disabled={page === 1}
          aria-disabled={page === 1}
          onClick={() => updateDiscovery({ page: page - 1 })}
        >
          {copy.previousPage}
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
          {copy.nextPage}
        </button>
      </nav>
    </main>
  )
}
