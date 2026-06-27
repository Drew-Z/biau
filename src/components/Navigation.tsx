import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

type SiteLanguage = 'zh' | 'en'
type ThemeMode = 'light' | 'dark' | 'auto'
type HarborScene = 'dusk' | 'garden' | 'stellar'

interface NavigationProps {
  language: SiteLanguage
  themeMode: ThemeMode
  harborScene: HarborScene
  onCycleTheme: () => void
  onCycleHarborScene: () => void
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
export function Navigation({
  language,
  themeMode,
  harborScene,
  onCycleTheme,
  onCycleHarborScene,
  onToggleLanguage,
}: NavigationProps) {
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
          <span
            className="nav-logo"
            data-scene={harborScene}
            onClick={(event) => {
              event.preventDefault()
              onCycleHarborScene()
            }}
          >
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true">
              <rect width="46" height="46" rx="15" fill="url(#logo-gradient)" />
              <path
                d="M11 30.2C14.8 27.3 18.9 27.4 22.7 30.2C26.6 33 31.2 32.5 36 28.9"
                stroke="url(#harbor-line)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M14 34H32.5"
                stroke="rgba(255,255,255,0.64)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M20.7 13.2V31.8"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="2.35"
                strokeLinecap="round"
              />
              <path
                d="M21.7 14C29.2 14.5 34.2 18.2 31.4 22.8C29.4 26 24.8 26.1 21.7 24.2V14Z"
                fill="url(#logo-sail)"
              />
              <path
                d="M21.7 23.4C31.5 23.2 37.1 28 33.8 32.6C31.2 36.1 25.1 35.4 21.7 31.5V23.4Z"
                fill="url(#logo-hull)"
              />
              <path
                d="M12.5 29.2C18 31 26.2 31.3 36 28.8C33.3 33.4 28.5 35.5 21.4 35.1C17.5 33.8 14.5 31.9 12.5 29.2Z"
                fill="url(#logo-hull)"
              />
              <circle cx="34.6" cy="27.3" r="2.7" fill="#FFD36E" />
              <circle cx="34.6" cy="27.3" r="5.5" fill="#FFD36E" opacity="0.16" />
              <path
                d="M18.7 29.7C23 30.8 27.9 30.6 33 29.5"
                stroke="rgba(255,255,255,0.34)"
                strokeWidth="1.25"
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
                <linearGradient id="logo-sail" x1="21.5" y1="13.5" x2="34" y2="27" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="1" stopColor="#C8D6FF" />
                </linearGradient>
                <linearGradient id="logo-hull" x1="12.5" y1="28.1" x2="35.2" y2="33.1" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#667EEA" />
                  <stop offset="0.58" stopColor="#354B7B" />
                  <stop offset="1" stopColor="#092243" />
                </linearGradient>
              </defs>
            </svg>
          </span>
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
