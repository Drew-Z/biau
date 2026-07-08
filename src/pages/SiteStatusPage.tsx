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
  getReliabilityStatusSummary,
  getStatusDetailPath,
  hasEntryStatusAttention,
  hasReliabilityStatusAttention,
  layerLabels,
  projectCategoryLabels,
  statusMeta,
} from '../data/siteStatusView'
import { useSiteStatus } from '../hooks/useSiteStatus'

const entrySummaryKeys = ['online', 'degraded', 'offline', 'unchecked'] as const
const reliabilitySummaryKeys = ['online', 'degraded', 'offline', 'unchecked', 'planned'] as const

const entrySummaryLabels: Record<(typeof entrySummaryKeys)[number], { label: string; hint: string }> = {
  online: { label: '可用入口', hint: '公开入口最近一次检测已响应' },
  degraded: { label: '受限入口', hint: '入口响应但可能需要登录、重试或说明' },
  offline: { label: '异常入口', hint: '最近一次检测未能确认入口可达' },
  unchecked: { label: '未检测入口', hint: '尚未生成公开入口检测数据' },
}

const reliabilitySummaryLabels: Record<(typeof reliabilitySummaryKeys)[number], { label: string; hint: string }> = {
  online: { label: '在线能力', hint: '已有入口或 synthetic 证据支撑的能力项' },
  degraded: { label: '受限能力', hint: '能力可触达但存在登录、配置或人工 gate' },
  offline: { label: '异常能力', hint: '最近一次检查显示能力不可用' },
  unchecked: { label: '未检测能力', hint: '已有检查项但缺少当前公开检测数据' },
  planned: { label: '待接入能力', hint: '已纳入观察路线，等待平台、凭据或发布门禁' },
}

export function SiteStatusPage() {
  const { status, loadError } = useSiteStatus()
  const reliabilitySummary = useMemo(
    () => getReliabilityStatusSummary(status.reliabilityProjects),
    [status.reliabilityProjects],
  )
  const entryNeedsAttention = hasEntryStatusAttention(status.summary)
  const reliabilityNeedsAttention = hasReliabilityStatusAttention(reliabilitySummary)
  const overviewTitle = entryNeedsAttention
    ? '部分入口需要关注'
    : reliabilityNeedsAttention
      ? '部分能力仍待验证'
      : '入口与关键能力稳定'

  return (
    <main className="site-status-page page-stack">
      <section className="section-header page-hero status-hero">
        <p className="section-subtitle">SITE STATUS</p>
        <h1 className="section-title">项目可靠性观察</h1>
        <p className="section-description">最近一次公开入口检测，以及每个重点项目的关键能力、指标接入和人工 gate。</p>
      </section>

      <section className="status-overview glass-card">
        <div className="status-overview__lead">
          <span className={`status-pulse ${entryNeedsAttention || reliabilityNeedsAttention ? 'degraded' : 'online'}`} aria-hidden />
          <div>
            <p className="section-subtitle">LAST CHECK</p>
            <h2>{overviewTitle}</h2>
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

      <section className="status-summary-clusters" aria-label="状态统计">
        <div className="status-summary-cluster" aria-label="公开入口统计">
          <div className="status-summary-cluster__head">
            <p className="section-subtitle">ENTRY REACHABILITY</p>
            <h2>入口可达性</h2>
          </div>
          <div className="status-summary-grid status-summary-grid--entry">
            {entrySummaryKeys.map((key) => (
              <div
                key={key}
                className={`status-summary-card glass-card is-${statusMeta[key].tone}`}
                data-status-scope="entry"
                data-status-key={key}
              >
                <span>{entrySummaryLabels[key].label}</span>
                <strong>{status.summary[key]}</strong>
                <p>{entrySummaryLabels[key].hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="status-summary-cluster" aria-label="可靠性能力统计">
          <div className="status-summary-cluster__head">
            <p className="section-subtitle">RELIABILITY COVERAGE</p>
            <h2>能力检查项</h2>
          </div>
          <div className="status-summary-grid status-summary-grid--reliability">
            {reliabilitySummaryKeys.map((key) => (
              <div
                key={key}
                className={`status-summary-card glass-card is-${statusMeta[key].tone}`}
                data-status-scope="reliability"
                data-status-key={key}
              >
                <span>{reliabilitySummaryLabels[key].label}</span>
                <strong>{reliabilitySummary[key]}</strong>
                <p>{reliabilitySummaryLabels[key].hint}</p>
              </div>
            ))}
          </div>
        </div>
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
              <dl className="status-project-card__meta" aria-label={`${project.title} 人工门禁摘要`}>
                <div>
                  <dt>人工 gate</dt>
                  <dd>{project.gates.length}</dd>
                </div>
                <div>
                  <dt>后续接入</dt>
                  <dd>{project.nextActions.length}</dd>
                </div>
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
