import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BlogCard } from '../components/BlogCard'
import { CategoryFilter } from '../components/CategoryFilter'
import { blogPosts, type BlogCategory } from '../data/blog'

export function BlogPage() {
  const navigate = useNavigate()
  const [selectedBlogCategory, setSelectedBlogCategory] = useState<BlogCategory | 'all'>('all')

  const filteredBlogs = useMemo(() => {
    if (selectedBlogCategory === 'all') return blogPosts
    return blogPosts.filter((post) => post.category === selectedBlogCategory)
  }, [selectedBlogCategory])

  const availableCategories = useMemo(() => {
    return Array.from(new Set(blogPosts.map((post) => post.category)))
  }, [])

  return (
    <div className="page-section">
      <div className="section-header">
        <p className="section-subtitle">KNOWLEDGE BASE</p>
        <h1 className="section-title">知识库</h1>
        <p className="section-description">从实践中提炼，向未来回声</p>
      </div>

      <CategoryFilter
        categories={availableCategories}
        selectedCategory={selectedBlogCategory}
        onSelect={setSelectedBlogCategory}
      />

      <div className="blogs-grid">
        {filteredBlogs.map((post) => (
          <BlogCard
            key={post.slug}
            post={post}
            onReadMore={() => navigate(`/blog/${post.slug}`)}
          />
        ))}
      </div>
    </div>
  )
}
