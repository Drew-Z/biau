import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import './App.css'
import { useTheme } from './hooks/useTheme'
import { Navigation } from './components/Navigation'
import { HomePage } from './pages/HomePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { BlogPage } from './pages/BlogPage'
import { BlogPostPage } from './pages/BlogPostPage'

type SiteLanguage = 'zh' | 'en'

function App() {
  const [language, setLanguage] = useState<SiteLanguage>('zh')
  const { mode: themeMode, cycleMode: cycleThemeMode } = useTheme()

  return (
    <div className="app">
      <div className="gradient-bg" />

      <Navigation
        language={language}
        themeMode={themeMode}
        onCycleTheme={cycleThemeMode}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'))}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  )
}

export default App
