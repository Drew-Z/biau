import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  STUDIO_STORAGE_KEYS,
  normalizeStudioIssueDetail,
  normalizeStudioSources,
  readStoredStudioToken,
  readStudioError,
  studioAiDailyIssueStatusLabels,
  studioDraftStatuses,
  studioSourceTierLabels,
  type StudioAiDailyIssue,
  type StudioAiDailyIssueStatus,
  type StudioDraft,
  type StudioSourceItem,
} from '../data/studio'
import {
  aiDailyBriefFieldLabels,
  createDefaultAiDailyBrief,
  evaluateAiDailyIssueReadiness,
  formatAiDailyBrief,
  parseAiDailyBriefText,
} from '../utils/studioAiDailyBrief'
import { STUDIO_API_BASE, STUDIO_API_ENV_NAMES, explainStudioApiError, requestStudioApi } from '../utils/studioApi'

interface IssueFormState {
  title: string
  date: string
  status: StudioAiDailyIssueStatus
  sourceIds: string[]
  briefText: string
  editorName: string
}

const issueStatusOrder: StudioAiDailyIssueStatus[] = [
  'source-collected',
  'extracted',
  'summarized',
  'synthesized',
  'review-needed',
  'approved',
  'published',
  'rejected',
  'needs-more-evidence',
]

const reviewReadyIssueStatuses = new Set<StudioAiDailyIssueStatus>(['review-needed', 'approved', 'published'])

function defaultForm(): IssueFormState {
  return {
    title: '',
    date: '',
    status: 'source-collected',
    sourceIds: [],
    briefText: formatAiDailyBrief(createDefaultAiDailyBrief()),
    editorName: '站长',
  }
}

function issueToForm(issue: StudioAiDailyIssue): IssueFormState {
  return {
    title: issue.title,
    date: issue.date,
    status: issue.status,
    sourceIds: issue.sourceIds,
    briefText: formatAiDailyBrief(issue.briefJson),
    editorName: '站长',
  }
}

