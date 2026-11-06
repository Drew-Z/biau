import { SITE_LANGUAGE_TAGS, type SiteLanguage } from '../utils/siteLanguage'

export const dailyEditionCopy = {
  zh: {
    subtitle: 'AI DAILY / 早晚刊', title: '潮讯 AI 日报', description: '每天早晚，关注 AI 模型、产品、研究与行业进展。AI 汇编，原文见来源。',
    morning: '早报', evening: '晚报', fresh: '最近一期', stale: '更新有所延迟', staleNotice: '最近一期已超过 18 小时，以下保留最后成功发布的内容。',
    empty: '首期日报准备中', emptyBody: '首期内容验收后，将按早晚节奏更新。', loading: '正在读取日报…', refresh: '刷新日报', retry: '重试', back: '返回 AI 日报',
    failed: '暂时无法读取日报', kept: '已保留上一次加载的内容。', missing: '这期日报尚未发布或已撤回。', unavailable: '内容服务暂不可用，请稍后重试。',
    read: '阅读整期', count: (n: number) => `${n} 条资讯`, sources: '原文来源', body: '本期内容', generated: '生成于', published: '发布于', updated: '修正于', window: '采集窗口', timezone: '北京时间',
    note: 'AI 汇编可能存在疏漏，请以原文为准。', chinese: '中文正文', schedule: '每天早晚更新，实际发布时间可能延后。',
  },
  en: {
    subtitle: 'AI DAILY / Morning & evening', title: 'TideBrief AI Daily', description: 'Morning and evening updates on AI models, products, research and the industry. Compiled with AI, linked to original sources.',
    morning: 'Morning', evening: 'Evening', fresh: 'Latest edition', stale: 'Update delayed', staleNotice: 'The latest edition is over 18 hours old. The last successful publication remains available below.',
    empty: 'The first edition is being prepared', emptyBody: 'Morning and evening updates begin after the first edition is reviewed.', loading: 'Loading editions…', refresh: 'Refresh editions', retry: 'Retry', back: 'Back to AI Daily',
    failed: 'AI Daily could not be loaded', kept: 'Previously loaded content has been kept.', missing: 'This edition is not published or has been withdrawn.', unavailable: 'The content service is unavailable. Please try again later.',
    read: 'Read edition', count: (n: number) => `${n} updates`, sources: 'Original sources', body: 'In this edition', generated: 'Generated', published: 'Published', updated: 'Corrected', window: 'Collection window', timezone: 'Beijing time',
    note: 'AI summaries may contain omissions. Refer to the original sources.', chinese: 'Content in Chinese', schedule: 'Updated morning and evening; publication times may vary.',
  },
}

export function dailyEditionTime(value: string, language: SiteLanguage) {
  return new Intl.DateTimeFormat(SITE_LANGUAGE_TAGS[language], { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
}
