import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileStack, PencilLine, Wrench } from 'lucide-react'
import { StudioDraftPreview } from '../components/StudioDraftPreview'
import { blogColumnMeta, blogColumnOrder, type BlogColumn } from '../data/blog'
import { projects } from '../data/portfolio'
import { reliabilityProjects } from '../data/statusTargets'
import {
  STUDIO_STORAGE_KEYS,
  normalizeStudioDraft,
  normalizeStudioDrafts,
  normalizeStudioHealth,
  normalizeStudioIssue,
  normalizeStudioIssues,
  normalizeStudioPublishExport,
  normalizeStudioPublishExports,
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
  type StudioPublishExport,
  type StudioSourceItem,
  type StudioSourceTier,
  type StudioVisibility,
} from '../data/studio'
import { bodyJsonFromText, textFromBodyJson } from '../utils/studioDraftBody'
import { createProjectDetailDraftTemplate } from '../utils/studioProjectDraft'
import {
  createResourceDraftTemplate,
  studioResourceDraftTypeLabels,
  type StudioResourceDraftType,
} from '../utils/studioResourceDraft'
import { createStatusDraftTemplate } from '../utils/studioStatusDraft'
import {
  STUDIO_API_BASE,
  STUDIO_API_ENV_NAMES,
  explainStudioApiError,
  explainStudioClientException,
  requestStudioApi,
} from '../utils/studioApi'

type StudioMobileWorkspaceView = 'drafts' | 'editor' | 'support'

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

