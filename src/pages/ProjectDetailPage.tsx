import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Link as LinkIcon } from 'lucide-react'
import { DetailReadingGuide, type DetailReadingItem } from '../components/DetailReadingGuide'
import { blogColumnMeta } from '../data/blog'
import { getProjectBlogPosts } from '../data/blogCuration'
import { getRelatedProjects, getRelatedProjectsTitle } from '../data/projectRecommendations'
import {
  projects,
  categoryLabels as projectCategoryLabels,
  projectDetailGroupLabels,
  statusLabels,
  type ProjectDetailContent,
  type ProjectDetailContentKey,
  type ProjectDetailSection,
  type ProjectLink,
  type ProjectVisualBlock,
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

interface ProjectDetailGroup {
  key: ProjectDetailContentKey
  sections: ProjectDetailSection[]
}

function getProjectDetailGroups(content?: ProjectDetailContent): ProjectDetailGroup[] {
  if (!content) return []
  return projectDetailContentOrder
    .map((key) => ({ key, sections: content[key] ?? [] }))
    .filter((group) => group.sections.length > 0)
}

const projectVisualTypeLabels: Record<ProjectVisualBlock['type'], string> = {
  screenshot: '界面截图',
  architecture: '架构图',
  workflow: '流程图',
  'data-flow': '数据流',
  status: '状态证据',
  release: '发布证据',
  diagram: '说明图',
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const project = useMemo(() => projects.find((p) => p.id === id), [id])
  const detailGroups = useMemo(() => getProjectDetailGroups(project?.detailContent), [project])

  const related = useMemo(() => {
    if (!project) return []
    return getRelatedProjects(project)
  }, [project])

  const projectReadings = useMemo(() => {
    if (!project) return []
    return getProjectBlogPosts(project.id).slice(0, 4)
  }, [project])

  const readingItems = useMemo<DetailReadingItem[]>(() => {
    if (!project) return []
    const items: DetailReadingItem[] = [
      { id: 'project-highlights', label: '核心亮点' },
      { id: 'project-stack', label: '技术栈' },
    ]
    if (project.links.length) items.push({ id: 'project-links', label: '相关链接' })
    detailGroups.forEach((group) => {
      items.push({ id: `project-${group.key}`, label: projectDetailGroupLabels[group.key] })
    })
    if (projectReadings.length) items.push({ id: 'project-readings', label: '延展阅读' })
    if (related.length) items.push({ id: 'project-related', label: getRelatedProjectsTitle(project, related) })
    return items
  }, [detailGroups, project, projectReadings, related])

  if (!project) {
    return (
      <main className="page-stack detail-page">
        <div className="detail-missing">
          <h1 className="section-title">未找到该项目</h1>
          <p className="section-description">该项目可能已下线或链接有误。</p>
          <button className="btn" onClick={() => navigate('/projects')}>
            <ArrowLeft size={16} aria-hidden />
            <span>返回项目集</span>
          </button>
        </div>
      </main>
    )
  }

  return (
    <article className="page-stack detail-page project-detail-page">
      <Link to="/projects" className="detail-back">
        <ArrowLeft size={16} aria-hidden />
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
        {project.links.length > 0 && (
          <nav className="detail-quick-links" aria-label={`${project.title} 快速链接`}>
            {project.links.map((link) => (
              <ProjectLinkBadge key={link.href} link={link} />
            ))}
          </nav>
        )}
      </header>

      {project.image && (
        <a
          href={project.image}
          target="_blank"
          rel="noopener noreferrer"
          className="detail-hero-image"
          aria-label={`打开 ${project.title} 项目截图原图`}
        >
          <ResponsiveImage src={project.image} alt={project.title} loading="eager" />
          <span className="detail-hero-image-action" aria-hidden="true">
            <LinkIcon size={16} aria-hidden />
            <span>打开原图</span>
          </span>
        </a>
      )}

      <DetailReadingGuide items={readingItems} />

      <div className="detail-body">
        <section id="project-highlights" className="detail-block">
          <h2 className="detail-block-title">核心亮点</h2>
          <ul className="detail-highlights">
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>

        <section id="project-stack" className="detail-block">
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
          <section id="project-links" className="detail-block">
            <h2 className="detail-block-title">相关链接</h2>
            <div className="detail-links">
              {project.links.map((link) => (
                <ProjectLinkBadge key={link.href} link={link} />
              ))}
            </div>
          </section>
        )}
      </div>

      {detailGroups.length > 0 && <ProjectDetailContentSections groups={detailGroups} />}

      {projectReadings.length > 0 && (
        <section id="project-readings" className="detail-related">
          <h2 className="detail-block-title">延展阅读</h2>
          <div className="detail-related-grid">
            {projectReadings.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="detail-related-card">
                <span className="detail-related-cat">{blogColumnMeta[post.column].titleZh}</span>
                <h3>{post.title}</h3>
                <p>{post.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section id="project-related" className="detail-related">
          <h2 className="detail-block-title">{getRelatedProjectsTitle(project, related)}</h2>
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
  groups: ProjectDetailGroup[]
}

function ProjectDetailContentSections({ groups }: ProjectDetailContentSectionsProps) {
  return (
    <section className="detail-body project-case-study" aria-label="项目案例分析">
      {groups.map((group) => (
        <section id={`project-${group.key}`} key={group.key} className="detail-block detail-block-wide project-case-study__group">
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
            <ProjectLinkBadge key={link.href} link={link} />
          ))}
        </div>
      )}
      {section.visual && <ProjectVisualFigure visual={section.visual} />}
    </article>
  )
}

function ProjectVisualFigure({ visual }: { visual: ProjectVisualBlock }) {
  const label = projectVisualTypeLabels[visual.type]
  const figureClassName = `project-visual project-visual--${visual.type}`

  return (
    <figure className={figureClassName}>
      <figcaption className="project-visual__meta">
        <span className="project-visual__type">{label}</span>
        <span className="project-visual__text">
          <strong>{visual.title}</strong>
          <span>{visual.description}</span>
        </span>
      </figcaption>
      {visual.image && (
        <a
          href={visual.image}
          target="_blank"
          rel="noopener noreferrer"
          className="project-visual__image"
          aria-label={`打开 ${visual.title} 原图`}
        >
          <ResponsiveImage src={visual.image} alt={visual.alt ?? visual.title} />
        </a>
      )}
      {(visual.caption || visual.sourceUrl) && (
        <p className="project-visual__caption">
          {visual.caption && <span className="project-visual__caption-text">{visual.caption}</span>}
          {visual.sourceUrl && (
            <a
              href={visual.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="project-visual__source-link"
            >
              {visual.sourceLabel ?? '查看来源'}
            </a>
          )}
        </p>
      )}
    </figure>
  )
}

function ProjectLinkBadge({ link }: { link: ProjectLink }) {
  const linkClassName = `link-badge link-badge--${link.type}`
  const content = (
    <>
      {link.type === 'external' ? <ExternalLink size={16} aria-hidden /> : <LinkIcon size={16} aria-hidden />}
      <span>{link.label}</span>
    </>
  )

  if (link.type === 'internal') {
    return (
      <Link to={link.href} className={linkClassName} data-link-type={link.type}>
        {content}
      </Link>
    )
  }

  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClassName} data-link-type={link.type}>
      {content}
    </a>
  )
}
