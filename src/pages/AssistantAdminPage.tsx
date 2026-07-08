import { useState, type FormEvent } from 'react'
import {
  ASSISTANT_STORAGE_KEYS,
  normalizeAssistantInternalKnowledgeDocument,
  normalizeAssistantInternalKnowledgeDocuments,
  normalizeAssistantInternalKnowledgeSyncRun,
  normalizeAssistantInvites,
  normalizeAssistantMember,
  normalizeAssistantModelChannels,
  normalizeAssistantRagAdminStatus,
  normalizeAssistantRagSyncResult,
  normalizeAssistantUsageSummaries,
  summarizeAssistantKnowledgeOps,
  type AssistantInternalKnowledgeDocument,
  type AssistantInternalKnowledgeStatus,
  type AssistantInternalKnowledgeSyncRun,
  type AssistantInviteSummary,
  type AssistantMemberProfile,
  type AssistantModelChannelSummary,
  type AssistantRagAdminStatus,
  type AssistantRagCollectionHealth,
  type AssistantRagSyncResult,
  type AssistantUsageSummary,
} from '../data/assistant'
import { ASSISTANT_API_ENV_NAMES, INTERNAL_ASSISTANT_API_BASE } from '../utils/assistantApi'

const API_BASE = INTERNAL_ASSISTANT_API_BASE

interface AdminSummary {
  members: number
  disabledMembers: number
  invites: number
  openInvites: number
  revokedInvites: number
  expiredInvites: number
  exhaustedInvites: number
  messages: number
  usage: number
  internalKnowledgeDocuments: number
  lastInternalKnowledgeSync?: AssistantInternalKnowledgeSyncRun | null
  modelChannels: AssistantModelChannelSummary[]
}

interface InviteFormState {
  code: string
  label: string
  role: 'MEMBER' | 'ADMIN'
  dailyQuota: string
  maxUses: string
}

interface KnowledgeFormState {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  tagsText: string
  status: AssistantInternalKnowledgeStatus
  sourceType: string
  safetyNotes: string
}

type AdminTab = 'overview' | 'invites' | 'members' | 'knowledge' | 'usage' | 'safety'

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: '概览' },
  { id: 'invites', label: '邀请' },
  { id: 'members', label: '成员' },
  { id: 'knowledge', label: '知识' },
  { id: 'usage', label: '用量' },
  { id: 'safety', label: '边界' },
]

const emptySummary: AdminSummary = {
  members: 0,
  disabledMembers: 0,
  invites: 0,
  openInvites: 0,
  revokedInvites: 0,
  expiredInvites: 0,
  exhaustedInvites: 0,
  messages: 0,
  usage: 0,
  internalKnowledgeDocuments: 0,
  lastInternalKnowledgeSync: null,
  modelChannels: [],
}

const defaultInviteForm: InviteFormState = {
  code: '',
  label: '内部邀请码',
  role: 'MEMBER',
  dailyQuota: '24',
  maxUses: '1',
}

const defaultKnowledgeForm: KnowledgeFormState = {
  id: '',
  slug: '',
  title: '',
  summary: '',
  body: '',
  tagsText: '',
  status: 'DRAFT',
  sourceType: 'manual',
  safetyNotes: '',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readStoredAdminToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(ASSISTANT_STORAGE_KEYS.adminToken) ?? ''
}

function formatModelChannelState(channel?: AssistantModelChannelSummary | null) {
  if (!channel) return '默认模型通道'
  if (!channel.isActive) return '已停用'
  if (!channel.configured) return '未配置'
  return channel.isDefault ? '默认可用' : '可用'
}

function normalizeSummary(value: unknown): AdminSummary | null {
  if (!isRecord(value)) return null
  const {
    members,
    disabledMembers,
    invites,
    openInvites,
    revokedInvites,
    expiredInvites,
    exhaustedInvites,
    messages,
    usage,
    internalKnowledgeDocuments,
    lastInternalKnowledgeSync,
    modelChannels,
  } = value
  if (
    typeof members !== 'number' ||
    typeof invites !== 'number' ||
    typeof messages !== 'number' ||
    typeof usage !== 'number'
  ) {
    return null
  }
  return {
    members,
    disabledMembers: typeof disabledMembers === 'number' ? disabledMembers : 0,
    invites,
    openInvites: typeof openInvites === 'number' ? openInvites : 0,
    revokedInvites: typeof revokedInvites === 'number' ? revokedInvites : 0,
    expiredInvites: typeof expiredInvites === 'number' ? expiredInvites : 0,
    exhaustedInvites: typeof exhaustedInvites === 'number' ? exhaustedInvites : 0,
    messages,
    usage,
    internalKnowledgeDocuments: typeof internalKnowledgeDocuments === 'number' ? internalKnowledgeDocuments : 0,
    lastInternalKnowledgeSync: normalizeAssistantInternalKnowledgeSyncRun(lastInternalKnowledgeSync),
    modelChannels: normalizeAssistantModelChannels(modelChannels),
  }
}

function normalizeMembers(value: unknown): AssistantMemberProfile[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantMember(item))
    .filter((item): item is AssistantMemberProfile => item !== null)
}

function getErrorCode(value: unknown) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : ''
}

function explainAdminError(status: number, errorCode: string) {
  if (status === 401 || errorCode === 'missing-admin-token') return 'admin token 缺失或不匹配。'
  if (status === 503 || errorCode === 'database-not-configured') return '后端数据库尚未配置，管理接口暂不可用。'
  if (errorCode === 'missing-code') return '请输入邀请码。'
  if (errorCode === 'unsupported-model-channel') return '模型渠道不存在或未在服务端配置。'
  if (errorCode === 'member-not-found') return '成员不存在或已被删除。'
  if (errorCode === 'invite-not-found') return '邀请码不存在或已被删除。'
  if (errorCode === 'unsupported-invite-revocation') return '邀请码撤销参数不正确。'
  if (errorCode === 'unsupported-member-status') return '成员状态参数不正确。'
  if (errorCode === 'missing-knowledge-document-fields') return '内部知识文档需要标题和正文。'
  if (errorCode === 'knowledge-slug-exists') return '内部知识文档 slug 已存在。'
  if (errorCode === 'knowledge-document-not-found') return '内部知识文档不存在或已被删除。'
  return `管理接口返回 ${status}，请检查 API 服务。`
}