interface ResourceTemplateFormState {
  title: string
  url: string
  resourceType: StudioResourceDraftType
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

const defaultResourceTemplateForm: ResourceTemplateFormState = {
  title: '',
  url: '',
  resourceType: 'tool',
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

function isStudioUiCheckFixture(searchParams: URLSearchParams) {
  if (searchParams.get('ui-check') !== 'review-queue') return false
  if (typeof window === 'undefined') return false
  return ['127.0.0.1', 'localhost'].includes(window.location.hostname)
}

function createStudioUiCheckDrafts(): StudioDraft[] {
  const baseDraft = {
    tag: 'UI Check',
    detail: '本地 UI 检查用草稿，只验证审核队列交互。',
    readTime: '3 min',
    bodyJson: {
      blocks: [
        {
          type: 'paragraph',
          text: '这是本地 UI 检查用正文，不会连接生产 Studio API。',
        },
      ],
    },
    knowledgePoints: ['审核队列', '本地 UI 检查'],
    projectIds: ['blog-semi'],
    aiAssistance: 'none',
    createdBy: 'ui-check',
    updatedBy: 'ui-check',
    publishedAt: null,
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    latestReview: null,
  } satisfies Omit<StudioDraft, 'id' | 'slug' | 'title' | 'column' | 'status' | 'visibility'>

  return [
    {
      ...baseDraft,
      id: 'ui-check-review-needed',
      slug: 'ui-check-review-needed',
      title: 'UI Check 待审核草稿',
      column: 'ai-daily',
      status: 'review-needed',
      visibility: 'hidden',
    },
    {
      ...baseDraft,
      id: 'ui-check-approved',
      slug: 'ui-check-approved',
      title: 'UI Check 已批准草稿',
      column: 'knowledge',
      status: 'approved',
      visibility: 'hidden',
    },
  ]
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

function getPublishExportFromPayload(payload: unknown) {
  return isRecord(payload) ? normalizeStudioPublishExport(payload.publishExport) : null
}

function formatDateTime(value: string) {
  if (!value) return '未知'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function readPublishExportStatus(checks: unknown) {
  if (!isRecord(checks)) return '未回写检查'
  const status = checks.status
  if (status === 'pending-local-export') return '等待本地导出'
  if (status === 'local-export-written') return '已写入，待检查'
  if (status === 'passed') return '检查通过'
  if (status === 'failed') return '检查失败'
  return typeof status === 'string' && status ? status : '已记录检查'
}

const reviewQueueStatuses = new Set<StudioDraft['status']>(['review-needed', 'approved', 'rejected'])

interface PageReviewPlan {
  kind: string
  title: string
  exportTarget: string
  description: string
  checks: string[]
}

function getPageReviewPlan(form: DraftFormState): PageReviewPlan {
  const projectIds = splitList(form.projectIdsText)
  if (form.slug.includes('-status-notes-update')) {
    return {
      kind: 'status-page',
      title: '状态页说明审核',
      exportTarget: 'src/data/statusTargets.ts update plan',
      description: '确认状态页只表达已观察、待接入或人工 gate 的事实，不伪造实时监控结论。',
      checks: [
        '已运行或准备运行 studio:status-plan，并人工比对 ReliabilityProject 更新候选。',
        '没有公开真实凭据、后台地址、模型渠道、数据库 URL、私有监控地址或敏感指标。',
        '入口可达、功能 synthetic、metrics 和 observability 分层表达清楚。',
        'planned、unchecked、degraded、online 等状态语义没有被混用。',
      ],
    }
  }

  if (form.slug.includes('-project-detail-update') || (form.column === 'project-notes' && projectIds.length === 1)) {
    return {
      kind: 'project-detail',
      title: '项目详情页审核',
      exportTarget: 'Project.detailContent / assistantContext plan',
      description: '确认项目详情页素材能进入公开案例页，但不会绕过 portfolio.ts 的 Git diff 审查。',
      checks: [
        '已运行或准备运行 studio:project-detail-plan，并人工确认 detailContent 更新范围。',
        '正文图片只使用公开安全路径，优先 /images/projects/，截图不含凭据或后台敏感信息。',
        'assistantContext 只包含可公开事实，不包含账号、密钥、私有路径或内部链接。',
        '项目不足、人工 gate 和后续路线没有被包装成已完成能力。',
      ],
    }
  }

  if (form.column === 'resources') {
    return {
      kind: 'resource-share',
      title: '资源分享审核',
      exportTarget: 'static-blog-data via studio:export',
      description: '确认资源分享有筛选理由、使用边界和公开证据，而不是无判断的链接清单。',
      checks: [
        '资源链接是公开 URL，已移除追踪参数、私有 token 和内部地址。',
        '正文包含个人判断、适用场景、使用方式、授权/成本/隐私注意事项。',
        '没有声称未亲自验证的 benchmark、使用结果或生产经验。',
        '导出时使用 resource 角色，并通过 blog:audit、blog:check、lint、build。',
      ],
    }
  }

  if (form.column === 'ai-daily') {
    return {
      kind: 'ai-daily',
      title: 'AI 日报审核',
      exportTarget: 'static-blog-data via studio:export',
      description: '确认每条动态都有公开来源和人工审核，不把 AI 输出当成事实本身。',
      checks: [
        '关键事实能回到公开来源链接，摘要没有复制长段原文。',
        '日报 issue、来源池和草稿状态已对齐，证据不足的内容不发布。',
        'aiAssistance 反映真实辅助方式，没有未经批准的模型调用。',
        '导出后运行 blog:audit、blog:check、lint、build。',
      ],
    }
  }

  return {
    kind: 'blog-post',
    title: '博客文章审核',
    exportTarget: 'static-blog-data via studio:export',
    description: '确认普通博客草稿能作为公开文章发布，并符合栏目边界和证据要求。',
    checks: [
      '标题、摘要、栏目、标签和正文结构与目标读者匹配。',
      '关键事实有来源或项目证据支撑，没有把猜测写成确定事实。',
      '没有泄露账号、密钥、生产 URL、私有路径、内部链接或敏感指标。',
      '导出后运行 blog:audit、blog:check、lint、build。',
    ],
  }
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

function normalizeDraftLookupTarget(value: string | null) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed || trimmed.length > 120 || !/^[a-z0-9_-]+$/iu.test(trimmed)) return ''
  return trimmed
}

function isAgenticWorkspaceDraft(draft: Pick<StudioDraft, 'aiAssistance'> | null) {
  return draft?.aiAssistance === 'agentic-workspace'
}

export function StudioPage() {
  const [searchParams] = useSearchParams()
  const draftLinkTarget = normalizeDraftLookupTarget(searchParams.get('draft'))
  const useStudioUiCheckFixture = isStudioUiCheckFixture(searchParams)
  const [adminToken, setAdminToken] = useState(() => readStoredStudioToken())
  const [draftToken, setDraftToken] = useState(() => readStoredStudioToken())
  const [health, setHealth] = useState<StudioHealth | null>(null)
  const [drafts, setDrafts] = useState<StudioDraft[]>([])
  const [sources, setSources] = useState<StudioSourceItem[]>([])
  const [issues, setIssues] = useState<StudioAiDailyIssue[]>([])
  const [publishExports, setPublishExports] = useState<StudioPublishExport[]>([])
  const [selectedDraftId, setSelectedDraftId] = useState('')
  const [mobileWorkspaceView, setMobileWorkspaceView] = useState<StudioMobileWorkspaceView>('editor')
  const [draftForm, setDraftForm] = useState<DraftFormState>(defaultDraftForm)
  const [sourceForm, setSourceForm] = useState<SourceFormState>(defaultSourceForm)
  const [issueForm, setIssueForm] = useState<IssueFormState>(() => defaultIssueForm())
  const [sourcePickerId, setSourcePickerId] = useState('')
  const [projectTemplateId, setProjectTemplateId] = useState(projects[0]?.id ?? '')
  const [resourceTemplateForm, setResourceTemplateForm] =
    useState<ResourceTemplateFormState>(defaultResourceTemplateForm)
  const [statusTemplateId, setStatusTemplateId] = useState(reliabilityProjects[0]?.id ?? '')
  const [statusText, setStatusText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSavingSource, setIsSavingSource] = useState(false)
  const [isSavingIssue, setIsSavingIssue] = useState(false)

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  )
  const reviewQueue = useMemo(
    () => drafts.filter((draft) => reviewQueueStatuses.has(draft.status)).slice(0, 6),
    [drafts],
  )
  const nextReviewDraft = useMemo(
    () => drafts.find((draft) => draft.status === 'review-needed') ?? drafts.find((draft) => reviewQueueStatuses.has(draft.status)) ?? null,
    [drafts],
  )
  const reviewMetrics = useMemo(
    () => ({
      hiddenReviewNeeded: drafts.filter((draft) => draft.status === 'review-needed' && draft.visibility === 'hidden').length,
      reviewNeeded: drafts.filter((draft) => draft.status === 'review-needed').length,
      approved: drafts.filter((draft) => draft.status === 'approved').length,
      rejected: drafts.filter((draft) => draft.status === 'rejected').length,
    }),
    [drafts],
  )

  const sortedSources = useMemo(
    () => [...sources].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sources],
  )
  const selectedIssueSourceIds = useMemo(() => splitList(issueForm.sourceIdsText), [issueForm.sourceIdsText])
  const selectedIssueSources = useMemo(() => {
    const sourceMap = new Map(sources.map((source) => [source.id, source]))
    return selectedIssueSourceIds
      .map((sourceId) => sourceMap.get(sourceId))
      .filter((source): source is StudioSourceItem => Boolean(source))
  }, [selectedIssueSourceIds, sources])
  const previewBody = useMemo(() => bodyJsonFromText(draftForm.bodyText), [draftForm.bodyText])
  const previewKnowledgePoints = useMemo(() => splitList(draftForm.knowledgePointsText), [draftForm.knowledgePointsText])
  const previewProjectIds = useMemo(() => splitList(draftForm.projectIdsText), [draftForm.projectIdsText])
  const pageReviewPlan = useMemo(() => getPageReviewPlan(draftForm), [draftForm])
  const previewDate = selectedDraft?.publishedAt?.slice(0, 10) || selectedDraft?.updatedAt?.slice(0, 10) || today()
  const displayStatusText =
    statusText || (draftLinkTarget && !adminToken ? '请先保存 Studio token，保存后会自动定位助手创建的草稿。' : '')

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
    setPublishExports([])
    window.localStorage.removeItem(STUDIO_STORAGE_KEYS.adminToken)
    setStatusText('Studio token 已清除。')
  }

