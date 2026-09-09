import type { AiDailyPublicFeedPayload } from '../utils/aiDailyPublicApi'
import { SITE_LANGUAGE_TAGS, type SiteLanguage } from '../utils/siteLanguage'

export type AiDailyFeedError = 'not-found' | 'rate-limited' | 'not-configured' | 'network' | 'unavailable'
export type AiDailyDetailError = 'missing-id' | 'not-found' | 'withdrawn' | 'expired' | 'network' | 'unavailable'

interface AiDailyInterfaceCopy {
  name: string
  corrected: string
  retry: string
  timePending: string
  feed: {
    subtitle: string
    description: string
    statusLabel: string
    freshness: Record<AiDailyPublicFeedPayload['meta']['freshness']['status'] | 'loading', string>
    latestApproval: (date: string) => string
    noApproval: string
    coverage: string
    updatedAt: (time: string) => string
    waitingForSync: string
    refresh: string
    refreshFailed: string
    keptContent: string
    staleNotice: (minutes: number) => string
    loading: string
    emptyTitle: string
    emptyDescription: string
    feedLabel: string
    loadingMore: string
    loadMore: string
    sources: (count: number) => string
    readItem: (title: string) => string
    readDetails: string
    errors: Record<AiDailyFeedError, string>
  }
  detail: {
    loadingTitle: string
    loadingDescription: string
    missingTitle: string
    missingDescription: string
    back: string
    approved: (date: string, revision: number) => string
    sections: Record<'fact' | 'impact' | 'uncertainty' | 'citations', string>
    openSource: string
    errors: Record<AiDailyDetailError, string>
  }
}

