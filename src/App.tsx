import { lazy, Suspense, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { useTheme } from './hooks/useTheme'
import { Navigation } from './components/Navigation'
import { SeoManager } from './components/SeoManager'
import { HarborIntro } from './components/HarborIntro'

type SiteLanguage = 'zh' | 'en'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const ProjectDetailPage = lazy(() =>
  import('./pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })),
)
const BlogPage = lazy(() => import('./pages/BlogPage').then((module) => ({ default: module.BlogPage })))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((module) => ({ default: module.BlogPostPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function App() {
  const [language, setLanguage] = useState<SiteLanguage>('zh')
  const { mode: themeMode, cycleMode: cycleThemeMode } = useTheme()
  const { pathname } = useLocation()

  const pageClass =
    pathname === '/'
      ? 'page-home'
      : pathname === '/projects'
        ? 'page-tools page-subpage'
        : pathname.startsWith('/projects')
          ? 'page-detail page-project-detail page-subpage'
          : pathname === '/blog'
            ? 'page-letters page-blog page-subpage'
            : pathname.startsWith('/blog')
              ? 'page-detail page-blog-post page-subpage'
              : 'page-not-found page-subpage'

  return (
    <div className={`app ${pageClass}`}>
      <div className="gradient-bg" />
      <div className="muxing-flow-grain" aria-hidden="true" />
      {pathname === '/' && <HarborIntro />}
      <SeoManager />

      <Navigation
        language={language}
        themeMode={themeMode}
        onCycleTheme={cycleThemeMode}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'))}
      />

      <Suspense
        fallback={
          <main className="page-stack route-loading">
            <div className="detail-missing">载入中</div>
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
