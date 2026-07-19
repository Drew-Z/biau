import { AlertCircle, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetailReadingGuide, type DetailReadingItem } from '../components/DetailReadingGuide'
import {
  requestAiDailyPublicDetail,
  type AiDailyPublicDetailPayload,
} from '../utils/aiDailyPublicApi'
import { applySeo } from '../utils/seo'

export function AiDailyPublicDetailPage() {
  const { publicId } = useParams<{ publicId: string }>()
  const [payload, setPayload] = useState<AiDailyPublicDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      setError('缺少公开事件地址。')
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
      setError(explainDetailError(result.status, result.error))
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
      title: `${payload.item.title} | BIAU Port AI 日报`,
      description: (payload.item.factSummary || payload.item.whyItMatters).trim().slice(0, 180),
      canonicalPath: `/ai-daily/${payload.item.publicId}`,
      type: 'article',
    })
  }, [payload])

  if (loading && !payload) {
    return <main className="page-stack detail-page"><div className="detail-missing"><h1 className="section-title">AI 日报载入中</h1><p className="section-description">正在打开公开快讯。</p></div></main>
  }

  if (!payload) {
    return (
      <main className="page-stack detail-page">
        <div className="detail-missing">
          <AlertCircle size={24} aria-hidden />
          <h1 className="section-title">无法打开这条快讯</h1>
          <p className="section-description">{error ?? '这条内容可能已撤回、过期或尚未通过公开审核。'}</p>
          <div className="detail-missing-actions">
            <button type="button" className="btn" onClick={() => void load()}><RefreshCw size={16} aria-hidden />重试</button>
            <Link to="/ai-daily" className="btn btn-secondary"><ArrowLeft size={16} aria-hidden />返回 AI 日报</Link>
          </div>
        </div>
      </main>
    )
  }

  const { item } = payload
  const readingItems: DetailReadingItem[] = [
    { id: 'ai-daily-fact', label: '事实摘要' },
    { id: 'ai-daily-impact', label: '为什么重要' },
    ...(item.uncertainty ? [{ id: 'ai-daily-uncertainty', label: '不确定性' }] : []),
    ...(item.citations.length ? [{ id: 'ai-daily-citations', label: '公开来源' }] : []),
  ]

  return (
    <article className="page-stack detail-page ai-daily-public-detail-page">
      <Link to="/ai-daily" className="detail-back"><ArrowLeft size={16} aria-hidden /><span>AI 日报</span></Link>
      <header className="detail-header">
        <div className="detail-badges"><span className="tag">AI DAILY</span>{item.corrected && <span className="ai-daily-public-correction">已修正</span>}</div>
        <h1 className="detail-title">{item.title}</h1>
        <p className="detail-summary">公开批准于 {formatDate(item.approvedAt)} · 版本 {item.revision}</p>
      </header>
      <DetailReadingGuide items={readingItems} />
      <div className="detail-body ai-daily-public-detail-body">
        <section id="ai-daily-fact" className="detail-block"><h2 className="detail-block-title">事实摘要</h2><p className="blog-post-body-text">{item.factSummary}</p></section>
        <section id="ai-daily-impact" className="detail-block"><h2 className="detail-block-title">为什么重要</h2><p className="blog-post-body-text">{item.whyItMatters}</p></section>
        {item.uncertainty && <section id="ai-daily-uncertainty" className="detail-block"><h2 className="detail-block-title">不确定性</h2><p className="blog-post-body-text">{item.uncertainty}</p></section>}
        {item.citations.length > 0 && (
          <section id="ai-daily-citations" className="detail-block ai-daily-public-citations">
            <h2 className="detail-block-title">公开来源</h2>
            <div className="ai-daily-public-citation-list">
              {item.citations.map((citation) => (
                <a key={`${citation.url}-${citation.title}`} href={citation.url} target="_blank" rel="noreferrer" className="ai-daily-public-citation">
                  <span className="ai-daily-public-citation__publisher">{citation.publisher}</span>
                  <strong>{citation.title}</strong>
                  <p>{citation.excerpt}</p>
                  <span className="ai-daily-public-citation__link">打开来源 <ExternalLink size={14} aria-hidden /></span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待确认'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function explainDetailError(status: number, error: string | null) {
  if (status === 404) return '这条快讯不存在，或还没有通过公开审核。'
  if (status === 410) return error?.includes('withdrawn') ? '这条快讯已被撤回。' : '这条快讯已超过公开保留时间。'
  if (error === 'public-ai-daily-network-error') return '浏览器无法连接内容服务，请稍后重试。'
  return '内容服务暂时返回异常状态。'
}