  const loadStudio = useCallback(async (token: string) => {
    if (useStudioUiCheckFixture) {
      setHealth({ ok: true, service: 'ui-check-studio', database: true, auth: 'fixture', publishMode: 'static-export' })
      setDrafts(createStudioUiCheckDrafts())
      setSources([])
      setIssues([])
      setPublishExports([])
      setSelectedDraftId('')
      setStatusText('Studio UI check fixture 已加载。')
      return
    }

    if (!STUDIO_API_BASE) {
      setStatusText(`当前没有配置 ${STUDIO_API_ENV_NAMES.studio} 或 ${STUDIO_API_ENV_NAMES.legacy}。`)
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

      const [draftResult, sourceResult, issueResult, publishExportResult] = await Promise.all([
        requestStudioApi('/content-drafts', token),
        requestStudioApi('/source-items', token),
        requestStudioApi('/ai-daily/issues', token),
        requestStudioApi('/publish-exports', token),
      ])
      let nextStatusText = 'Studio 数据已刷新。'
      if (draftResult.ok) {
        const nextDrafts = normalizeStudioDrafts(draftResult.payload)
        setDrafts(nextDrafts)
        if (draftLinkTarget) {
          const matchedDraft = nextDrafts.find((draft) => draft.id === draftLinkTarget || draft.slug === draftLinkTarget)
          if (matchedDraft) {
            setSelectedDraftId(matchedDraft.id)
            setDraftForm(draftToForm(matchedDraft))
            nextStatusText = `已定位到助手创建的草稿：${matchedDraft.title}。仍需人工审核后才能发布。`
          } else {
            nextStatusText = `没有找到助手链接中的草稿：${draftLinkTarget}。请确认 token 连接的是同一个 Studio 数据库，或刷新草稿箱。`
          }
        }
      } else {
        setDrafts([])
        if (draftLinkTarget) nextStatusText = '草稿列表加载失败，暂时无法定位助手创建的草稿。'
      }
      if (sourceResult.ok) setSources(normalizeStudioSources(sourceResult.payload))
      if (issueResult.ok) setIssues(normalizeStudioIssues(issueResult.payload))
      if (publishExportResult.ok) setPublishExports(normalizeStudioPublishExports(publishExportResult.payload))
      setStatusText(nextStatusText)
    } catch (error) {
      setStatusText(explainStudioClientException(error, '初始化数据'))
    } finally {
      setIsLoading(false)
    }
  }, [draftLinkTarget, useStudioUiCheckFixture])

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

