import type { Activity } from '@lingban/pet-runtime'
import type { SiteLanguage } from '../utils/siteLanguage'

export const publicAssistantPetCopy: Record<SiteLanguage, {
  activities: Record<Activity, string>
  unread: (count: number) => string
}> = {
  zh: {
    activities: { idle: '暂无新结果', thinking: '正在思考', working: '正在处理', needsInput: '需要你回应', review: '结果待检查', ready: '有新的结果', blocked: '任务遇到问题', sleepy: '正在休息' },
    unread: count => `${count} 个结果未读`,
  },
  en: {
    activities: { idle: 'No new results', thinking: 'Thinking', working: 'Working', needsInput: 'Needs your input', review: 'Result needs review', ready: 'New result available', blocked: 'Task needs attention', sleepy: 'Resting' },
    unread: count => `${count} unread ${count === 1 ? 'result' : 'results'}`,
  },
}
