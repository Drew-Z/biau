import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

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

const brandTitle: Record<SiteLanguage, string> = { zh: '泊岸', en: 'BIAU PORT' }
const allProjectsLabel: Record<SiteLanguage, string> = { zh: '所有项目', en: 'ALL PROJECTS' }
const backHomeLabel: Record<SiteLanguage, string> = { zh: '回主页', en: 'HOME' }

export function Navigation({ language, themeMode, onCycleTheme, onToggleLanguage }: NavigationProps) {
  const theme = themeMeta[themeMode]
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const primaryActionLabel = isHome ? allProjectsLabel[language] : backHomeLabel[language]
  const primaryActionTarget = isHome ? '/projects' : '/'

  return (
    <nav className="navigation-top">
      <div className="nav-inner">
        {/* 左侧：Logo + 站点名 */}
        <Link className="nav-brand-section" to="/" aria-label="回到首页 / BIAU Port 泊岸">
          <div className="nav-logo">
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true">
              <rect width="46" height="46" rx="15" fill="url(#logo-gradient)" />
              <path
                d="M12 29.5C15.2 26.9 18.8 26.9 22 29.5C25.2 32.1 28.8 32.1 34 28"
                stroke="url(#harbor-line)"
                strokeWidth="2.7"
                strokeLinecap="round"
              />
              <path
                d="M15 33.5H31.5"
                stroke="rgba(255,255,255,0.72)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M18 25.2V12.5H26.4C30.1 12.5 32.6 14.6 32.6 17.8C32.6 21.1 30 23.1 26.2 23.1H22.7"
                stroke="white"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="34" cy="26.4" r="2.6" fill="#FFD36E" />
              <path
                d="M34 21.4V17.8"
                stroke="#FFD36E"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="46" y2="46">
                  <stop offset="0%" stopColor="#667EEA" />
                  <stop offset="100%" stopColor="#764BA2" />
                </linearGradient>
                <linearGradient id="harbor-line" x1="12" y1="26" x2="34" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#EAF7FF" />
                  <stop offset="100%" stopColor="#FFD36E" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="nav-brand-text">
            <div className="brand-subtitle">BIAU PORT</div>
            <div className="brand-title">{brandTitle[language]}</div>
          </div>
        </Link>

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

        {/* 右侧：主题切换 + 语言切换 + 语境按钮 */}
        <div className="nav-actions">
          <button
            type="button"
            className="nav-theme-toggle"
            onClick={onCycleTheme}
            aria-label={`主题：${theme.label.zh} / Theme: ${theme.label.en}`}
            title={`${theme.label.zh} · ${theme.label.en}`}
          >
            {theme.glyph}
          </button>
          <button
            type="button"
            className="nav-lang-toggle"
            onClick={onToggleLanguage}
            aria-label="切换语言 / Switch language"
          >
            {language === 'zh' ? 'EN' : '中'}
          </button>
          <button
            type="button"
            className="nav-all-tools"
            onClick={() => navigate(primaryActionTarget)}
            aria-label={primaryActionLabel}
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </nav>
  )
}
