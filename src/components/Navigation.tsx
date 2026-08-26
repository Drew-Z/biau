import { Activity, FolderKanban, Home, Leaf, Library, Sparkles, Sunrise } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BiauPortMark } from './BiauPortMark'
import { SITE_THEMES, SITE_THEME_META, type SiteTheme } from '../utils/appearance'

type SiteLanguage = 'zh' | 'en'

interface NavigationProps {
  language: SiteLanguage
  theme: SiteTheme
  onSelectTheme: (theme: SiteTheme) => void
  onToggleLanguage: () => void
}

const themeIcons: Record<SiteTheme, LucideIcon> = {
  morning: Sunrise,
  nature: Leaf,
  stellar: Sparkles,
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
]

const brandTitle: Record<SiteLanguage, string> = { zh: '泊岸', en: 'BIAU PORT' }
const allProjectsLabel: Record<SiteLanguage, string> = { zh: '所有项目', en: 'ALL PROJECTS' }
const backHomeLabel: Record<SiteLanguage, string> = { zh: '回主页', en: 'HOME' }

export function Navigation({
  language,
  theme,
  onSelectTheme,
  onToggleLanguage,
}: NavigationProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const primaryActionLabel = isHome ? allProjectsLabel[language] : backHomeLabel[language]
  const primaryActionTarget = isHome ? '/projects' : '/'

  return (
    <>
      <nav className="navigation-top" aria-label="主导航">
        <div className="nav-inner">
          <div className="nav-brand-section">
            <Link
              to="/"
              className="nav-logo"
              data-theme={theme}
              aria-label="回到首页 / BIAU Port 泊岸"
            >
              <BiauPortMark className="nav-logo-mark" />
            </Link>
            <Link className="nav-brand-link" to="/" aria-label="回到首页 / BIAU Port 泊岸">
              <div className="nav-brand-text">
                <div className="brand-title">{brandTitle[language]}</div>
                <div className="brand-subtitle">BIAU PORT</div>
              </div>
            </Link>
          </div>

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
              className="nav-lang-toggle"
              onClick={onToggleLanguage}
              aria-label="切换语言 / Switch language"
            >
              {language === 'zh' ? '中' : 'EN'}
            </button>
            <div className="nav-theme-selector" role="group" aria-label="选择主题 / Select theme">
              {SITE_THEMES.map((option) => {
                const ThemeIcon = themeIcons[option]
                const label = SITE_THEME_META[option].label
                return (
                  <button
                    key={option}
                    type="button"
                    className="nav-theme-option"
                    data-theme-option={option}
                    aria-pressed={theme === option}
                    aria-label={`${label.zh}主题 / ${label.en} theme`}
                    title={`${label.zh} / ${label.en}`}
                    onClick={() => onSelectTheme(option)}
                  >
                    <span className="nav-theme-swatch" aria-hidden />
                    <ThemeIcon size={15} strokeWidth={1.9} aria-hidden />
                  </button>
                )
              })}
            </div>
            <span className="sr-only" aria-live="polite">
              当前主题：{SITE_THEME_META[theme].label.zh} / {SITE_THEME_META[theme].label.en}
            </span>
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
