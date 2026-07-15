import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import '../styles/operator.css'
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Database,
  Gauge,
  HardDrive,
  MemoryStick,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import {
  getAssistantKnowledgeDocumentSyncState,
  normalizeAssistantInternalKnowledgeDocument,
  normalizeAssistantInternalKnowledgeSyncRun,
  summarizeAssistantKnowledgeOps,
  type AssistantInternalKnowledgeDocument,
  type AssistantInternalKnowledgeStatus,
  type AssistantMemory,
} from '../data/assistant'
import {
  explainOperatorError,
  normalizeOperatorSummary,
  readOperatorKnowledge,
  readOperatorMemories,
  readOperatorModelChannels,
  readOperatorRag,
  readOperatorUsage,
  requestOperatorApi,
  type OperatorSettingsSnapshot,
} from '../data/operator'

type SettingsSection = 'overview' | 'knowledge' | 'rag' | 'memory' | 'usage'

interface KnowledgeFormState {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  tags: string
  status: AssistantInternalKnowledgeStatus
  sourceType: string
  safetyNotes: string
}

const emptyKnowledgeForm: KnowledgeFormState = {
  id: '',
  slug: '',
  title: '',
  summary: '',
  body: '',
  tags: '',
  status: 'DRAFT',
  sourceType: 'manual',
  safetyNotes: '',
}

const sectionItems: Array<{ id: SettingsSection; label: string; icon: typeof Gauge }> = [
  { id: 'overview', label: '总览', icon: Gauge },
  { id: 'knowledge', label: '知识', icon: BookOpen },
  { id: 'rag', label: 'RAG', icon: Database },
  { id: 'memory', label: '记忆', icon: MemoryStick },
  { id: 'usage', label: '用量', icon: HardDrive },
]

const initialSnapshot: OperatorSettingsSnapshot = {
  summary: null,
  documents: [],
  lastSyncRun: null,
  rag: null,
  memories: [],
  usage: [],
  modelChannels: [],
  selectedModelChannel: null,
}

