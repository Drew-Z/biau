import type { KeyboardEvent } from 'react'
import type { BlogPostSummary } from '../data/blog'
import { catalogCopy } from '../data/catalogCopy'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

interface BlogCardProps {
  post: BlogPostSummary
  onReadMore: () => void
}

export function BlogCard({ post, onReadMore }: BlogCardProps) {
  const language = useSiteLanguage()
  const copy = catalogCopy[language]
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onReadMore()
  }

  return (
    <article
      className="glass-card blog-card hover-lift"
      lang={SITE_LANGUAGE_TAGS[language]}
      data-reading-card={`blog:${post.slug}`}
      role="link"
      tabIndex={0}
      aria-label={copy.readArticle(post.title)}
      onClick={onReadMore}
      onKeyDown={handleKeyDown}
    >
      <div className="blog-header" lang="zh-CN">
        <span className="tag">{post.tag}</span>
        {post.series && <span className="blog-series">「{post.series}」</span>}
      </div>

      <h3 className="blog-title" lang="zh-CN">{post.title}</h3>
      <p className="blog-detail" lang="zh-CN">{post.detail}</p>

      <div className="blog-meta" lang="en">
        <span className="blog-read-time">{post.readTime}</span>
        <span className="blog-divider">·</span>
        <span className="blog-date">{post.date}</span>
      </div>

      {post.knowledgePoints && post.knowledgePoints.length > 0 && (
        <div className="blog-tags" lang="zh-CN">
          {post.knowledgePoints.slice(0, 3).map((point) => (
            <span key={point} className="knowledge-tag">{point}</span>
          ))}
        </div>
      )}

      <button
        className="btn"
        data-reading-entry={`blog:${post.slug}`}
        onClick={(event) => {
          event.stopPropagation()
          onReadMore()
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {copy.readMore} →
      </button>
    </article>
  )
}
