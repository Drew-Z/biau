import { AlertCircle, ArrowRight, Clock3, RefreshCw, Rss, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  requestAiDailyPublicFeed,
  type AiDailyPublicFeedPayload,
  type AiDailyPublicItem,
} from '../utils/aiDailyPublicApi'

const REFRESH_INTERVAL_MS = 60_000

export function AiDailyPublicPage() {
  const [payload, setPayload] = useState<AiDailyPublicFeedPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)
  const etagRef = useRef<string | null>(null)
  const payloadRef = useRef<AiDailyPublicFeedPayload | null>(null)
  const lastFetchedAtRef = useRef<number | null>(null)
  const requestSequenceRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async (append = false) => {
    const currentPayload = payloadRef.current
    if (append && !currentPayload?.nextCursor) return
    const requestId = ++requestSequenceRef.current
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    if (append || currentPayload) setRefreshing(true)
    else setLoading(true)

    const result = await requestAiDailyPublicFeed({
      cursor: append ? currentPayload?.nextCursor : null,
      etag: append ? null : etagRef.current,
      limit: 20,
      signal: controller.signal,
    })
    if (requestId !== requestSequenceRef.current) return
    if (abortControllerRef.current === controller) abortControllerRef.current = null
    if (result.aborted) return

    const fetchedAt = Date.now()
    lastFetchedAtRef.current = fetchedAt
    setLastFetchedAt(fetchedAt)
    setRefreshing(false)
    setLoading(false)
    if (result.notModified) {
      setError(null)
      return
    }
    if (!result.ok || !result.payload) {
      setError(explainPublicFeedError(result.status, result.error))
      return
    }
    etagRef.current = append ? etagRef.current : result.etag
    const nextPayload = append && currentPayload
      ? { ...result.payload, items: [...currentPayload.items, ...result.payload.items] }
      : result.payload
    payloadRef.current = nextPayload
    setPayload(nextPayload)
    setError(null)
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0)
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (!lastFetchedAtRef.current || Date.now() - lastFetchedAtRef.current >= REFRESH_INTERVAL_MS) void load()
    }, REFRESH_INTERVAL_MS)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      requestSequenceRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [load])

  const freshness = payload?.meta.freshness
  return (
    <main className="page-stack ai-daily-public-page">
      <section className="section-header page-hero ai-daily-public-hero">
        <div>
          <p className="section-subtitle">AI DAILY / 每日快讯</p>
          <h1 className="section-title">AI 日报</h1>
          <p className="section-description">
            只展示经过证据整理与人工批准的近期 AI 动态。每条快讯保留公开引用，修正会沿用同一个事件地址。
          </p>
        </div>
        <div className="ai-daily-public-hero-mark" aria-hidden="true">
          <Rss size={30} strokeWidth={1.5} />
        </div>
      </section>

      <section className="ai-daily-public-overview" aria-label="AI 日报状态">
        <div className="ai-daily-public-freshness" data-state={freshness?.status ?? (loading ? 'loading' : 'empty')}>
          <span className="ai-daily-public-status-dot" aria-hidden="true" />
          <div>
            <strong>{formatFreshness(freshness?.status, loading)}</strong>
            <span>{formatLatestApproval(freshness?.latestApprovalAt)}</span>
          </div>
        </div>
        <div className="ai-daily-public-coverage">
          <span>本页证据覆盖</span>
          <strong>{payload ? `${Math.round(payload.meta.editorialCoverage.citationCoverage * 100)}%` : '—'}</strong>
        </div>
        <div className="ai-daily-public-refresh">
          <Clock3 size={16} aria-hidden />
          <span>{lastFetchedAt ? `更新于 ${formatTime(lastFetchedAt)}` : '等待首次同步'}</span>
          <button type="button" className="icon-button" onClick={() => void load()} disabled={loading || refreshing} aria-label="刷新 AI 日报">
            <RefreshCw size={16} aria-hidden className={refreshing ? 'is-spinning' : undefined} />
          </button>
        </div>
      </section>

      {error && (
        <section className="ai-daily-public-notice is-error" role="alert">
          <AlertCircle size={18} aria-hidden />
          <div>
            <strong>暂时无法刷新 AI 日报</strong>
            <p>{error}{payload ? ' 已保留上一次成功加载的内容。' : ''}</p>
          </div>
          <button type="button" className="btn btn-compact" onClick={() => void load()}>
            重试
          </button>
        </section>
      )}

      {freshness?.stale && (
        <section className="ai-daily-public-notice is-stale" role="status">
          <Clock3 size={18} aria-hidden />
          <p>当前 API 可用，但最近一次公开投影已经超过 {freshness.staleAfterMinutes} 分钟，内容可能暂时滞后。</p>
        </section>
      )}

      {loading && !payload && (
        <section className="ai-daily-public-empty" aria-live="polite">
          <span className="loading-bar" aria-hidden="true" />
          <p>正在读取已批准的 AI 动态…</p>
        </section>
      )}

      {!loading && payload && payload.items.length === 0 && (
        <section className="ai-daily-public-empty">
          <ShieldCheck size={24} aria-hidden />
          <h2>公开快讯暂为空</h2>
          <p>内容工作台还没有把近期事件批准为公开 Flash。静态 AI 日报仍会按独立审核流程发布。</p>
        </section>
      )}

      {payload && payload.items.length > 0 && (
        <section className="ai-daily-public-feed" aria-label="近期 AI 快讯">
          <div className="ai-daily-public-grid">
            {payload.items.map((item) => <AiDailyPublicCard key={item.publicId} item={item} />)}
          </div>
          {payload.nextCursor && (
            <div className="ai-daily-public-load-more">
              <button type="button" className="btn" onClick={() => void load(true)} disabled={refreshing}>
                {refreshing ? '读取中…' : '加载更早快讯'}
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function AiDailyPublicCard({ item }: { item: AiDailyPublicItem }) {
  return (
    <article className="ai-daily-public-card">
      <div className="ai-daily-public-card__meta">
        <span>{formatDate(item.approvedAt)}</span>
        {item.corrected && <span className="ai-daily-public-correction">已修正</span>}
      </div>
      <h2>{item.title}</h2>
      <p className="ai-daily-public-card__summary">{item.factSummary}</p>
      <p className="ai-daily-public-card__impact">{item.whyItMatters}</p>
      <div className="ai-daily-public-card__footer">
        <span>{item.citations.length ? `${item.citations.length} 个公开来源` : '来源整理中'}</span>
        <Link to={`/ai-daily/${item.publicId}`} aria-label={`阅读 ${item.title}`}>
          阅读详情 <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </article>
  )
}

function formatFreshness(status: 'fresh' | 'stale' | 'empty' | undefined, loading: boolean) {
  if (loading && !status) return '正在同步'
  if (status === 'fresh') return '公开投影正常'
  if (status === 'stale') return '投影需要关注'
  return '等待公开内容'
}

function formatLatestApproval(value: string | null | undefined) {
  return value ? `最近批准 ${formatDate(value)}` : '还没有可公开的批准记录'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待确认'
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(value)
}

function explainPublicFeedError(status: number, error: string | null) {
  if (status === 404) return '公开 AI 日报接口尚未配置或没有公开入口。'
  if (status === 429) return '刷新太频繁，请稍后再试。'
  if (status === 503) return '内容服务还没有连接到 Studio 数据库。'
  if (error === 'public-ai-daily-network-error') return '浏览器无法连接内容服务，请稍后重试。'
  return '内容服务暂时返回异常状态。'
}
