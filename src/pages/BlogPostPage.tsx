import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { blogColumnMeta } from '../data/blog'
import { getBlogProjectIds, getPublicBlogPostSummary, getRelatedBlogPosts } from '../data/blogCuration'
import { getBlogPost } from '../data/blogContent'
import type { BlogPost } from '../data/blogShared'
import { projects } from '../data/portfolio'

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [loadedPost, setLoadedPost] = useState<{ slug: string; post: BlogPost | null } | null>(null)

  const publicPostSummary = useMemo(() => (slug ? getPublicBlogPostSummary(slug) : undefined), [slug])
  const post = publicPostSummary ? (loadedPost && loadedPost.slug === slug ? loadedPost.post : undefined) : null

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

  if (post === undefined) {
    return (
      <main className="page-stack detail-page">
        <div className="detail-missing">
          <h1 className="section-title">文章载入中</h1>
          <p className="section-description">正在打开知识库内容。</p>
        </div>
      </main>
    )
  }

  if (!post) {
    return (
      <main className="page-stack detail-page">
        <div className="detail-missing">
          <h1 className="section-title">未找到该文章</h1>
          <p className="section-description">该文章可能已下线或链接有误。</p>
          <button className="btn" onClick={() => navigate('/blog')}>
            <ArrowLeft size={16} aria-hidden />
            <span>返回知识库</span>
          </button>
        </div>
      </main>
    )
  }

  return (
    <article className="page-stack detail-page blog-post-page">
      <Link to="/blog" className="detail-back">
        <ArrowLeft size={16} aria-hidden />
        <span>知识库</span>
      </Link>

      <header className="detail-header">
        <div className="detail-badges">
          <span className="tag">{blogColumnMeta[post.column].titleZh}</span>
          {post.series && <span className="blog-series">「{post.series}」</span>}
        </div>
        <h1 className="detail-title">{post.title}</h1>
        <p className="detail-summary">{post.detail}</p>
        <div className="blog-meta detail-meta">
          <span className="blog-read-time">{post.readTime}</span>
          <span className="blog-divider">·</span>
          <span className="blog-date">{post.date}</span>
          <span className="blog-divider">·</span>
          <span className="tag">{post.tag}</span>
        </div>
      </header>

      <div className="detail-body blog-post-body">
        {post.knowledgePoints && post.knowledgePoints.length > 0 && (
          <section className="detail-block">
            <h2 className="detail-block-title">知识点</h2>
            <ul className="detail-highlights">
              {post.knowledgePoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        )}

        {post.scenarios && post.scenarios.length > 0 && (
          <section className="detail-block">
            <h2 className="detail-block-title">应用场景</h2>
            <ul className="detail-highlights">
              {post.scenarios.map((scenario) => (
                <li key={scenario}>{scenario}</li>
              ))}
            </ul>
          </section>
        )}

        {post.sections.map((section) => (
          <section key={section.title} className="detail-block blog-post-section">
            <h2 className="detail-block-title">{section.title}</h2>
            <p className="blog-post-body-text">{section.body}</p>
          </section>
        ))}

        {post.practiceChecklist && post.practiceChecklist.length > 0 && (
          <section className="detail-block">
            <h2 className="detail-block-title">实践清单</h2>
            <ul className="detail-highlights">
              {post.practiceChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {post.takeaways.length > 0 && (
          <section className="detail-block">
            <h2 className="detail-block-title">关键收获</h2>
            <ul className="detail-highlights">
              {post.takeaways.map((takeaway) => (
                <li key={takeaway}>{takeaway}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {relatedProjects.length > 0 && (
        <section className="detail-related">
          <h2 className="detail-block-title">关联项目</h2>
          <div className="detail-related-grid">
            {relatedProjects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="detail-related-card">
                <span className="detail-related-cat">{project.role}</span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="detail-related">
          <h2 className="detail-block-title">延展阅读</h2>
          <div className="detail-related-grid">
            {related.map((item) => (
              <Link key={item.slug} to={`/blog/${item.slug}`} className="detail-related-card">
                <span className="detail-related-cat">{blogColumnMeta[item.column].titleZh}</span>
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
