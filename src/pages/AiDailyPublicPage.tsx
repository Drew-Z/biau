import { AlertCircle, ArrowRight, Clock3, RefreshCw, Rss, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/route-pages.css'
import {
  requestAiDailyPublicFeed,
  type AiDailyPublicFeedPayload,
  type AiDailyPublicItem,
} from '../utils/aiDailyPublicApi'
import { formatProductName } from '../data/productRegistry'
import { aiDailyInterfaceCopy, classifyAiDailyFeedError, formatAiDailyDate, formatAiDailyTime, type AiDailyFeedError } from '../data/aiDailyInterfaceCopy'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

const REFRESH_INTERVAL_MS = 60_000

export function AiDailyPublicPage() {
  const language = useSiteLanguage()
  const copy = aiDailyInterfaceCopy[language]
  const [payload, setPayload] = useState<AiDailyPublicFeedPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<AiDailyFeedError | null>(null)
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
      setError(classifyAiDailyFeedError(result.status, result.error))
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
    <main className="page-stack ai-daily-public-page" lang={SITE_LANGUAGE_TAGS[language]}>
      <section className="section-header page-hero ai-daily-public-hero">
        <div>
          <p className="section-subtitle">{copy.feed.subtitle}</p>
          <h1 className="section-title" lang="zh-CN">{formatProductName('ai-daily')}</h1>
          <p className="section-description">
            {copy.feed.description}
          </p>
        </div>
        <div className="ai-daily-public-hero-mark" aria-hidden="true">
          <Rss size={30} strokeWidth={1.5} />
        </div>
      </section>

      <section className="ai-daily-public-overview" aria-label={copy.feed.statusLabel}>
        <div className="ai-daily-public-freshness" data-state={freshness?.status ?? (loading ? 'loading' : 'empty')}>
          <span className="ai-daily-public-status-dot" aria-hidden="true" />
          <div>
            <strong>{copy.feed.freshness[freshness?.status ?? (loading ? 'loading' : 'empty')]}</strong>
            <span>{freshness?.latestApprovalAt ? copy.feed.latestApproval(formatAiDailyDate(freshness.latestApprovalAt, language)) : copy.feed.noApproval}</span>
          </div>
        </div>
        <div className="ai-daily-public-coverage">
          <span>{copy.feed.coverage}</span>
          <strong>{payload ? `${Math.round(payload.meta.editorialCoverage.citationCoverage * 100)}%` : '—'}</strong>
        </div>
        <div className="ai-daily-public-refresh">
          <Clock3 size={16} aria-hidden />
          <span>{lastFetchedAt ? copy.feed.updatedAt(formatAiDailyTime(lastFetchedAt, language)) : copy.feed.waitingForSync}</span>
          <button type="button" className="icon-button" onClick={() => void load()} disabled={loading || refreshing} aria-label={copy.feed.refresh}>
            <RefreshCw size={16} aria-hidden className={refreshing ? 'is-spinning' : undefined} />
          </button>
        </div>
      </section>

      {error && (
        <section className="ai-daily-public-notice is-error" role="alert">
          <AlertCircle size={18} aria-hidden />
          <div>
            <strong>{copy.feed.refreshFailed}</strong>
            <p>{copy.feed.errors[error]}{payload ? copy.feed.keptContent : ''}</p>
          </div>
          <button type="button" className="btn btn-compact" onClick={() => void load()}>
            {copy.retry}
          </button>
        </section>
      )}

      {freshness?.stale && (
        <section className="ai-daily-public-notice is-stale" role="status">
          <Clock3 size={18} aria-hidden />
          <p>{copy.feed.staleNotice(freshness.staleAfterMinutes)}</p>
        </section>
      )}

      {loading && !payload && (
        <section className="ai-daily-public-empty" aria-live="polite">
          <span className="loading-bar" aria-hidden="true" />
          <p>{copy.feed.loading}</p>
        </section>
      )}

      {!loading && payload && payload.items.length === 0 && (
        <section className="ai-daily-public-empty">
          <ShieldCheck size={24} aria-hidden />
          <h2>{copy.feed.emptyTitle}</h2>
          <p>{copy.feed.emptyDescription}</p>
        </section>
      )}

      {payload && payload.items.length > 0 && (
        <section className="ai-daily-public-feed" aria-label={copy.feed.feedLabel}>
          <div className="ai-daily-public-grid">
            {payload.items.map((item) => <AiDailyPublicCard key={item.publicId} item={item} />)}
          </div>
          {payload.nextCursor && (
            <div className="ai-daily-public-load-more">
              <button type="button" className="btn" onClick={() => void load(true)} disabled={refreshing}>
                {refreshing ? copy.feed.loadingMore : copy.feed.loadMore}
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
  const language = useSiteLanguage()
  const copy = aiDailyInterfaceCopy[language]
  return (
    <article className="ai-daily-public-card">
      <div className="ai-daily-public-card__meta">
        <span>{formatAiDailyDate(item.approvedAt, language)}</span>
        {item.corrected && <span className="ai-daily-public-correction">{copy.corrected}</span>}
      </div>
      <h2 lang="zh-CN">{item.title}</h2>
      <p className="ai-daily-public-card__summary" lang="zh-CN">{item.factSummary}</p>
      <p className="ai-daily-public-card__impact" lang="zh-CN">{item.whyItMatters}</p>
      <div className="ai-daily-public-card__footer">
        <span>{copy.feed.sources(item.citations.length)}</span>
        <Link to={`/ai-daily/${item.publicId}`} aria-label={copy.feed.readItem(item.title)}>
          {copy.feed.readDetails} <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </article>
  )
}
