import { Link } from 'react-router-dom'

const footerLinks = [
  { label: '项目集', to: '/projects' },
  { label: '知识库', to: '/blog' },
  { label: '状态页', to: '/status' },
]

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer" aria-label="BIAU Port 站点信息">
      <div className="site-footer__inner">
        <section className="site-footer__brand">
          <p className="site-footer__eyebrow">BIAU Port / 泊岸</p>
          <h2>AI 应用、项目案例与知识内容展示站</h2>
          <p>
            本站用于展示公开项目、技术文章、入口状态和低敏演示路径；不会在页面中公开真实密钥、账号、数据库连接或私有后台地址。
          </p>
        </section>

        <section className="site-footer__trust" aria-label="站点性质与边界">
          <article>
            <strong>项目性质</strong>
            <span>个人维护的开源/作品展示与工程记录站点，不是交易、支付、投融资或身份认证平台。</span>
          </article>
          <article>
            <strong>隐私说明</strong>
            <span>站点分析适配器默认关闭；启用第三方统计前需要单独配置并审核采集范围。助手仅在用户主动使用时请求服务。</span>
          </article>
          <article>
            <strong>免责声明</strong>
            <span>文章和演示内容只用于技术交流，不构成法律、医疗、投资或商业决策建议。</span>
          </article>
          <article>
            <strong>联系方式</strong>
            <span>
              可通过{' '}
              <a href="https://github.com/Drew-Z/biau/issues" target="_blank" rel="noopener noreferrer">
                GitHub Issues
              </a>{' '}
              反馈站点访问、内容或项目展示问题。
            </span>
          </article>
        </section>

        <nav className="site-footer__links" aria-label="页脚导航">
          {footerLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="site-footer__copyright">© {year} BIAU Port / 泊岸. Public-safe project showcase.</p>
      </div>
    </footer>
  )
}
