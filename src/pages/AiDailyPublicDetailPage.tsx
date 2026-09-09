import { AlertCircle, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import '../styles/route-pages.css'
import { DetailReadingGuide, type DetailReadingItem } from '../components/DetailReadingGuide'
import {
  requestAiDailyPublicDetail,
  type AiDailyPublicDetailPayload,
} from '../utils/aiDailyPublicApi'
import { formatProductName } from '../data/productRegistry'
import { applySeo } from '../utils/seo'
import { aiDailyInterfaceCopy, classifyAiDailyDetailError, formatAiDailyDate, type AiDailyDetailError } from '../data/aiDailyInterfaceCopy'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

export function AiDailyPublicDetailPage() {
  const language = useSiteLanguage()
  const copy = aiDailyInterfaceCopy[language]
  const { publicId } = useParams<{ publicId: string }>()
  const [payload, setPayload] = useState<AiDailyPublicDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AiDailyDetailError | null>(null)
  const etagRef = useRef<string | null>(null)
  const loadedPublicIdRef = useRef<string | null>(null)
  const requestSequenceRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    const requestId = ++requestSequenceRef.current
    abortControllerRef.current?.abort()
    if (!publicId) {
      abortControllerRef.current = null
      setLoading(false)
      setError('missing-id')
      return
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    if (loadedPublicIdRef.current !== publicId) {
      loadedPublicIdRef.current = publicId
      etagRef.current = null
      setPayload(null)
      setError(null)
    }
    setLoading(true)
    const result = await requestAiDailyPublicDetail(publicId, { etag: etagRef.current, signal: controller.signal })
    if (requestId !== requestSequenceRef.current) return
    if (abortControllerRef.current === controller) abortControllerRef.current = null
    if (result.aborted) return
    setLoading(false)
    if (result.notModified) {
      setError(null)
      return
    }
    if (!result.ok || !result.payload) {
      setError(classifyAiDailyDetailError(result.status, result.error))
      return
    }
    etagRef.current = result.etag
    setPayload(result.payload)
    setError(null)
  }, [publicId])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0)
    return () => {
      window.clearTimeout(initialLoad)
      requestSequenceRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [load])

  useEffect(() => {
    if (!payload) return
    applySeo({
      title: `${payload.item.title} | ${formatProductName('ai-daily')} AI 日报`,
      description: (payload.item.factSummary || payload.item.whyItMatters).trim().slice(0, 180),
      canonicalPath: `/ai-daily/${payload.item.publicId}`,
      type: 'article',
    })
  }, [payload])

  if (loading && !payload) {
    return <main className="page-stack detail-page" lang={SITE_LANGUAGE_TAGS[language]}><div className="detail-missing"><h1 className="section-title">{copy.detail.loadingTitle}</h1><p className="section-description">{copy.detail.loadingDescription}</p></div></main>
  }

  if (!payload) {
    return (
      <main className="page-stack detail-page" lang={SITE_LANGUAGE_TAGS[language]}>
        <div className="detail-missing detail-missing--ai-daily">
          <AlertCircle size={24} aria-hidden />
          <h1 className="section-title">{copy.detail.missingTitle}</h1>
          <p className="section-description">{error ? copy.detail.errors[error] : copy.detail.missingDescription}</p>
          <div className="detail-missing-actions">
            <button type="button" className="btn" onClick={() => void load()}><RefreshCw size={16} aria-hidden />{copy.retry}</button>
            <Link to="/ai-daily" className="btn btn-secondary"><ArrowLeft size={16} aria-hidden />{copy.detail.back}</Link>
          </div>
        </div>
      </main>
    )
  }

  const { item } = payload
  const readingItems: DetailReadingItem[] = [
    { id: 'ai-daily-fact', label: copy.detail.sections.fact },
    { id: 'ai-daily-impact', label: copy.detail.sections.impact },
    ...(item.uncertainty ? [{ id: 'ai-daily-uncertainty', label: copy.detail.sections.uncertainty }] : []),
    ...(item.citations.length ? [{ id: 'ai-daily-citations', label: copy.detail.sections.citations }] : []),
  ]

  return (
    <article className="page-stack detail-page ai-daily-public-detail-page" lang={SITE_LANGUAGE_TAGS[language]}>
      <Link to="/ai-daily" className="detail-back"><ArrowLeft size={16} aria-hidden /><span><span lang="zh-CN">{formatProductName('ai-daily')}</span>｜{copy.name}</span></Link>
      <header className="detail-header">
        <div className="detail-badges"><span className="tag">AI DAILY</span>{item.corrected && <span className="ai-daily-public-correction">{copy.corrected}</span>}</div>
        <h1 className="detail-title" lang="zh-CN">{item.title}</h1>
        <p className="detail-summary">{copy.detail.approved(formatAiDailyDate(item.approvedAt, language, true), item.revision)}</p>
      </header>
      <DetailReadingGuide items={readingItems} itemsLanguage={language} />
      <div className="detail-body ai-daily-public-detail-body">
        <section id="ai-daily-fact" className="detail-block"><h2 className="detail-block-title">{copy.detail.sections.fact}</h2><p className="blog-post-body-text" lang="zh-CN">{item.factSummary}</p></section>
        <section id="ai-daily-impact" className="detail-block"><h2 className="detail-block-title">{copy.detail.sections.impact}</h2><p className="blog-post-body-text" lang="zh-CN">{item.whyItMatters}</p></section>
        {item.uncertainty && <section id="ai-daily-uncertainty" className="detail-block"><h2 className="detail-block-title">{copy.detail.sections.uncertainty}</h2><p className="blog-post-body-text" lang="zh-CN">{item.uncertainty}</p></section>}
        {item.citations.length > 0 && (
          <section id="ai-daily-citations" className="detail-block ai-daily-public-citations">
            <h2 className="detail-block-title">{copy.detail.sections.citations}</h2>
            <div className="ai-daily-public-citation-list">
              {item.citations.map((citation) => (
                <a key={`${citation.url}-${citation.title}`} href={citation.url} target="_blank" rel="noreferrer" className="ai-daily-public-citation" lang="">
                  <span className="ai-daily-public-citation__publisher">{citation.publisher}</span>
                  <strong>{citation.title}</strong>
                  <p>{citation.excerpt}</p>
                  <span className="ai-daily-public-citation__link" lang={SITE_LANGUAGE_TAGS[language]}>{copy.detail.openSource} <ExternalLink size={14} aria-hidden /></span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}
