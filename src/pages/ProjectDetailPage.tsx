import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconLink } from '@douyinfe/semi-icons'
import { categoryLabels as blogCategoryLabels } from '../data/blog'
import { getProjectBlogPosts } from '../data/blogCuration'
import {
  projects,
  categoryLabels as projectCategoryLabels,
  projectDetailGroupLabels,
  statusLabels,
  type ProjectDetailContent,
  type ProjectDetailContentKey,
  type ProjectDetailSection,
} from '../data/portfolio'
import { ResponsiveImage } from '../components/ResponsiveImage'
const projectDetailContentOrder: ProjectDetailContentKey[] = [
  'overview',
  'workflow',
  'architecture',
  'quality',
  'limitations',
  'roadmap',
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

  const projectReadings = useMemo(() => {
    if (!project) return []
    return getProjectBlogPosts(project.id).slice(0, 4)
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
          <span className="tag">{projectCategoryLabels[project.category]}</span>
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

      {project.detailContent && <ProjectDetailContentSections content={project.detailContent} />}

      {projectReadings.length > 0 && (
        <section className="detail-related">
          <h2 className="detail-block-title">延展阅读</h2>
          <div className="detail-related-grid">
            {projectReadings.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="detail-related-card">
                <span className="detail-related-cat">{blogCategoryLabels[post.category]}</span>
                <h3>{post.title}</h3>
                <p>{post.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="detail-related">
          <h2 className="detail-block-title">同类项目</h2>
          <div className="detail-related-grid">
            {related.map((item) => (
              <Link key={item.id} to={`/projects/${item.id}`} className="detail-related-card">
                <span className="detail-related-cat">{projectCategoryLabels[item.category]}</span>
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

interface ProjectDetailContentSectionsProps {
  content: ProjectDetailContent
}

function ProjectDetailContentSections({ content }: ProjectDetailContentSectionsProps) {
  const groups = projectDetailContentOrder
    .map((key) => ({ key, sections: content[key] ?? [] }))
    .filter((group) => group.sections.length > 0)

  if (groups.length === 0) return null

  return (
    <section className="detail-body project-case-study" aria-label="项目案例分析">
      {groups.map((group) => (
        <section key={group.key} className="detail-block detail-block-wide project-case-study__group">
          <p className="project-case-study__eyebrow">{projectDetailGroupLabels[group.key]}</p>
          <div className="project-case-study__sections">
            {group.sections.map((section) => (
              <ProjectDetailContentSection key={section.title} section={section} />
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}

interface ProjectDetailContentSectionProps {
  section: ProjectDetailSection
}

function ProjectDetailContentSection({ section }: ProjectDetailContentSectionProps) {
  return (
    <article className="project-case-study__section">
      <h3>{section.title}</h3>
      {section.body && <p className="blog-post-body-text">{section.body}</p>}
      {section.items && section.items.length > 0 && (
        <ul className="detail-highlights">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {section.links && section.links.length > 0 && (
        <div className="detail-links project-case-study__links">
          {section.links.map((link) => (
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
      )}
    </article>
  )
}
