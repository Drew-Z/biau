import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, List } from 'lucide-react'
import { useMemo } from 'react'
import '../styles/route-pages.css'
import {
  getReliabilityProjectStatusCounts,
  reliabilityStatusOrder,
  type ReliabilityProject,
} from '../data/statusTargets'
import {
  getStatusDetailPath,
  formatCheckedAt,
  parseEvidenceFreshness,
} from '../data/siteStatusView'
import { statusDetailSectionIds, statusInterfaceCopy } from '../data/statusInterfaceCopy'
import { useSiteStatus } from '../hooks/useSiteStatus'
import { DetailReadingGuide, type DetailReadingItem } from '../components/DetailReadingGuide'
import { detailCopy } from '../data/detailCopy'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

function StatusProjectDetail({ project }: { project: ReliabilityProject }) {
  const language = useSiteLanguage()
  const copy = statusInterfaceCopy[language]
  const projectCounts = getReliabilityProjectStatusCounts(project)
  const visibleStatuses = reliabilityStatusOrder.filter((statusKey) => projectCounts[statusKey] > 0)

  return (
    <article className="status-project glass-card" aria-labelledby={`${project.id}-status-title`}>
      <div className="status-project__header">
        <div>
          <p className="section-subtitle">{copy.categories[project.category]}</p>
          <h2 id={`${project.id}-status-title`} lang="zh-CN">{project.title}</h2>
        </div>
        <div className="status-project__header-tools">
          <span lang="en">{project.checks.length} checks</span>
          <Link to="/status">{copy.backOverview}</Link>
        </div>
      </div>
      <p className="status-project__summary" lang="zh-CN">{project.summary}</p>
      <dl id="status-detail-distribution" className="status-project__status-strip" aria-label={copy.distribution(project.title)}>
        {visibleStatuses.map((statusKey) => {
          const meta = copy.states[statusKey]
          return (
            <div key={statusKey} className={`is-${meta.tone}`}>
              <dt>{meta.label}</dt>
              <dd>{projectCounts[statusKey]}</dd>
            </div>
          )
        })}
      </dl>

      <div id="status-detail-checks" className="status-check-list">
        {project.checks.map((check) => {
          const meta = copy.states[check.status]
          const layer = copy.layers[check.layer]
          const freshness = parseEvidenceFreshness(check.evidence)
          return (
            <section key={check.id} className={`status-check is-${meta.tone}`}>
              <div className="status-check__head">
                <span className={`status-badge is-${meta.tone}`}>{meta.label}</span>
                <span className="status-layer-chip">{layer.code}</span>
                <h3 lang="zh-CN">{check.label}</h3>
              </div>
              <p lang="zh-CN">{check.description}</p>
              <dl className="status-check__facts">
                <div>
                  <dt>{copy.layer}</dt>
                  <dd>{layer.title}</dd>
                </div>
                <div>
                  <dt>{copy.cadence}</dt>
                  <dd lang="zh-CN">{check.cadence}</dd>
                </div>
                <div>
                  <dt>{copy.owner}</dt>
                  <dd lang="zh-CN">{check.ownerHint}</dd>
                </div>
                <div>
                  <dt>{copy.statusMeaning}</dt>
                  <dd>{meta.hint}</dd>
                </div>
                {freshness && (
                  <>
                    <div>
                      <dt>{copy.evidenceTime}</dt>
                      <dd>{formatCheckedAt(freshness.checkedAt, language)}</dd>
                    </div>
                    <div>
                      <dt>{copy.evidenceFreshness}</dt>
                      <dd className="status-evidence-freshness">
                        <span className={`status-freshness-badge is-${copy.states[freshness.tone].tone}`}>
                          {copy.freshness[freshness.freshnessLabel]}
                        </span>
                        {freshness.ageText && <span lang="zh-CN">{freshness.ageText}</span>}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              <p className="status-target__note is-soft" lang="zh-CN">{check.evidence}</p>
            </section>
          )
        })}
      </div>

      <div className="status-project__footer">
        <section id="status-detail-handling" className="status-project__handling-guide" aria-label={copy.handlingLabel(project.title)}>
          <div className="status-project__footer-head">
            <h3>{copy.handlingTitle}</h3>
            <span lang="en">SAFE</span>
          </div>
          <p>{copy.handlingDescription}</p>
          <ul className="status-project__guidance-list">
            {copy.handlingRules.map((rule, index) => <li key={index}>{rule}</li>)}
          </ul>
        </section>
        <section id="status-detail-gates" aria-label={copy.gatesLabel(project.title)}>
          <div className="status-project__footer-head">
            <h3>{copy.gates}</h3>
            <span>{project.gates.length}</span>
          </div>
          <ol className="status-project__manual-list is-gate">
            {project.gates.map((gate, index) => (
              <li key={gate}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p lang="zh-CN">{gate}</p>
              </li>
            ))}
          </ol>
        </section>
        <section id="status-detail-next-actions" aria-label={copy.nextActionsLabel(project.title)}>
          <div className="status-project__footer-head">
            <h3>{copy.nextActions}</h3>
            <span>{project.nextActions.length}</span>
          </div>
          <ol className="status-project__manual-list is-next">
            {project.nextActions.map((action, index) => (
              <li key={action}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p lang="zh-CN">{action}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  )
}

export function SiteStatusDetailPage() {
  const language = useSiteLanguage()
  const copy = statusInterfaceCopy[language]
  const statusDetailReadingItems = useMemo<DetailReadingItem[]>(
    () => statusDetailSectionIds.map((id) => ({ id, label: copy.detailSections[id] })),
    [copy],
  )
  const { projectId = '' } = useParams()
  const { status, loadError } = useSiteStatus()
  const project = status.reliabilityProjects?.find((item) => item.id === projectId)

  if (!project) {
    return (
      <main className="site-status-page page-stack" lang={SITE_LANGUAGE_TAGS[language]}>
        <section className="detail-missing glass-card">
          <p className="section-subtitle" lang="en">STATUS DETAIL</p>
          <h1>{copy.missingTitle}</h1>
          <p>{copy.missingDescription}</p>
          {loadError && <p className="status-load-error">{copy.loadError}<span lang="">{loadError}</span></p>}
          <Link to="/status" className="btn">
            <ArrowLeft size={16} aria-hidden />
            <span>{copy.backStatus}</span>
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="site-status-page page-stack" lang={SITE_LANGUAGE_TAGS[language]}>
      <section id="status-detail-overview" className="section-header page-hero status-hero">
        <p className="section-subtitle" lang="en">STATUS DETAIL</p>
        <h1 className="section-title" lang="zh-CN">{project.title}</h1>
        <p className="section-description" lang="zh-CN">{project.summary}</p>
        <div className="status-detail-actions">
          <Link to="/status" className="btn">
            <ArrowLeft size={16} aria-hidden />
            <span>{copy.backStatus}</span>
          </Link>
          <Link to={getStatusDetailPath(project.id)} className="btn btn-primary" aria-current="page">
            <List size={16} aria-hidden />
            <span>{copy.currentDetail}</span>
          </Link>
        </div>
      </section>
      {loadError && <p className="status-load-error">{copy.loadError}<span lang="">{loadError}</span></p>}
      <DetailReadingGuide items={statusDetailReadingItems} itemsLanguage={language} label={detailCopy[language].reading.statusNavigation} />
      <section className="status-reliability" aria-label={copy.reliabilityLabel(project.title)}>
        <StatusProjectDetail project={project} />
      </section>
    </main>
  )
}
