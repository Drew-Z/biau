import type { PublicAssistantMode, PublicAssistantRecoveryFailureClass, PublicAssistantStatus } from '../utils/publicAssistantApi'
import type { SiteLanguage } from '../utils/siteLanguage'

type IssueCopy = { title: string; detail: string }

export interface PublicAssistantInterfaceCopy {
  launcher: { idle: string; opening: string; warming: string; ready: string; error: string }
  service: { online: string; degraded: string; error: string; ready: string; warming: string; warmupError: string }
  modes: Record<PublicAssistantMode, string>
  feedbackReasons: Record<'incorrect' | 'unclear' | 'missing-sources' | 'outdated' | 'other', string>
  statuses: Record<PublicAssistantStatus, string>
  routes: Record<'direct' | 'site' | 'web' | 'combined', string>
  evidenceCount: (count: number) => string
  seconds: (value: number | string) => string
  siteSourceCount: (count: number) => string
  recovery: { recovered: (attempts: number) => string; failed: (label: string, attempts: number) => string; failures: Record<PublicAssistantRecoveryFailureClass, string> }
  loading: Record<'image' | 'planning' | 'site' | 'researching' | 'evaluating' | 'refining' | 'answering' | 'recovering' | 'verifying' | 'saving' | 'web' | 'auto', string>
  retry: string
  retryAfter: (seconds: number) => string
  retryRestore: string
  retryAction: string
  issues: Record<'offline' | 'restored' | 'branch' | 'revision' | 'starting' | 'timeout' | 'unreachable' | 'expired' | 'cancelled' | 'image' | 'refresh' | 'history' | 'invalid' | 'failed', IssueCopy>
  rateLimited: { title: string; waiting: (seconds: number) => string; ready: string }
  history: { actions: string; open: string; title: string; newSession: string; close: string; back: string; backTitle: string; loading: string; unavailable: string; retryDetail: string; emptyTitle: string; emptyDetail: string; turns: (count: number) => string; delete: string; deleteLabel: (title: string) => string; deleteConfirm: string }
  fullscreen: { enter: string; exit: string }
  closeAssistant: string
  close: string
  hint: string
  branch: { current: string; option: (ordinal: number, count: number, earlier: boolean, preview: string) => string; earlier: string; revisions: string }
  eyebrow: { publicResearch: string; recentSessions: string }
  advanced: string
  scope: string
  transcript: string
  empty: IssueCopy
  warmup: IssueCopy & { retry: string; unavailable: string }
  restoring: string
  snapshot: string
  restore: IssueCopy
  truncated: string
  question: { editContent: string; cancel: string; resend: string; sendEdit: string; actions: string; edit: string; editTitle: string }
  evidence: { summary: (count: number) => string; claims: (count: number) => string; claimSources: string; locate: (title: string) => string; sources: string; web: string; site: string; fallbackId: (count: number) => string; verified: string; partial: string; openWeb: (title: string) => string; openSite: (title: string) => string }
  revision: { label: string; previous: string; previousTitle: string; next: string; nextTitle: string; continue: string }
  answer: { actions: string; copied: string; copy: string; copiedTitle: string; regenerate: string; regenerateTitle: string; helpful: string; helpfulTitle: string; improve: string; improveTitle: string; feedbackFailed: string; feedbackGroup: string; feedbackPrompt: string }
  latest: string
  live: Record<'warming' | 'error' | 'restoring' | 'loading' | 'cancelled' | 'completed', string>
  suggestions: string
  image: { preview: string; use: string; remove: string; replace: string; add: string; unsupported: string; sourceTooLarge: string; outputTooLarge: string; unreadable: string }
  composer: { label: string; placeholder: string; stopLabel: string; stop: string; sendLabel: string; send: string }
  markdown: { copiedCode: string; copyCode: string; copied: string; table: string }
}

