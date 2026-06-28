import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconLink } from '@douyinfe/semi-icons'
import { projects, categoryLabels, statusLabels } from '../data/portfolio'
import { ResponsiveImage } from '../components/ResponsiveImage'

const xunqiuCurrentState = [
  {
    title: '旧版 App 与旧后端保留',
    detail:
      '旧 Android 客户端仍对应旧 Java 后端和历史接口，不把旧包强行切到新服务，避免影响历史链路和旧版验证口径。',
  },
  {
    title: '64 位新 App 接入新后端',
    detail:
      '新版 Android 64 客户端通过配置化 Host 指向现代后端，核心路径保持旧客户端熟悉的接口形态和返回 envelope。',
  },
  {
    title: '静态产品页用于公开展示',
    detail:
      '产品展示页承载项目说明、技术文档、APK 下载和仓库入口；动态能力由 Render 后端与 R2 上传链路支撑。',
  },
]

const xunqiuBackendScope = [
  '账号登录与 token',
  '动态发布、评论、点赞',
  '图片与短视频 multipart 上传',
  '球队、成员、约赛与球场',
  '搜索、消息和兜底展示数据',
  '支付、短信、IM、推送安全 stub',
]

const xunqiuVerification = [
  'Render 健康检查返回 UP',
  'PostgreSQL 由 Flyway 初始化 schema 与 seed 数据',
  'R2 环境变量完成连接，图片动态上传已通过 curl 验证',
  '旧版客户端不切换 Host，64 位新客户端指向新服务',
]

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const project = useMemo(() => projects.find((p) => p.id === id), [id])

  const related = useMemo(() => {
    if (!project) return []
    return projects
      .filter((p) => p.id !== project.id && p.category === project.category)
      .slice(0, 3)
  }, [project])

  if (!project) {
    return (
      <main className="page-stack detail-page">
        <div className="detail-missing">
          <h1 className="section-title">未找到该项目</h1>
          <p className="section-description">该项目可能已下线或链接有误。</p>
          <button className="btn" onClick={() => navigate('/projects')}>
            <IconArrowLeft />
            <span>返回项目集</span>
          </button>
        </div>
      </main>
    )
  }

  return (
    <article className="page-stack detail-page project-detail-page">
      <Link to="/projects" className="detail-back">
        <IconArrowLeft />
        <span>项目集</span>
      </Link>

      <header className="detail-header">
        <div className="detail-badges">
          <span className="tag">{categoryLabels[project.category]}</span>
          <span className="detail-status">{statusLabels[project.status]}</span>
        </div>
        <h1 className="detail-title">{project.title}</h1>
        <p className="detail-role">{project.role}</p>
        <p className="detail-summary">{project.summary}</p>
      </header>

      {project.image && (
        <div className="detail-hero-image">
          <ResponsiveImage src={project.image} alt={project.title} loading="eager" />
        </div>
      )}

      <div className="detail-body">
        <section className="detail-block">
          <h2 className="detail-block-title">核心亮点</h2>
          <ul className="detail-highlights">
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>

        <section className="detail-block">
          <h2 className="detail-block-title">技术栈</h2>
          <div className="detail-stack">
            {project.stack.map((tech) => (
              <span key={tech} className="stack-tag">
                {tech}
              </span>
            ))}
          </div>
        </section>

        {project.links.length > 0 && (
          <section className="detail-block">
            <h2 className="detail-block-title">相关链接</h2>
            <div className="detail-links">
              {project.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.type === 'external' ? '_blank' : undefined}
                  rel={link.type === 'external' ? 'noopener noreferrer' : undefined}
                  className="link-badge"
                >
                  <IconLink />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>

      {project.id === 'xunqiu' && <XunqiuProjectArticle />}

      {related.length > 0 && (
        <section className="detail-related">
          <h2 className="detail-block-title">同类项目</h2>
          <div className="detail-related-grid">
            {related.map((item) => (
              <Link key={item.id} to={`/projects/${item.id}`} className="detail-related-card">
                <span className="detail-related-cat">{categoryLabels[item.category]}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

function XunqiuProjectArticle() {
  return (
    <section className="detail-body xunqiu-current-body" aria-label="寻球当前项目情况">
      <section className="detail-block detail-block-wide">
        <h2 className="detail-block-title">当前项目情况</h2>
        <p className="blog-post-body-text">
          寻球现在不是单纯的 Android 兼容性改造，而是一条新旧并行的移动端业务系统链路：旧版 App
          继续对应旧后端，64 位新 App 对接新建的 Spring Boot 3 后端。新后端部署在 Render，数据库使用
          PostgreSQL，图片和视频文件通过 Cloudflare R2 外置存储。公开产品展示页已经独立部署，可作为项目入口：
          <a className="xunqiu-inline-link" href="https://xunqiu.playlab.eu.cc/" target="_blank" rel="noopener noreferrer">
            xunqiu.playlab.eu.cc
          </a>
          。
        </p>
      </section>

      {xunqiuCurrentState.map((item) => (
        <section key={item.title} className="detail-block">
          <h2 className="detail-block-title">{item.title}</h2>
          <p className="blog-post-body-text">{item.detail}</p>
        </section>
      ))}

      <section className="detail-block">
        <h2 className="detail-block-title">新后端覆盖范围</h2>
        <ul className="detail-highlights">
          {xunqiuBackendScope.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="detail-block">
        <h2 className="detail-block-title">部署与验收状态</h2>
        <ul className="detail-highlights">
          {xunqiuVerification.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="detail-block detail-block-wide">
        <h2 className="detail-block-title">工程取舍</h2>
        <p className="blog-post-body-text">
          这次没有继续修补旧 WAR、旧数据库和失效的第三方能力，而是把 64 位新客户端需要的核心接口重新建模。
          支付、短信、IM、推送和社交登录保留接口边界但先安全降级，避免展示环境依赖不可用密钥或触发真实外部服务。
          这让项目可以持续演示、继续扩展，也让旧版 App 与新版 App 的后端职责分开。
        </p>
      </section>
    </section>
  )
}
