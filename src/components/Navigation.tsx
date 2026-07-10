import { useState } from 'react'
import { IconClose, IconMenu } from '@douyinfe/semi-icons'
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
}

const navItems: NavItem[] = [
  { to: '/', label: { en: 'HOME', zh: '首页' } },
  { to: '/projects', label: { en: 'PROJECTS', zh: '项目' } },
  { to: '/blog', label: { en: 'BLOG', zh: '博客' } },
  { to: '/status', label: { en: 'STATUS', zh: '状态' } },
  { to: '/assistant', label: { en: 'ASSISTANT', zh: '助手' } },
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
  const [mobileMenuState, setMobileMenuState] = useState({ open: false, pathname })
  const isHome = pathname === '/'
  const primaryActionLabel = isHome ? allProjectsLabel[language] : backHomeLabel[language]
  const primaryActionTarget = isHome ? '/projects' : '/'
  const mobileMenuId = 'site-mobile-navigation'
  const mobileMenuOpen = mobileMenuState.pathname === pathname && mobileMenuState.open

  const handlePrimaryAction = () => {
    setMobileMenuState({ open: false, pathname })
    navigate(primaryActionTarget)
  }

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
            <BiauPortMark className="nav-logo-mark" />
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
            onClick={handlePrimaryAction}
            aria-label={primaryActionLabel}
          >
            {primaryActionLabel}
          </button>
          <button
            type="button"
            className="nav-menu-toggle"
            onClick={() => setMobileMenuState({ open: !mobileMenuOpen, pathname })}
            aria-label={mobileMenuOpen ? '关闭导航菜单 / Close menu' : '打开导航菜单 / Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuId}
          >
            {mobileMenuOpen ? <IconClose aria-hidden /> : <IconMenu aria-hidden />}
          </button>
        </div>

        <div id={mobileMenuId} className="nav-mobile-panel" hidden={!mobileMenuOpen}>
          <div className="nav-mobile-links">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-mobile-link ${isActive ? 'active' : ''}`}
              >
                {item.label[language]}
              </NavLink>
            ))}
          </div>
          <div className="nav-mobile-actions">
            <button type="button" className="nav-mobile-primary nav-mobile-language" onClick={onToggleLanguage}>
              {language === 'zh' ? 'English' : '简体中文'}
            </button>
            <button type="button" className="nav-mobile-primary" onClick={handlePrimaryAction}>
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
