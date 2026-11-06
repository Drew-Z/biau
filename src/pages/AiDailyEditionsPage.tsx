import { AlertCircle, ArrowRight, Clock3, RefreshCw, Rss } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { useDailyEditionResource } from '../hooks/useDailyEditionResource'
import { DAILY_STALE_MS } from '../data/aiDailyEditions'
import { dailyEditionCopy, dailyEditionTime } from '../data/aiDailyEditionCopy'
import { readDailyIndex } from '../utils/aiDailyEditionsApi'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'
import { applySeo } from '../utils/seo'
import '../styles/route-pages.css'
import '../styles/ai-daily-editions.css'

export function AiDailyEditionsPage() {
  const language = useSiteLanguage()
  const copy = dailyEditionCopy[language]
  useEffect(() => {
    applySeo({ title: '潮讯 AI 日报 · 早晚刊 | BIAU Port', description: 'AI 行业早晚刊：AI 汇编，附原文来源、采集窗口和实际发布时间。', canonicalPath: '/ai-daily', type: 'website' })
  }, [])
  const { payload, error, loading, checkedAt, refresh } = useDailyEditionResource(readDailyIndex)
  const latest = payload?.editions[0]
  const stale = latest && checkedAt - Date.parse(latest.generatedAt) > DAILY_STALE_MS
  return <main className="page-stack ai-daily-public-page daily-editions" lang={SITE_LANGUAGE_TAGS[language]}>
    <section className="section-header page-hero ai-daily-public-hero">
      <div><p className="section-subtitle">{copy.subtitle}</p><h1 className="section-title">{copy.title}</h1><p className="section-description">{copy.description}</p></div>
      <div className="ai-daily-public-hero-mark" aria-hidden><Rss size={30} /></div>
    </section>
    <div className="daily-editions-status">
      <div><Clock3 size={18} aria-hidden /><span>{latest ? `${stale ? copy.stale : copy.fresh} · ${dailyEditionTime(latest.publishedAt, language)}` : copy.schedule}</span></div>
      <button className="btn btn-compact" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} aria-hidden />{copy.refresh}</button>
    </div>
    {stale && <p role="status" className="daily-editions-note">{copy.staleNotice}</p>}
    {error !== null && <div className="daily-editions-error" role="alert"><AlertCircle size={18} aria-hidden /><p>{copy.failed} · {copy.unavailable} {payload ? copy.kept : ''}</p></div>}
    {loading && !payload && <p role="status">{copy.loading}</p>}
    {payload?.editions.length === 0 && <section className="ai-daily-public-empty"><h2>{copy.empty}</h2><p>{copy.emptyBody}</p></section>}
    <div className="daily-edition-list">
      {payload?.editions.map((edition) => <article className="daily-edition-row" key={edition.editionId}>
        <div className="daily-edition-slot"><span>{edition.editionDate}</span><strong>{copy[edition.slot]}</strong></div>
        <div className="daily-edition-row-body"><h2 lang="zh-CN"><Link to={`/ai-daily/${edition.editionId}`}>{edition.title}</Link></h2><p>{copy.count(edition.itemCount)} · {copy.chinese}</p><p>{copy.published} {dailyEditionTime(edition.publishedAt, language)} · {copy.timezone}</p></div>
        <Link className="daily-edition-read" to={`/ai-daily/${edition.editionId}`} aria-label={`${copy.read}: ${edition.title}`}>{copy.read}<ArrowRight size={16} aria-hidden /></Link>
      </article>)}
    </div>
  </main>
}
