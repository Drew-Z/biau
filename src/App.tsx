import { lazy, Suspense, useLayoutEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { useTheme } from './hooks/useTheme'
import { Navigation } from './components/Navigation'
import { SeoManager } from './components/SeoManager'
import { HarborIntro } from './components/HarborIntro'
import { BlogPage } from './pages/BlogPage'
import { HomePage } from './pages/HomePage'
import { ProjectsPage } from './pages/ProjectsPage'

type SiteLanguage = 'zh' | 'en'
type HarborScene = 'dusk' | 'garden' | 'stellar'

const HARBOR_SCENE_STORAGE_KEY = 'biau-port-harbor-scene'

function readHarborScene(): HarborScene {
  if (typeof window === 'undefined') return 'dusk'
  const stored = window.localStorage.getItem(HARBOR_SCENE_STORAGE_KEY)
  if (stored === 'dusk' || stored === 'garden' || stored === 'stellar') return stored
  return 'dusk'
}

const ProjectDetailPage = lazy(() =>
  import('./pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })),
)
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((module) => ({ default: module.BlogPostPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function App() {
  const [language, setLanguage] = useState<SiteLanguage>('zh')
  const [harborScene, setHarborScene] = useState<HarborScene>(readHarborScene)
  const { mode: themeMode, cycleMode: cycleThemeMode } = useTheme()
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.harborScene = harborScene
    window.localStorage.setItem(HARBOR_SCENE_STORAGE_KEY, harborScene)
  }, [harborScene])

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
      <div className="harbor-environment" aria-hidden="true">
        <span className="harbor-environment__beam" />
        <span className="harbor-environment__spectrum" />
        <span className="harbor-environment__mist" />
      </div>
      <div className="muxing-flow-grain" aria-hidden="true" />
      {pathname === '/' && <HarborIntro />}
      <SeoManager />

      <Navigation
        language={language}
        themeMode={themeMode}
        harborScene={harborScene}
        onCycleTheme={cycleThemeMode}
        onCycleHarborScene={() =>
          setHarborScene((prev) => (prev === 'dusk' ? 'garden' : prev === 'garden' ? 'stellar' : 'dusk'))
        }
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
