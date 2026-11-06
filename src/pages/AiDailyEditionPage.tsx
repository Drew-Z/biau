import { useCallback, useEffect } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AiDailyMarkdown } from '../components/AiDailyMarkdown'
import { DetailReadingGuide } from '../components/DetailReadingGuide'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { useDailyEditionResource } from '../hooks/useDailyEditionResource'
import { dailyEditionCopy, dailyEditionTime } from '../data/aiDailyEditionCopy'
import { readDailyEdition } from '../utils/aiDailyEditionsApi'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'
import { applySeo } from '../utils/seo'
import '../styles/route-pages.css'
import '../styles/ai-daily-editions.css'

export function AiDailyEditionPage({ editionId }: { editionId: string }) {
  const language = useSiteLanguage()
  const copy = dailyEditionCopy[language]
  const load = useCallback((signal: AbortSignal, etag?: string | null) => readDailyEdition(editionId, signal, etag), [editionId])
  const { payload, loading, error, refresh } = useDailyEditionResource(load)
  useEffect(() => {
    if (payload) applySeo({ title: `${payload.edition.title} | AI 日报`, description: 'AI 行业早晚刊，附原文来源与更新时间。', canonicalPath: `/ai-daily/${payload.edition.editionId}`, type: 'article' })
  }, [payload])
  if (!payload) return <main className="page-stack detail-page" lang={SITE_LANGUAGE_TAGS[language]}><div className="detail-missing detail-missing--ai-daily"><h1 className="section-title">{loading ? copy.loading : copy.failed}</h1><p>{error === 404 ? copy.missing : !loading ? copy.unavailable : ''}</p><div className="detail-missing-actions"><Link to="/ai-daily" className="btn"><ArrowLeft size={16} />{copy.back}</Link><button className="btn" disabled={loading} onClick={() => void refresh()}><RefreshCw size={16} />{copy.retry}</button></div></div></main>
  const { edition, markdown } = payload
  return <article className="page-stack detail-page daily-edition-detail" lang={SITE_LANGUAGE_TAGS[language]}>
    <Link to="/ai-daily" className="detail-back"><ArrowLeft size={16} aria-hidden />{copy.back}</Link>
    <header className="detail-header"><p className="section-subtitle">{edition.editionDate} · {copy[edition.slot]} · {copy.chinese}</p><h1 className="detail-title" lang="zh-CN">{edition.title}</h1><p className="detail-summary">{copy.note}</p>
      <dl className="daily-edition-times"><div><dt>{copy.generated}</dt><dd>{dailyEditionTime(edition.generatedAt, language)}</dd></div><div><dt>{copy.published}</dt><dd>{dailyEditionTime(edition.publishedAt, language)}</dd></div>{edition.revision > 1 && <div><dt>{copy.updated}</dt><dd>{dailyEditionTime(edition.updatedAt, language)}</dd></div>}<div><dt>{copy.window}</dt><dd>{dailyEditionTime(edition.windowStart, language)} — {dailyEditionTime(edition.windowEnd, language)} · {copy.timezone}</dd></div></dl>
    </header>
    {error !== null && <p role="alert" className="daily-editions-note">{copy.failed} · {copy.kept}</p>}
    <DetailReadingGuide items={[{ id: 'daily-body', label: copy.body }, { id: 'daily-sources', label: copy.sources }]} itemsLanguage={language} />
    <div className="detail-body"><section id="daily-body"><AiDailyMarkdown markdown={markdown} /></section><section id="daily-sources" className="detail-block"><h2 className="detail-block-title">{copy.sources}</h2><ul className="daily-edition-sources">{edition.sourceLinks.map((source, index) => <li key={`${index}-${source.url}`}><a href={source.url} target="_blank" rel="noopener noreferrer" lang="">{source.title}</a><span lang="">{source.publisher}</span></li>)}</ul></section></div>
  </article>
}
