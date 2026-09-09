import type { PublicAssistantRecoveryMeta } from './publicAssistantApi'
import { publicAssistantInterfaceCopy } from '../data/publicAssistantInterfaceCopy'
import type { SiteLanguage } from './siteLanguage'

export function formatPublicAssistantRecoveryLabel(recovery?: PublicAssistantRecoveryMeta, language: SiteLanguage = 'zh') {
  if (!recovery || recovery.state === 'none') return ''
  const copy = publicAssistantInterfaceCopy[language]
  if (recovery.state === 'recovered') return copy.recovery.recovered(recovery.attempts)
  if (!recovery.failureClass) return ''
  return copy.recovery.failed(copy.recovery.failures[recovery.failureClass], recovery.attempts)
}
