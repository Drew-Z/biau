import type { BlogPost } from '../data/blog'

interface BlogCardProps {
  post: BlogPost
  onReadMore: () => void
}

export function BlogCard({ post, onReadMore }: BlogCardProps) {
  return (
    <article className="glass-card blog-card hover-lift">
      <div className="blog-header">
        <span className="tag">{post.tag}</span>
        {post.series && <span className="blog-series">「{post.series}」</span>}
      </div>
      
      <h3 className="blog-title">{post.title}</h3>
      <p className="blog-detail">{post.detail}</p>
      
      <div className="blog-meta">
        <span className="blog-read-time">{post.readTime}</span>
        <span className="blog-divider">·</span>
        <span className="blog-date">{post.date}</span>
      </div>
      
      {post.knowledgePoints && post.knowledgePoints.length > 0 && (
        <div className="blog-tags">
          {post.knowledgePoints.slice(0, 3).map((point) => (
            <span key={point} className="knowledge-tag">{point}</span>
          ))}
        </div>
      )}
      
      <button className="btn" onClick={onReadMore}>
        READ MORE →
      </button>
    </article>
  )
}