function formatAdminDate(value?: string | null) {
  if (!value) return '未设置'
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const inviteStatusLabels: Record<AssistantInviteSummary['status'], string> = {
  OPEN: '可用',
  EXHAUSTED: '已用尽',
  EXPIRED: '已过期',
  REVOKED: '已撤销',
}

const knowledgeStatusLabels: Record<AssistantInternalKnowledgeStatus, string> = {
  DRAFT: '草稿',
  REVIEWED: '已审核',
  ACTIVE: '已启用',
  ARCHIVED: '已归档',
}

const syncDiagnosticLabels: Record<string, string> = {
  mode: '模式',
  scope: '范围',
  reason: '原因',
  configured: 'RAG 已配置',
  syncConfigured: '同步 token 已配置',
  accepted: '已接收',
  documentCount: '文档数',
  chunkCount: 'Chunk 数',
  entityCount: '实体数',
  relationCount: '关系数',
  issueCount: '问题数',
  httpStatus: 'HTTP 状态',
  sourceName: '来源',
  sourceChecksum: '来源摘要',
}

function splitTags(value: string) {
  return value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16)
}

function formatDiagnosticValue(value: string | number | boolean) {
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

function formatKnowledgeDocumentSyncState(document: AssistantInternalKnowledgeDocument) {
  if (document.status !== 'REVIEWED' && document.status !== 'ACTIVE') return '不参与同步'
  if (!document.lastSyncedAt) return '待同步'
  const updatedAt = document.updatedAt ? Date.parse(document.updatedAt) : Number.NaN
  const syncedAt = Date.parse(document.lastSyncedAt)
  if (!Number.isNaN(updatedAt) && !Number.isNaN(syncedAt) && updatedAt > syncedAt) return '内容已变更'
  return '已同步'
}

function formatRagCollection(collection?: AssistantRagCollectionHealth) {
  if (!collection) return '未返回'
  return `${collection.vectorReady ? 'ready' : 'empty'} · ${collection.pointCount} chunks`
}

export function AssistantAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [adminToken, setAdminToken] = useState(() => readStoredAdminToken())
  const [draftToken, setDraftToken] = useState(() => readStoredAdminToken())
  const [summary, setSummary] = useState<AdminSummary>(emptySummary)
  const [summaryStatus, setSummaryStatus] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')
  const [invitesStatus, setInvitesStatus] = useState('')
  const [membersStatus, setMembersStatus] = useState('')
  const [knowledgeStatus, setKnowledgeStatus] = useState('')
  const [ragStatusText, setRagStatusText] = useState('')
  const [usageStatus, setUsageStatus] = useState('')
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [isLoadingInvites, setIsLoadingInvites] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false)
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false)
  const [isSyncingKnowledge, setIsSyncingKnowledge] = useState(false)
  const [isLoadingRagStatus, setIsLoadingRagStatus] = useState(false)
  const [isSyncingPublicRag, setIsSyncingPublicRag] = useState(false)
  const [isLoadingUsage, setIsLoadingUsage] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState('')
  const [updatingInviteId, setUpdatingInviteId] = useState('')
  const [inviteForm, setInviteForm] = useState<InviteFormState>(defaultInviteForm)
  const [knowledgeForm, setKnowledgeForm] = useState<KnowledgeFormState>(defaultKnowledgeForm)
  const [invites, setInvites] = useState<AssistantInviteSummary[]>([])
  const [members, setMembers] = useState<AssistantMemberProfile[]>([])
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<AssistantInternalKnowledgeDocument[]>([])
  const [lastKnowledgeSyncRun, setLastKnowledgeSyncRun] = useState<AssistantInternalKnowledgeSyncRun | null>(null)
  const [ragAdminStatus, setRagAdminStatus] = useState<AssistantRagAdminStatus | null>(null)
  const [lastPublicRagSync, setLastPublicRagSync] = useState<AssistantRagSyncResult | null>(null)
  const [modelChannels, setModelChannels] = useState<AssistantModelChannelSummary[]>([])
  const [usageLogs, setUsageLogs] = useState<AssistantUsageSummary[]>([])
  const knowledgeOps = summarizeAssistantKnowledgeOps(knowledgeDocuments, lastKnowledgeSyncRun)
  const syncDiagnosticEntries = Object.entries(lastKnowledgeSyncRun?.diagnostic ?? {})
  const ragDiagnosticEntries = Object.entries(ragAdminStatus?.diagnostic ?? {})
  const publicRagSyncDiagnosticEntries = Object.entries(lastPublicRagSync?.diagnostic ?? {})

  const saveAdminToken = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = draftToken.trim()
    setAdminToken(token)
    if (token) {
      window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.adminToken, token)
      setSummaryStatus('admin token 已保存在当前浏览器。')
    } else {
      window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.adminToken)
      setSummaryStatus('admin token 已清除。')
    }
  }

  const clearAdminToken = () => {
    setDraftToken('')
    setAdminToken('')
    window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.adminToken)
    setSummaryStatus('admin token 已清除。')
  }

  const loadSummary = async () => {
    if (!API_BASE) {
      setSummaryStatus(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法调用管理 API。`)
      return
    }
    if (!adminToken) {
      setSummaryStatus('请先保存 admin token。')
      return
    }

    setIsLoadingSummary(true)
    setSummaryStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setSummaryStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }

      const nextSummary = normalizeSummary(payload)
      if (!nextSummary) {
        setSummaryStatus('管理 API 返回的摘要格式不完整。')
        return
      }

      setSummary(nextSummary)
      setModelChannels(nextSummary.modelChannels)
      setLastKnowledgeSyncRun(nextSummary.lastInternalKnowledgeSync ?? null)
      setSummaryStatus('摘要已更新。')
    } catch {
      setSummaryStatus('无法连接管理 API。')
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const loadMembers = async () => {
    if (!API_BASE) {
      setMembersStatus(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法调用成员 API。`)
      return
    }
    if (!adminToken) {
      setMembersStatus('请先保存 admin token。')
      return
    }

    setIsLoadingMembers(true)
    setMembersStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/members`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setMembersStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }

      if (!isRecord(payload)) {
        setMembersStatus('成员 API 返回格式不完整。')
        return
      }

      setMembers(normalizeMembers(payload.members))
      setModelChannels(normalizeAssistantModelChannels(payload.modelChannels))
      setMembersStatus('成员列表已更新。')
    } catch {
      setMembersStatus('无法连接成员 API。')
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const loadUsage = async () => {
    if (!API_BASE) {
      setUsageStatus(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法调用用量 API。`)
      return
    }
    if (!adminToken) {
      setUsageStatus('请先保存 admin token。')
      return
    }

    setIsLoadingUsage(true)
    setUsageStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/usage`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setUsageStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }
      if (!isRecord(payload)) {
        setUsageStatus('用量 API 返回格式不完整。')
        return
      }

      setUsageLogs(normalizeAssistantUsageSummaries(payload.usage))
      setUsageStatus('最近用量已更新。')
    } catch {
      setUsageStatus('无法连接用量 API。')
    } finally {
      setIsLoadingUsage(false)
    }
  }

  const loadInvites = async () => {
    if (!API_BASE) {
      setInvitesStatus(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法调用邀请码 API。`)
      return
    }
    if (!adminToken) {
      setInvitesStatus('请先保存 admin token。')
      return
    }

    setIsLoadingInvites(true)
    setInvitesStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/invites`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setInvitesStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }
      if (!isRecord(payload)) {
        setInvitesStatus('邀请码 API 返回格式不完整。')
        return
      }

      setInvites(normalizeAssistantInvites(payload.invites))
      setInvitesStatus('邀请码列表已更新。')
    } catch {
      setInvitesStatus('无法连接邀请码 API。')
    } finally {
      setIsLoadingInvites(false)
    }
  }

  const loadKnowledgeDocuments = async () => {
    if (!API_BASE) {
      setKnowledgeStatus(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法调用内部知识 API。`)
      return
    }
    if (!adminToken) {
      setKnowledgeStatus('请先保存 admin token。')
      return
    }

    setIsLoadingKnowledge(true)
    setKnowledgeStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/knowledge-documents`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setKnowledgeStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }
      if (!isRecord(payload)) {
        setKnowledgeStatus('内部知识 API 返回格式不完整。')
        return
      }

      setKnowledgeDocuments(normalizeAssistantInternalKnowledgeDocuments(payload.documents))
      setLastKnowledgeSyncRun(normalizeAssistantInternalKnowledgeSyncRun(payload.lastSyncRun))
      setKnowledgeStatus('内部知识文档已更新。')
    } catch {
      setKnowledgeStatus('无法连接内部知识 API。')
    } finally {
      setIsLoadingKnowledge(false)
    }
  }

  const loadRagStatus = async () => {
    if (!API_BASE) {
      setRagStatusText(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法调用 RAG 管理 API。`)
      return
    }
    if (!adminToken) {
      setRagStatusText('请先保存 admin token。')
      return
    }

    setIsLoadingRagStatus(true)
    setRagStatusText('')
    try {
      const response = await fetch(`${API_BASE}/admin/rag/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setRagStatusText(explainAdminError(response.status, getErrorCode(payload)))
        return
      }

      const status = normalizeAssistantRagAdminStatus(payload)
      if (!status) {
        setRagStatusText('RAG 管理 API 返回格式不完整。')
        return
      }

      setRagAdminStatus(status)
      setRagStatusText(status.health?.vectorReady ? 'RAG 状态已更新：向量库 ready。' : 'RAG 状态已更新：向量库尚未 ready。')
    } catch {
      setRagStatusText('无法连接 RAG 管理 API。')
    } finally {
      setIsLoadingRagStatus(false)
    }
  }

  const saveKnowledgeDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!API_BASE || !adminToken) {
      setKnowledgeStatus('请先保存 admin token 并确认 API base 已配置。')
      return
    }

    setIsSavingKnowledge(true)
    setKnowledgeStatus('')
    const isEditing = Boolean(knowledgeForm.id)
    try {
      const response = await fetch(
        `${API_BASE}/admin/knowledge-documents${isEditing ? `/${knowledgeForm.id}` : ''}`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug: knowledgeForm.slug,
            title: knowledgeForm.title,
            summary: knowledgeForm.summary,
            body: knowledgeForm.body,
            tags: splitTags(knowledgeForm.tagsText),
            status: knowledgeForm.status,
            sourceType: knowledgeForm.sourceType,
            safetyNotes: knowledgeForm.safetyNotes,
          }),
        },
      )
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setKnowledgeStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }
      if (!isRecord(payload)) {
        setKnowledgeStatus('内部知识保存 API 返回格式不完整。')
        return
      }

      const document = normalizeAssistantInternalKnowledgeDocument(payload.document)
      if (!document) {
        setKnowledgeStatus('内部知识保存 API 返回的文档格式不完整。')
        return
      }

      setKnowledgeDocuments((current) =>
        [document, ...current.filter((item) => item.id !== document.id)].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      )
      setKnowledgeForm(defaultKnowledgeForm)
      setKnowledgeStatus(`内部知识文档已${isEditing ? '更新' : '创建'}：${document.title}`)
      void loadSummary()
    } catch {
      setKnowledgeStatus('无法连接内部知识保存 API。')
    } finally {
      setIsSavingKnowledge(false)
    }
  }

  const editKnowledgeDocument = (document: AssistantInternalKnowledgeDocument) => {
    setKnowledgeForm({
      id: document.id,
      slug: document.slug,
      title: document.title,
      summary: document.summary,
      body: document.body,
      tagsText: document.tags.join('\n'),
      status: document.status,
      sourceType: document.sourceType,
      safetyNotes: document.safetyNotes,
    })
    setKnowledgeStatus(`正在编辑：${document.title}`)
  }

  const syncKnowledgeDocuments = async () => {
    if (!API_BASE || !adminToken) {
      setKnowledgeStatus('请先保存 admin token 并确认 API base 已配置。')
      return
    }

    setIsSyncingKnowledge(true)
    setKnowledgeStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/knowledge/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setKnowledgeStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }
      if (!isRecord(payload)) {
        setKnowledgeStatus('内部知识同步 API 返回格式不完整。')
        return
      }

      const syncRun = normalizeAssistantInternalKnowledgeSyncRun(payload.syncRun)
      setLastKnowledgeSyncRun(syncRun)
      setKnowledgeStatus(payload.accepted === true ? '内部知识已提交同步。' : '内部知识同步已记录为本地计划/跳过，等待 RAG sync 配置。')
      void loadKnowledgeDocuments()
    } catch {
      setKnowledgeStatus('无法连接内部知识同步 API。')
    } finally {
      setIsSyncingKnowledge(false)
    }
  }

  const syncPublicRagKnowledge = async () => {
    if (!API_BASE) {
      setRagStatusText(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法调用 RAG 管理 API。`)
      return
    }
    if (!adminToken) {
      setRagStatusText('请先保存 admin token。')
      return
    }

    setIsSyncingPublicRag(true)
    setRagStatusText('')
    try {
      const response = await fetch(`${API_BASE}/admin/rag/sync-public`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setRagStatusText(explainAdminError(response.status, getErrorCode(payload)))
        return
      }

      const syncPayload = isRecord(payload) ? payload.sync : null
      const sync = normalizeAssistantRagSyncResult(syncPayload)
      if (!sync) {
        setRagStatusText('公开知识库同步 API 返回格式不完整。')
        return
      }

      setLastPublicRagSync(sync)
      if (sync.health) {
        setRagAdminStatus((current) => ({
          configured: current?.configured ?? true,
          syncConfigured: current?.syncConfigured ?? true,
          health: sync.health,
          diagnostic: sync.diagnostic ?? current?.diagnostic ?? null,
        }))
      }
      setRagStatusText(sync.accepted ? '公开知识库已同步到 RAG。' : '公开知识库同步未完成，请查看低敏诊断。')
    } catch {
      setRagStatusText('无法连接公开知识库同步 API。')
    } finally {
      setIsSyncingPublicRag(false)
    }
  }

  const updateMemberModelChannel = async (memberId: string, modelChannelId: string) => {
    if (!API_BASE || !adminToken) {
      setMembersStatus('请先保存 admin token 并确认 API base 已配置。')
      return
    }

    setUpdatingMemberId(memberId)
    setMembersStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelChannelId }),
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setMembersStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }
      if (!isRecord(payload)) {
        setMembersStatus('成员更新 API 返回格式不完整。')
        return
      }

      const updated = normalizeAssistantMember(payload.member)
      if (!updated) {
        setMembersStatus('成员更新 API 返回的成员格式不完整。')
        return
      }

      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)))
      setModelChannels(normalizeAssistantModelChannels(payload.modelChannels))
      setMembersStatus(`已为 ${updated.name} 分配模型渠道：${updated.modelChannel?.label ?? '默认模型通道'}（${formatModelChannelState(updated.modelChannel)}）`)
    } catch {
      setMembersStatus('无法连接成员更新 API。')
    } finally {
      setUpdatingMemberId('')
    }
  }

  const updateMemberStatus = async (memberId: string, status: 'ACTIVE' | 'DISABLED') => {
    if (!API_BASE || !adminToken) {
      setMembersStatus('请先保存 admin token 并确认 API base 已配置。')
      return
    }

    setUpdatingMemberId(memberId)
    setMembersStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setMembersStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }
      if (!isRecord(payload)) {
        setMembersStatus('成员更新 API 返回格式不完整。')
        return
      }

      const updated = normalizeAssistantMember(payload.member)
      if (!updated) {
        setMembersStatus('成员更新 API 返回的成员格式不完整。')
        return
      }

      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)))
      setMembersStatus(`${updated.name} 已${status === 'DISABLED' ? '禁用' : '启用'}。`)
      void loadSummary()
    } catch {
      setMembersStatus('无法连接成员更新 API。')
    } finally {
      setUpdatingMemberId('')
    }
  }

  const updateInviteRevocation = async (inviteId: string, revoked: boolean) => {
    if (!API_BASE || !adminToken) {
      setInvitesStatus('请先保存 admin token 并确认 API base 已配置。')
      return
    }

    setUpdatingInviteId(inviteId)
    setInvitesStatus('')
    try {
      const response = await fetch(`${API_BASE}/admin/invites/${inviteId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ revoked }),
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setInvitesStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }
      if (!isRecord(payload)) {
        setInvitesStatus('邀请码更新 API 返回格式不完整。')
        return
      }

      const updated = normalizeAssistantInvites([payload.invite])[0]
      if (!updated) {
        setInvitesStatus('邀请码更新 API 返回格式不完整。')
        return
      }

      setInvites((current) => current.map((invite) => (invite.id === updated.id ? updated : invite)))
      setInvitesStatus(`邀请码已${revoked ? '撤销' : '恢复'}：${updated.label}`)
      void loadSummary()
    } catch {
      setInvitesStatus('无法连接邀请码更新 API。')
    } finally {
      setUpdatingInviteId('')
    }
  }

  const updateInviteField = <K extends keyof InviteFormState>(field: K, value: InviteFormState[K]) => {
    setInviteForm((current) => ({ ...current, [field]: value }))
  }

  const updateKnowledgeField = <K extends keyof KnowledgeFormState>(field: K, value: KnowledgeFormState[K]) => {
    setKnowledgeForm((current) => ({ ...current, [field]: value }))
  }

  const createInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = inviteForm.code.trim()
    if (!code) {
      setInviteStatus('请输入邀请码。')
      return
    }
    if (!API_BASE) {
      setInviteStatus(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法创建邀请码。`)
      return
    }
    if (!adminToken) {
      setInviteStatus('请先保存 admin token。')
      return
    }

    setIsCreatingInvite(true)
    setInviteStatus('')

    try {
      const response = await fetch(`${API_BASE}/admin/invites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          label: inviteForm.label.trim() || '内部邀请码',
          role: inviteForm.role,
          dailyQuota: Number(inviteForm.dailyQuota || 24),
          maxUses: Number(inviteForm.maxUses || 1),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as unknown
      if (!response.ok) {
        setInviteStatus(explainAdminError(response.status, getErrorCode(payload)))
        return
      }

      const invite = isRecord(payload) ? normalizeAssistantInvites([payload.invite])[0] : null
      const label = invite?.label ?? inviteForm.label
      if (invite) {
        setInvites((current) => [invite, ...current.filter((item) => item.id !== invite.id)])
      }
      setInviteStatus(`邀请码已创建：${label}`)
      setInviteForm({ ...defaultInviteForm, label: inviteForm.label || defaultInviteForm.label })
      void loadSummary()
    } catch {
      setInviteStatus('无法连接管理 API。')
    } finally {
      setIsCreatingInvite(false)
    }
  }

  return (
    <main className="assistant-admin-page page-stack">
      <section className="assistant-admin-shell">
        <header className="assistant-admin-hero">
          <p className="section-subtitle">HIDDEN ADMIN</p>
          <h1 className="section-title">内部助手管理页</h1>
          <p className="section-description">
            面向内部助手的 owner 工作台：管理连接、邀请、成员渠道、内部知识、同步状态和最近用量。
          </p>
        </header>

        <nav className="assistant-admin-tabs" aria-label="内部助手管理分区" role="tablist">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={activeTab === tab.id ? 'is-active' : ''}
              aria-selected={activeTab === tab.id}
              aria-controls={`assistant-admin-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section
          id="assistant-admin-panel-overview"
          className="assistant-admin-grid assistant-admin-grid--single"
          role="tabpanel"
          hidden={activeTab !== 'overview'}
        >
          <article className="assistant-admin-card">
            <h2>API 连接</h2>
            <p>admin token 只保存在当前浏览器本地，用于调用隐藏管理接口。</p>

            <form className="assistant-admin-form" onSubmit={saveAdminToken}>
              <label className="assistant-field">
                <span>Admin token</span>
                <input
                  type="password"
                  value={draftToken}
                  onChange={(event) => setDraftToken(event.target.value)}
                  placeholder="粘贴 ADMIN_TOKEN"
                  autoComplete="off"
                />
              </label>
              <div className="assistant-admin-actions">
                <button type="submit">保存 token</button>
                <button type="button" onClick={clearAdminToken}>
                  清除
                </button>
              </div>
            </form>

            <div className="assistant-admin-actions">
              <button type="button" onClick={() => void loadSummary()} disabled={isLoadingSummary || !adminToken}>
                {isLoadingSummary ? '读取中…' : '刷新摘要'}
              </button>
            </div>

            {summaryStatus && <p className="assistant-status-text">{summaryStatus}</p>}

            <div className="assistant-admin-summary" aria-label="管理摘要">
              <span>
                <strong>{summary.members}</strong>
                成员
              </span>
              <span>
                <strong>{summary.disabledMembers}</strong>
                已禁用
              </span>
              <span>
                <strong>{summary.invites}</strong>
                邀请码
              </span>
              <span>
                <strong>{summary.openInvites}</strong>
                可用邀请
              </span>
              <span>
                <strong>{summary.revokedInvites}</strong>
                已撤销邀请
              </span>
              <span>
                <strong>{summary.messages}</strong>
                消息
              </span>
              <span>
                <strong>{summary.usage}</strong>
                用量
              </span>
              <span>
                <strong>{summary.internalKnowledgeDocuments}</strong>
                内部知识
              </span>
            </div>
          </article>
        </section>

        <section
          id="assistant-admin-panel-invites"
          className="assistant-admin-grid assistant-admin-grid--single"
          role="tabpanel"
          hidden={activeTab !== 'invites'}
        >
          <article className="assistant-admin-card">
            <h2>创建邀请码</h2>
            <p>用于少量内部小伙伴兑换成员 token，不开放公共注册入口。</p>

            <form className="assistant-admin-form" onSubmit={createInvite}>
              <label className="assistant-field">
                <span>邀请码</span>
                <input
                  type="text"
                  value={inviteForm.code}
                  onChange={(event) => updateInviteField('code', event.target.value)}
                  placeholder="BIAU-PORT-ALPHA"
                  autoComplete="off"
                />
              </label>
              <label className="assistant-field">
                <span>标签</span>
                <input
                  type="text"
                  value={inviteForm.label}
                  onChange={(event) => updateInviteField('label', event.target.value)}
                  placeholder="内部邀请码"
                  maxLength={80}
                />
              </label>
              <div className="assistant-form-grid">
                <label className="assistant-field">
                  <span>角色</span>
                  <select
                    value={inviteForm.role}
                    onChange={(event) => updateInviteField('role', event.target.value === 'ADMIN' ? 'ADMIN' : 'MEMBER')}
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>
                <label className="assistant-field">
                  <span>每日额度</span>
                  <input
                    type="number"
                    min="1"
                    value={inviteForm.dailyQuota}
                    onChange={(event) => updateInviteField('dailyQuota', event.target.value)}
                  />
                </label>
                <label className="assistant-field">
                  <span>可用次数</span>
                  <input
                    type="number"
                    min="1"
                    value={inviteForm.maxUses}
                    onChange={(event) => updateInviteField('maxUses', event.target.value)}
                  />
                </label>
              </div>
              <button type="submit" disabled={isCreatingInvite || !adminToken}>
                {isCreatingInvite ? '创建中…' : '创建邀请码'}
              </button>
            </form>

            {inviteStatus && <p className="assistant-status-text">{inviteStatus}</p>}

            <div className="assistant-admin-actions">
              <button type="button" onClick={() => void loadInvites()} disabled={isLoadingInvites || !adminToken}>
                {isLoadingInvites ? '读取中…' : '刷新邀请码'}
              </button>
            </div>
            {invitesStatus && <p className="assistant-status-text">{invitesStatus}</p>}
            <div className="assistant-admin-table" aria-label="邀请码列表">
              {invites.map((invite) => (
                <div key={invite.id} className="assistant-admin-row assistant-admin-row--member">
                  <div>
                    <strong>{invite.label}</strong>
                    <span>
                      {invite.role} · {inviteStatusLabels[invite.status]} · {invite.usedCount}/{invite.maxUses} 次
                    </span>
                    <span>
                      创建：{formatAdminDate(invite.createdAt)} · 过期：{formatAdminDate(invite.expiresAt)}
                    </span>
                  </div>
                  <div className="assistant-admin-actions">
                    <button
                      type="button"
                      disabled={updatingInviteId === invite.id}
                      onClick={() => void updateInviteRevocation(invite.id, invite.status !== 'REVOKED')}
                    >
                      {invite.status === 'REVOKED' ? '恢复' : '撤销'}
                    </button>
                  </div>
                </div>
              ))}
              {invites.length === 0 && <p className="assistant-status-text">刷新后会显示最近的邀请码；不会展示明文邀请码或 hash。</p>}
            </div>
          </article>
        </section>

        <section
          id="assistant-admin-panel-members"
          className="assistant-admin-grid assistant-admin-grid--single"
          role="tabpanel"
          hidden={activeTab !== 'members'}
        >
          <article className="assistant-admin-card">
            <h2>成员模型渠道</h2>
            <p>为每个内部成员分配服务端已配置的模型渠道；这里只显示渠道名称、模型和 provider，不展示 key 或 base URL。</p>
            <div className="assistant-admin-actions">
              <button type="button" onClick={() => void loadMembers()} disabled={isLoadingMembers || !adminToken}>
                {isLoadingMembers ? '读取中…' : '刷新成员'}
              </button>
            </div>
            {membersStatus && <p className="assistant-status-text">{membersStatus}</p>}
            <div className="assistant-admin-table" aria-label="成员模型渠道列表">
              {members.map((member) => (
                <div key={member.id} className="assistant-admin-row assistant-admin-row--member">
                  <div>
                    <strong>{member.name}</strong>
                    <span>
                      {member.role} · {member.status ?? 'ACTIVE'} · {member.dailyQuota} / day
                    </span>
                    <span>
                      当前渠道：{member.modelChannel?.label ?? '默认模型通道'} / {member.modelChannel?.model ?? 'fallback'} · {formatModelChannelState(member.modelChannel)}
                    </span>
                  </div>
                  <label className="assistant-field assistant-field--compact">
                    <span>模型渠道</span>
                    <select
                      value={member.modelChannel?.id ?? 'default'}
                      disabled={updatingMemberId === member.id || modelChannels.length === 0}
                      onChange={(event) => void updateMemberModelChannel(member.id, event.target.value)}
                    >
                      {member.modelChannel && !modelChannels.some((channel) => channel.id === member.modelChannel?.id) && (
                        <option value={member.modelChannel.id} disabled>
                          {member.modelChannel.label} · {member.modelChannel.model}（{formatModelChannelState(member.modelChannel)}）
                        </option>
                      )}
                      {modelChannels.map((channel) => (
                        <option key={channel.id} value={channel.id} disabled={!channel.isActive}>
                          {channel.label} · {channel.model}（{formatModelChannelState(channel)}）
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="assistant-admin-actions">
                    <button
                      type="button"
                      disabled={updatingMemberId === member.id}
                      onClick={() => void updateMemberStatus(member.id, member.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED')}
                    >
                      {member.status === 'DISABLED' ? '启用' : '禁用'}
                    </button>
                  </div>
                </div>
              ))}
              {members.length === 0 && <p className="assistant-status-text">刷新后会显示已兑换邀请码的内部成员。</p>}
            </div>
          </article>
        </section>

        <section
          id="assistant-admin-panel-knowledge"
          className="assistant-admin-grid assistant-admin-grid--single"
          role="tabpanel"
          hidden={activeTab !== 'knowledge'}
        >
          <article className="assistant-admin-card">
            <h2>RAG 管理</h2>
            <p>初始化和观察公开/内部知识库的向量检索状态；同步由后端代理执行，不在浏览器暴露 RAG token。</p>
            <div className="assistant-admin-actions">
              <button type="button" onClick={() => void loadRagStatus()} disabled={isLoadingRagStatus || !adminToken}>
                {isLoadingRagStatus ? '读取中…' : '刷新 RAG 状态'}
              </button>
              <button type="button" onClick={() => void syncPublicRagKnowledge()} disabled={isSyncingPublicRag || !adminToken}>
                {isSyncingPublicRag ? '同步中…' : '同步公开知识库'}
              </button>
              <button type="button" onClick={() => void syncKnowledgeDocuments()} disabled={isSyncingKnowledge || !adminToken}>
                {isSyncingKnowledge ? '同步中…' : '同步内部知识库'}
              </button>
            </div>
            {ragStatusText && <p className="assistant-status-text">{ragStatusText}</p>}
            <div className="assistant-admin-summary" aria-label="RAG Orchestrator 状态">
              <span>
                <strong>{ragAdminStatus?.configured ? '已配置' : '未配置'}</strong>
                RAG 服务
              </span>
              <span>
                <strong>{ragAdminStatus?.syncConfigured ? '已配置' : '未配置'}</strong>
                同步 token
              </span>
              <span>
                <strong>{ragAdminStatus?.health?.store ?? 'unknown'}</strong>
                Store
              </span>
              <span>
                <strong>{ragAdminStatus?.health?.vectorReady ? 'ready' : 'not ready'}</strong>
                向量状态
              </span>
              <span>
                <strong>{ragAdminStatus?.health?.chunkCount ?? 0}</strong>
                总 chunks
              </span>
            </div>
            <div className="assistant-admin-row assistant-admin-row--member" aria-label="RAG collection 状态">
              <div>
                <strong>公开知识库</strong>
                <span>{formatRagCollection(ragAdminStatus?.health?.collections?.public)}</span>
              </div>
              <div>
                <strong>内部知识库</strong>
                <span>{formatRagCollection(ragAdminStatus?.health?.collections?.internal)}</span>
              </div>
            </div>
            {lastPublicRagSync && (
              <div className="assistant-admin-row assistant-admin-row--member" aria-label="最近公开知识库同步结果">
                <div>
                  <strong>公开同步：{lastPublicRagSync.status}</strong>
                  <span>
                    accepted：{lastPublicRagSync.accepted ? '是' : '否'} · issue：{lastPublicRagSync.issueCount}
                  </span>
                </div>
                <div>
                  <strong>{lastPublicRagSync.diagnostic?.reason ?? lastPublicRagSync.diagnostic?.mode ?? '低敏诊断'}</strong>
                  <span>chunk：{lastPublicRagSync.diagnostic?.chunkCount ?? lastPublicRagSync.health?.chunkCount ?? 0}</span>
                </div>
              </div>
            )}
            {ragDiagnosticEntries.length > 0 && (
              <ul className="assistant-admin-list" aria-label="RAG 状态低敏诊断字段">
                {ragDiagnosticEntries.map(([key, value]) => (
                  <li key={key}>
                    {syncDiagnosticLabels[key] ?? key}：{formatDiagnosticValue(value)}
                  </li>
                ))}
              </ul>
            )}
            {publicRagSyncDiagnosticEntries.length > 0 && (
              <ul className="assistant-admin-list" aria-label="公开知识库同步低敏诊断字段">
                {publicRagSyncDiagnosticEntries.map(([key, value]) => (
                  <li key={key}>
                    {syncDiagnosticLabels[key] ?? key}：{formatDiagnosticValue(value)}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="assistant-admin-card">
            <h2>内部知识源</h2>
            <p>维护经过审核的内部知识文档；只有已审核/已启用文档会进入同步计划。</p>

            <form className="assistant-admin-form" onSubmit={saveKnowledgeDocument}>
              <label className="assistant-field">
                <span>标题</span>
                <input
                  type="text"
                  value={knowledgeForm.title}
                  onChange={(event) => updateKnowledgeField('title', event.target.value)}
                  placeholder="内部知识标题"
                  maxLength={120}
                />
              </label>
              <label className="assistant-field">
                <span>Slug</span>
                <input
                  type="text"
                  value={knowledgeForm.slug}
                  onChange={(event) => updateKnowledgeField('slug', event.target.value)}
                  placeholder="可留空自动生成"
                  maxLength={80}
                />
              </label>
              <label className="assistant-field">
                <span>摘要</span>
                <textarea
                  value={knowledgeForm.summary}
                  onChange={(event) => updateKnowledgeField('summary', event.target.value)}
                  placeholder="一句话说明这份知识的边界"
                  rows={2}
                />
              </label>
              <label className="assistant-field">
                <span>正文</span>
                <textarea
                  value={knowledgeForm.body}
                  onChange={(event) => updateKnowledgeField('body', event.target.value)}
                  placeholder="只写可进入内部助手的脱敏内容"
                  rows={6}
                />
              </label>
              <div className="assistant-form-grid">
                <label className="assistant-field">
                  <span>状态</span>
                  <select
                    value={knowledgeForm.status}
                    onChange={(event) => updateKnowledgeField('status', event.target.value as AssistantInternalKnowledgeStatus)}
                  >
                    <option value="DRAFT">草稿</option>
                    <option value="REVIEWED">已审核</option>
                    <option value="ACTIVE">已启用</option>
                    <option value="ARCHIVED">已归档</option>
                  </select>
                </label>
                <label className="assistant-field">
                  <span>来源类型</span>
                  <input
                    type="text"
                    value={knowledgeForm.sourceType}
                    onChange={(event) => updateKnowledgeField('sourceType', event.target.value)}
                    placeholder="manual / project-note"
                    maxLength={40}
                  />
                </label>
              </div>
              <label className="assistant-field">
                <span>标签</span>
                <textarea
                  value={knowledgeForm.tagsText}
                  onChange={(event) => updateKnowledgeField('tagsText', event.target.value)}
                  placeholder="每行一个标签"
                  rows={2}
                />
              </label>
              <label className="assistant-field">
                <span>安全备注</span>
                <textarea
                  value={knowledgeForm.safetyNotes}
                  onChange={(event) => updateKnowledgeField('safetyNotes', event.target.value)}
                  placeholder="脱敏范围、不可公开边界、人工审核备注"
                  rows={2}
                />
              </label>
              <div className="assistant-admin-actions">
                <button type="submit" disabled={isSavingKnowledge || !adminToken}>
                  {isSavingKnowledge ? '保存中…' : knowledgeForm.id ? '更新文档' : '创建文档'}
                </button>
                <button type="button" onClick={() => setKnowledgeForm(defaultKnowledgeForm)}>
                  清空
                </button>
              </div>
            </form>

            <div className="assistant-admin-actions">
              <button type="button" onClick={() => void loadKnowledgeDocuments()} disabled={isLoadingKnowledge || !adminToken}>
                {isLoadingKnowledge ? '读取中…' : '刷新知识'}
              </button>
              <button type="button" onClick={() => void syncKnowledgeDocuments()} disabled={isSyncingKnowledge || !adminToken}>
                {isSyncingKnowledge ? '同步中…' : '同步内部知识库'}
              </button>
            </div>
            {knowledgeStatus && <p className="assistant-status-text">{knowledgeStatus}</p>}
            <div className="assistant-admin-summary" aria-label="内部知识同步准备度">
              <span>
                <strong>{knowledgeOps.total}</strong>
                全部文档
              </span>
              <span>
                <strong>{knowledgeOps.eligible}</strong>
                可同步
              </span>
              <span>
                <strong>{knowledgeOps.unsyncedEligible}</strong>
                待首次同步
              </span>
              <span>
                <strong>{knowledgeOps.staleEligible}</strong>
                内容已变更
              </span>
              <span>
                <strong>{knowledgeOps.syncedEligible}</strong>
                已同步
              </span>
            </div>
            {lastKnowledgeSyncRun && (
              <div className="assistant-admin-row assistant-admin-row--member" aria-label="最近内部知识同步诊断">
                <div>
                  <strong>最近同步：{lastKnowledgeSyncRun.status}</strong>
                  <span>
                    文档 {lastKnowledgeSyncRun.documentCount} · chunk {lastKnowledgeSyncRun.chunkCount} · 问题 {lastKnowledgeSyncRun.issueCount}
                  </span>
                  <span>
                    开始：{formatAdminDate(lastKnowledgeSyncRun.startedAt)} · 完成：{formatAdminDate(lastKnowledgeSyncRun.finishedAt)}
                  </span>
                </div>
                <div>
                  <strong>{knowledgeOps.lastSyncReason ?? knowledgeOps.lastSyncMode ?? '低敏诊断'}</strong>
                  <span>accepted：{knowledgeOps.lastSyncAccepted === undefined ? '未返回' : knowledgeOps.lastSyncAccepted ? '是' : '否'}</span>
                  <span>issue：{knowledgeOps.lastSyncIssueCount ?? 0}</span>
                </div>
              </div>
            )}
            {syncDiagnosticEntries.length > 0 && (
              <ul className="assistant-admin-list" aria-label="内部知识同步低敏诊断字段">
                {syncDiagnosticEntries.map(([key, value]) => (
                  <li key={key}>
                    {syncDiagnosticLabels[key] ?? key}：{formatDiagnosticValue(value)}
                  </li>
                ))}
              </ul>
            )}
            <div className="assistant-admin-table" aria-label="内部知识文档列表">
              {knowledgeDocuments.map((document) => (
                <div key={document.id} className="assistant-admin-row assistant-admin-row--member">
                  <div>
                    <strong>{document.title}</strong>
                    <span>
                      {knowledgeStatusLabels[document.status]} · {document.sourceType} · {document.tags.join(' / ') || '无标签'}
                    </span>
                    <span>
                      更新：{formatAdminDate(document.updatedAt)} · 上次同步：{formatAdminDate(document.lastSyncedAt)} · {formatKnowledgeDocumentSyncState(document)}
                    </span>
                  </div>
                  <div className="assistant-admin-actions">
                    <button type="button" onClick={() => editKnowledgeDocument(document)}>
                      编辑
                    </button>
                  </div>
                </div>
              ))}
              {knowledgeDocuments.length === 0 && <p className="assistant-status-text">刷新后会显示数据库中的内部知识文档。</p>}
            </div>
          </article>
        </section>

        <section
          id="assistant-admin-panel-usage"
          className="assistant-admin-grid assistant-admin-grid--single"
          role="tabpanel"
          hidden={activeTab !== 'usage'}
        >
          <article className="assistant-admin-card">
            <h2>基础用量</h2>
            <p>查看最近 50 条内部助手使用记录，只显示成员摘要、scope、模型和低敏 token 计数。</p>
            <div className="assistant-admin-actions">
              <button type="button" onClick={() => void loadUsage()} disabled={isLoadingUsage || !adminToken}>
                {isLoadingUsage ? '读取中…' : '刷新用量'}
              </button>
            </div>
            {usageStatus && <p className="assistant-status-text">{usageStatus}</p>}
            <div className="assistant-admin-table" aria-label="基础用量列表">
              {usageLogs.map((usage) => (
                <div key={usage.id} className="assistant-admin-row assistant-admin-row--member">
                  <div>
                    <strong>{usage.member?.name ?? '已删除成员'}</strong>
                    <span>
                      {usage.scope} · {usage.model}
                    </span>
                    <span>
                      {formatAdminDate(usage.createdAt)} · {usage.modelChannel?.label ?? usage.member?.modelChannel?.label ?? '默认/未知渠道'}
                    </span>
                  </div>
                  <div>
                    <strong>{usage.tokensIn + usage.tokensOut}</strong>
                    <span>
                      tokens · in {usage.tokensIn} / out {usage.tokensOut}
                    </span>
                  </div>
                </div>
              ))}
              {usageLogs.length === 0 && <p className="assistant-status-text">刷新后会显示最近内部助手用量；不会展示消息正文或请求内容。</p>}
            </div>
          </article>
        </section>

        <section
          id="assistant-admin-panel-safety"
          className="assistant-admin-grid assistant-admin-grid--single"
          role="tabpanel"
          hidden={activeTab !== 'safety'}
        >
          <article className="assistant-admin-card">
            <h2>安全边界</h2>
            <p>模型渠道密钥和服务地址只在服务端环境变量中维护；成员表只保存渠道 id。</p>
            <ul className="assistant-admin-list">
              <li>页面不会展示模型 key、base URL、token hash 或邀请码 hash。</li>
              <li>成员被分配到未配置渠道时，后端会安全回退并返回低敏状态。</li>
              <li>内部知识同步按钮只显示低敏诊断，不展示 RAG URL、sync token 或文档原始外部响应。</li>
              <li>生产环境必须继续依赖后端 `ADMIN_TOKEN` 校验。</li>
            </ul>
          </article>
        </section>
      </section>
    </main>
  )
}