export const publicAssistantInterfaceCopy: Record<SiteLanguage, PublicAssistantInterfaceCopy> = {
  zh: {
    launcher: { idle: '泊岸研究助手', opening: '正在打开助手', warming: '助手准备中', ready: '助手已就绪', error: '助手等待重试' },
    service: { online: '研究助手已响应', degraded: '回答服务已降级', error: '研究服务暂不可用', ready: '可检索本站与公开网页', warming: '助手服务准备中', warmupError: '助手服务等待重试' },
    modes: { auto: '自动选择', site: '仅本站', web: '仅公开网页' },
    feedbackReasons: { incorrect: '内容不准确', unclear: '表达不清楚', 'missing-sources': '缺少来源', outdated: '信息已过时', other: '其他问题' },
    statuses: { answered: '已回答', partial: '部分证据', uncertain: '证据不足', degraded: '降级回答', blocked: '已安全拦截' },
    routes: { direct: '直接回答', site: '本站检索', web: '网页研究', combined: '综合研究' },
    evidenceCount: (count) => `${count} 条证据`,
    seconds: (value) => `${value} 秒`,
    siteSourceCount: (count) => `${count} 条站内来源`,
    recovery: {
      recovered: (attempts) => `已自动恢复（${attempts} 次尝试）`,
      failed: (label, attempts) => `${label}（${attempts} 次尝试）`,
      failures: { not_configured: '回答模型尚未配置', timeout: '回答超时', network: '回答网络异常', upstream: '上游回答服务异常', empty: '上游未返回内容', invalid: '回答格式未通过校验' },
    },
    loading: { image: '正在读取图片中的可见内容…', planning: '正在判断问题需要哪些公开资料…', site: '正在检索本站公开资料…', researching: '正在搜索并读取公开来源…', evaluating: '正在筛选可引用的证据…', refining: '证据还不够，正在调整检索…', answering: '正在基于证据组织回答…', recovering: '回答服务波动，正在重新尝试…', verifying: '正在核对结论与引用…', saving: '正在保存本次匿名记录…', web: '正在搜索并核验公开网页…', auto: '正在判断问题并组织研究…' },
    retry: '重试',
    retryAfter: (seconds) => `${seconds} 秒后`,
    retryRestore: '重试恢复',
    retryAction: '重试本次操作',
    issues: {
      offline: { title: '设备当前离线', detail: '网络恢复后可以继续本次操作。' },
      restored: { title: '网络已恢复', detail: '问题仍然保留，可以立即重试。' },
      branch: { title: '分支操作未完成', detail: '当前对话路径没有改变，可以重试本次操作。' },
      revision: { title: '重新生成未完成', detail: '当前回答版本已保留，可以重试本次生成。' },
      starting: { title: '助手服务仍在启动', detail: '输入内容已经保留，可以稍后重新准备服务。' },
      timeout: { title: '本次研究超时', detail: '服务没有在限定时间内完成，可以直接重试。' },
      unreachable: { title: '暂时无法连接研究服务', detail: '可能正在冷启动或网络不可达，可以稍后重试。' },
      expired: { title: '会话已过期', detail: '这条匿名历史已被清理，可以新建会话继续。' },
      cancelled: { title: '已停止生成', detail: '问题仍保留在当前会话中，可以重新发起。' },
      image: { title: '图片无法发送', detail: '请重新选择一张较小的 JPEG、PNG 或 WebP 图片。' },
      refresh: { title: '会话状态需要刷新', detail: '回答已经收到。刷新完成前不会发送下一问，以免进入错误的会话分支。' },
      history: { title: '历史服务暂不可用', detail: '当前仍可提问，但暂时无法读取或保存历史。' },
      invalid: { title: '响应格式异常', detail: '服务返回了无法安全展示的内容，请重试。' },
      failed: { title: '本次请求未完成', detail: '已保留站内兜底结果，可以重新发起研究。' },
    },
    rateLimited: { title: '请求较多', waiting: (seconds) => `可在 ${seconds} 秒后重试。`, ready: '等待时间已结束，可以重试。' },
    history: { actions: '会话操作', open: '查看历史会话', title: '历史会话', newSession: '新建会话', close: '关闭历史会话', back: '返回当前会话', backTitle: '返回', loading: '正在读取匿名历史…', unavailable: '历史暂不可用', retryDetail: '稍后可以重试。', emptyTitle: '还没有可恢复的会话', emptyDetail: '完成一次提问后，会话会在这个浏览器中保留。', turns: (count) => `${count} 轮`, delete: '删除会话', deleteLabel: (title) => `删除会话：${title}`, deleteConfirm: '删除这条匿名会话及其原始记录？' },
    fullscreen: { enter: '进入全屏', exit: '退出全屏' },
    closeAssistant: '关闭研究助手', close: '关闭', hint: '问本站内容，也可以研究公开网页。',
    branch: { current: '当前会话分支', option: (ordinal, count, earlier, preview) => `分支 ${ordinal} · ${count}${earlier ? '+' : ''} 轮 · ${preview}`, earlier: '较早分支未显示。', revisions: '部分问题的较早回答版本未显示，版本计数仅针对当前载入内容。' },
    eyebrow: { publicResearch: '公开研究', recentSessions: '最近会话' },
    advanced: '高级设置', scope: '资料范围', transcript: '对话记录',
    empty: { title: '从一个具体问题开始', detail: '助手会选择直接回答、本站检索或公开网页研究。' },
    warmup: { title: '助手服务正在准备', detail: '输入内容会保留，服务就绪后即可发送。', retry: '重新准备', unavailable: '助手服务暂未就绪' },
    restoring: '正在恢复当前匿名会话…', snapshot: '正在显示此浏览器保存的只读快照，恢复服务端会话后才能继续操作。',
    restore: { title: '当前会话暂时无法恢复', detail: '可以重试恢复，或新建一条空白会话。' }, truncated: '已恢复最近一段对话，较早内容未载入。',
    question: { editContent: '编辑问题内容', cancel: '取消', resend: '重新发送', sendEdit: '发送修改', actions: '问题操作', edit: '编辑问题', editTitle: '编辑并从此处创建新分支' },
    evidence: { summary: (count) => `来源与回答信息（${count}）`, claims: (count) => `查看证据对应（${count}）`, claimSources: '这条结论的来源', locate: (title) => `定位来源：${title}`, sources: '回答来源', web: '外部网页', site: '本站资料', fallbackId: (count) => `来源 ${count}`, verified: '已核验', partial: '部分证据', openWeb: (title) => `在新窗口打开来源：${title}`, openSite: (title) => `查看站内来源：${title}` },
    revision: { label: '回答版本', previous: '查看上一版回答', previousTitle: '上一版', next: '查看下一版回答', nextTitle: '下一版', continue: '从此版本继续' },
    answer: { actions: '回答操作', copied: '已复制回答', copy: '复制回答', copiedTitle: '已复制', regenerate: '重新生成回答', regenerateTitle: '重新生成', helpful: '这个回答有帮助', helpfulTitle: '有帮助', improve: '这个回答需要改进', improveTitle: '需要改进', feedbackFailed: '反馈未提交', feedbackGroup: '选择需要改进的原因', feedbackPrompt: '哪里需要改进？' },
    latest: '回到最新',
    live: { warming: '助手服务正在准备，输入内容会保留', error: '助手服务暂未就绪，可以重新准备', restoring: '正在恢复当前会话', loading: '正在生成回答', cancelled: '已停止生成', completed: '回答已完成' },
    suggestions: '建议提问',
    image: { preview: '待发送图片预览', use: '仅用于本次回答，不写入历史', remove: '移除图片', replace: '更换图片', add: '添加图片', unsupported: '仅支持 JPEG、PNG 或 WebP 图片。', sourceTooLarge: '原图超过 8 MB，请选择更小的图片。', outputTooLarge: '图片压缩后仍然过大，请裁剪后重试。', unreadable: '图片无法读取，请换一张图片重试。' },
    composer: { label: '向研究助手提问', placeholder: '输入一个需要回答或研究的问题', stopLabel: '停止生成', stop: '停止', sendLabel: '发送问题', send: '发送' },
    markdown: { copiedCode: '已复制代码', copyCode: '复制代码', copied: '已复制', table: '回答中的表格' },
  },
  en: {
    launcher: { idle: 'BIAU Port research assistant', opening: 'Opening assistant', warming: 'Preparing assistant', ready: 'Assistant ready', error: 'Assistant awaiting retry' },
    service: { online: 'Research assistant responded', degraded: 'Answer service degraded', error: 'Research service unavailable', ready: 'Search this site and public webpages', warming: 'Preparing assistant service', warmupError: 'Assistant service awaiting retry' },
    modes: { auto: 'Automatic', site: 'This site only', web: 'Public webpages only' },
    feedbackReasons: { incorrect: 'Inaccurate content', unclear: 'Unclear wording', 'missing-sources': 'Missing sources', outdated: 'Outdated information', other: 'Other issue' },
    statuses: { answered: 'Answered', partial: 'Partial evidence', uncertain: 'Insufficient evidence', degraded: 'Fallback answer', blocked: 'Safely blocked' },
    routes: { direct: 'Direct answer', site: 'Site search', web: 'Web research', combined: 'Combined research' },
    evidenceCount: (count) => `${count} evidence item${count === 1 ? '' : 's'}`,
    seconds: (value) => `${value} s`,
    siteSourceCount: (count) => `${count} site source${count === 1 ? '' : 's'}`,
    recovery: {
      recovered: (attempts) => `Recovered automatically (${attempts} attempts)`,
      failed: (label, attempts) => `${label} (${attempts} attempts)`,
      failures: { not_configured: 'Answer model not configured', timeout: 'Answer timed out', network: 'Answer network error', upstream: 'Upstream answer service error', empty: 'Upstream returned no content', invalid: 'Answer format validation failed' },
    },
    loading: { image: 'Reading visible image content...', planning: 'Identifying the public information needed...', site: 'Searching this site...', researching: 'Searching and reading public sources...', evaluating: 'Selecting evidence to cite...', refining: 'Refining the search for more evidence...', answering: 'Composing an evidence-based answer...', recovering: 'Answer service interrupted; retrying...', verifying: 'Checking conclusions and citations...', saving: 'Saving this anonymous record...', web: 'Searching and verifying public webpages...', auto: 'Planning the research...' },
    retry: 'Retry', retryAfter: (seconds) => `In ${seconds} s`, retryRestore: 'Retry restore', retryAction: 'Retry action',
    issues: {
      offline: { title: 'Device is offline', detail: 'Continue this action after the network reconnects.' },
      restored: { title: 'Network reconnected', detail: 'Your question is retained and ready to retry.' },
      branch: { title: 'Branch action incomplete', detail: 'The current conversation path is unchanged. You can retry this action.' },
      revision: { title: 'Regeneration incomplete', detail: 'The current answer version is retained. You can retry generation.' },
      starting: { title: 'Assistant service is still starting', detail: 'Your input is retained. You can prepare the service again shortly.' },
      timeout: { title: 'Research timed out', detail: 'The service did not finish in time. You can retry.' },
      unreachable: { title: 'Research service cannot be reached', detail: 'The service may be starting or the network may be unavailable. Try again shortly.' },
      expired: { title: 'Session expired', detail: 'This anonymous history was removed. Start a new session to continue.' },
      cancelled: { title: 'Generation stopped', detail: 'Your question is retained in this session and can be sent again.' },
      image: { title: 'Image cannot be sent', detail: 'Select a smaller JPEG, PNG or WebP image.' },
      refresh: { title: 'Session state needs refreshing', detail: 'The answer was received. The next question is paused until refresh completes to preserve the correct branch.' },
      history: { title: 'History service unavailable', detail: 'You can still ask questions, but history cannot currently be read or saved.' },
      invalid: { title: 'Unexpected response format', detail: 'The service returned content that cannot be displayed safely. Please retry.' },
      failed: { title: 'Request incomplete', detail: 'The site fallback result is retained. You can retry the research.' },
    },
    rateLimited: { title: 'Too many requests', waiting: (seconds) => `Retry in ${seconds} seconds.`, ready: 'The wait has ended. You can retry.' },
    history: { actions: 'Session actions', open: 'View session history', title: 'Session history', newSession: 'New session', close: 'Close session history', back: 'Return to current session', backTitle: 'Back', loading: 'Loading anonymous history...', unavailable: 'History unavailable', retryDetail: 'You can retry shortly.', emptyTitle: 'No sessions to restore', emptyDetail: 'After a question is answered, the session is retained in this browser.', turns: (count) => `${count} turn${count === 1 ? '' : 's'}`, delete: 'Delete session', deleteLabel: (title) => `Delete session: ${title}`, deleteConfirm: 'Delete this anonymous session and its original records?' },
    fullscreen: { enter: 'Enter fullscreen', exit: 'Exit fullscreen' },
    closeAssistant: 'Close research assistant', close: 'Close', hint: 'Ask about this site or research public webpages.',
    branch: { current: 'Current conversation branch', option: (ordinal, count, earlier, preview) => `Branch ${ordinal} · ${count}${earlier ? '+' : ''} turns · ${preview}`, earlier: 'Earlier branches are not shown.', revisions: 'Earlier answer versions for some questions are not shown. Counts cover only loaded content.' },
    eyebrow: { publicResearch: 'PUBLIC RESEARCH', recentSessions: 'RECENT SESSIONS' },
    advanced: 'Advanced settings', scope: 'Source scope', transcript: 'Conversation transcript',
    empty: { title: 'Start with a specific question', detail: 'The assistant chooses a direct answer, site search or public web research.' },
    warmup: { title: 'Preparing assistant service', detail: 'Your input is retained and can be sent when the service is ready.', retry: 'Prepare again', unavailable: 'Assistant service is not ready' },
    restoring: 'Restoring the current anonymous session...', snapshot: 'Showing a read-only snapshot saved in this browser. Restore the server session to continue.',
    restore: { title: 'Current session cannot be restored yet', detail: 'Retry restoration or start a new empty session.' }, truncated: 'The recent conversation was restored. Earlier content is not loaded.',
    question: { editContent: 'Edit question content', cancel: 'Cancel', resend: 'Resend', sendEdit: 'Send changes', actions: 'Question actions', edit: 'Edit question', editTitle: 'Edit and create a new branch from here' },
    evidence: { summary: (count) => `Sources and answer details (${count})`, claims: (count) => `View evidence mapping (${count})`, claimSources: 'Sources for this claim', locate: (title) => `Locate source: ${title}`, sources: 'Answer sources', web: 'Public webpage', site: 'Site source', fallbackId: (count) => `Source ${count}`, verified: 'Verified', partial: 'Partial evidence', openWeb: (title) => `Open source in a new window: ${title}`, openSite: (title) => `View site source: ${title}` },
    revision: { label: 'Answer versions', previous: 'View previous answer version', previousTitle: 'Previous version', next: 'View next answer version', nextTitle: 'Next version', continue: 'Continue from this version' },
    answer: { actions: 'Answer actions', copied: 'Answer copied', copy: 'Copy answer', copiedTitle: 'Copied', regenerate: 'Regenerate answer', regenerateTitle: 'Regenerate', helpful: 'This answer is helpful', helpfulTitle: 'Helpful', improve: 'This answer needs improvement', improveTitle: 'Needs improvement', feedbackFailed: 'Feedback not submitted', feedbackGroup: 'Select a reason for improvement', feedbackPrompt: 'What needs improvement?' },
    latest: 'Back to latest',
    live: { warming: 'Preparing assistant service; your input is retained', error: 'Assistant service is not ready; prepare again', restoring: 'Restoring the current session', loading: 'Generating an answer', cancelled: 'Generation stopped', completed: 'Answer completed' },
    suggestions: 'Suggested questions',
    image: { preview: 'Image preview to send', use: 'Used for this answer only; not stored in history', remove: 'Remove image', replace: 'Replace image', add: 'Add image', unsupported: 'Only JPEG, PNG or WebP images are supported.', sourceTooLarge: 'The original image exceeds 8 MB. Select a smaller image.', outputTooLarge: 'The compressed image is still too large. Crop it and try again.', unreadable: 'The image could not be read. Try another image.' },
    composer: { label: 'Ask the research assistant', placeholder: 'Enter a question to answer or research', stopLabel: 'Stop generation', stop: 'Stop', sendLabel: 'Send question', send: 'Send' },
    markdown: { copiedCode: 'Code copied', copyCode: 'Copy code', copied: 'Copied', table: 'Table in the answer' },
  },
}
