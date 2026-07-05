import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { StudioDraftPreview } from '../components/StudioDraftPreview'
import { blogColumnMeta, blogColumnOrder, type BlogColumn } from '../data/blog'
import {
  STUDIO_STORAGE_KEYS,
  normalizeStudioDraft,
  normalizeStudioDrafts,
  normalizeStudioHealth,
  normalizeStudioIssue,
  normalizeStudioIssues,
  normalizeStudioSource,
  normalizeStudioSources,
  readStoredStudioToken,
  readStudioError,
  studioAiDailyIssueStatusLabels,
  studioDraftStatuses,
  studioSourceTierLabels,
  studioVisibilityLabels,
  type StudioAiDailyIssue,
  type StudioDraft,
  type StudioHealth,
  type StudioSourceItem,
  type StudioSourceTier,
  type StudioVisibility,
} from '../data/studio'
import { bodyJsonFromText, textFromBodyJson } from '../utils/studioDraftBody'
import { STUDIO_API_BASE, STUDIO_API_ENV_NAMES, explainStudioApiError, requestStudioApi } from '../utils/studioApi'

interface DraftFormState {
  title: string
  slug: string
  column: BlogColumn
  tag: string
  detail: string
  readTime: string
  bodyText: string
  knowledgePointsText: string
  projectIdsText: string
  visibility: StudioVisibility
  aiAssistance: string
  editorName: string
}

interface SourceFormState {
  title: string
  url: string
  sourceName: string
  sourceTier: StudioSourceTier
  language: string
  publishedAt: string
  summary: string
  tagsText: string
}

interface IssueFormState {
  date: string
  title: string
  sourceIdsText: string
}

const defaultDraftForm: DraftFormState = {
  title: '',
  slug: '',
  column: 'knowledge',
  tag: '知识积累',
  detail: '',
  readTime: '8 min',
  bodyText: '',
  knowledgePointsText: '',
  projectIdsText: '',
  visibility: 'hidden',
  aiAssistance: 'none',
  editorName: '站长',
}