export const aiDailyInterfaceCopy: Record<SiteLanguage, AiDailyInterfaceCopy> = {
  zh: {
    name: 'AI 日报',
    corrected: '已修正',
    retry: '重试',
    timePending: '时间待确认',
    feed: {
      subtitle: 'AI DAILY / 每日快讯',
      description: '只展示经过证据整理与人工批准的近期 AI 动态。每条快讯保留公开引用，修正会沿用同一个事件地址。',
      statusLabel: '潮讯 AI 日报状态',
      freshness: { loading: '正在同步', fresh: '公开投影正常', stale: '投影需要关注', empty: '等待公开内容' },
      latestApproval: (date) => `最近批准 ${date}`,
      noApproval: '还没有可公开的批准记录',
      coverage: '本页证据覆盖',
      updatedAt: (time) => `更新于 ${time}`,
      waitingForSync: '等待首次同步',
      refresh: '刷新 AI 日报',
      refreshFailed: '暂时无法刷新 AI 日报',
      keptContent: ' 已保留上一次成功加载的内容。',
      staleNotice: (minutes) => `当前 API 可用，但最近一次公开投影已经超过 ${minutes} 分钟，内容可能暂时滞后。`,
      loading: '正在读取已批准的 AI 动态…',
      emptyTitle: '公开快讯暂为空',
      emptyDescription: '内容工作台还没有把近期事件批准为公开 Flash。静态 AI 日报仍会按独立审核流程发布。',
      feedLabel: '近期 AI 快讯',
      loadingMore: '读取中…',
      loadMore: '加载更早快讯',
      sources: (count) => count ? `${count} 个公开来源` : '来源整理中',
      readItem: (title) => `阅读 ${title}`,
      readDetails: '阅读详情',
      errors: {
        'not-found': '公开 AI 日报接口尚未配置或没有公开入口。',
        'rate-limited': '刷新太频繁，请稍后再试。',
        'not-configured': '内容服务还没有连接到 Studio 数据库。',
        network: '浏览器无法连接内容服务，请稍后重试。',
        unavailable: '内容服务暂时返回异常状态。',
      },
    },
    detail: {
      loadingTitle: 'AI 日报载入中',
      loadingDescription: '正在打开公开快讯。',
      missingTitle: '无法打开这条快讯',
      missingDescription: '这条内容可能已撤回、过期或尚未通过公开审核。',
      back: '返回 AI 日报',
      approved: (date, revision) => `公开批准于 ${date} · 版本 ${revision}`,
      sections: { fact: '事实摘要', impact: '为什么重要', uncertainty: '不确定性', citations: '公开来源' },
      openSource: '打开来源',
      errors: {
        'missing-id': '缺少公开事件地址。',
        'not-found': '这条快讯不存在，或还没有通过公开审核。',
        withdrawn: '这条快讯已被撤回。',
        expired: '这条快讯已超过公开保留时间。',
        network: '浏览器无法连接内容服务，请稍后重试。',
        unavailable: '内容服务暂时返回异常状态。',
      },
    },
  },
  en: {
    name: 'AI Daily',
    corrected: 'Corrected',
    retry: 'Retry',
    timePending: 'Time to be confirmed',
    feed: {
      subtitle: 'AI DAILY / Daily briefs',
      description: 'Recent AI updates reviewed against evidence and approved by an editor. Each brief keeps its public sources and a stable URL for corrections.',
      statusLabel: 'TideBrief AI Daily status',
      freshness: { loading: 'Syncing', fresh: 'Public feed up to date', stale: 'Feed needs attention', empty: 'Waiting for public content' },
      latestApproval: (date) => `Latest approval ${date}`,
      noApproval: 'No approved public records yet',
      coverage: 'Source coverage on this page',
      updatedAt: (time) => `Updated at ${time}`,
      waitingForSync: 'Waiting for first sync',
      refresh: 'Refresh AI Daily',
      refreshFailed: 'AI Daily could not refresh',
      keptContent: ' Previously loaded content has been kept.',
      staleNotice: (minutes) => `The API is available, but the latest public update is over ${minutes} minutes old. Content may be behind.`,
      loading: 'Loading approved AI updates…',
      emptyTitle: 'No public briefs yet',
      emptyDescription: 'The content studio has not yet approved recent events as public Flash briefs. Static AI Daily editions follow their separate review process.',
      feedLabel: 'Recent AI briefs',
      loadingMore: 'Loading…',
      loadMore: 'Load earlier briefs',
      sources: (count) => count ? `${count} public ${count === 1 ? 'source' : 'sources'}` : 'Sources being collected',
      readItem: (title) => `Read ${title}`,
      readDetails: 'Read details',
      errors: {
        'not-found': 'The public AI Daily endpoint is not configured or available.',
        'rate-limited': 'Too many refreshes. Please try again later.',
        'not-configured': 'The content service is not yet connected to the Studio database.',
        network: 'The browser cannot reach the content service. Please try again later.',
        unavailable: 'The content service is temporarily unavailable.',
      },
    },
    detail: {
      loadingTitle: 'Loading AI Daily',
      loadingDescription: 'Opening the public brief.',
      missingTitle: 'This brief could not be opened',
      missingDescription: 'This content may have been withdrawn, expired, or not yet approved for public release.',
      back: 'Back to AI Daily',
      approved: (date, revision) => `Publicly approved ${date} · Revision ${revision}`,
      sections: { fact: 'Facts', impact: 'Why it matters', uncertainty: 'Uncertainty', citations: 'Public sources' },
      openSource: 'Open source',
      errors: {
        'missing-id': 'The public event address is missing.',
        'not-found': 'This brief does not exist or has not been approved for public release.',
        withdrawn: 'This brief has been withdrawn.',
        expired: 'This brief is past its public retention period.',
        network: 'The browser cannot reach the content service. Please try again later.',
        unavailable: 'The content service is temporarily unavailable.',
      },
    },
  },
}

export function classifyAiDailyFeedError(status: number, error: string | null): AiDailyFeedError {
  if (status === 404) return 'not-found'
  if (status === 429) return 'rate-limited'
  if (status === 503) return 'not-configured'
  if (error === 'public-ai-daily-network-error') return 'network'
  return 'unavailable'
}

export function classifyAiDailyDetailError(status: number, error: string | null): AiDailyDetailError {
  if (status === 404) return 'not-found'
  if (status === 410) return error?.includes('withdrawn') ? 'withdrawn' : 'expired'
  if (error === 'public-ai-daily-network-error') return 'network'
  return 'unavailable'
}

export function formatAiDailyDate(value: string, language: SiteLanguage = 'zh', includeYear = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return aiDailyInterfaceCopy[language].timePending
  return new Intl.DateTimeFormat(SITE_LANGUAGE_TAGS[language], {
    ...(includeYear ? { year: 'numeric' as const } : {}),
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export function formatAiDailyTime(value: number, language: SiteLanguage = 'zh') {
  return new Intl.DateTimeFormat(SITE_LANGUAGE_TAGS[language], { hour: '2-digit', minute: '2-digit' }).format(value)
}
