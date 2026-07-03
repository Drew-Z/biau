import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconExternalOpen, IconLink, IconListView } from '@douyinfe/semi-icons'
import {
  SITE_STATUS_BASE_URL,
  findReliabilityProjectForTarget,
  getReliabilityAnchorId,
  getReliabilityProjectStatusCounts,
  reliabilityProjects,
  reliabilityStatusOrder,
  siteStatusTargets,
  type ReliabilityLayer,
  type ReliabilityProject,
  type ReliabilityStatus,
  type SiteStatusTarget,
} from '../data/statusTargets'

type EntryStatusValue = Exclude<ReliabilityStatus, 'planned'>

interface SiteStatusCheck extends SiteStatusTarget {
  status: EntryStatusValue
  httpStatus: number
  durationMs: number
  checkedAt: string
  finalUrl: string
  issues: string[]
}

interface SiteStatusSummary {
  total: number
  online: number
  degraded: number
  offline: number
  unchecked: number
}

interface SiteStatusPayload {
  checkedAt: string
  base: string
  ok: boolean
  summary: SiteStatusSummary
  targets: SiteStatusCheck[]
  reliabilityProjects?: ReliabilityProject[]
}

const statusMeta: Record<ReliabilityStatus, { label: string; tone: string; hint: string }> = {
  online: { label: '可用', tone: 'online', hint: '公开入口已响应' },
  degraded: { label: '受限', tone: 'degraded', hint: '入口响应但可能需要登录、重试或人工说明' },
  offline: { label: '异常', tone: 'offline', hint: '最近一次检测未能确认入口可达' },
  unchecked: { label: '未检测', tone: 'unchecked', hint: '尚未生成公开检测数据' },
  planned: { label: '待接入', tone: 'planned', hint: '已记录检查项，等待后续接入真实探针' },
}

const expectationLabels: Record<SiteStatusTarget['expectation'], string> = {
  'public-entry': '公开入口',
  'login-gated': '登录门禁',
  'static-site': '静态展示',
}

const layerLabels: Record<ReliabilityLayer, { title: string; code: string; description: string }> = {
  entry: {
    title: '入口可达',
    code: 'L0',
    description: '页面、工作台或展示站是否能响应。',
  },
  synthetic: {
    title: '功能小任务',
    code: 'L1',
    description: '用真实小流程证明问答、合同审查、登录或试玩能跑通。',
  },
  metrics: {
    title: '项目指标',
    code: 'L2',
    description: '服务暴露低敏指标，再交给 Prometheus 或托管平台采集。',
  },
  observability: {
    title: '看板告警',
    code: 'L3',
    description: 'Grafana、ARMS、Sentry、LLM tracing 或访问分析。',
  },
}

const projectCategoryLabels: Record<ReliabilityProject['category'], string> = {
  'main-site': '主站',
  'ai-workbench': 'AI 工作台',
  'business-system': '业务系统',
  'mobile-app': '移动应用',
  interactive: '互动体验',
}

function createUncheckedTarget(target: SiteStatusTarget): SiteStatusCheck {
  return {
    ...target,
    status: 'unchecked',
    httpStatus: 0,
    durationMs: 0,
    checkedAt: '',
    finalUrl: target.url,
    issues: ['status data not generated'],
  }
}

function buildSummary(targets: SiteStatusCheck[]): SiteStatusSummary {
  return targets.reduce<SiteStatusSummary>(
    (summary, target) => {
      summary.total += 1
      summary[target.status] += 1
      return summary
    },
    { total: 0, online: 0, degraded: 0, offline: 0, unchecked: 0 },
  )
}

function mergePayload(payload: SiteStatusPayload | null): SiteStatusPayload {
  const payloadTargets = Array.isArray(payload?.targets) ? payload.targets : []
  const generatedTargets = new Map(payloadTargets.map((target) => [target.id, target]))
  const targets = siteStatusTargets.map((target) => generatedTargets.get(target.id) ?? createUncheckedTarget(target))
  const summary = payload?.summary && payloadTargets.length === targets.length ? payload.summary : buildSummary(targets)
  const projects = Array.isArray(payload?.reliabilityProjects) ? payload.reliabilityProjects : reliabilityProjects

  return {
    checkedAt: payload?.checkedAt ?? '',
    base: payload?.base ?? SITE_STATUS_BASE_URL,
    ok: payload?.ok ?? false,
    summary,
    targets,
    reliabilityProjects: projects,
  }
}

function formatCheckedAt(value: string) {
  if (!value) return '未生成'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间不可读'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
  }).format(date)
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '未记录'
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(2)} s`
}

function formatHttpStatus(value: number) {
  return value > 0 ? `HTTP ${value}` : '未记录'
}

export function SiteStatusPage() {
  const [payload, setPayload] = useState<SiteStatusPayload | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/status/site-status.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<SiteStatusPayload>
      })
      .then((data) => {
        if (!active) return
        setPayload(data)
        setLoadError('')
      })
      .catch((error) => {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : String(error))
      })
    return () => {
      active = false
    }
  }, [])

  const status = useMemo(() => mergePayload(payload), [payload])
  const allClear = status.summary.offline === 0 && status.summary.unchecked === 0
  const reliabilitySummary = useMemo(() => {
    const checks = status.reliabilityProjects?.flatMap((project) => project.checks) ?? []
    return checks.reduce(
      (summary, check) => {
        summary.total += 1
        summary[check.status] += 1
        return summary
      },
      { total: 0, online: 0, degraded: 0, offline: 0, unchecked: 0, planned: 0 } as Record<ReliabilityStatus | 'total', number>,
    )
  }, [status.reliabilityProjects])

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
        {(Object.keys(layerLabels) as ReliabilityLayer[]).map((layer) => {
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
          const detailHref = detailProject ? `#${getReliabilityAnchorId(detailProject.id)}` : '#status-reliability'
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
                <a
                  className="btn status-target__detail-link"
                  href={detailHref}
                  aria-label={`详细状态：${detailProject?.title ?? target.label}`}
                >
                  <IconListView aria-hidden />
                  <span>详细状态</span>
                </a>
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

      <section id="status-reliability" className="status-reliability" aria-label="项目可靠性检查基线">
        {status.reliabilityProjects?.map((project) => {
          const projectCounts = getReliabilityProjectStatusCounts(project)
          const visibleStatuses = reliabilityStatusOrder.filter((statusKey) => projectCounts[statusKey] > 0)
          return (
            <article
              key={project.id}
              id={getReliabilityAnchorId(project.id)}
              className="status-project glass-card"
              aria-labelledby={`${getReliabilityAnchorId(project.id)}-title`}
            >
              <div className="status-project__header">
                <div>
                  <p className="section-subtitle">{projectCategoryLabels[project.category]}</p>
                  <h2 id={`${getReliabilityAnchorId(project.id)}-title`}>{project.title}</h2>
                </div>
                <div className="status-project__header-tools">
                  <span>{project.checks.length} checks</span>
                  <a href="#status-targets">入口卡片</a>
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
        })}
      </section>
    </main>
  )
}