const defaultSourceForm: SourceFormState = {
  title: '',
  url: '',
  sourceName: '',
  sourceTier: 'official-primary',
  language: 'zh',
  publishedAt: '',
  summary: '',
  tagsText: '',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function defaultIssueForm(): IssueFormState {
  return {
    date: today(),
    title: `AI 日报 ${today()}`,
    sourceIdsText: '',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, '-')
    .replace(/[\u4e00-\u9fa5]/gu, '')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .slice(0, 96)
}

function splitList(value: string) {
  return value
    .split(/[\n,，]/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getDraftFromPayload(payload: unknown) {
  return isRecord(payload) ? normalizeStudioDraft(payload.draft) : null
}

function getSourceFromPayload(payload: unknown) {
  return isRecord(payload) ? normalizeStudioSource(payload.source) : null
}

function getIssueFromPayload(payload: unknown) {
  return isRecord(payload) ? normalizeStudioIssue(payload.issue) : null
}

function formatDateTime(value: string) {
  if (!value) return '未知'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function draftToForm(draft: StudioDraft): DraftFormState {
  return {
    title: draft.title,
    slug: draft.slug,
    column: blogColumnOrder.includes(draft.column as BlogColumn) ? (draft.column as BlogColumn) : 'knowledge',
    tag: draft.tag,
    detail: draft.detail,
    readTime: draft.readTime,
    bodyText: textFromBodyJson(draft),
    knowledgePointsText: draft.knowledgePoints.join('\n'),
    projectIdsText: draft.projectIds.join('\n'),
    visibility: draft.visibility,
    aiAssistance: draft.aiAssistance,
    editorName: draft.updatedBy || draft.createdBy || '站长',
  }
}

export function StudioPage() {
  const [adminToken, setAdminToken] = useState(() => readStoredStudioToken())
  const [draftToken, setDraftToken] = useState(() => readStoredStudioToken())
  const [health, setHealth] = useState<StudioHealth | null>(null)
  const [drafts, setDrafts] = useState<StudioDraft[]>([])
  const [sources, setSources] = useState<StudioSourceItem[]>([])
  const [issues, setIssues] = useState<StudioAiDailyIssue[]>([])
  const [selectedDraftId, setSelectedDraftId] = useState('')
  const [draftForm, setDraftForm] = useState<DraftFormState>(defaultDraftForm)
  const [sourceForm, setSourceForm] = useState<SourceFormState>(defaultSourceForm)
  const [issueForm, setIssueForm] = useState<IssueFormState>(() => defaultIssueForm())
  const [statusText, setStatusText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSavingSource, setIsSavingSource] = useState(false)
  const [isSavingIssue, setIsSavingIssue] = useState(false)

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  )

  const sortedSources = useMemo(
    () => [...sources].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sources],
  )
  const previewBody = useMemo(() => bodyJsonFromText(draftForm.bodyText), [draftForm.bodyText])
  const previewKnowledgePoints = useMemo(() => splitList(draftForm.knowledgePointsText), [draftForm.knowledgePointsText])
  const previewProjectIds = useMemo(() => splitList(draftForm.projectIdsText), [draftForm.projectIdsText])
  const previewDate = selectedDraft?.publishedAt?.slice(0, 10) || selectedDraft?.updatedAt?.slice(0, 10) || today()

  const saveToken = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = draftToken.trim()
    setAdminToken(token)
    if (token) {
      window.localStorage.setItem(STUDIO_STORAGE_KEYS.adminToken, token)
      setStatusText('Studio token 已保存在当前浏览器。')
      void loadStudio(token)
    } else {
      window.localStorage.removeItem(STUDIO_STORAGE_KEYS.adminToken)
      setStatusText('Studio token 已清除。')
    }
  }

  const clearToken = () => {
    setDraftToken('')
    setAdminToken('')
    setHealth(null)
    setDrafts([])
    setSources([])
    setIssues([])
    window.localStorage.removeItem(STUDIO_STORAGE_KEYS.adminToken)
    setStatusText('Studio token 已清除。')
  }

  const loadStudio = useCallback(async (token: string) => {
    if (!STUDIO_API_BASE) {
      setStatusText(`当前没有配置 ${STUDIO_API_ENV_NAMES.studio} 或 ${STUDIO_API_ENV_NAMES.internal}。`)
      return
    }
    if (!token) {
      setStatusText('请先保存 Studio token。')
      return
    }

    setIsLoading(true)
    setStatusText('')
    try {
      const healthResult = await requestStudioApi('/health', token)
      if (!healthResult.ok) {
        setStatusText(explainStudioApiError(healthResult.status, readStudioError(healthResult.payload)))
        return
      }
      const nextHealth = normalizeStudioHealth(healthResult.payload)
      if (!nextHealth) {
        setStatusText('Studio health 返回格式不完整。')
        return
      }
      setHealth(nextHealth)
      if (!nextHealth.database) {
        setStatusText('Studio API 已连接，但数据库还没有配置。')
        return
      }

      const [draftResult, sourceResult, issueResult] = await Promise.all([
        requestStudioApi('/content-drafts', token),
        requestStudioApi('/source-items', token),
        requestStudioApi('/ai-daily/issues', token),
      ])
      if (draftResult.ok) setDrafts(normalizeStudioDrafts(draftResult.payload))
      if (sourceResult.ok) setSources(normalizeStudioSources(sourceResult.payload))
      if (issueResult.ok) setIssues(normalizeStudioIssues(issueResult.payload))
      setStatusText('Studio 数据已刷新。')
    } catch {
      setStatusText('无法连接 Studio API。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (adminToken) void loadStudio(adminToken)
  }, [adminToken, loadStudio])

  const updateDraftField = <K extends keyof DraftFormState>(field: K, value: DraftFormState[K]) => {
    setDraftForm((current) => ({ ...current, [field]: value }))
  }

  const updateSourceField = <K extends keyof SourceFormState>(field: K, value: SourceFormState[K]) => {
    setSourceForm((current) => ({ ...current, [field]: value }))
  }

  const updateIssueField = <K extends keyof IssueFormState>(field: K, value: IssueFormState[K]) => {
    setIssueForm((current) => ({ ...current, [field]: value }))
  }

  const selectDraft = (draft: StudioDraft) => {
    setSelectedDraftId(draft.id)
    setDraftForm(draftToForm(draft))
    setStatusText(`正在编辑：${draft.title}`)
  }

  const newDraft = () => {
    setSelectedDraftId('')
    setDraftForm(defaultDraftForm)
    setStatusText('已切换到新建草稿。')
  }

  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!adminToken) {
      setStatusText('请先保存 Studio token。')
      return
    }

    const payload = {
      title: draftForm.title.trim(),
      slug: draftForm.slug.trim(),
      column: draftForm.column,
      tag: draftForm.tag.trim(),
      detail: draftForm.detail.trim(),
      readTime: draftForm.readTime.trim(),
      bodyJson: bodyJsonFromText(draftForm.bodyText),
      knowledgePoints: splitList(draftForm.knowledgePointsText),
      projectIds: splitList(draftForm.projectIdsText),
      visibility: draftForm.visibility,
      aiAssistance: draftForm.aiAssistance.trim() || 'none',
      createdBy: draftForm.editorName.trim(),
      updatedBy: draftForm.editorName.trim(),
    }

    setIsSavingDraft(true)
    setStatusText('')
    try {
      const result = await requestStudioApi(
        selectedDraft ? `/content-drafts/${selectedDraft.id}` : '/content-drafts',
        adminToken,
        {
          method: selectedDraft ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      )
      if (!result.ok) {
        setStatusText(explainStudioApiError(result.status, readStudioError(result.payload)))
        return
      }
      const nextDraft = getDraftFromPayload(result.payload)
      if (!nextDraft) {
        setStatusText('Studio API 返回的草稿格式不完整。')
        return
      }
      setDrafts((current) => [nextDraft, ...current.filter((draft) => draft.id !== nextDraft.id)])
      setSelectedDraftId(nextDraft.id)
      setDraftForm(draftToForm(nextDraft))
      setStatusText(selectedDraft ? '草稿已保存。' : '草稿已创建。')
    } catch {
      setStatusText('无法连接 Studio API。')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const reviewDraft = async (status: 'approved' | 'needs-changes' | 'rejected') => {
    if (!selectedDraft || !adminToken) return
    const result = await requestStudioApi(`/content-drafts/${selectedDraft.id}/reviews`, adminToken, {
      method: 'POST',
      body: JSON.stringify({
        status,
        reviewedBy: draftForm.editorName.trim(),
        notes: status === 'approved' ? '通过 Studio 第一版审核。' : '需要继续编辑后再发布。',
        checklist: {
          sourceChecked: true,
          safetyChecked: true,
          publicReady: status === 'approved',
        },
      }),
    })
    if (!result.ok) {
      setStatusText(explainStudioApiError(result.status, readStudioError(result.payload)))
      return
    }
    const nextDraft = getDraftFromPayload(result.payload)
    if (nextDraft) {
      setDrafts((current) => [nextDraft, ...current.filter((draft) => draft.id !== nextDraft.id)])
      setSelectedDraftId(nextDraft.id)
      setStatusText(`审核状态已更新：${studioDraftStatuses[nextDraft.status]}`)
    }
  }

  const createPublishExport = async () => {
    if (!selectedDraft || !adminToken) return
    const result = await requestStudioApi(`/content-drafts/${selectedDraft.id}/publish-exports`, adminToken, {
      method: 'POST',
      body: JSON.stringify({
        target: 'static-blog-data',
        exportedBy: draftForm.editorName.trim(),
      }),
    })
    setStatusText(
      result.ok
        ? '已创建发布导出记录；实际写入公开数据会在导出器切片完成。'
        : explainStudioApiError(result.status, readStudioError(result.payload)),
    )
  }

  const saveSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!adminToken) {
      setStatusText('请先保存 Studio token。')
      return
    }

    setIsSavingSource(true)
    try {
      const result = await requestStudioApi('/source-items', adminToken, {
        method: 'POST',
        body: JSON.stringify({
          title: sourceForm.title,
          url: sourceForm.url,
          sourceName: sourceForm.sourceName,
          sourceTier: sourceForm.sourceTier,
          language: sourceForm.language,
          publishedAt: sourceForm.publishedAt,
          summary: sourceForm.summary,
          tags: splitList(sourceForm.tagsText),
        }),
      })
      if (!result.ok) {
        setStatusText(explainStudioApiError(result.status, readStudioError(result.payload)))
        return
      }
      const source = getSourceFromPayload(result.payload)
      if (!source) {
        setStatusText('Studio API 返回的来源格式不完整。')
        return
      }
      setSources((current) => [source, ...current])
      setSourceForm(defaultSourceForm)
      setStatusText('来源已保存。')
    } catch {
      setStatusText('无法连接 Studio API。')
    } finally {
      setIsSavingSource(false)
    }
  }

  const appendSourceToIssue = (sourceId: string) => {
    const ids = new Set(splitList(issueForm.sourceIdsText))
    ids.add(sourceId)
    updateIssueField('sourceIdsText', Array.from(ids).join('\n'))
  }

  const saveIssue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!adminToken) {
      setStatusText('请先保存 Studio token。')
      return
    }

    setIsSavingIssue(true)
    try {
      const result = await requestStudioApi('/ai-daily/issues', adminToken, {
        method: 'POST',
        body: JSON.stringify({
          date: issueForm.date,
          title: issueForm.title,
          sourceIds: splitList(issueForm.sourceIdsText),
        }),
      })
      if (!result.ok) {
        setStatusText(explainStudioApiError(result.status, readStudioError(result.payload)))
        return
      }
      const issue = getIssueFromPayload(result.payload)
      if (!issue) {
        setStatusText('Studio API 返回的 AI 日报 issue 格式不完整。')
        return
      }
      setIssues((current) => [issue, ...current])
      setIssueForm(defaultIssueForm())
      setStatusText('AI 日报 issue 已创建。')
    } catch {
      setStatusText('无法连接 Studio API。')
    } finally {
      setIsSavingIssue(false)
    }
  }

  const canExport = selectedDraft?.status === 'approved'

  return (
    <main className="studio-page page-stack">
      <section className="section-header page-hero">
        <p className="section-subtitle">CONTENT STUDIO</p>
        <h1 className="section-title">内容工作台</h1>
        <p className="section-description">
          面向站长的内部编辑面：先把博客、AI 日报来源和审核状态存进数据库，再导出到公开静态内容。
        </p>
      </section>

      <section className="studio-control-bar">
        <form className="assistant-admin-form studio-token-form" onSubmit={saveToken}>
          <label className="assistant-field">
            <span>Studio token</span>
            <input
              type="password"
              value={draftToken}
              onChange={(event) => setDraftToken(event.target.value)}
              placeholder="粘贴 STUDIO_ADMIN_TOKEN 或 ADMIN_TOKEN"
              autoComplete="off"
            />
          </label>
          <div className="assistant-admin-actions">
            <button type="submit">保存并连接</button>
            <button type="button" onClick={clearToken}>
              清除
            </button>
            <button type="button" onClick={() => void loadStudio(adminToken)} disabled={isLoading || !adminToken}>
              {isLoading ? '刷新中…' : '刷新数据'}
            </button>
          </div>
        </form>
        <div className="studio-health">
          <span className="assistant-chip">{STUDIO_API_BASE ? 'API base 已配置' : 'API base 未配置'}</span>
          <span className="assistant-chip">{health?.database ? '数据库在线' : '数据库未确认'}</span>
          <span className="assistant-chip">{health?.publishMode || 'static-export'}</span>
        </div>
        {statusText && <p className="assistant-status-text">{statusText}</p>}
      </section>

      <section className="studio-grid">
        <aside className="studio-card studio-list-panel">
          <div className="studio-card__header">
            <div>
              <p className="assistant-panel__eyebrow">DRAFTS</p>
              <h2>草稿箱</h2>
            </div>
            <button type="button" onClick={newDraft}>
              新建
            </button>
          </div>

          <div className="studio-draft-list">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                className={`studio-draft-item ${draft.id === selectedDraftId ? 'is-active' : ''}`}
                onClick={() => selectDraft(draft)}
              >
                <strong>{draft.title}</strong>
                <span>{draft.slug}</span>
                <em>
                  {blogColumnMeta[draft.column as BlogColumn]?.titleZh ?? draft.column} · {studioDraftStatuses[draft.status]}
                </em>
              </button>
            ))}
            {drafts.length === 0 && <p className="assistant-status-text">还没有数据库草稿。</p>}
          </div>
        </aside>

        <section className="studio-editor-stack">
          <section className="studio-card studio-editor">
            <div className="studio-card__header">
              <div>
                <p className="assistant-panel__eyebrow">BLOG EDITOR</p>
                <h2>{selectedDraft ? '编辑草稿' : '新建草稿'}</h2>
              </div>
              {selectedDraft && <span className="studio-status-pill">{studioDraftStatuses[selectedDraft.status]}</span>}
            </div>

            <form className="studio-form" onSubmit={saveDraft}>
              <div className="studio-form-grid">
                <label className="assistant-field">
                  <span>标题</span>
                  <input
                    value={draftForm.title}
                    onChange={(event) => {
                      const title = event.target.value
                      updateDraftField('title', title)
                      if (!selectedDraft && !draftForm.slug) updateDraftField('slug', slugify(title))
                    }}
                    placeholder="写一个访客可读的技术标题"
                  />
                </label>
                <label className="assistant-field">
                  <span>Slug</span>
                  <input
                    value={draftForm.slug}
                    onChange={(event) => updateDraftField('slug', event.target.value)}
                    placeholder="agentic-rag-notes"
                  />
                </label>
                <label className="assistant-field">
                  <span>栏目</span>
                  <select
                    value={draftForm.column}
                    onChange={(event) => updateDraftField('column', event.target.value as BlogColumn)}
                  >
                    {blogColumnOrder.map((column) => (
                      <option key={column} value={column}>
                        {blogColumnMeta[column].titleZh} / {blogColumnMeta[column].titleEn}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="assistant-field">
                  <span>可见性</span>
                  <select
                    value={draftForm.visibility}
                    onChange={(event) => updateDraftField('visibility', event.target.value as StudioVisibility)}
                  >
                    {Object.entries(studioVisibilityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="assistant-field">
                  <span>标签</span>
                  <input value={draftForm.tag} onChange={(event) => updateDraftField('tag', event.target.value)} />
                </label>
                <label className="assistant-field">
                  <span>阅读时间</span>
                  <input value={draftForm.readTime} onChange={(event) => updateDraftField('readTime', event.target.value)} />
                </label>
              </div>

              <label className="assistant-field">
                <span>摘要</span>
                <textarea
                  value={draftForm.detail}
                  onChange={(event) => updateDraftField('detail', event.target.value)}
                  rows={3}
                  placeholder="公开列表里的文章摘要，必须能解释读者为什么要点开"
                />
              </label>

              <label className="assistant-field">
                <span>正文草稿</span>
                <textarea
                  value={draftForm.bodyText}
                  onChange={(event) => updateDraftField('bodyText', event.target.value)}
                  rows={12}
                  placeholder="用空行分段；支持 ## 标题、- 列表、![alt](url)、```mermaid 代码块。"
                />
              </label>

              <div className="studio-form-grid">
                <label className="assistant-field">
                  <span>知识点</span>
                  <textarea
                    value={draftForm.knowledgePointsText}
                    onChange={(event) => updateDraftField('knowledgePointsText', event.target.value)}
                    rows={4}
                    placeholder="每行一个知识点"
                  />
                </label>
                <label className="assistant-field">
                  <span>关联项目 ID</span>
                  <textarea
                    value={draftForm.projectIdsText}
                    onChange={(event) => updateDraftField('projectIdsText', event.target.value)}
                    rows={4}
                    placeholder="blog-semi&#10;legal-rag"
                  />
                </label>
              </div>

              <div className="studio-form-grid">
                <label className="assistant-field">
                  <span>AI 辅助方式</span>
                  <select
                    value={draftForm.aiAssistance}
                    onChange={(event) => updateDraftField('aiAssistance', event.target.value)}
                  >
                    <option value="none">none</option>
                    <option value="summary-assisted">summary-assisted</option>
                    <option value="draft-assisted">draft-assisted</option>
                    <option value="polish-assisted">polish-assisted</option>
                  </select>
                </label>
                <label className="assistant-field">
                  <span>编辑者</span>
                  <input
                    value={draftForm.editorName}
                    onChange={(event) => updateDraftField('editorName', event.target.value)}
                    placeholder="站长"
                  />
                </label>
              </div>

              <div className="assistant-admin-actions studio-actions">
                <button type="submit" disabled={isSavingDraft || !adminToken}>
                  {isSavingDraft ? '保存中…' : selectedDraft ? '保存草稿' : '创建草稿'}
                </button>
                <button type="button" disabled={!selectedDraft} onClick={() => void reviewDraft('needs-changes')}>
                  标记待修
                </button>
                <button type="button" disabled={!selectedDraft} onClick={() => void reviewDraft('approved')}>
                  审核通过
                </button>
                <button type="button" disabled={!canExport} onClick={() => void createPublishExport()}>
                  创建导出记录
                </button>
              </div>
            </form>
          </section>

          <StudioDraftPreview
            title={draftForm.title}
            slug={draftForm.slug}
            column={draftForm.column}
            tag={draftForm.tag}
            detail={draftForm.detail}
            readTime={draftForm.readTime}
            date={previewDate}
            body={previewBody}
            knowledgePoints={previewKnowledgePoints}
            projectIds={previewProjectIds}
            statusLabel={selectedDraft ? studioDraftStatuses[selectedDraft.status] : '未保存'}
            visibilityLabel={studioVisibilityLabels[draftForm.visibility]}
            aiAssistance={draftForm.aiAssistance}
          />
        </section>

        <aside className="studio-side-stack">
          <article className="studio-card">
            <div className="studio-card__header">
              <div>
                <p className="assistant-panel__eyebrow">SOURCES</p>
                <h2>来源池</h2>
              </div>
            </div>
            <form className="studio-form" onSubmit={saveSource}>
              <label className="assistant-field">
                <span>来源标题</span>
                <input value={sourceForm.title} onChange={(event) => updateSourceField('title', event.target.value)} />
              </label>
              <label className="assistant-field">
                <span>公开 URL</span>
                <input value={sourceForm.url} onChange={(event) => updateSourceField('url', event.target.value)} />
              </label>
              <div className="studio-form-grid">
                <label className="assistant-field">
                  <span>来源名</span>
                  <input
                    value={sourceForm.sourceName}
                    onChange={(event) => updateSourceField('sourceName', event.target.value)}
                    placeholder="OpenAI Blog"
                  />
                </label>
                <label className="assistant-field">
                  <span>等级</span>
                  <select
                    value={sourceForm.sourceTier}
                    onChange={(event) => updateSourceField('sourceTier', event.target.value as StudioSourceTier)}
                  >
                    {Object.entries(studioSourceTierLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="assistant-field">
                <span>摘要</span>
                <textarea
                  value={sourceForm.summary}
                  onChange={(event) => updateSourceField('summary', event.target.value)}
                  rows={4}
                />
              </label>
              <label className="assistant-field">
                <span>标签</span>
                <input
                  value={sourceForm.tagsText}
                  onChange={(event) => updateSourceField('tagsText', event.target.value)}
                  placeholder="model, release"
                />
              </label>
              <button type="submit" disabled={isSavingSource || !adminToken}>
                {isSavingSource ? '保存中…' : '保存来源'}
              </button>
            </form>
            <div className="studio-source-list">
              {sortedSources.slice(0, 6).map((source) => (
                <button key={source.id} type="button" onClick={() => appendSourceToIssue(source.id)}>
                  <strong>{source.title}</strong>
                  <span>{studioSourceTierLabels[source.sourceTier]}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="studio-card">
            <div className="studio-card__header">
              <div>
                <p className="assistant-panel__eyebrow">AI DAILY</p>
                <h2>日报 Issue</h2>
              </div>
            </div>
            <form className="studio-form" onSubmit={saveIssue}>
              <div className="studio-form-grid">
                <label className="assistant-field">
                  <span>日期</span>
                  <input value={issueForm.date} onChange={(event) => updateIssueField('date', event.target.value)} />
                </label>
                <label className="assistant-field">
                  <span>标题</span>
                  <input value={issueForm.title} onChange={(event) => updateIssueField('title', event.target.value)} />
                </label>
              </div>
              <label className="assistant-field">
                <span>来源 ID</span>
                <textarea
                  value={issueForm.sourceIdsText}
                  onChange={(event) => updateIssueField('sourceIdsText', event.target.value)}
                  rows={4}
                  placeholder="点击上方来源可追加，也可以每行粘贴一个 source id"
                />
              </label>
              <button type="submit" disabled={isSavingIssue || !adminToken}>
                {isSavingIssue ? '创建中…' : '创建 Issue'}
              </button>
            </form>
            <div className="studio-issue-list">
              {issues.slice(0, 5).map((issue) => (
                <Link key={issue.id} className="studio-issue-card" to={`/studio/ai-daily/${issue.id}`}>
                  <strong>{issue.title}</strong>
                  <span>
                    {issue.date} · {studioAiDailyIssueStatusLabels[issue.status]} · {issue.sourceIds.length} sources
                  </span>
                </Link>
              ))}
            </div>
          </article>

          <article className="studio-card">
            <p className="assistant-panel__eyebrow">PUBLISH GATE</p>
            <h2>发布边界</h2>
            <ul className="assistant-admin-list">
              <li>数据库草稿不会直接出现在公开站。</li>
              <li>审核通过后只创建导出记录，实际写文件由后续导出器完成。</li>
              <li>模型辅助默认关闭，真实调用必须按具体内容任务批准。</li>
              <li>来源和正文会拦截明显 token、key 和数据库连接串。</li>
            </ul>
            {selectedDraft && (
              <p className="assistant-status-text">
                当前草稿更新于 {formatDateTime(selectedDraft.updatedAt)}，状态为 {studioDraftStatuses[selectedDraft.status]}。
              </p>
            )}
          </article>
        </aside>
      </section>
    </main>
  )
}
