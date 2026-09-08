import { Link } from 'react-router-dom'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'
import '../styles/route-pages.css'

export function NotFoundPage() {
  const language = useSiteLanguage()
  const english = language === 'en'
  return (
    <main className="page-stack not-found-page" lang={SITE_LANGUAGE_TAGS[language]}>
      <section className="section-header page-hero">
        <p className="section-subtitle">404 / LOST ROUTE</p>
        <h1 className="section-title">{english ? 'Page not found' : '页面没有靠岸'}</h1>
        <p className="section-description">{english ? 'There is no content at this address. Return home, or browse the projects and knowledge base.' : '这个地址暂时没有对应内容，可以回到主页，或继续查看项目和知识库。'}</p>
      </section>

      <nav className="not-found-actions" aria-label={english ? 'Page recovery' : '404 页面导航'}>
        <Link to="/" className="btn">
          {english ? 'Home' : '回主页'}
        </Link>
        <Link to="/projects" className="btn">
          {english ? 'Projects' : '看项目'}
        </Link>
        <Link to="/blog" className="btn">
          {english ? 'Knowledge Base' : '看知识库'}
        </Link>
      </nav>
    </main>
  )
}
