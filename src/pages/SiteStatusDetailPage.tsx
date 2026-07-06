import { Link, useParams } from 'react-router-dom'
import { IconArrowLeft, IconListView } from '@douyinfe/semi-icons'
import {
  getReliabilityProjectStatusCounts,
  reliabilityStatusOrder,
  type ReliabilityProject,
} from '../data/statusTargets'
import {
  getStatusDetailPath,
  layerLabels,
  parseEvidenceFreshness,
  projectCategoryLabels,
  statusMeta,
} from '../data/siteStatusView'
import { useSiteStatus } from '../hooks/useSiteStatus'

function StatusProjectDetail({ project }: { project: ReliabilityProject }) {
  const projectCounts = getReliabilityProjectStatusCounts(project)
  const visibleStatuses = reliabilityStatusOrder.filter((statusKey) => projectCounts[statusKey] > 0)

  return (
    <article className="status-project glass-card" aria-labelledby={`${project.id}-status-title`}>
      <div className="status-project__header">
        <div>
          <p className="section-subtitle">{projectCategoryLabels[project.category]}</p>
          <h2 id={`${project.id}-status-title`}>{project.title}</h2>
        </div>
        <div className="status-project__header-tools">
          <span>{project.checks.length} checks</span>
          <Link to="/status">返回总览</Link>
        </div>
      </div>
      <p className="status-project__summary">{project.summary}</p>
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

      <div className="status-check-list">
        {project.checks.map((check) => {
          const meta = statusMeta[check.status]
          const layer = layerLabels[check.layer]
          const freshness = parseEvidenceFreshness(check.evidence)
          return (
            <section key={check.id} className={`status-check is-${meta.tone}`}>
              <div className="status-check__head">
                <span className={`status-badge is-${meta.tone}`}>{meta.label}</span>
                <span className="status-layer-chip">{layer.code}</span>
                <h3>{check.label}</h3>
              </div>
              <p>{check.description}</p>
              <dl className="status-check__facts">
                <div>
                  <dt>层级</dt>
                  <dd>{layer.title}</dd>
                </div>
                <div>
                  <dt>频率</dt>
                  <dd>{check.cadence}</dd>
                </div>
                <div>
                  <dt>接入点</dt>
                  <dd>{check.ownerHint}</dd>
                </div>
                <div>
                  <dt>状态语义</dt>
                  <dd>{meta.hint}</dd>
                </div>
                {freshness && (
                  <>
                    <div>
                      <dt>证据时间</dt>
                      <dd>{freshness.checkedAtLabel}</dd>
                    </div>
                    <div>
                      <dt>证据新鲜度</dt>
                      <dd className="status-evidence-freshness">
                        <span className={`status-freshness-badge is-${statusMeta[freshness.tone].tone}`}>
                          {freshness.freshnessLabel}
                        </span>
                        {freshness.ageText && <span>{freshness.ageText}</span>}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              <p className="status-target__note is-soft">{check.evidence}</p>
            </section>
          )
        })}
      </div>

      <div className="status-project__footer">
        <div>
          <h3>人工 gate</h3>
          {project.gates.map((gate) => (
            <p key={gate}>{gate}</p>
          ))}
        </div>
        <div>
          <h3>后续接入</h3>
          {project.nextActions.map((action) => (
            <p key={action}>{action}</p>
          ))}
        </div>
      </div>
    </article>
  )
}

export function SiteStatusDetailPage() {
  const { projectId = '' } = useParams()
  const { status, loadError } = useSiteStatus()
  const project = status.reliabilityProjects?.find((item) => item.id === projectId)

  if (!project) {
    return (
      <main className="site-status-page page-stack">
        <section className="detail-missing glass-card">
          <p className="section-subtitle">STATUS DETAIL</p>
          <h1>没有找到这个状态页</h1>
          <p>这个项目状态详情暂时不存在，或者状态数据还没有生成。</p>
          {loadError && <p className="status-load-error">状态数据暂未读取成功：{loadError}</p>}
          <Link to="/status" className="btn">
            <IconArrowLeft aria-hidden />
            <span>返回状态总览</span>
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="site-status-page page-stack">
      <section className="section-header page-hero status-hero">
        <p className="section-subtitle">STATUS DETAIL</p>
        <h1 className="section-title">{project.title}</h1>
        <p className="section-description">{project.summary}</p>
        <div className="status-detail-actions">
          <Link to="/status" className="btn">
            <IconArrowLeft aria-hidden />
            <span>返回状态总览</span>
          </Link>
          <Link to={getStatusDetailPath(project.id)} className="btn btn-primary" aria-current="page">
            <IconListView aria-hidden />
            <span>当前详情页</span>
          </Link>
        </div>
      </section>
      {loadError && <p className="status-load-error">状态数据暂未读取成功：{loadError}</p>}
      <section className="status-reliability" aria-label={`${project.title} 可靠性详情`}>
        <StatusProjectDetail project={project} />
      </section>
    </main>
  )
}
