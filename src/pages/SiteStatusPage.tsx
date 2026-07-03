import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { IconExternalOpen, IconLink, IconListView } from '@douyinfe/semi-icons'
import {
  findReliabilityProjectForTarget,
  getReliabilityProjectStatusCounts,
  reliabilityStatusOrder,
} from '../data/statusTargets'
import {
  expectationLabels,
  formatCheckedAt,
  formatDuration,
  formatHttpStatus,
  getStatusDetailPath,
  layerLabels,
  projectCategoryLabels,
  statusMeta,
  type SiteStatusPayload,
} from '../data/siteStatusView'
import { useSiteStatus } from '../hooks/useSiteStatus'

function getReliabilitySummary(status: SiteStatusPayload) {
  const checks = status.reliabilityProjects?.flatMap((project) => project.checks) ?? []
  return checks.reduce(
    (summary, check) => {
      summary.total += 1
      summary[check.status] += 1
      return summary
    },
    { total: 0, online: 0, degraded: 0, offline: 0, unchecked: 0, planned: 0 },
  )
}

export function SiteStatusPage() {
  const { status, loadError } = useSiteStatus()
  const allClear = status.summary.offline === 0 && status.summary.unchecked === 0
  const reliabilitySummary = useMemo(() => getReliabilitySummary(status), [status])

  return (
    <main className="site-status-page page-stack">
      <section className="section-header page-hero status-hero">
        <p className="section-subtitle">SITE STATUS</p>
        <h1 className="section-title">项目可靠性观察</h1>
        <p className="section-description">最近一次公开入口检测，以及每个重点项目的关键能力、指标接入和人工 gate。</p>
      </section>

      <section className="status-overview glass-card">
        <div className="status-overview__lead">
          <span className={`status-pulse ${allClear ? 'online' : 'degraded'}`} aria-hidden />
          <div>
            <p className="section-subtitle">LAST CHECK</p>
            <h2>{allClear ? '主要入口可访问' : '部分入口需要关注'}</h2>
          </div>
        </div>
        <dl className="status-metrics" aria-label="站点入口状态摘要">
          <div>
            <dt>检测时间</dt>
            <dd>{formatCheckedAt(status.checkedAt)}</dd>
          </div>
          <div>
            <dt>检测基准</dt>
            <dd>{status.base}</dd>
          </div>
          <div>
            <dt>可用入口</dt>
            <dd>
              {status.summary.online}/{status.summary.total}
            </dd>
          </div>
          <div>
            <dt>可靠性项</dt>
            <dd>{reliabilitySummary.total}</dd>
          </div>
        </dl>
        {loadError && <p className="status-load-error">状态数据暂未读取成功：{loadError}</p>}
      </section>

      <section className="status-summary-grid" aria-label="状态统计">
        {(['online', 'degraded', 'offline', 'unchecked', 'planned'] as const).map((key) => (
          <div key={key} className={`status-summary-card glass-card is-${statusMeta[key].tone}`}>
            <span>{statusMeta[key].label}</span>
            <strong>{key === 'planned' ? reliabilitySummary.planned : status.summary[key]}</strong>
            <p>{statusMeta[key].hint}</p>
          </div>
        ))}
      </section>

      <section className="status-layer-grid" aria-label="可靠性分层">
        {(Object.keys(layerLabels) as Array<keyof typeof layerLabels>).map((layer) => {
          const meta = layerLabels[layer]
          return (
            <article key={layer} className="status-layer-card glass-card">
              <span>{meta.code}</span>
              <h2>{meta.title}</h2>
              <p>{meta.description}</p>
            </article>
          )
        })}
      </section>

      <section id="status-targets" className="status-targets" aria-label="主页外链检测结果">
        {status.targets.map((target) => {
          const meta = statusMeta[target.status]
          const detailProject = findReliabilityProjectForTarget(target, status.reliabilityProjects ?? [])
          const detailHref = detailProject ? getStatusDetailPath(detailProject.id) : '/status'
          return (
            <article key={target.id} className={`status-target glass-card is-${meta.tone}`}>
              <div className="status-target__main">
                <div className="status-target__titleline">
                  <span className={`status-badge is-${meta.tone}`}>{meta.label}</span>
                  <span>{expectationLabels[target.expectation]}</span>
                </div>
                <h2>{target.label}</h2>
                <p>{target.description}</p>
              </div>

              <dl className="status-target__facts">
                <div>
                  <dt>HTTP</dt>
                  <dd>{formatHttpStatus(target.httpStatus)}</dd>
                </div>
                <div>
                  <dt>耗时</dt>
                  <dd>{formatDuration(target.durationMs)}</dd>
                </div>
                <div>
                  <dt>单项检测</dt>
                  <dd>{formatCheckedAt(target.checkedAt)}</dd>
                </div>
              </dl>

              <p className="status-target__note">{target.issues[0] ?? target.note}</p>
              <p className="status-target__note is-soft">{target.note}</p>

              <div className="status-target__actions">
                <Link
                  className="btn status-target__detail-link"
                  to={detailHref}
                  aria-label={`详细状态：${detailProject?.title ?? target.label}`}
                >
                  <IconListView aria-hidden />
                  <span>详细状态</span>
                </Link>
                <Link to={`/projects/${target.projectId}`} className="btn">
                  <IconLink aria-hidden />
                  <span>项目详情</span>
                </Link>
                <a className="btn btn-primary" href={target.url} target="_blank" rel="noopener noreferrer">
                  <span>打开入口</span>
                  <IconExternalOpen aria-hidden />
                </a>
              </div>
            </article>
          )
        })}
      </section>

      <section className="status-project-index" aria-label="可靠性详情页">
        {status.reliabilityProjects?.map((project) => {
          const projectCounts = getReliabilityProjectStatusCounts(project)
          const visibleStatuses = reliabilityStatusOrder.filter((statusKey) => projectCounts[statusKey] > 0)
          return (
            <article key={project.id} className="status-project-card glass-card">
              <div>
                <p className="section-subtitle">{projectCategoryLabels[project.category]}</p>
                <h2>{project.title}</h2>
                <p>{project.summary}</p>
              </div>
              <dl className="status-project__status-strip" aria-label={`${project.title} 状态分布`}>
                {visibleStatuses.map((statusKey) => {
                  const meta = statusMeta[statusKey]
                  return (
                    <div key={statusKey} className={`is-${meta.tone}`}>
                      <dt>{meta.label}</dt>
                      <dd>{projectCounts[statusKey]}</dd>
                    </div>
                  )
                })}
              </dl>
              <Link to={getStatusDetailPath(project.id)} className="btn status-project-card__link">
                <IconListView aria-hidden />
                <span>查看详细状态</span>
              </Link>
            </article>
          )
        })}
      </section>
    </main>
  )
}
