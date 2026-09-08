import { Link } from 'react-router-dom'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

const footerLinks = [
  { label: { zh: '项目集', en: 'Projects' }, to: '/projects' },
  { label: { zh: '知识库', en: 'Knowledge Base' }, to: '/blog' },
  { label: { zh: 'AI 日报', en: 'AI Daily' }, to: '/ai-daily' },
  { label: { zh: '状态页', en: 'Status' }, to: '/status' },
]

const footerCopy = {
  zh: {
    label: 'BIAU Port 站点信息',
    title: 'AI 应用、项目案例与知识内容展示站',
    description: '本站用于展示公开项目、技术文章、入口状态和低敏演示路径；不会在页面中公开真实密钥、账号、数据库连接或私有后台地址。',
    trustLabel: '站点性质与边界',
    about: '项目性质',
    aboutText: '个人维护的开源/作品展示与工程记录站点，不是交易、支付、投融资或身份认证平台。',
    privacy: '隐私说明',
    privacyText: '站点分析适配器默认关闭；启用第三方统计前需要单独配置并审核采集范围。助手仅在用户主动使用时请求服务。',
    disclaimer: '免责声明',
    disclaimerText: '文章和演示内容只用于技术交流，不构成法律、医疗、投资或商业决策建议。',
    contact: '联系方式',
    contactBefore: '可通过',
    contactAfter: '反馈站点访问、内容或项目展示问题。',
    navigation: '页脚导航',
  },
  en: {
    label: 'BIAU Port site information',
    title: 'AI applications, project work and technical writing',
    description: 'Public projects, technical articles, entry status and demos that avoid sensitive data. Pages do not expose real credentials, accounts, database connections or private administration addresses.',
    trustLabel: 'About the site and its scope',
    about: 'About this site',
    aboutText: 'A personally maintained showcase of open-source work, projects and engineering notes. It is not a platform for trading, payments, financing, investment or identity verification.',
    privacy: 'Privacy',
    privacyText: 'Site analytics are disabled by default. Third-party analytics require separate configuration and a review of the data collected. The assistant requests service only when a visitor actively uses it.',
    disclaimer: 'Disclaimer',
    disclaimerText: 'Articles and demos are for technical discussion. They are not legal, medical, investment or business advice.',
    contact: 'Contact',
    contactBefore: 'Use',
    contactAfter: 'to report issues with site access, content or project presentations.',
    navigation: 'Footer navigation',
  },
}

export function SiteFooter() {
  const language = useSiteLanguage()
  const copy = footerCopy[language]
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer" aria-label={copy.label} lang={SITE_LANGUAGE_TAGS[language]}>
      <div className="site-footer__inner">
        <section className="site-footer__brand">
          <p className="site-footer__eyebrow">BIAU Port / <span lang="zh-CN">泊岸</span></p>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </section>

        <section className="site-footer__trust" aria-label={copy.trustLabel}>
          <article>
            <strong>{copy.about}</strong>
            <span>{copy.aboutText}</span>
          </article>
          <article>
            <strong>{copy.privacy}</strong>
            <span>{copy.privacyText}</span>
          </article>
          <article>
            <strong>{copy.disclaimer}</strong>
            <span>{copy.disclaimerText}</span>
          </article>
          <article>
            <strong>{copy.contact}</strong>
            <span>
              {copy.contactBefore}{' '}
              <a href="https://github.com/Drew-Z/biau/issues" target="_blank" rel="noopener noreferrer">
                GitHub Issues
              </a>{' '}
              {copy.contactAfter}
            </span>
          </article>
        </section>

        <nav className="site-footer__links" aria-label={copy.navigation}>
          {footerLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label[language]}
            </Link>
          ))}
        </nav>

        <p className="site-footer__copyright">© {year} BIAU Port / <span lang="zh-CN">泊岸</span>. Public-safe project showcase.</p>
      </div>
    </footer>
  )
}
