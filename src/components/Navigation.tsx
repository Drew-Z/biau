import { Activity, Bot, FolderKanban, Home, Library } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BiauPortMark } from './BiauPortMark'

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
  mobileLabel?: { en: string; zh: string }
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/', label: { en: 'HOME', zh: '首页' }, icon: Home },
  { to: '/projects', label: { en: 'PROJECTS', zh: '项目' }, icon: FolderKanban },
  {
    to: '/blog',
    label: { en: 'BLOG', zh: '博客' },
    mobileLabel: { en: 'KNOWLEDGE', zh: '知识' },
    icon: Library,
  },
  { to: '/status', label: { en: 'STATUS', zh: '状态' }, icon: Activity },
  { to: '/assistant', label: { en: 'ASSISTANT', zh: '助手' }, icon: Bot },
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
    <>
      <nav className="navigation-top" aria-label="主导航">
        <div className="nav-inner">
          <Link className="nav-brand-section" to="/" aria-label="回到首页 / BIAU Port 泊岸">
            <span className="nav-logo" data-scene={harborScene} onClick={onCycleHarborScene}>
              <BiauPortMark className="nav-logo-mark" />
            </span>
            <div className="nav-brand-text">
              <div className="brand-subtitle">BIAU PORT</div>
              <div className="brand-title">{brandTitle[language]}</div>
            </div>
          </Link>

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

      <nav className="mobile-tabbar" aria-label="移动端主导航">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `mobile-tab ${isActive ? 'is-active' : ''}`}
              aria-label={`${item.label.zh} / ${item.label.en}`}
            >
              <Icon className="mobile-tab__icon" size={19} strokeWidth={1.9} aria-hidden />
              <span className="mobile-tab__label">{item.mobileLabel?.[language] ?? item.label[language]}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