  const updateResourceTemplateField = <K extends keyof ResourceTemplateFormState>(
    field: K,
    value: ResourceTemplateFormState[K],
  ) => {
    setResourceTemplateForm((current) => ({ ...current, [field]: value }))
  }

  const selectDraft = (draft: StudioDraft) => {
    setMobileWorkspaceView('editor')
    setSelectedDraftId(draft.id)
    setDraftForm(draftToForm(draft))
    setStatusText(`正在编辑：${draft.title}`)
  }

  const newDraft = () => {
    setMobileWorkspaceView('editor')
    setSelectedDraftId('')
    setDraftForm(defaultDraftForm)
    setStatusText('已切换到新建草稿。')
  }

  const applyProjectDetailTemplate = () => {
    const project = projects.find((item) => item.id === projectTemplateId)
    if (!project) {
      setStatusText('请选择有效的项目。')
      return
    }
    const template = createProjectDetailDraftTemplate(project)
    setSelectedDraftId('')
    setDraftForm((current) => ({
      ...current,
      ...template,
      editorName: current.editorName || defaultDraftForm.editorName,
    }))
    setStatusText(`已生成 ${project.title} 的项目详情页草稿模板；保存后仍需审核再导出。`)
  }

  const applyResourceTemplate = () => {
    const template = createResourceDraftTemplate(resourceTemplateForm)
    setSelectedDraftId('')
    setDraftForm((current) => ({
      ...current,
      ...template,
      editorName: current.editorName || defaultDraftForm.editorName,
    }))
    setStatusText(`已生成 ${template.title}；保存后仍需审核再导出。`)
  }

  const applyStatusTemplate = () => {
    const project = reliabilityProjects.find((item) => item.id === statusTemplateId)
    if (!project) {
      setStatusText('请选择有效的状态项目。')
      return
    }
    const template = createStatusDraftTemplate(project)
    setSelectedDraftId('')
    setDraftForm((current) => ({
      ...current,
      ...template,
      editorName: current.editorName || defaultDraftForm.editorName,
    }))
    setStatusText(`已生成 ${project.title} 的状态页说明草稿；保存后仍需审核再导出。`)
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
    } catch (error) {
      setStatusText(explainStudioClientException(error, '保存草稿'))
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
        notes:
          status === 'approved'
            ? `通过 Studio 第一版审核。页面级审核：${pageReviewPlan.title}。`
            : `需要继续编辑后再发布。页面级审核：${pageReviewPlan.title}。`,
        checklist: {
          sourceChecked: true,
          safetyChecked: true,
          publicReady: status === 'approved',
          pageKind: pageReviewPlan.kind,
          pageExportTarget: pageReviewPlan.exportTarget,
          pageChecks: pageReviewPlan.checks,
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
    if (!result.ok) {
      setStatusText(explainStudioApiError(result.status, readStudioError(result.payload)))
      return
    }
    const publishExport = getPublishExportFromPayload(result.payload)
    if (publishExport) setPublishExports((current) => [publishExport, ...current.filter((item) => item.id !== publishExport.id)])
    setStatusText('已创建发布导出记录；本地导出器写入公开数据后可回写文件列表和检查结果。')
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
      setSourcePickerId(source.id)
      setSourceForm(defaultSourceForm)
      setStatusText('来源已保存，已设为日报来源选择器的当前选项。')
    } catch (error) {
      setStatusText(explainStudioClientException(error, '保存来源'))
    } finally {
      setIsSavingSource(false)
    }
  }

