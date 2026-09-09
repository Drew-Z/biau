import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Link as LinkIcon, List } from 'lucide-react'
import '../styles/route-pages.css'
import {
  findReliabilityProjectForTarget,
  getReliabilityProjectStatusCounts,
  reliabilityStatusOrder,
} from '../data/statusTargets'
import {
  formatCheckedAt,
  formatDuration,
  formatHttpStatus,
  getReliabilityStatusSummary,
  getStatusManualActionQueue,
  getStatusDetailPath,
  hasEntryStatusAttention,
  hasReliabilityStatusAttention,
} from '../data/siteStatusView'
import { statusInterfaceCopy } from '../data/statusInterfaceCopy'
import { StatusSectionNavigator } from '../components/StatusSectionNavigator'
import { useSiteStatus } from '../hooks/useSiteStatus'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

const entrySummaryKeys = ['online', 'degraded', 'offline', 'unchecked'] as const
const reliabilitySummaryKeys = ['online', 'degraded', 'offline', 'unchecked', 'planned'] as const

export function SiteStatusPage() {
  const language = useSiteLanguage()
  const copy = statusInterfaceCopy[language]
  const { status, loadError } = useSiteStatus()
  const reliabilitySummary = useMemo(
    () => getReliabilityStatusSummary(status.reliabilityProjects),
    [status.reliabilityProjects],
  )
  const manualActionQueue = useMemo(
    () => getStatusManualActionQueue(status.reliabilityProjects),
    [status.reliabilityProjects],
  )
  const entryNeedsAttention = hasEntryStatusAttention(status.summary)
  const reliabilityNeedsAttention = hasReliabilityStatusAttention(reliabilitySummary)
  const overviewTitle = entryNeedsAttention
    ? copy.overview.entries
    : reliabilityNeedsAttention
      ? copy.overview.capabilities
      : copy.overview.stable

  return (
    <main className="site-status-page page-stack" lang={SITE_LANGUAGE_TAGS[language]}>
      <section className="section-header page-hero status-hero">
        <p className="section-subtitle" lang="en">SITE STATUS</p>
        <h1 className="section-title">{copy.title}</h1>
        <p className="section-description">{copy.description}</p>
      </section>

      <StatusSectionNavigator />

      <section id="status-overview" className="status-overview glass-card">
        <div className="status-overview__lead">
          <span className={`status-pulse ${entryNeedsAttention || reliabilityNeedsAttention ? 'degraded' : 'online'}`} aria-hidden />
          <div>
            <p className="section-subtitle" lang="en">LAST CHECK</p>
            <h2>{overviewTitle}</h2>
          </div>
        </div>
        <dl className="status-metrics" aria-label={copy.metricsLabel}>
          <div>
            <dt>{copy.checkedAt}</dt>
            <dd>{formatCheckedAt(status.checkedAt, language)}</dd>
          </div>
          <div>
            <dt>{copy.baseline}</dt>
            <dd lang="en">{status.base}</dd>
          </div>
          <div>
            <dt>{copy.availableEntries}</dt>
            <dd>
              {status.summary.online}/{status.summary.total}
            </dd>
          </div>
          <div>
            <dt>{copy.reliabilityItems}</dt>
            <dd>{reliabilitySummary.total}</dd>
          </div>
        </dl>
        {loadError && <p className="status-load-error">{copy.loadError}<span lang="">{loadError}</span></p>}
      </section>

      <section id="status-summary" className="status-summary-clusters" aria-label={copy.summaryLabel}>
        <div className="status-summary-cluster" aria-label={copy.entrySummaryLabel}>
          <div className="status-summary-cluster__head">
            <p className="section-subtitle" lang="en">ENTRY REACHABILITY</p>
            <h2>{copy.entryTitle}</h2>
          </div>
          <div className="status-summary-grid status-summary-grid--entry">
            {entrySummaryKeys.map((key) => (
              <div
                key={key}
                className={`status-summary-card glass-card is-${copy.states[key].tone}`}
                data-status-scope="entry"
                data-status-key={key}
              >
                <span>{copy.entrySummary[key].label}</span>
                <strong>{status.summary[key]}</strong>
                <p>{copy.entrySummary[key].hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="status-summary-cluster" aria-label={copy.reliabilitySummaryLabel}>
          <div className="status-summary-cluster__head">
            <p className="section-subtitle" lang="en">RELIABILITY COVERAGE</p>
            <h2>{copy.reliabilityTitle}</h2>
          </div>
          <div className="status-summary-grid status-summary-grid--reliability">
            {reliabilitySummaryKeys.map((key) => (
              <div
                key={key}
                className={`status-summary-card glass-card is-${copy.states[key].tone}`}
                data-status-scope="reliability"
                data-status-key={key}
              >
                <span>{copy.reliabilitySummary[key].label}</span>
                <strong>{reliabilitySummary[key]}</strong>
                <p>{copy.reliabilitySummary[key].hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="status-layers" className="status-layer-grid" aria-label={copy.layerLabel}>
        {(Object.keys(copy.layers) as Array<keyof typeof copy.layers>).map((layer) => {
          const meta = copy.layers[layer]
          return (
            <article key={layer} className="status-layer-card glass-card">
              <span>{meta.code}</span>
              <h2>{meta.title}</h2>
              <p>{meta.description}</p>
            </article>
          )
        })}
      </section>

      <section id="status-manual" className="status-manual-queue" aria-label={copy.manualLabel}>
        <div className="status-manual-queue__head">
          <div>
            <p className="section-subtitle" lang="en">ACTION QUEUE</p>
            <h2>{copy.manualTitle}</h2>
            <p>{copy.manualDescription}</p>
          </div>
          <span lang="en">{manualActionQueue.length} items</span>
        </div>
        <div className="status-manual-queue__grid">
          {manualActionQueue.map((item) => (
            <article
              key={item.id}
              className={`status-manual-action glass-card is-${item.type}`}
              data-manual-action-type={item.type}
              data-project-id={item.projectId}
            >
              <div className="status-manual-action__meta">
                <span>{copy.manualTypes[item.type]}</span>
                <span>{copy.categories[item.projectCategory]}</span>
              </div>
              <h3 lang="zh-CN">{item.projectTitle}</h3>
              <p lang="zh-CN">{item.text}</p>
              <Link to={item.detailPath} className="btn status-manual-action__link" aria-label={copy.manualDetails(item.projectTitle)}>
                <List size={16} aria-hidden />
                <span>{copy.viewDetails}</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="status-targets" className="status-targets" aria-label={copy.targetsLabel}>
        {status.targets.map((target) => {
          const meta = copy.states[target.status]
          const detailProject = findReliabilityProjectForTarget(target, status.reliabilityProjects ?? [])
          const detailHref = detailProject ? getStatusDetailPath(detailProject.id) : '/status'
          const note = target.note.trim()
          const primaryNote = target.issues[0]?.trim() || note
          return (
            <article key={target.id} className={`status-target glass-card is-${meta.tone}`}>
              <div className="status-target__main">
                <div className="status-target__titleline">
                  <span className={`status-badge is-${meta.tone}`}>{meta.label}</span>
                  <span>{copy.expectations[target.expectation]}</span>
                </div>
                <h2 lang="zh-CN">{target.label}</h2>
                <p lang="zh-CN">{target.description}</p>
              </div>

              <dl className="status-target__facts">
                <div>
                  <dt>HTTP</dt>
                  <dd>{formatHttpStatus(target.httpStatus, language)}</dd>
                </div>
                <div>
                  <dt>{copy.elapsed}</dt>
                  <dd>{formatDuration(target.durationMs, language)}</dd>
                </div>
                <div>
                  <dt>{copy.singleCheck}</dt>
                  <dd>{formatCheckedAt(target.checkedAt, language)}</dd>
                </div>
              </dl>

              {primaryNote && <p className="status-target__note" lang="zh-CN">{primaryNote}</p>}
              {note && note !== primaryNote && <p className="status-target__note is-soft" lang="zh-CN">{note}</p>}

              <div className="status-target__actions">
                <Link
                  className="btn status-target__detail-link"
                  to={detailHref}
                  aria-label={copy.detailName(detailProject?.title ?? target.label)}
                >
                  <List size={16} aria-hidden />
                  <span>{copy.detailLabel}</span>
                </Link>
                <Link to={`/projects/${target.projectId}`} className="btn">
                  <LinkIcon size={16} aria-hidden />
                  <span>{copy.projectDetails}</span>
                </Link>
                <a className="btn btn-primary" href={target.url} target="_blank" rel="noopener noreferrer">
                  <span>{copy.openEntry}</span>
                  <ExternalLink size={16} aria-hidden />
                </a>
              </div>
            </article>
          )
        })}
      </section>

      <section id="status-projects" className="status-project-index" aria-label={copy.projectsLabel}>
        {status.reliabilityProjects?.map((project) => {
          const projectCounts = getReliabilityProjectStatusCounts(project)
          const visibleStatuses = reliabilityStatusOrder.filter((statusKey) => projectCounts[statusKey] > 0)
          return (
            <article key={project.id} className="status-project-card glass-card">
              <div>
                <p className="section-subtitle">{copy.categories[project.category]}</p>
                <h2 lang="zh-CN">{project.title}</h2>
                <p lang="zh-CN">{project.summary}</p>
              </div>
              <dl className="status-project__status-strip" aria-label={copy.distribution(project.title)}>
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
              <dl className="status-project-card__meta" aria-label={copy.gatesSummary(project.title)}>
                <div>
                  <dt>{copy.gates}</dt>
                  <dd>{project.gates.length}</dd>
                </div>
                <div>
                  <dt>{copy.nextActions}</dt>
                  <dd>{project.nextActions.length}</dd>
                </div>
              </dl>
              <Link to={getStatusDetailPath(project.id)} className="btn status-project-card__link">
                <List size={16} aria-hidden />
                <span>{copy.viewStatus}</span>
              </Link>
            </article>
          )
        })}
      </section>
    </main>
  )
}
