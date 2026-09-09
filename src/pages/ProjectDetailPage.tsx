import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Activity, ArrowLeft, CircleAlert, ExternalLink, Link as LinkIcon } from 'lucide-react'
import '../styles/route-pages.css'
import { DetailReadingGuide, type DetailReadingItem } from '../components/DetailReadingGuide'
import { blogColumnMeta } from '../data/blog'
import { getProjectBlogPosts } from '../data/blogCuration'
import { getRelatedProjects, getRelatedProjectsTitle } from '../data/projectRecommendations'
import { catalogCopy } from '../data/catalogCopy'
import { detailCopy, projectDetailGroupLabelsEn } from '../data/detailCopy'
import { projectCategoryLabelsEn, projectStatusLabelsEn } from '../data/projectInterfaceCopy'
import {
  projects,
  categoryLabels as projectCategoryLabels,
  projectDetailGroupLabels,
  statusLabels,
  type ProjectDetailContent,
  type ProjectDetailContentKey,
  type ProjectDetailSection,
  type ProjectVisualBlock,
} from '../data/portfolio'
import {
  findProjectPublication,
  getProjectCta,
  getPublishedProjectLinks,
  type ProjectPublication,
  type PublishedProjectLink,
} from '../data/projectPublication'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { getProjectListHref, parseProjectGroupSearch, serializeProjectGroupSearch } from '../utils/projectDiscovery'
import { useDetailReadingNavigation } from '../hooks/useReadingNavigation'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS, type SiteLanguage } from '../utils/siteLanguage'

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

function getProjectGroupLabels(language: SiteLanguage) {
  return language === 'en' ? projectDetailGroupLabelsEn : projectDetailGroupLabels
}