export function OperatorSettingsPage() {
  const [section, setSection] = useState<SettingsSection>('overview')
  const [snapshot, setSnapshot] = useState<OperatorSettingsSnapshot>(initialSnapshot)
  const [knowledgeForm, setKnowledgeForm] = useState<KnowledgeFormState>(emptyKnowledgeForm)
  const [statusText, setStatusText] = useState('正在读取站务配置…')
  const [errorText, setErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    void loadSnapshot()
  }, [])

  const knowledgeOps = useMemo(
    () => summarizeAssistantKnowledgeOps(snapshot.documents, snapshot.lastSyncRun),
    [snapshot.documents, snapshot.lastSyncRun],
  )

  async function loadSnapshot() {
    setIsLoading(true)
    const [summaryResult, knowledgeResult, ragResult, memoriesResult, usageResult, channelsResult] = await Promise.all([
      requestOperatorApi<unknown>('/summary'),
      requestOperatorApi<unknown>('/knowledge-documents'),
      requestOperatorApi<unknown>('/rag/status'),
      requestOperatorApi<unknown>('/memories?includeArchived=true'),
      requestOperatorApi<unknown>('/usage'),
      requestOperatorApi<unknown>('/model-channels'),
    ])

    if (!summaryResult.ok) {
      setErrorText(explainOperatorError(summaryResult.status, summaryResult.errorCode))
      setStatusText('站务设置未连接')
      setIsLoading(false)
      return
    }

    const knowledge = knowledgeResult.ok ? readOperatorKnowledge(knowledgeResult.data) : { documents: [], lastSyncRun: null }
    const channels = channelsResult.ok ? readOperatorModelChannels(channelsResult.data) : { modelChannels: [], selectedModelChannel: null }
    setSnapshot({
      summary: normalizeOperatorSummary(summaryResult.data),
      documents: knowledge.documents,
      lastSyncRun: knowledge.lastSyncRun,
      rag: ragResult.ok ? readOperatorRag(ragResult.data) : null,
      memories: memoriesResult.ok ? readOperatorMemories(memoriesResult.data) : [],
      usage: usageResult.ok ? readOperatorUsage(usageResult.data) : [],
      modelChannels: channels.modelChannels,
      selectedModelChannel: channels.selectedModelChannel,
    })
    setStatusText('站务配置已同步')
    setErrorText('')
    setIsLoading(false)
  }

  function editDocument(document: AssistantInternalKnowledgeDocument) {
    setKnowledgeForm({
      id: document.id,
      slug: document.slug,
      title: document.title,
      summary: document.summary,
      body: document.body,
      tags: document.tags.join(', '),
      status: document.status,
      sourceType: document.sourceType,
      safetyNotes: document.safetyNotes,
    })
  }

  async function saveDocument(event: FormEvent) {
    event.preventDefault()
    if (!knowledgeForm.title.trim() || !knowledgeForm.body.trim()) return
    setIsSaving(true)
    const path = knowledgeForm.id ? `/knowledge-documents/${encodeURIComponent(knowledgeForm.id)}` : '/knowledge-documents'
    const result = await requestOperatorApi<unknown>(path, {
      method: knowledgeForm.id ? 'PATCH' : 'POST',
      body: JSON.stringify({
        slug: knowledgeForm.slug,
        title: knowledgeForm.title,
        summary: knowledgeForm.summary,
        body: knowledgeForm.body,
        tags: knowledgeForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        status: knowledgeForm.status,
        sourceType: knowledgeForm.sourceType,
        safetyNotes: knowledgeForm.safetyNotes,
      }),
    })
    setIsSaving(false)
    const document = isRecord(result.data) ? normalizeAssistantInternalKnowledgeDocument(result.data.document) : null
    if (!result.ok || !document) {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      return
    }
    setSnapshot((current) => ({
      ...current,
      documents: [document, ...current.documents.filter((item) => item.id !== document.id)],
    }))
    setKnowledgeForm(emptyKnowledgeForm)
    setStatusText('知识文档已保存')
    setErrorText('')
  }

  async function syncInternalKnowledge() {
    setStatusText('正在提交内部知识同步…')
    const result = await requestOperatorApi<unknown>('/knowledge/sync', { method: 'POST', body: '{}' })
    const syncRun = isRecord(result.data) ? normalizeAssistantInternalKnowledgeSyncRun(result.data.syncRun) : null
    if (!result.ok || !syncRun) {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      return
    }
    setSnapshot((current) => ({ ...current, lastSyncRun: syncRun }))
    setStatusText(result.data && isRecord(result.data) && result.data.accepted === true ? '内部知识同步已接受' : '内部知识同步已记录')
    setErrorText('')
    await loadSnapshot()
  }

  async function syncPublicKnowledge() {
    setStatusText('正在提交公开知识同步…')
    const result = await requestOperatorApi<unknown>('/rag/sync-public', { method: 'POST', body: '{}' })
    if (!result.ok) {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      return
    }
    setStatusText('公开知识同步请求已完成')
    setErrorText('')
    await loadSnapshot()
  }

  async function toggleMemory(memory: AssistantMemory) {
    const archived = memory.status !== 'ARCHIVED'
    const result = await requestOperatorApi<unknown>(`/memories/${encodeURIComponent(memory.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    })
    if (!result.ok) {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      return
    }
    await loadSnapshot()
  }

  return (
    <main className="operator-settings-page">
      <header className="operator-settings-topbar">
        <div>
          <Link to="/operator" className="operator-icon-button" aria-label="返回站务工作区">
            <ArrowLeft size={18} aria-hidden />
          </Link>
          <span className="operator-brand-mark" aria-hidden><Settings2 size={19} /></span>
          <div><p>站务设置</p><span>BIAU OPERATOR SETTINGS</span></div>
        </div>
        <button type="button" className="operator-command-button" onClick={() => void loadSnapshot()} disabled={isLoading}>
          <RefreshCw size={16} aria-hidden />
          刷新
        </button>
      </header>

      <section className={`operator-settings-status ${errorText ? 'is-error' : ''}`} role="status">
        {errorText ? <ShieldCheck size={17} aria-hidden /> : <CheckCircle2 size={17} aria-hidden />}
        <span>{errorText || statusText}</span>
      </section>

      <div className="operator-settings-layout">
        <nav className="operator-settings-nav" aria-label="站务设置分区">
          {sectionItems.map((item) => {
            const Icon = item.icon
            return (
              <button type="button" key={item.id} className={section === item.id ? 'is-active' : ''} onClick={() => setSection(item.id)}>
                <Icon size={17} aria-hidden />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <section className="operator-settings-content">
          {section === 'overview' && <OverviewSection snapshot={snapshot} />}
          {section === 'knowledge' && (
            <KnowledgeSection
              documents={snapshot.documents}
              form={knowledgeForm}
              setForm={setKnowledgeForm}
              onEdit={editDocument}
              onSave={saveDocument}
              onSync={syncInternalKnowledge}
              isSaving={isSaving}
              ops={knowledgeOps}
            />
          )}
          {section === 'rag' && <RagSection snapshot={snapshot} onSyncPublic={syncPublicKnowledge} onSyncInternal={syncInternalKnowledge} />}
          {section === 'memory' && <MemorySection memories={snapshot.memories} onToggle={toggleMemory} />}
          {section === 'usage' && <UsageSection snapshot={snapshot} />}
        </section>
      </div>
    </main>
  )
}

function OverviewSection({ snapshot }: { snapshot: OperatorSettingsSnapshot }) {
  const summary = snapshot.summary
  const metrics = [
    ['会话', summary?.sessions ?? 0],
    ['消息', summary?.messages ?? 0],
    ['长期记忆', summary?.memories ?? 0],
    ['知识文档', summary?.internalKnowledgeDocuments ?? 0],
  ]
  return (
    <div className="operator-settings-section">
      <header className="operator-section-heading"><div><p>运行总览</p><h1>泊岸站务</h1></div><Bot size={24} aria-hidden /></header>
      <div className="operator-metric-band">
        {metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="operator-overview-grid">
        <section className="operator-settings-panel">
          <header><span>Owner boundary</span><ShieldCheck size={17} aria-hidden /></header>
          <dl className="operator-detail-list">
            <div><dt>身份</dt><dd>{summary?.operator.name ?? '未连接'}</dd></div>
            <div><dt>角色</dt><dd>{summary?.operator.role ?? '—'}</dd></div>
            <div><dt>API</dt><dd>Cloudflare Access facade</dd></div>
            <div><dt>发布权限</dt><dd>人工审核</dd></div>
          </dl>
        </section>
        <section className="operator-settings-panel">
          <header><span>Model route</span><Bot size={17} aria-hidden /></header>
          <dl className="operator-detail-list">
            <div><dt>通道</dt><dd>{snapshot.selectedModelChannel?.label ?? '默认通道'}</dd></div>
            <div><dt>模型</dt><dd>{snapshot.selectedModelChannel?.model ?? '未配置'}</dd></div>
            <div><dt>Provider</dt><dd>{snapshot.selectedModelChannel?.provider ?? '—'}</dd></div>
            <div><dt>状态</dt><dd>{snapshot.selectedModelChannel?.configured ? 'configured' : 'not configured'}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  )
}

function KnowledgeSection({
  documents,
  form,
  setForm,
  onEdit,
  onSave,
  onSync,
  isSaving,
  ops,
}: {
  documents: AssistantInternalKnowledgeDocument[]
  form: KnowledgeFormState
  setForm: (value: KnowledgeFormState) => void
  onEdit: (document: AssistantInternalKnowledgeDocument) => void
  onSave: (event: FormEvent) => void
  onSync: () => void
  isSaving: boolean
  ops: ReturnType<typeof summarizeAssistantKnowledgeOps>
}) {
  return (
    <div className="operator-settings-section">
      <header className="operator-section-heading">
        <div><p>Knowledge operations</p><h1>站务知识</h1></div>
        <button type="button" className="operator-command-button" onClick={() => void onSync()}><RefreshCw size={16} aria-hidden />同步 reviewed / active</button>
      </header>
      <div className="operator-metric-band is-compact">
        <div><span>总数</span><strong>{ops.total}</strong></div>
        <div><span>可同步</span><strong>{ops.eligible}</strong></div>
        <div><span>待同步</span><strong>{ops.unsyncedEligible + ops.staleEligible}</strong></div>
        <div><span>已同步</span><strong>{ops.syncedEligible}</strong></div>
      </div>
      <div className="operator-knowledge-layout">
        <section className="operator-settings-panel operator-document-list">
          <header><span>文档</span><button type="button" onClick={() => setForm(emptyKnowledgeForm)} aria-label="新建知识文档"><Plus size={17} aria-hidden /></button></header>
          <div>
            {documents.map((document) => (
              <button type="button" key={document.id} className={form.id === document.id ? 'is-active' : ''} onClick={() => onEdit(document)}>
                <span>{document.title}</span>
                <small>{document.status} · {getAssistantKnowledgeDocumentSyncState(document)}</small>
              </button>
            ))}
            {documents.length === 0 && <p className="operator-empty-copy">还没有站务知识文档。</p>}
          </div>
        </section>
        <form className="operator-settings-panel operator-knowledge-form" onSubmit={onSave}>
          <header><span>{form.id ? '编辑文档' : '新建文档'}</span><Save size={17} aria-hidden /></header>
          <div className="operator-form-grid">
            <label><span>标题</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
            <label><span>Slug</span><input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
            <label><span>状态</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AssistantInternalKnowledgeStatus })}><option value="DRAFT">DRAFT</option><option value="REVIEWED">REVIEWED</option><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
            <label><span>来源类型</span><select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })}><option value="manual">manual</option><option value="project-note">project-note</option><option value="runbook">runbook</option><option value="status-note">status-note</option><option value="incident-note">incident-note</option></select></label>
            <label className="is-wide"><span>摘要</span><textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
            <label className="is-wide"><span>正文</span><textarea rows={10} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required /></label>
            <label className="is-wide"><span>标签</span><input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="project, status, workflow" /></label>
            <label className="is-wide"><span>安全备注</span><textarea rows={3} value={form.safetyNotes} onChange={(event) => setForm({ ...form, safetyNotes: event.target.value })} /></label>
          </div>
          <footer><button type="submit" className="operator-command-button" disabled={isSaving}><Save size={16} aria-hidden />保存文档</button></footer>
        </form>
      </div>
    </div>
  )
}

function RagSection({ snapshot, onSyncPublic, onSyncInternal }: { snapshot: OperatorSettingsSnapshot; onSyncPublic: () => void; onSyncInternal: () => void }) {
  const rag = snapshot.rag
  return (
    <div className="operator-settings-section">
      <header className="operator-section-heading"><div><p>Retrieval pipeline</p><h1>RAG Orchestrator</h1></div><Database size={24} aria-hidden /></header>
      <div className="operator-overview-grid">
        <section className="operator-settings-panel">
          <header><span>运行状态</span><span className={`operator-status-dot ${rag?.health?.vectorReady ? 'is-ready' : ''}`} /></header>
          <dl className="operator-detail-list">
            <div><dt>服务</dt><dd>{rag?.configured ? 'configured' : 'not configured'}</dd></div>
            <div><dt>存储</dt><dd>{rag?.health?.store ?? '—'}</dd></div>
            <div><dt>向量检索</dt><dd>{rag?.health?.vectorReady ? 'ready' : 'not ready'}</dd></div>
            <div><dt>Reranker</dt><dd>{rag?.health?.rerankerReady ? 'ready' : 'optional / off'}</dd></div>
          </dl>
        </section>
        <section className="operator-settings-panel">
          <header><span>索引规模</span><HardDrive size={17} aria-hidden /></header>
          <dl className="operator-detail-list">
            <div><dt>文档</dt><dd>{rag?.health?.documentCount ?? 0}</dd></div>
            <div><dt>Chunks</dt><dd>{rag?.health?.chunkCount ?? 0}</dd></div>
            <div><dt>Entities</dt><dd>{rag?.health?.entityCount ?? 0}</dd></div>
            <div><dt>Relations</dt><dd>{rag?.health?.relationCount ?? 0}</dd></div>
          </dl>
        </section>
      </div>
      <div className="operator-action-band">
        <button type="button" onClick={() => void onSyncPublic()}><RefreshCw size={17} aria-hidden /><span>同步公开知识</span></button>
        <button type="button" onClick={() => void onSyncInternal()}><RefreshCw size={17} aria-hidden /><span>同步站务知识</span></button>
      </div>
    </div>
  )
}

function MemorySection({ memories, onToggle }: { memories: AssistantMemory[]; onToggle: (memory: AssistantMemory) => void }) {
  return (
    <div className="operator-settings-section">
      <header className="operator-section-heading"><div><p>Durable context</p><h1>站长长期记忆</h1></div><MemoryStick size={24} aria-hidden /></header>
      <div className="operator-record-list">
        {memories.map((memory) => (
          <article key={memory.id} className={memory.status === 'ARCHIVED' ? 'is-muted' : ''}>
            <div><span>{memory.kind}</span><time>{formatDate(memory.updatedAt)}</time></div>
            <h2>{memory.title}</h2>
            <p>{memory.content}</p>
            <button type="button" onClick={() => void onToggle(memory)}><Archive size={15} aria-hidden />{memory.status === 'ARCHIVED' ? '恢复' : '归档'}</button>
          </article>
        ))}
        {memories.length === 0 && <p className="operator-empty-copy">还没有迁移或创建长期记忆。</p>}
      </div>
    </div>
  )
}

function UsageSection({ snapshot }: { snapshot: OperatorSettingsSnapshot }) {
  return (
    <div className="operator-settings-section">
      <header className="operator-section-heading"><div><p>Low-sensitive telemetry</p><h1>运行与模型通道</h1></div><Gauge size={24} aria-hidden /></header>
      <section className="operator-settings-panel operator-channel-list">
        <header><span>模型通道</span><small>{snapshot.modelChannels.length}</small></header>
        <div>
          {snapshot.modelChannels.map((channel) => (
            <article key={channel.id}>
              <div><strong>{channel.label}</strong><span>{channel.isDefault ? 'DEFAULT' : channel.id}</span></div>
              <p>{channel.provider} · {channel.model}</p>
              <small>{channel.configured && channel.isActive ? 'configured' : channel.isActive ? 'missing credentials' : 'inactive'}</small>
            </article>
          ))}
        </div>
      </section>
      <div className="operator-usage-table" role="table" aria-label="站务运行记录">
        <div role="row"><span role="columnheader">时间</span><span role="columnheader">Scope</span><span role="columnheader">模型</span><span role="columnheader">通道</span></div>
        {snapshot.usage.map((usage) => (
          <div role="row" key={usage.id}><span role="cell">{formatDate(usage.createdAt)}</span><span role="cell">{usage.scope}</span><span role="cell">{usage.model}</span><span role="cell">{usage.modelChannel?.label ?? usage.modelChannelId ?? 'default'}</span></div>
        ))}
      </div>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
