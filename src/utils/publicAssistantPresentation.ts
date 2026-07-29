import type {
  PublicAssistantRecoveryFailureClass,
  PublicAssistantRecoveryMeta,
} from './publicAssistantApi'

const RECOVERY_FAILURE_LABELS: Record<PublicAssistantRecoveryFailureClass, string> = {
  not_configured: '回答模型尚未配置',
  timeout: '回答超时',
  network: '回答网络异常',
  upstream: '上游回答服务异常',
  empty: '上游未返回内容',
  invalid: '回答格式未通过校验',
}

export function formatPublicAssistantRecoveryLabel(recovery?: PublicAssistantRecoveryMeta) {
  if (!recovery || recovery.state === 'none') return ''
  if (recovery.state === 'recovered') return `已自动恢复（${recovery.attempts} 次尝试）`
  if (!recovery.failureClass) return ''
  return `${RECOVERY_FAILURE_LABELS[recovery.failureClass]}（${recovery.attempts} 次尝试）`
}
