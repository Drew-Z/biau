import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft } from '@douyinfe/semi-icons'
import { blogPosts, categoryLabels } from '../data/blog'

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const post = useMemo(() => blogPosts.find((p) => p.slug === slug), [slug])

  const related = useMemo(() => {
    if (!post) return []
    return blogPosts
      .filter((p) => p.slug !== post.slug && p.category === post.category)
      .slice(0, 3)
  }, [post])

  if (!post) {
    return (
      <div className="page-section">
        <div className="detail-missing">
          <h1 className="section-title">未找到该文章</h1>
          <p className="section-description">该文章可能已下线或链接有误。</p>
          <button className="btn" onClick={() => navigate('/blog')}>
            <IconArrowLeft />
            <span>返回知识库</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <article className="page-section detail-page blog-post-page">
      <Link to="/blog" className="detail-back">
        <IconArrowLeft />
        <span>知识库</span>
      </Link>

      <header className="detail-header">
        <div className="detail-badges">
          <span className="tag">{categoryLabels[post.category]}</span>
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

      {related.length > 0 && (
        <section className="detail-related">
          <h2 className="detail-block-title">同类文章</h2>
          <div className="detail-related-grid">
            {related.map((item) => (
              <Link key={item.slug} to={`/blog/${item.slug}`} className="detail-related-card">
                <span className="detail-related-cat">{categoryLabels[item.category]}</span>
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