export function ProjectDetailPage() {
  const language = useSiteLanguage()
  const copy = detailCopy[language]
  const languageTag = SITE_LANGUAGE_TAGS[language]
  const categoryLabels = language === 'en' ? projectCategoryLabelsEn : projectCategoryLabels
  const projectStatusLabels = language === 'en' ? projectStatusLabelsEn : statusLabels
  const { id } = useParams<{ id: string }>()
  const { search } = useLocation()
  const group = parseProjectGroupSearch(search)
  const listHref = getProjectListHref(group)
  const groupSearch = serializeProjectGroupSearch(group)
  const { relatedState, returnState } = useDetailReadingNavigation(listHref)

  const project = useMemo(() => projects.find((p) => p.id === id), [id])
  const publication = useMemo(() => (project ? findProjectPublication(project.id) : undefined), [project])
  const publishedLinks = useMemo(
    () => (project ? getPublishedProjectLinks(publication, project.links, language) : []),
    [language, project, publication],
  )
  const entryAction = useMemo(() => (publication ? getProjectCta(publication, language) : undefined), [language, publication])
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
      { id: 'project-highlights', label: copy.project.highlights },
      { id: 'project-stack', label: copy.project.stack },
    ]
    if (publishedLinks.length) items.push({ id: 'project-links', label: copy.project.links })
    detailGroups.forEach((group) => {
      items.push({ id: `project-${group.key}`, label: getProjectGroupLabels(language)[group.key] })
    })
    if (projectReadings.length) items.push({ id: 'project-readings', label: copy.furtherReading })
    if (related.length) items.push({ id: 'project-related', label: getRelatedProjectsTitle(project, related, language) })
    return items
  }, [copy, detailGroups, language, project, projectReadings, publishedLinks.length, related])

  if (!project) {
    return (
      <main className="page-stack detail-page" lang={languageTag}>
        <div className="detail-missing detail-missing--catalog">
          <h1 className="section-title" tabIndex={-1} data-reading-heading>{copy.project.missingTitle}</h1>
          <p className="section-description">{copy.project.missingDescription}</p>
          <Link className="btn" to={listHref} state={returnState}>
            <ArrowLeft size={16} aria-hidden />
            <span>{copy.project.back}</span>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <article className="page-stack detail-page project-detail-page" lang={languageTag}>
      <Link to={listHref} className="detail-back" state={returnState}>
        <ArrowLeft size={16} aria-hidden />
        <span>{catalogCopy[language].projectsTitle}</span>
      </Link>

      <header className="detail-header" lang="zh-CN">
        <div className="detail-badges">
          <span className="tag" lang={languageTag}>{categoryLabels[project.category]}</span>
          <span className="detail-status" lang={languageTag}>{projectStatusLabels[project.status]}</span>
        </div>
        <h1 className="detail-title" tabIndex={-1} data-reading-heading>{project.title}</h1>
        <p className="detail-role">{project.role}</p>
        <p className="detail-summary">{project.summary}</p>
        {entryAction?.explanation && (
          <p className={`detail-entry-note is-${entryAction.mode}`} lang={SITE_LANGUAGE_TAGS[entryAction.explanationLanguage ?? language]}>
            <CircleAlert size={16} aria-hidden />
            <span>{entryAction.explanation}</span>
          </p>
        )}
        {publishedLinks.length > 0 && (
          <nav className="detail-quick-links" aria-label={copy.project.quickLinks(project.title)} lang={languageTag}>
            {publishedLinks.map((link) => (
              <ProjectLinkBadge key={`${link.intent}-${link.href}`} link={link} />
            ))}
          </nav>
        )}
      </header>

      {project.image && (
        <figure className="detail-hero-figure">
          <a
            href={project.image}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-hero-image"
            aria-label={copy.project.openScreenshot(project.title)}
          >
            <ResponsiveImage src={project.image} alt={project.imageAlt ?? project.title} loading="eager" lang="zh-CN" />
            <span className="detail-hero-image-action" aria-hidden="true">
              <LinkIcon size={16} aria-hidden />
              <span>{copy.project.openOriginal}</span>
            </span>
          </a>
          {project.imageCaption && <figcaption className="detail-hero-caption" lang="zh-CN">{project.imageCaption}</figcaption>}
        </figure>
      )}

      <DetailReadingGuide items={readingItems} itemsLanguage={language} />

      <div className="detail-body">
        <section id="project-highlights" className="detail-block">
          <h2 className="detail-block-title">{copy.project.highlights}</h2>
          <ul className="detail-highlights" lang="zh-CN">
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>

        <section id="project-stack" className="detail-block">
          <h2 className="detail-block-title">{copy.project.stack}</h2>
          <div className="detail-stack" lang="zh-CN">
            {project.stack.map((tech) => (
              <span key={tech} className="stack-tag">
                {tech}
              </span>
            ))}
          </div>
        </section>

        {publishedLinks.length > 0 && (
          <section id="project-links" className="detail-block">
            <h2 className="detail-block-title">{copy.project.links}</h2>
            <div className="detail-links">
              {publishedLinks.map((link) => (
                <ProjectLinkBadge key={`${link.intent}-${link.href}`} link={link} />
              ))}
            </div>
          </section>
        )}
      </div>

      {detailGroups.length > 0 && <ProjectDetailContentSections groups={detailGroups} publication={publication} />}

      {projectReadings.length > 0 && (
        <section id="project-readings" className="detail-related">
          <h2 className="detail-block-title">{copy.furtherReading}</h2>
          <div className="detail-related-grid">
            {projectReadings.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="detail-related-card" lang="zh-CN">
                <span className="detail-related-cat" lang={languageTag}>{language === 'en' ? blogColumnMeta[post.column].titleEn : blogColumnMeta[post.column].titleZh}</span>
                <h3>{post.title}</h3>
                <p>{post.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section id="project-related" className="detail-related">
          <h2 className="detail-block-title">{getRelatedProjectsTitle(project, related, language)}</h2>
          <div className="detail-related-grid">
            {related.map((item) => (
              <Link key={item.id} to={`/projects/${item.id}${groupSearch}`} className="detail-related-card" state={relatedState} lang="zh-CN">
                <span className="detail-related-cat" lang={languageTag}>{categoryLabels[item.category]}</span>
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
  publication?: ProjectPublication
}

function ProjectDetailContentSections({ groups, publication }: ProjectDetailContentSectionsProps) {
  const language = useSiteLanguage()
  const copy = detailCopy[language].project
  return (
    <section className="detail-body project-case-study" aria-label={copy.caseStudy}>
      {groups.map((group) => (
        <section id={`project-${group.key}`} key={group.key} className="detail-block detail-block-wide project-case-study__group">
          <p className="project-case-study__eyebrow">{getProjectGroupLabels(language)[group.key]}</p>
          <div className="project-case-study__sections">
            {group.sections.map((section) => (
              <ProjectDetailContentSection key={section.title} section={section} publication={publication} />
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}

interface ProjectDetailContentSectionProps {
  section: ProjectDetailSection
  publication?: ProjectPublication
}

function ProjectDetailContentSection({ section, publication }: ProjectDetailContentSectionProps) {
  const language = useSiteLanguage()
  const publishedLinks = getPublishedProjectLinks(publication, section.links ?? [], language)

  return (
    <article className="project-case-study__section" lang="zh-CN">
      <h3>{section.title}</h3>
      {section.body && <p className="blog-post-body-text">{section.body}</p>}
      {section.items && section.items.length > 0 && (
        <ul className="detail-highlights">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {publishedLinks.length > 0 && (
        <div className="detail-links project-case-study__links">
          {publishedLinks.map((link) => (
            <ProjectLinkBadge key={`${link.intent}-${link.href}`} link={link} />
          ))}
        </div>
      )}
      {section.visual && <ProjectVisualFigure visual={section.visual} publication={publication} />}
    </article>
  )
}

function ProjectVisualFigure({ visual, publication }: { visual: ProjectVisualBlock; publication?: ProjectPublication }) {
  const language = useSiteLanguage()
  const copy = detailCopy[language].project
  const label = copy.visualTypes[visual.type]
  const figureClassName = `project-visual project-visual--${visual.type}`
  const sourceLink = visual.sourceUrl
    ? getPublishedProjectLinks(publication, [
        {
          label: visual.sourceLabel ?? '查看来源',
          href: visual.sourceUrl,
          type: visual.sourceUrl.startsWith('/') ? 'internal' : 'external',
          intent: visual.sourceIntent,
        },
      ], language)[0]
    : undefined

  return (
    <figure className={figureClassName} lang={SITE_LANGUAGE_TAGS[language]}>
      <figcaption className="project-visual__meta">
        <span className="project-visual__type">{label}</span>
        <span className="project-visual__text" lang="zh-CN">
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
          aria-label={copy.openImage(visual.title)}
        >
          <ResponsiveImage src={visual.image} alt={visual.alt ?? visual.title} lang="zh-CN" />
        </a>
      )}
      {(visual.caption || sourceLink) && (
        <p className="project-visual__caption" lang="zh-CN">
          {visual.caption && <span className="project-visual__caption-text">{visual.caption}</span>}
          {sourceLink &&
            (sourceLink.type === 'internal' ? (
              <Link to={sourceLink.href} className="project-visual__source-link" title={sourceLink.explanation} lang={SITE_LANGUAGE_TAGS[sourceLink.explanationLanguage ?? sourceLink.labelLanguage]}>
                <span className="project-entry-label" lang={SITE_LANGUAGE_TAGS[sourceLink.labelLanguage]}>{sourceLink.label}</span>
              </Link>
            ) : (
              <a
                href={sourceLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="project-visual__source-link"
                title={sourceLink.explanation}
                lang={SITE_LANGUAGE_TAGS[sourceLink.explanationLanguage ?? sourceLink.labelLanguage]}
              >
                <span className="project-entry-label" lang={SITE_LANGUAGE_TAGS[sourceLink.labelLanguage]}>{sourceLink.label}</span>
              </a>
            ))}
        </p>
      )}
    </figure>
  )
}

function ProjectLinkBadge({ link }: { link: PublishedProjectLink }) {
  const linkClassName = `link-badge link-badge--${link.type}`
  const content = (
    <>
      {link.intent === 'status' ? (
        <Activity size={16} aria-hidden />
      ) : link.type === 'external' ? (
        <ExternalLink size={16} aria-hidden />
      ) : (
        <LinkIcon size={16} aria-hidden />
      )}
      <span className="project-entry-label" lang={SITE_LANGUAGE_TAGS[link.labelLanguage]}>{link.label}</span>
    </>
  )

  if (link.type === 'internal') {
    return (
      <Link to={link.href} className={linkClassName} data-link-type={link.type} title={link.explanation} lang={SITE_LANGUAGE_TAGS[link.explanationLanguage ?? link.labelLanguage]}>
        {content}
      </Link>
    )
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
      data-link-type={link.type}
      title={link.explanation}
      lang={SITE_LANGUAGE_TAGS[link.explanationLanguage ?? link.labelLanguage]}
    >
      {content}
    </a>
  )
}
