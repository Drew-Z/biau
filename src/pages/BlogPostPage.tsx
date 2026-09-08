import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import '../styles/route-pages.css'
import { DetailReadingGuide, type DetailReadingItem } from '../components/DetailReadingGuide'
import { blogColumnMeta } from '../data/blog'
import { getBlogProjectIds, getPublicBlogPosts, getPublicBlogPostSummary, getRelatedBlogPosts } from '../data/blogCuration'
import { getBlogPost } from '../data/blogContent'
import type { BlogPost } from '../data/blogShared'
import { catalogCopy } from '../data/catalogCopy'
import { detailCopy } from '../data/detailCopy'
import { projects } from '../data/portfolio'
import { getBlogListHref, resolveBlogDiscovery, serializeBlogDiscoveryState } from '../utils/blogDiscovery'
import { useDetailReadingNavigation } from '../hooks/useReadingNavigation'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

export function BlogPostPage() {
  const language = useSiteLanguage()
  const copy = detailCopy[language]
  const languageTag = SITE_LANGUAGE_TAGS[language]
  const { slug } = useParams<{ slug: string }>()
  const { search } = useLocation()
  const [loadedPost, setLoadedPost] = useState<{ slug: string; post: BlogPost | null } | null>(null)
  const listState = useMemo(() => resolveBlogDiscovery(search, getPublicBlogPosts()).state, [search])
  const listHref = getBlogListHref(listState)
  const listSearch = serializeBlogDiscoveryState(listState)

  const publicPostSummary = useMemo(() => (slug ? getPublicBlogPostSummary(slug) : undefined), [slug])
  const post = publicPostSummary ? (loadedPost && loadedPost.slug === slug ? loadedPost.post : undefined) : null
  const { relatedState, returnState } = useDetailReadingNavigation(listHref, post !== undefined)

  useEffect(() => {
    let cancelled = false
    if (!slug || !publicPostSummary) {
      return () => {
        cancelled = true
      }
    }

    void getBlogPost(slug).then((nextPost) => {
      if (!cancelled) setLoadedPost({ slug, post: nextPost ?? null })
    })

    return () => {
      cancelled = true
    }
  }, [publicPostSummary, slug])

  const related = useMemo(() => {
    if (!post) return []
    return getRelatedBlogPosts(post)
  }, [post])

  const relatedProjects = useMemo(() => {
    if (!post) return []
    const projectIds = new Set(getBlogProjectIds(post.slug))
    return projects.filter((project) => projectIds.has(project.id))
  }, [post])

  const readingItems = useMemo<DetailReadingItem[]>(() => {
    if (!post) return []
    const items: DetailReadingItem[] = []
    if (post.knowledgePoints?.length) items.push({ id: 'blog-knowledge', label: copy.blog.knowledge })
    if (post.scenarios?.length) items.push({ id: 'blog-scenarios', label: copy.blog.scenarios })
    post.sections.forEach((section, index) => {
      items.push({ id: `blog-section-${index + 1}`, label: section.title, language: 'zh' })
    })
    if (post.practiceChecklist?.length) items.push({ id: 'blog-practice', label: copy.blog.practice })
    if (post.takeaways.length) items.push({ id: 'blog-takeaways', label: copy.blog.takeaways })
    if (relatedProjects.length) items.push({ id: 'blog-related-projects', label: copy.blog.relatedProjects })
    if (related.length) items.push({ id: 'blog-related-posts', label: copy.furtherReading })
    return items
  }, [copy, post, related, relatedProjects])

  if (post === undefined) {
    return (
      <main className="page-stack detail-page" lang={languageTag}>
        <div className="detail-missing">
          <h1 className="section-title">{copy.blog.loadingTitle}</h1>
          <p className="section-description">{copy.blog.loadingDescription}</p>
        </div>
      </main>
    )
  }

  if (!post) {
    return (
      <main className="page-stack detail-page" lang={languageTag}>
        <div className="detail-missing detail-missing--catalog">
          <h1 className="section-title" tabIndex={-1} data-reading-heading>{copy.blog.missingTitle}</h1>
          <p className="section-description">{copy.blog.missingDescription}</p>
          <Link className="btn" to={listHref} state={returnState}>
            <ArrowLeft size={16} aria-hidden />
            <span>{copy.blog.back}</span>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <article className="page-stack detail-page blog-post-page" lang={languageTag}>
      <Link to={listHref} className="detail-back" state={returnState}>
        <ArrowLeft size={16} aria-hidden />
        <span>{catalogCopy[language].blogTitle}</span>
      </Link>

      <header className="detail-header" lang="zh-CN">
        <div className="detail-badges">
          <span className="tag" lang={languageTag}>{language === 'en' ? blogColumnMeta[post.column].titleEn : blogColumnMeta[post.column].titleZh}</span>
          {post.series && <span className="blog-series">「{post.series}」</span>}
        </div>
        <h1 className="detail-title" tabIndex={-1} data-reading-heading>{post.title}</h1>
        <p className="detail-summary">{post.detail}</p>
        <div className="blog-meta detail-meta">
          <span className="blog-read-time" lang="en">{post.readTime}</span>
          <span className="blog-divider">·</span>
          <span className="blog-date" lang="en">{post.date}</span>
          <span className="blog-divider">·</span>
          <span className="tag">{post.tag}</span>
        </div>
      </header>

      <DetailReadingGuide items={readingItems} itemsLanguage={language} />

      <div className="detail-body blog-post-body">
        {post.knowledgePoints && post.knowledgePoints.length > 0 && (
          <section id="blog-knowledge" className="detail-block">
            <h2 className="detail-block-title">{copy.blog.knowledge}</h2>
            <ul className="detail-highlights" lang="zh-CN">
              {post.knowledgePoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        )}

        {post.scenarios && post.scenarios.length > 0 && (
          <section id="blog-scenarios" className="detail-block">
            <h2 className="detail-block-title">{copy.blog.scenarios}</h2>
            <ul className="detail-highlights" lang="zh-CN">
              {post.scenarios.map((scenario) => (
                <li key={scenario}>{scenario}</li>
              ))}
            </ul>
          </section>
        )}

        {post.sections.map((section, index) => (
          <section id={`blog-section-${index + 1}`} key={section.title} className="detail-block blog-post-section" lang="zh-CN">
            <h2 className="detail-block-title">{section.title}</h2>
            <p className="blog-post-body-text">{section.body}</p>
          </section>
        ))}

        {post.practiceChecklist && post.practiceChecklist.length > 0 && (
          <section id="blog-practice" className="detail-block">
            <h2 className="detail-block-title">{copy.blog.practice}</h2>
            <ul className="detail-highlights" lang="zh-CN">
              {post.practiceChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {post.takeaways.length > 0 && (
          <section id="blog-takeaways" className="detail-block">
            <h2 className="detail-block-title">{copy.blog.takeaways}</h2>
            <ul className="detail-highlights" lang="zh-CN">
              {post.takeaways.map((takeaway) => (
                <li key={takeaway}>{takeaway}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {relatedProjects.length > 0 && (
        <section id="blog-related-projects" className="detail-related">
          <h2 className="detail-block-title">{copy.blog.relatedProjects}</h2>
          <div className="detail-related-grid">
            {relatedProjects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="detail-related-card" lang="zh-CN">
                <span className="detail-related-cat">{project.role}</span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section id="blog-related-posts" className="detail-related">
          <h2 className="detail-block-title">{copy.furtherReading}</h2>
          <div className="detail-related-grid">
            {related.map((item) => (
              <Link key={item.slug} to={`/blog/${item.slug}${listSearch}`} className="detail-related-card" state={relatedState} lang="zh-CN">
                <span className="detail-related-cat" lang={languageTag}>{language === 'en' ? blogColumnMeta[item.column].titleEn : blogColumnMeta[item.column].titleZh}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
