import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import './styles/site-footer.css'
import { useTheme } from './hooks/useTheme'
import { Navigation } from './components/Navigation'
import { PublicAssistantWidget } from './components/PublicAssistantWidget'
import { SeoManager } from './components/SeoManager'
import { HarborIntro } from './components/HarborIntro'
import { SiteFooter } from './components/SiteFooter'
import { BlogPage } from './pages/BlogPage'
import { HomePage } from './pages/HomePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { AssistantPage } from './pages/AssistantPage'
import { AssistantAdminPage } from './pages/AssistantAdminPage'
import { SiteStatusPage } from './pages/SiteStatusPage'
import { SiteStatusDetailPage } from './pages/SiteStatusDetailPage'
import { trackRouteView } from './utils/analytics'

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
const StudioPage = lazy(() => import('./pages/StudioPage').then((module) => ({ default: module.StudioPage })))
const StudioAiDailyIssuePage = lazy(() =>
  import('./pages/StudioAiDailyIssuePage').then((module) => ({ default: module.StudioAiDailyIssuePage })),
)
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function getPageClass(pathname: string) {
  if (pathname === '/') return 'page-home'
  if (pathname === '/projects') return 'page-tools page-subpage'
  if (pathname.startsWith('/projects/')) return 'page-detail page-project-detail page-subpage'
  if (pathname === '/assistant' || pathname.startsWith('/assistant/')) return 'page-assistant page-subpage'
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return 'page-studio page-subpage'
  if (pathname === '/status' || pathname.startsWith('/status/')) return 'page-status page-subpage'
  if (pathname === '/blog') return 'page-letters page-blog page-subpage'
  if (pathname.startsWith('/blog/')) return 'page-detail page-blog-post page-subpage'
  return 'page-not-found page-subpage'
}

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

  useEffect(() => {
    trackRouteView(pathname)
  }, [pathname])

  const pageClass = getPageClass(pathname)
  const showPublicAssistant = !pathname.startsWith('/assistant') && !pathname.startsWith('/studio')

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
      {showPublicAssistant && <PublicAssistantWidget />}

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
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/assistant/admin" element={<AssistantAdminPage />} />
          <Route path="/studio/ai-daily/:issueId" element={<StudioAiDailyIssuePage />} />
          <Route path="/studio/*" element={<StudioPage />} />
          <Route path="/status" element={<SiteStatusPage />} />
          <Route path="/status/:projectId" element={<SiteStatusDetailPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <SiteFooter />
    </div>
  )
}

export default App