function formatDateTime(value: string) {
  if (!value) return '未知'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function getSourceMeta(source: StudioSourceItem) {
  return [
    studioSourceTierLabels[source.sourceTier],
    source.language,
    source.publishedAt ? source.publishedAt.slice(0, 10) : '待复核日期',
  ]
    .filter(Boolean)
    .join(' · ')
}

function sameStringList(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

export function StudioAiDailyIssuePage() {
  const { issueId } = useParams()
  const [adminToken, setAdminToken] = useState(() => readStoredStudioToken())
  const [draftToken, setDraftToken] = useState(() => readStoredStudioToken())
  const [issue, setIssue] = useState<StudioAiDailyIssue | null>(null)
  const [linkedDraft, setLinkedDraft] = useState<StudioDraft | null>(null)
  const [selectedSources, setSelectedSources] = useState<StudioSourceItem[]>([])
  const [sourcePool, setSourcePool] = useState<StudioSourceItem[]>([])
  const [form, setForm] = useState<IssueFormState>(() => defaultForm())
  const [statusText, setStatusText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

  const selectedSourceIdSet = useMemo(() => new Set(form.sourceIds), [form.sourceIds])
  const availableSources = useMemo(
    () =>
      sourcePool
        .filter((source) => !selectedSourceIdSet.has(source.id))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sourcePool, selectedSourceIdSet],
  )
  const orderedSelectedSources = useMemo(() => {
    const sourceMap = new Map([...selectedSources, ...sourcePool].map((source) => [source.id, source]))
    return form.sourceIds.map((sourceId) => sourceMap.get(sourceId)).filter((source): source is StudioSourceItem => Boolean(source))
  }, [form.sourceIds, selectedSources, sourcePool])
  const briefValidation = useMemo(() => parseAiDailyBriefText(form.briefText), [form.briefText])
  const issueReadiness = useMemo(
    () => evaluateAiDailyIssueReadiness({ briefValidation, sources: orderedSelectedSources }),
    [briefValidation, orderedSelectedSources],
  )
  const hasUnsavedIssueChanges = useMemo(() => {
    if (!issue) return false
    return (
      form.title !== issue.title ||
      form.date !== issue.date ||
      form.status !== issue.status ||
      form.briefText !== formatAiDailyBrief(issue.briefJson) ||
      !sameStringList(form.sourceIds, issue.sourceIds)
    )
  }, [form, issue])

  const applyDetailPayload = (payload: unknown) => {
    const detail = normalizeStudioIssueDetail(payload)
    if (!detail) {
      setStatusText('Studio API 返回的 issue 详情格式不完整。')
      return false
    }
    setIssue(detail.issue)
    setLinkedDraft(detail.draft)
    setSelectedSources(detail.sources)
    setForm(issueToForm(detail.issue))
    return true
  }

  const loadIssue = useCallback(
    async (token: string) => {
      if (!issueId) {
        setStatusText('缺少 AI Daily issue id。')
        return
      }
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
        const [issueResult, sourceResult] = await Promise.all([
          requestStudioApi(`/ai-daily/issues/${issueId}`, token),
          requestStudioApi('/source-items', token),
        ])
        if (!issueResult.ok) {
          setStatusText(explainStudioApiError(issueResult.status, readStudioError(issueResult.payload)))
          return
        }
        if (!applyDetailPayload(issueResult.payload)) return
        if (sourceResult.ok) setSourcePool(normalizeStudioSources(sourceResult.payload))
        setStatusText('AI 日报 issue 详情已刷新。')
      } catch {
        setStatusText('无法连接 Studio API。')
      } finally {
        setIsLoading(false)
      }
    },
    [issueId],
  )

  useEffect(() => {
    if (!adminToken) return undefined
    const timer = window.setTimeout(() => {
      void loadIssue(adminToken)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [adminToken, loadIssue])

  const saveToken = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = draftToken.trim()
    setAdminToken(token)
    if (token) {
      window.localStorage.setItem(STUDIO_STORAGE_KEYS.adminToken, token)
      setStatusText('Studio token 已保存在当前浏览器。')
      void loadIssue(token)
    } else {
      window.localStorage.removeItem(STUDIO_STORAGE_KEYS.adminToken)
      setStatusText('Studio token 已清除。')
    }
  }

  const updateForm = <K extends keyof IssueFormState>(field: K, value: IssueFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const resetBriefTemplate = () => {
    updateForm('briefText', formatAiDailyBrief(createDefaultAiDailyBrief()))
    setStatusText('已套用推荐 brief 模板。')
  }

  const addSource = (sourceId: string) => {
    setForm((current) => {
      if (current.sourceIds.includes(sourceId)) return current
      return { ...current, sourceIds: [...current.sourceIds, sourceId] }
    })
    setStatusText('来源已加入本地选择，保存 Issue 后写入数据库。')
  }

  const removeSource = (sourceId: string) => {
    setForm((current) => ({ ...current, sourceIds: current.sourceIds.filter((id) => id !== sourceId) }))
    setStatusText('来源已从本地选择移除，保存 Issue 后写入数据库。')
  }

  const saveIssue = async (nextStatus?: StudioAiDailyIssueStatus) => {
    if (!adminToken || !issueId) {
      setStatusText('请先保存 Studio token。')
      return
    }

    const parsedBrief = parseAiDailyBriefText(form.briefText)
    if (parsedBrief.hasErrors || !parsedBrief.brief) {
      const firstError = parsedBrief.issues.find((issue) => issue.level === 'error')
      setStatusText(firstError?.message ?? 'brief JSON 不是有效对象，请先修正格式。')
      return
    }
    const targetStatus = nextStatus ?? form.status
    if (reviewReadyIssueStatuses.has(targetStatus) && issueReadiness.hasErrors) {
      const firstError = issueReadiness.issues.find((issue) => issue.level === 'error')
      setStatusText(firstError?.message ?? '进入审核前需要补齐 brief 和来源证据。')
      return
    }

    setIsSaving(true)
    setStatusText('')
    try {
      const result = await requestStudioApi(`/ai-daily/issues/${issueId}`, adminToken, {
        method: 'PATCH',
        body: JSON.stringify({
          title: form.title,
          date: form.date,
          status: nextStatus ?? form.status,
          sourceIds: form.sourceIds,
          briefJson: parsedBrief.brief,
        }),
      })
      if (!result.ok) {
        setStatusText(explainStudioApiError(result.status, readStudioError(result.payload)))
        return
      }
      if (!applyDetailPayload(result.payload)) return
      setStatusText(nextStatus === 'review-needed' ? 'AI 日报 issue 已进入待审核。' : 'AI 日报 issue 已保存。')
    } catch {
      setStatusText('无法连接 Studio API。')
    } finally {
      setIsSaving(false)
    }
  }

  const saveIssueFromForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void saveIssue()
  }

  const convertToDraft = async () => {
    if (!adminToken || !issueId) {
      setStatusText('请先保存 Studio token。')
      return
    }
    if (hasUnsavedIssueChanges) {
      setStatusText('请先保存当前 issue，再转换为内容草稿。')
      return
    }
    if (issueReadiness.hasErrors) {
      const firstError = issueReadiness.issues.find((issue) => issue.level === 'error')
      setStatusText(firstError?.message ?? '进入草稿前需要补齐 brief 和来源证据。')
      return
    }
    setIsConverting(true)
    setStatusText('')
    try {
      const result = await requestStudioApi(`/ai-daily/issues/${issueId}/content-draft`, adminToken, {
        method: 'POST',
        body: JSON.stringify({ editorName: form.editorName }),
      })
      if (!result.ok) {
        setStatusText(explainStudioApiError(result.status, readStudioError(result.payload)))
        return
      }
      if (!applyDetailPayload(result.payload)) return
      setStatusText('已根据本期来源创建 AI 日报内容草稿，可返回 Studio 草稿箱继续预览和审核。')
    } catch {
      setStatusText('无法连接 Studio API。')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <main className="studio-page studio-issue-page page-stack">
      <section className="section-header page-hero">
        <p className="section-subtitle">AI DAILY ISSUE</p>
        <h1 className="section-title">{issue?.title || 'AI 日报详情'}</h1>
        <p className="section-description">
          在一期日报里完成来源选择、brief 草稿、审核状态和内容草稿转换。公开发布仍由审核后的静态导出流程完成。
        </p>
        <div className="detail-quick-links">
          <Link className="link-badge link-badge--internal" to="/studio">
            返回内容工作台
          </Link>
        </div>
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
            <button type="button" onClick={() => void loadIssue(adminToken)} disabled={isLoading || !adminToken}>
              {isLoading ? '刷新中…' : '刷新详情'}
            </button>
          </div>
        </form>
        {statusText && <p className="assistant-status-text">{statusText}</p>}
      </section>

      <section className="studio-issue-layout">
        <section className="studio-card studio-issue-editor">
          <div className="studio-card__header">
            <div>
              <p className="assistant-panel__eyebrow">ISSUE META</p>
              <h2>期刊状态与 brief</h2>
            </div>
            {issue && <span className="studio-status-pill">{studioAiDailyIssueStatusLabels[issue.status]}</span>}
          </div>

          <form className="studio-form" onSubmit={saveIssueFromForm}>
            <div className="studio-form-grid">
              <label className="assistant-field">
                <span>标题</span>
                <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
              </label>
              <label className="assistant-field">
                <span>日期</span>
                <input value={form.date} onChange={(event) => updateForm('date', event.target.value)} />
              </label>
            </div>
            <div className="studio-form-grid">
              <label className="assistant-field">
                <span>状态</span>
                <select
                  value={form.status}
                  onChange={(event) => updateForm('status', event.target.value as StudioAiDailyIssueStatus)}
                >
                  {issueStatusOrder.map((status) => (
                    <option key={status} value={status}>
                      {studioAiDailyIssueStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="assistant-field">
                <span>编辑者</span>
                <input value={form.editorName} onChange={(event) => updateForm('editorName', event.target.value)} />
              </label>
            </div>
            <label className="assistant-field">
              <span>Issue brief JSON</span>
              <textarea
                value={form.briefText}
                onChange={(event) => updateForm('briefText', event.target.value)}
                rows={14}
                spellCheck={false}
                placeholder={formatAiDailyBrief(createDefaultAiDailyBrief())}
              />
            </label>
            <div
              className={`studio-brief-quality ${
                briefValidation.hasErrors ? 'is-error' : briefValidation.hasWarnings ? 'is-warning' : 'is-ready'
              }`}
            >
              <div>
                <strong>{briefValidation.hasErrors ? 'brief 需要修正' : briefValidation.hasWarnings ? 'brief 待补充' : 'brief 可进入审核'}</strong>
                <span>
                  {briefValidation.hasErrors
                    ? '保存前先修复阻塞错误。'
                    : briefValidation.hasWarnings
                      ? '结构可保存，但建议继续补充编辑判断。'
                      : '字段完整，适合进入下一步人工审核。'}
                </span>
              </div>
              <button type="button" onClick={resetBriefTemplate}>
                套用模板
              </button>
              <ul>
                {(briefValidation.issues.length > 0
                  ? briefValidation.issues
                  : (Object.keys(aiDailyBriefFieldLabels) as Array<keyof typeof aiDailyBriefFieldLabels>).map((field) => ({
                      level: 'ready' as const,
                      field,
                      message: `${aiDailyBriefFieldLabels[field]} 已就绪。`,
                    }))
                ).map((issue) => (
                  <li key={`${issue.field}-${issue.message}`} className={`is-${issue.level}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={`studio-brief-quality ${
                issueReadiness.hasErrors ? 'is-error' : issueReadiness.hasWarnings || hasUnsavedIssueChanges ? 'is-warning' : 'is-ready'
              }`}
            >
              <div>
                <strong>
                  {issueReadiness.hasErrors
                    ? 'Issue 尚未准备好'
                    : hasUnsavedIssueChanges
                      ? 'Issue 有未保存修改'
                      : issueReadiness.hasWarnings
                        ? 'Issue 可进入审核，但仍建议补强'
                        : 'Issue 已满足审核入口'}
                </strong>
                <span>
                  {issueReadiness.hasErrors
                    ? '进入审核或转草稿前，先补齐 brief 和来源证据。'
                    : hasUnsavedIssueChanges
                      ? '转草稿会读取服务端已保存内容，请先保存当前修改。'
                      : issueReadiness.hasWarnings
                        ? '可以继续推进，但发布前应复核来源质量。'
                        : 'brief、来源和证据骨架都已满足本地门禁。'}
                </span>
              </div>
              <span className="studio-status-pill">
                {issueReadiness.usefulSourceCount}/{issueReadiness.sourceCount} sources
              </span>
              <ul>
                {[
                  ...issueReadiness.issues,
                  ...(hasUnsavedIssueChanges
                    ? [{ level: 'warning' as const, field: 'sources' as const, message: '当前表单存在未保存修改，转草稿前需要先保存。' }]
                    : []),
                  ...(issueReadiness.issues.length === 0 && !hasUnsavedIssueChanges
                    ? [
                        { level: 'ready' as const, field: 'brief' as const, message: 'brief 字段已满足审核入口。' },
                        { level: 'ready' as const, field: 'sources' as const, message: '来源证据可以写入隐藏审核草稿。' },
                      ]
                    : []),
                ].map((issue) => (
                  <li key={`${issue.field}-${issue.message}`} className={`is-${issue.level}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
            <div className="assistant-admin-actions studio-actions">
              <button type="submit" disabled={isSaving || !adminToken}>
                {isSaving ? '保存中…' : '保存 Issue'}
              </button>
              <button
                type="button"
                disabled={isSaving || !adminToken || issueReadiness.hasErrors}
                onClick={() => void saveIssue('review-needed')}
              >
                进入审核
              </button>
              <button
                type="button"
                disabled={isConverting || !adminToken || issueReadiness.hasErrors || hasUnsavedIssueChanges}
                onClick={() => void convertToDraft()}
              >
                {isConverting ? '转换中…' : '转为内容草稿'}
              </button>
            </div>
          </form>
        </section>

        <aside className="studio-side-stack">
          <article className="studio-card">
            <p className="assistant-panel__eyebrow">CURRENT ISSUE</p>
            <h2>元信息</h2>
            <dl className="studio-issue-facts">
              <div>
                <dt>Issue ID</dt>
                <dd>{issue?.id ?? issueId ?? '未知'}</dd>
              </div>
              <div>
                <dt>来源数量</dt>
                <dd>{form.sourceIds.length}</dd>
              </div>
              <div>
                <dt>更新时间</dt>
                <dd>{issue ? formatDateTime(issue.updatedAt) : '未载入'}</dd>
              </div>
              <div>
                <dt>草稿链接</dt>
                <dd>{linkedDraft ? `${linkedDraft.slug} · ${studioDraftStatuses[linkedDraft.status]}` : '尚未转换'}</dd>
              </div>
            </dl>
          </article>

          <article className="studio-card">
            <p className="assistant-panel__eyebrow">DRAFT GATE</p>
            <h2>转换边界</h2>
            <ul className="assistant-admin-list">
              <li>转草稿只生成 hidden + review-needed 的 AI 日报草稿。</li>
              <li>AI 辅助方式记录为 none，不会调用模型。</li>
              <li>来源卡会写入正文块，后续在草稿预览里继续编辑。</li>
              <li>公开发布仍需要人工审核和 static export。</li>
            </ul>
          </article>
        </aside>
      </section>

      <section className="studio-issue-layout">
        <section className="studio-card">
          <div className="studio-card__header">
            <div>
              <p className="assistant-panel__eyebrow">SELECTED SOURCES</p>
              <h2>本期来源</h2>
            </div>
          </div>
          <div className="studio-source-cards">
            {orderedSelectedSources.map((source) => (
              <article key={source.id} className="studio-source-card">
                <div>
                  <span className="studio-status-pill">{getSourceMeta(source)}</span>
                  <h3>{source.title}</h3>
                  <p>{source.summary || '还没有摘要，进入草稿前需要补充。'}</p>
                </div>
                <div className="studio-source-card__footer">
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    打开来源
                  </a>
                  <span>{source.tags.join('、') || source.sourceName}</span>
                  <button type="button" onClick={() => removeSource(source.id)}>
                    移除
                  </button>
                </div>
              </article>
            ))}
            {orderedSelectedSources.length === 0 && <p className="assistant-status-text">本期还没有选择来源。</p>}
          </div>
        </section>

        <aside className="studio-card">
          <div className="studio-card__header">
            <div>
              <p className="assistant-panel__eyebrow">SOURCE POOL</p>
              <h2>可加入来源</h2>
            </div>
          </div>
          <div className="studio-source-list">
            {availableSources.slice(0, 24).map((source) => (
              <button key={source.id} type="button" onClick={() => addSource(source.id)}>
                <strong>{source.title}</strong>
                <span>{getSourceMeta(source)}</span>
              </button>
            ))}
            {availableSources.length === 0 && <p className="assistant-status-text">没有可加入的来源，或来源池尚未载入。</p>}
          </div>
        </aside>
      </section>
    </main>
  )
}
