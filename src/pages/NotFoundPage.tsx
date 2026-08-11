import { Link } from 'react-router-dom'
import '../styles/route-pages.css'

export function NotFoundPage() {
  return (
    <main className="page-stack not-found-page">
      <section className="section-header page-hero">
        <p className="section-subtitle">404 / LOST ROUTE</p>
        <h1 className="section-title">页面没有靠岸</h1>
        <p className="section-description">这个地址暂时没有对应内容，可以回到主页，或继续查看项目和知识库。</p>
      </section>

      <nav className="not-found-actions" aria-label="404 页面导航">
        <Link to="/" className="btn">
          回主页
        </Link>
        <Link to="/projects" className="btn">
          看项目
        </Link>
        <Link to="/blog" className="btn">
          看知识库
        </Link>
      </nav>
    </main>
  )
}
