import { NavLink, useNavigate } from 'react-router-dom'

type SiteLanguage = 'zh' | 'en'
type ThemeMode = 'light' | 'dark' | 'auto'

interface NavigationProps {
  language: SiteLanguage
  themeMode: ThemeMode
  onCycleTheme: () => void
  onToggleLanguage: () => void
}

const themeMeta: Record<ThemeMode, { glyph: string; label: Record<SiteLanguage, string> }> = {
  light: { glyph: '☀', label: { zh: '浅色', en: 'LIGHT' } },
  dark: { glyph: '☾', label: { zh: '深色', en: 'DARK' } },
  auto: { glyph: '◐', label: { zh: '自动', en: 'AUTO' } },
}

interface NavItem {
  to: string
  label: { en: string; zh: string }
}

const navItems: NavItem[] = [
  { to: '/', label: { en: 'HOME', zh: '首页' } },
  { to: '/projects', label: { en: 'PROJECTS', zh: '项目' } },
  { to: '/blog', label: { en: 'BLOG', zh: '博客' } },
]

const brandTitle: Record<SiteLanguage, string> = { zh: '笔岸实验室', en: 'BIAU LABS' }
const allProjectsLabel: Record<SiteLanguage, string> = { zh: '所有项目', en: 'ALL PROJECTS' }

export function Navigation({ language, themeMode, onCycleTheme, onToggleLanguage }: NavigationProps) {
  const theme = themeMeta[themeMode]
  const navigate = useNavigate()

  return (
    <nav className="navigation-top">
      <div className="nav-inner">
        {/* 左侧：Logo + 站点名 */}
        <div className="nav-brand-section">
          <div className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#logo-gradient)"/>
              <path d="M16 8L20 16L16 24L12 16L16 8Z" fill="white" opacity="0.9"/>
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#667eea"/>
                  <stop offset="100%" stopColor="#764ba2"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="nav-brand-text">
            <div className="brand-subtitle">BIAU LABS</div>
            <div className="brand-title">{brandTitle[language]}</div>
          </div>
        </div>

        {/* 中间：主导航 */}
        <ul className="nav-items-center">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link-center ${isActive ? 'active' : ''}`}
              >
                <span className="nav-link-en">{item.label[language]}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* 右侧：主题切换 + 语言切换 + 所有项目按钮 */}
        <div className="nav-actions">
          <button
            className="nav-theme-toggle"
            onClick={onCycleTheme}
            aria-label={`主题：${theme.label.zh} / Theme: ${theme.label.en}`}
            title={`${theme.label.zh} · ${theme.label.en}`}
          >
            {theme.glyph}
          </button>
          <button
            className="nav-lang-toggle"
            onClick={onToggleLanguage}
            aria-label="切换语言 / Switch language"
          >
            {language === 'zh' ? 'EN' : '中'}
          </button>
          <button className="nav-all-tools" onClick={() => navigate('/projects')}>
            {allProjectsLabel[language]}
          </button>
        </div>
      </div>
    </nav>
  )
}