  const appendSourceToIssue = (sourceId: string) => {
    if (!sourceId) {
      setStatusText('请先选择一个已保存来源。')
      return
    }
    const ids = new Set(splitList(issueForm.sourceIdsText))
    if (ids.has(sourceId)) {
      setStatusText('这个来源已经在本期日报里。')
      return
    }
    ids.add(sourceId)
    updateIssueField('sourceIdsText', Array.from(ids).join('\n'))
    const source = sources.find((item) => item.id === sourceId)
    setStatusText(source ? `已加入来源：${source.title}` : '已加入来源 ID。')
  }

  const appendPickedSourceToIssue = () => {
    appendSourceToIssue(sourcePickerId)
  }

  const removeSourceFromIssue = (sourceId: string) => {
    updateIssueField('sourceIdsText', splitList(issueForm.sourceIdsText).filter((id) => id !== sourceId).join('\n'))
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
    } catch (error) {
      setStatusText(explainStudioClientException(error, '创建 AI 日报 issue'))
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
        {displayStatusText && <p className="assistant-status-text">{displayStatusText}</p>}
      </section>

      <section className="studio-review-guide" aria-label="Studio 审核流程">
        <div className="studio-review-guide__intro">
          <p className="assistant-panel__eyebrow">REVIEW FLOW</p>
          <h2>审核从草稿箱开始</h2>
          <p>
            先在左侧点一篇草稿；内容会载入中间编辑器，公开效果在编辑器下方的预览区。确认正文、来源、可见性和安全边界都没问题后，再点审核通过。
          </p>
        </div>
        <ol className="studio-review-steps">
          <li>
            <span>1</span>
            <strong>点草稿</strong>
            <em>左侧草稿箱选择要审核的文章。</em>
          </li>
          <li>
            <span>2</span>
            <strong>看内容</strong>
            <em>中间编辑器是正文，下面是公开预览。</em>
          </li>
          <li>
            <span>3</span>
            <strong>通过审核</strong>
            <em>确认无误后点审核通过。</em>
          </li>
          <li>
            <span>4</span>
            <strong>创建导出</strong>
            <em>通过后才能生成发布导出记录。</em>
          </li>
        </ol>
        <div className="studio-review-current">
          <span>当前草稿</span>
          <strong>{selectedDraft ? selectedDraft.title : drafts.length > 0 ? '请先从左侧草稿箱选择一篇草稿' : '暂无可审核草稿'}</strong>
          <p>
            {selectedDraft
              ? `${studioDraftStatuses[selectedDraft.status]} · ${studioVisibilityLabels[draftForm.visibility]} · ${draftForm.slug || '未填写 slug'}`
              : '选中草稿后，这里会显示审核状态和下一步动作。'}
          </p>
          <div className="studio-review-queue-brief" aria-label="Studio 待审核草稿摘要">
            <div className="studio-review-queue-metrics">
              <span>
                <em>Hidden 待审</em>
                <strong>{reviewMetrics.hiddenReviewNeeded}</strong>
              </span>
              <span>
                <em>全部待审</em>
                <strong>{reviewMetrics.reviewNeeded}</strong>
              </span>
              <span>
                <em>可导出</em>
                <strong>{reviewMetrics.approved}</strong>
              </span>
            </div>
            <p>
              <span>下一篇待审核</span>
              <strong>{nextReviewDraft ? nextReviewDraft.title : '暂无待审核草稿'}</strong>
              <em>
                {nextReviewDraft
                  ? `${studioDraftStatuses[nextReviewDraft.status]} · ${studioVisibilityLabels[nextReviewDraft.visibility]}`
                  : adminToken
                    ? '刷新数据后仍为空，就先创建或等待新的 review-needed 草稿。'
                    : '保存 Studio token 并刷新数据后，这里会显示下一篇。'}
              </em>
            </p>
          </div>
          <div className="studio-review-current__actions">
            <button type="button" disabled={!nextReviewDraft} onClick={() => nextReviewDraft && selectDraft(nextReviewDraft)}>
              打开下一篇待审核
            </button>
            <a href="#studio-draft-editor">编辑内容</a>
            <a href="#studio-draft-preview">查看预览</a>
            <button type="button" disabled={!selectedDraft || !adminToken} onClick={() => void reviewDraft('approved')}>
              审核通过
            </button>
            <button type="button" disabled={!canExport || !adminToken} onClick={() => void createPublishExport()}>
              创建导出记录
            </button>
          </div>
        </div>
      </section>

      <nav className="studio-workspace-tabs" role="tablist" aria-label="Studio 手机工作模式">
        <button
          id="studio-mobile-tab-drafts"
          type="button"
          role="tab"
          aria-selected={mobileWorkspaceView === 'drafts'}
          aria-controls="studio-mobile-panel-drafts"
          onClick={() => setMobileWorkspaceView('drafts')}
        >
          <FileStack size={17} aria-hidden />
          <span>草稿箱</span>
          <em>{drafts.length}</em>
        </button>
        <button
          id="studio-mobile-tab-editor"
          type="button"
          role="tab"
          aria-selected={mobileWorkspaceView === 'editor'}
          aria-controls="studio-mobile-panel-editor"
          onClick={() => setMobileWorkspaceView('editor')}
        >
          <PencilLine size={17} aria-hidden />
          <span>编辑</span>
          <em>{selectedDraft ? '已选' : '新建'}</em>
        </button>
        <button
          id="studio-mobile-tab-support"
          type="button"
          role="tab"
          aria-selected={mobileWorkspaceView === 'support'}
          aria-controls="studio-mobile-panel-support"
          onClick={() => setMobileWorkspaceView('support')}
        >
          <Wrench size={17} aria-hidden />
          <span>辅助</span>
          <em>{reviewQueue.length}</em>
        </button>
      </nav>

      <section className="studio-grid" data-mobile-view={mobileWorkspaceView}>
        <aside id="studio-mobile-panel-drafts" className="studio-card studio-list-panel" role="tabpanel" aria-label="草稿箱">
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
                <span className="studio-draft-item__title">
                  <strong>{draft.title}</strong>
                  {isAgenticWorkspaceDraft(draft) && <span className="studio-agentic-pill">Agentic Workspace</span>}
                </span>
                <span>{draft.slug}</span>
                <em>
                  {blogColumnMeta[draft.column as BlogColumn]?.titleZh ?? draft.column} · {studioDraftStatuses[draft.status]}
                </em>
              </button>
            ))}
            {drafts.length === 0 && <p className="assistant-status-text">还没有数据库草稿。</p>}
          </div>
        </aside>

        <section id="studio-mobile-panel-editor" className="studio-editor-stack" role="tabpanel" aria-label="草稿编辑">
          <section id="studio-draft-editor" className="studio-card studio-editor">
            <div className="studio-card__header">
              <div>
                <p className="assistant-panel__eyebrow">BLOG EDITOR</p>
                <h2>{selectedDraft ? '编辑草稿' : '新建草稿'}</h2>
              </div>
              {selectedDraft && (
                <span className="studio-editor-statuses">
                  <span className="studio-status-pill">{studioDraftStatuses[selectedDraft.status]}</span>
                  {isAgenticWorkspaceDraft(selectedDraft) && <span className="studio-agentic-pill">Agentic Workspace</span>}
                </span>
              )}
            </div>

            <div className="studio-template-strip">
              <div className="studio-template-panel">
                <label className="assistant-field">
                  <span>项目详情模板</span>
                  <select value={projectTemplateId} onChange={(event) => setProjectTemplateId(event.target.value)}>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={applyProjectDetailTemplate}>
                  生成详情页草稿
                </button>
              </div>

              <div className="studio-template-panel">
                <label className="assistant-field">
                  <span>状态说明模板</span>
                  <select value={statusTemplateId} onChange={(event) => setStatusTemplateId(event.target.value)}>
                    {reliabilityProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={applyStatusTemplate}>
                  生成状态说明草稿
                </button>
              </div>

              <div className="studio-template-panel">
                <div className="studio-form-grid">
                  <label className="assistant-field">
                    <span>资源名称</span>
                    <input
                      value={resourceTemplateForm.title}
                      onChange={(event) => updateResourceTemplateField('title', event.target.value)}
                      placeholder="例如：某个工具、仓库或教程"
                    />
                  </label>
                  <label className="assistant-field">
                    <span>资源类型</span>
                    <select
                      value={resourceTemplateForm.resourceType}
                      onChange={(event) =>
                        updateResourceTemplateField('resourceType', event.target.value as StudioResourceDraftType)
                      }
                    >
                      {Object.entries(studioResourceDraftTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="assistant-field">
                  <span>公开 URL</span>
                  <input
                    value={resourceTemplateForm.url}
                    onChange={(event) => updateResourceTemplateField('url', event.target.value)}
                    placeholder="可选；建议使用无查询参数的公开主页"
                  />
                </label>
                <button type="button" onClick={applyResourceTemplate}>
                  生成资源分享草稿
                </button>
              </div>
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

          <div id="studio-draft-preview" className="studio-preview-anchor">
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
          </div>
        </section>

        <aside id="studio-mobile-panel-support" className="studio-side-stack" role="tabpanel" aria-label="Studio 辅助工具">
          <article className="studio-card studio-ai-daily-card">
            <div className="studio-card__header">
              <div>
                <p className="assistant-panel__eyebrow">AI DAILY</p>
                <h2>创建日报 Issue</h2>
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
              <div className="studio-source-picker">
                <div className="studio-source-picker__header">
                  <div>
                    <strong>从来源池选择</strong>
                    <span>保存来源后，在这里把它加入本期日报</span>
                  </div>
                  <span>{selectedIssueSourceIds.length} selected</span>
                </div>
                <div className="studio-source-picker__controls">
                  <label className="assistant-field">
                    <span>已有来源</span>
                    <select
                      value={sourcePickerId}
                      onChange={(event) => setSourcePickerId(event.target.value)}
                      disabled={sortedSources.length === 0}
                    >
                      <option value="">选择一个来源标题</option>
                      {sortedSources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.title} · {source.sourceName || '未填写来源名'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={appendPickedSourceToIssue} disabled={!sourcePickerId}>
                    加入本期
                  </button>
                </div>
                {sortedSources.length === 0 && <p className="assistant-status-text">还没有保存来源。先在下方录入公开来源。</p>}
              </div>
              <div className="studio-selected-sources">
                <div className="studio-source-picker__header">
                  <div>
                    <strong>本期已选来源</strong>
                    <span>创建 Issue 后会进入日报详情页继续填写 brief</span>
                  </div>
                  <span>{selectedIssueSourceIds.length}</span>
                </div>
                {selectedIssueSources.map((source) => (
                  <div key={source.id} className="studio-selected-source">
                    <span>
                      <strong>{source.title}</strong>
                      <em>{source.sourceName || '未填写来源名'}</em>
                    </span>
                    <button type="button" onClick={() => removeSourceFromIssue(source.id)}>
                      移除
                    </button>
                  </div>
                ))}
                {selectedIssueSourceIds.length > selectedIssueSources.length && (
                  <p className="assistant-status-text">有手动粘贴的来源 ID 尚未在当前来源池中载入。</p>
                )}
                {selectedIssueSourceIds.length === 0 && <p className="assistant-status-text">还没有为这期日报选择来源。</p>}
              </div>
              <details className="studio-advanced-source-ids">
                <summary>高级：手动粘贴来源 ID</summary>
                <label className="assistant-field">
                  <span>来源 ID</span>
                  <textarea
                    value={issueForm.sourceIdsText}
                    onChange={(event) => updateIssueField('sourceIdsText', event.target.value)}
                    rows={3}
                    placeholder="每行一个 source id；一般不需要手动填写"
                  />
                </label>
              </details>
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
              {issues.length === 0 && <p className="assistant-status-text">还没有日报 Issue。</p>}
            </div>
          </article>

          <article className="studio-card studio-source-workbench">
            <div className="studio-card__header">
              <div>
                <p className="assistant-panel__eyebrow">SOURCES</p>
                <h2>新增来源</h2>
              </div>
            </div>
            <form className="studio-form" onSubmit={saveSource}>
              <label className="assistant-field">
                <span>来源标题</span>
                <input
                  value={sourceForm.title}
                  onChange={(event) => updateSourceField('title', event.target.value)}
                  placeholder="公开来源或文章标题"
                />
              </label>
              <label className="assistant-field">
                <span>公开 URL</span>
                <input
                  value={sourceForm.url}
                  onChange={(event) => updateSourceField('url', event.target.value)}
                  placeholder="https://..."
                />
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
                  placeholder="人工转述来源要点，发布前继续复核原文。"
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
            <div className="studio-source-list-preview">
              <div className="studio-source-picker__header">
                <div>
                  <strong>最近保存来源</strong>
                  <span>选择来源请回到上方日报 Issue</span>
                </div>
                <span>{sortedSources.length}</span>
              </div>
              <div className="studio-source-list studio-source-list--compact">
                {sortedSources.slice(0, 6).map((source) => (
                  <article key={source.id} className="studio-source-mini-card">
                    <strong>{source.title}</strong>
                    <span>
                      {source.sourceName || '未填写来源名'} · {studioSourceTierLabels[source.sourceTier]}
                    </span>
                  </article>
                ))}
                {sortedSources.length === 0 && <p className="assistant-status-text">还没有保存来源。</p>}
              </div>
            </div>
          </article>

          <article className="studio-card">
            <div className="studio-card__header">
              <div>
                <p className="assistant-panel__eyebrow">REVIEW QUEUE</p>
                <h2>审核队列</h2>
              </div>
            </div>
            <div className="studio-review-summary">
              <div>
                <span>待审核</span>
                <strong>{reviewMetrics.reviewNeeded}</strong>
              </div>
              <div>
                <span>可导出</span>
                <strong>{reviewMetrics.approved}</strong>
              </div>
              <div>
                <span>已拒绝</span>
                <strong>{reviewMetrics.rejected}</strong>
              </div>
            </div>
            <div className="studio-review-list">
              {reviewQueue.map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  className={`studio-review-item ${draft.id === selectedDraftId ? 'is-active' : ''}`}
                  onClick={() => selectDraft(draft)}
                >
                  <strong>{draft.title}</strong>
                  <span>{draft.slug}</span>
                  <em>
                    {studioDraftStatuses[draft.status]} · {blogColumnMeta[draft.column as BlogColumn]?.titleZh ?? draft.column}
                  </em>
                </button>
              ))}
              {reviewQueue.length === 0 && <p className="assistant-status-text">还没有进入审核队列的草稿。</p>}
            </div>
          </article>

          <article className="studio-card">
            <p className="assistant-panel__eyebrow">PUBLISH GATE</p>
            <h2>发布边界</h2>
            <ul className="assistant-admin-list">
              <li>数据库草稿不会直接出现在公开站。</li>
              <li>审核通过后创建导出记录，由本地/CI 导出器写入公开数据并回写检查结果。</li>
              <li>模型辅助默认关闭，真实调用必须按具体内容任务批准。</li>
              <li>来源和正文会拦截明显 token、key 和数据库连接串。</li>
            </ul>
            <div className="studio-page-review">
              <span className="assistant-panel__eyebrow">PAGE REVIEW</span>
              <h3>{pageReviewPlan.title}</h3>
              <p>{pageReviewPlan.description}</p>
              <p className="assistant-status-text">导出目标：{pageReviewPlan.exportTarget}</p>
              <ul className="assistant-admin-list">
                {pageReviewPlan.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>
            {selectedDraft && (
              <p className="assistant-status-text">
                当前草稿更新于 {formatDateTime(selectedDraft.updatedAt)}，状态为 {studioDraftStatuses[selectedDraft.status]}。
              </p>
            )}
            <div className="studio-publish-list">
              {publishExports.slice(0, 5).map((publishExport) => (
                <article key={publishExport.id} className="studio-publish-item">
                  <div>
                    <strong>{publishExport.draft?.title || publishExport.draftId}</strong>
                    <span>
                      {publishExport.draft?.slug || publishExport.target} · {readPublishExportStatus(publishExport.checks)}
                    </span>
                  </div>
                  <span>{formatDateTime(publishExport.createdAt)}</span>
                  {publishExport.exportedFiles.length > 0 && <em>{publishExport.exportedFiles.join('、')}</em>}
                </article>
              ))}
              {publishExports.length === 0 && <p className="assistant-status-text">还没有发布导出记录。</p>}
            </div>
          </article>
        </aside>
      </section>
    </main>
  )
}
