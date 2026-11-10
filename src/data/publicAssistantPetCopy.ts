import type { Activity } from '@lingban/pet-runtime'
import type { SiteLanguage } from '../utils/siteLanguage'

export const publicAssistantPetCopy: Record<SiteLanguage, {
  activities: Record<Activity, string>
  unread: (count: number) => string
  open: string
  close: string
  title: string
  options: string
  dockLeft: string
  dockRight: string
  reset: string
  hide: string
  show: string
  opening: string
  reviewResult: string
  bubbles: Partial<Record<Activity, string>>
}> = {
  zh: {
    activities: { idle: '暂无新结果', thinking: '正在思考', working: '正在处理', needsInput: '需要你回应', review: '结果待检查', ready: '有新的结果', blocked: '任务遇到问题', sleepy: '正在休息' },
    unread: count => `${count} 个结果未读`,
    open: '打开研究助手', close: '收起对话', title: '青珑 · 研究助手',
    options: '青珑设置', dockLeft: '移至左侧', dockRight: '移至右侧', reset: '恢复默认位置',
    hide: '隐藏青珑', show: '显示青珑', opening: '正在打开研究助手…',
    reviewResult: '整理好了，有些信息待确认',
    bubbles: { thinking: '正在思考你的问题', working: '正在整理资料', review: '正在检查结果', needsInput: '需要你补充一点信息', ready: '整理好了，点我查看', blocked: '这次没完成，点我查看' },
  },
  en: {
    activities: { idle: 'No new results', thinking: 'Thinking', working: 'Working', needsInput: 'Needs your input', review: 'Result needs review', ready: 'New result available', blocked: 'Task needs attention', sleepy: 'Resting' },
    unread: count => `${count} unread ${count === 1 ? 'result' : 'results'}`,
    open: 'Open research assistant', close: 'Collapse conversation', title: 'Qinglong · Research assistant',
    options: 'Qinglong settings', dockLeft: 'Move to left', dockRight: 'Move to right', reset: 'Reset position',
    hide: 'Hide Qinglong', show: 'Show Qinglong', opening: 'Opening research assistant…',
    reviewResult: 'The result is ready; some details need review',
    bubbles: { thinking: 'Thinking about your question', working: 'Gathering information', review: 'Checking the result', needsInput: 'A little more information is needed', ready: 'The result is ready', blocked: 'This attempt needs your attention' },
  },
}
