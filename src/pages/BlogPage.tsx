import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BlogCard } from '../components/BlogCard'
import { BlogColumnFilter } from '../components/BlogColumnFilter'
import { blogColumnMeta, blogColumnOrder, type BlogColumn } from '../data/blog'
import {
  filterBlogPosts,
  getPublicBlogPosts,
} from '../data/blogCuration'

const PAGE_SIZE = 12

export function BlogPage() {
  const navigate = useNavigate()
  const [selectedBlogColumn, setSelectedBlogColumn] = useState<BlogColumn | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const publicBlogs = useMemo(() => getPublicBlogPosts(), [])

  const filteredBlogs = useMemo(() => {
    return filterBlogPosts(publicBlogs, {
      column: selectedBlogColumn,
      query: searchQuery,
    })
  }, [publicBlogs, searchQuery, selectedBlogColumn])

  const totalPages = Math.max(1, Math.ceil(filteredBlogs.length / PAGE_SIZE))
  const visibleBlogs = filteredBlogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  const emptyTitle =
    selectedBlogColumn === 'all'
      ? '没有找到相关文章'
      : `${blogColumnMeta[selectedBlogColumn].titleZh} 暂无公开文章`
  const emptyDescription =
    selectedBlogColumn === 'all'
      ? '换一个关键词或分类试试看。'
      : searchQuery.trim()
        ? '当前栏目下没有匹配关键词的公开文章。'
        : '内容仍在整理或人工审核中，通过发布门禁后会出现在这里。'

  const handleSelectColumn = (column: BlogColumn | 'all') => {
    setSelectedBlogColumn(column)
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  return (
    <main className="blog-index-page page-stack">
      <section className="section-header page-hero">
        <p className="section-subtitle">KNOWLEDGE BASE</p>
        <h1 className="section-title">知识库</h1>
        <p className="section-description">从实践中提炼项目方法、技术路线和公开内容系统。</p>
      </section>

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
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="搜索文章、项目方法、技术关键词"
        />
        <p className="blog-result-meta" aria-live="polite">
          公开精选 · {filteredBlogs.length} 篇文章 · 第 {page} / {totalPages} 页
        </p>
      </section>

      <div className="blogs-grid">
        {visibleBlogs.map((post) => (
          <BlogCard
            key={post.slug}
            post={post}
            onReadMore={() => navigate(`/blog/${post.slug}`)}
          />
        ))}
      </div>

      {visibleBlogs.length === 0 && (
        <section className="blog-empty">
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
        </section>
      )}

      <nav className="blog-pagination" aria-label="文章分页">
        <button
          className="btn"
          type="button"
          disabled={page === 1}
          aria-disabled={page === 1}
          onClick={() => setPage((current) => current - 1)}
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
          onClick={() => setPage((current) => current + 1)}
        >
          下一页
        </button>
      </nav>
    </main>
  )
}
