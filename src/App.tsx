import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import './styles/site-footer.css'
import { useSiteTheme } from './hooks/useSiteTheme'
import { FlowBackground } from './components/FlowBackground'
import { StarfieldBackground } from './components/StarfieldBackground'
import { StellarEffects } from './components/StellarEffects'
import { Navigation } from './components/Navigation'
import { SeoManager } from './components/SeoManager'
import { HarborIntro } from './components/HarborIntro'
import { SiteFooter } from './components/SiteFooter'
import { PublicAssistantLauncher } from './components/PublicAssistantLauncher'
import { BlogPage } from './pages/BlogPage'
import { HomePage } from './pages/HomePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { trackRouteView } from './utils/analytics'
import { loadPublicAssistantWidget } from './utils/publicAssistantLoader'
import {
  abortPublicAssistantWarmup,
  getPublicAssistantWarmupServerSnapshot,
  getPublicAssistantWarmupSnapshot,
  startPublicAssistantWarmup,
  subscribePublicAssistantWarmup,
} from './utils/publicAssistantWarmup'

type SiteLanguage = 'zh' | 'en'

const ProjectDetailPage = lazy(() =>
  import('./pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })),
)
const SiteStatusPage = lazy(() =>
  import('./pages/SiteStatusPage').then((module) => ({ default: module.SiteStatusPage })),
)
const SiteStatusDetailPage = lazy(() =>
  import('./pages/SiteStatusDetailPage').then((module) => ({ default: module.SiteStatusDetailPage })),
)
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((module) => ({ default: module.BlogPostPage })))
const StudioPage = lazy(() => import('./pages/StudioPage').then((module) => ({ default: module.StudioPage })))
const StudioAiDailyIssuePage = lazy(() =>
  import('./pages/StudioAiDailyIssuePage').then((module) => ({ default: module.StudioAiDailyIssuePage })),
)
const StudioAiDailyWorkspacePage = lazy(() =>
  import('./pages/StudioAiDailyWorkspacePage').then((module) => ({ default: module.StudioAiDailyWorkspacePage })),
)
const AiDailyPublicPage = lazy(() => import('./pages/AiDailyPublicPage').then((module) => ({ default: module.AiDailyPublicPage })))
const AiDailyPublicDetailPage = lazy(() =>
  import('./pages/AiDailyPublicDetailPage').then((module) => ({ default: module.AiDailyPublicDetailPage })),
)
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const PublicAssistantWidget = lazy(loadPublicAssistantWidget)

function getPageClass(pathname: string) {
  if (pathname === '/') return 'page-home'
  if (pathname === '/projects') return 'page-tools page-subpage'
  if (pathname.startsWith('/projects/')) return 'page-detail page-project-detail page-subpage'
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return 'page-studio page-subpage'
  if (pathname === '/status') return 'page-status page-subpage'
  if (pathname.startsWith('/status/')) return 'page-status page-status-detail page-detail page-subpage'
  if (pathname === '/blog') return 'page-letters page-blog page-subpage'
  if (pathname.startsWith('/blog/')) return 'page-detail page-blog-post page-subpage'
  if (pathname === '/ai-daily') return 'page-letters page-ai-daily page-subpage'
  if (pathname.startsWith('/ai-daily/')) return 'page-detail page-ai-daily-detail page-subpage'
  return 'page-not-found page-subpage'
}

function App() {
  const [language, setLanguage] = useState<SiteLanguage>('zh')
  const { theme, selectTheme } = useSiteTheme()
  const [assistantMounted, setAssistantMounted] = useState(false)
  const [assistantInitiallyOpen, setAssistantInitiallyOpen] = useState(false)
  const [assistantFooterVisible, setAssistantFooterVisible] = useState(false)
  const { pathname } = useLocation()
  const assistantWarmup = useSyncExternalStore(
    subscribePublicAssistantWarmup,
    getPublicAssistantWarmupSnapshot,
    getPublicAssistantWarmupServerSnapshot,
  )

  useEffect(() => {
    trackRouteView(pathname)
  }, [pathname])

  useEffect(() => {
    if (pathname.startsWith('/studio')) return
    const media = window.matchMedia('(max-width: 768px)')
    const handleFirstScroll = () => {
      if (!media.matches) return
      void loadPublicAssistantWidget()
      void startPublicAssistantWarmup()
    }
    window.addEventListener('scroll', handleFirstScroll, { passive: true, once: true })
    return () => window.removeEventListener('scroll', handleFirstScroll)
  }, [pathname])

  useEffect(() => {
    const footer = document.querySelector('.site-footer')
    if (!footer || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setAssistantFooterVisible(entry.isIntersecting), { threshold: 0.08 })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => abortPublicAssistantWarmup(), [])

  const pageClass = getPageClass(pathname)
  const showPublicAssistant = !pathname.startsWith('/studio')

  return (
    <div className={`app ${pageClass}`}>
      <FlowBackground theme={theme} />
      <StarfieldBackground theme={theme} />
      <StellarEffects theme={theme} />
      {pathname === '/' && <HarborIntro theme={theme} />}
      <SeoManager />

      <Navigation
        language={language}
        theme={theme}
        onSelectTheme={selectTheme}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'))}
      />
      {showPublicAssistant && !assistantMounted && (
        <PublicAssistantLauncher
          warmup={assistantWarmup}
          footerVisible={assistantFooterVisible}
          onIntent={() => {
            void loadPublicAssistantWidget()
            void startPublicAssistantWarmup()
          }}
          onOpen={() => {
            setAssistantInitiallyOpen(true)
            setAssistantMounted(true)
          }}
        />
      )}
      {showPublicAssistant && assistantMounted && (
        <Suspense
          fallback={(
            <PublicAssistantLauncher
              warmup={assistantWarmup}
              footerVisible={assistantFooterVisible}
              onIntent={() => {
                void loadPublicAssistantWidget()
                void startPublicAssistantWarmup()
              }}
              onOpen={() => undefined}
              opening
            />
          )}
        >
          <PublicAssistantWidget
            initiallyOpen={assistantInitiallyOpen}
            onInitialOpenHandled={() => setAssistantInitiallyOpen(false)}
          />
        </Suspense>
      )}

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
          <Route path="/studio/ai-daily/:issueId" element={<StudioAiDailyIssuePage />} />
          <Route path="/studio/ai-daily" element={<StudioAiDailyWorkspacePage />} />
          <Route path="/studio/*" element={<StudioPage />} />
          <Route path="/status" element={<SiteStatusPage />} />
          <Route path="/status/:projectId" element={<SiteStatusDetailPage />} />
          <Route path="/ai-daily" element={<AiDailyPublicPage />} />
          <Route path="/ai-daily/:publicId" element={<AiDailyPublicDetailPage />} />
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
