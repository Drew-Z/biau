function normalizeApiBase(value: string | undefined) {
  return value?.trim().replace(/\/+$/, '') ?? ''
}

export const STUDIO_API_BASE =
  normalizeApiBase(import.meta.env.VITE_STUDIO_API_BASE_URL) || normalizeApiBase(import.meta.env.VITE_CHAT_API_BASE_URL)

export const STUDIO_API_ENV_NAMES = {
  studio: 'VITE_STUDIO_API_BASE_URL',
  legacy: 'VITE_CHAT_API_BASE_URL',
} as const

export interface StudioApiResult {
  ok: boolean
  status: number
  payload: unknown
}

function tokenHasInvalidHeaderCharacters(token: string) {
  return [...token].some((char) => {
    const codePoint = char.codePointAt(0) ?? 0
    return codePoint > 255 || codePoint === 127 || codePoint < 32
  })
}

export async function requestStudioApi(path: string, token: string, init: RequestInit = {}): Promise<StudioApiResult> {
  if (tokenHasInvalidHeaderCharacters(token)) {
    return { ok: false, status: 0, payload: { error: 'invalid-token-format' } }
  }

  try {
    const response = await fetch(`${STUDIO_API_BASE}/studio/api${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    })
    const payload = (await response.json().catch(() => ({}))) as unknown
    return { ok: response.ok, status: response.status, payload }
  } catch {
    return { ok: false, status: 0, payload: { error: 'studio-network-error' } }
  }
}

export function explainStudioApiError(status: number, errorCode: string) {
  if (errorCode === 'invalid-token-format') return 'Studio token 格式不正确：请清除后重新粘贴纯文本 token，不要包含换行、空格、中文或不可见字符。'
  if (errorCode === 'studio-network-error') return '浏览器无法连接 Studio API。请检查 Studio API 地址是否仍是当前 Render 服务，或稍后重试；如果后端健康但页面失败，通常是浏览器网络、CORS 或代理拦截。'
  if (errorCode === 'studio-auth-not-configured') return '后端还没有配置 STUDIO_ADMIN_TOKEN 或 ADMIN_TOKEN。'
  if (status === 401 || errorCode === 'missing-studio-token') return 'Studio token 缺失或不匹配。'
  if (status === 503 || errorCode === 'database-not-configured') return '后端数据库尚未配置，内容工作台暂不能写入。'
  if (errorCode === 'duplicate-slug') return 'slug 已存在，请换一个公开路径。'
  if (errorCode === 'duplicate-ai-daily-date') return '这一天的 AI 日报 issue 已经存在。'
  if (errorCode === 'sensitive-content-detected') return '内容里疑似包含密钥、连接串或 token，请先移除。'
  if (errorCode === 'invalid-slug') return 'slug 只能使用小写字母、数字和短横线。'
  if (errorCode === 'invalid-column') return '请选择有效博客栏目。'
  if (errorCode === 'invalid-url') return '来源 URL 必须是公开 http(s) 链接。'
  if (errorCode === 'invalid-source-tier') return '请选择有效来源等级。'
  if (errorCode === 'draft-not-approved') return '草稿还没有通过审核，不能进入发布导出记录。'
  if (errorCode === 'draft-not-found') return '没有找到这篇草稿；它可能已被其他窗口删除或切换。'
  if (errorCode === 'invalid-draft-version') return '当前操作缺少有效的草稿版本。请刷新 Studio 数据后重试。'
  if (errorCode === 'draft-state-changed') return '草稿状态刚刚被其他操作更新。请刷新 Studio 数据后再继续。'
  if (errorCode === 'missing-draft-content-change') return '没有检测到实际内容修改；草稿状态不会因空保存而变化。'
  if (errorCode === 'archived-draft-read-only') return '已归档草稿为只读状态，不能继续编辑或审核。'
  if (errorCode === 'draft-already-archived') return '这篇草稿已经归档。'
  if (errorCode === 'published-draft-archive-requires-withdrawal') return '已发布草稿必须先走公开撤回流程，不能直接归档。'
  if (errorCode === 'invalid-draft-status') return '草稿状态无效，请刷新 Studio 数据后重试。'
  if (errorCode === 'invalid-review-status') return '请选择有效的审核状态。'
  if (errorCode === 'review-checklist-incomplete') return '审核清单还没有确认公开就绪，不能批准草稿。'
  if (errorCode === 'draft-revision-required') return '请先修改并保存草稿，再重新提交审核。'
  if (errorCode === 'invalid-review-transition') return '当前草稿状态不能执行这项审核操作，请刷新后重新选择草稿。'
  if (errorCode === 'publish-review-not-approved') return '草稿的最新审核记录不是“已批准”，不能创建发布导出。'
  if (errorCode === 'publish-review-checklist-incomplete') return '最新审核记录没有确认公开就绪，不能创建发布导出。'
  if (errorCode === 'publish-export-not-found') return '没有找到这条 Publish Export 记录。'
  if (errorCode === 'publish-export-already-exists') return '这个草稿版本已经创建过 Publish Export，请使用现有记录。'
  if (errorCode === 'invalid-publish-export-draft') return 'Publish Export 回写缺少草稿绑定，请使用卡片中生成的完整导出命令。'
  if (errorCode === 'invalid-publish-export-version') return 'Publish Export 回写缺少草稿版本或批准记录，请重新复制完整导出命令。'
  if (errorCode === 'publish-export-draft-mismatch') return 'Publish Export 不属于当前草稿，请重新复制该草稿卡片中的导出命令。'
  if (errorCode === 'publish-export-version-missing') return '这条 Publish Export 是旧版记录，缺少草稿版本绑定；请在 Studio 中重新创建。'
  if (errorCode === 'publish-export-version-mismatch') return '导出命令中的草稿版本与 Publish Export 不一致，请重新创建导出记录。'
  if (errorCode === 'publish-export-stale-draft') return '草稿或批准记录在导出后发生了变化；请丢弃旧导出差异并重新创建 Publish Export。'
  if (errorCode === 'invalid-publish-export-transition') return '已通过的 Publish Export 已锁定，不能再次覆盖。'
  if (errorCode === 'invalid-publish-export-checks') return 'Publish Export 回写的检查结果格式无效，请使用仓库内 studio:export 命令重新执行。'
  if (errorCode === 'invalid-publish-export-files') return 'Publish Export 回写的文件列表无效，请使用仓库内 studio:export 命令重新执行。'
  if (errorCode === 'ai-daily-issue-not-found') return '没有找到这个 AI 日报 issue。'
  if (errorCode === 'invalid-ai-daily-status') return '请选择有效的 AI 日报状态。'
  if (errorCode === 'invalid-source-ids') return '来源列表里包含不存在的 source id。'
  if (errorCode === 'invalid-brief-json') return 'brief JSON 必须是对象，并且不能过大。'
  if (errorCode === 'ai-daily-issue-needs-sources') return '请先给这期 AI 日报选择至少一个来源。'
  if (errorCode === 'ai-daily-issue-not-ready') return '这期 AI 日报还没有满足审核入口，请先补齐 brief 和来源证据。'
  if (status === 409) return `Studio 当前状态不允许这项操作${errorCode ? `（${errorCode}）` : ''}。`
  return `Studio API 返回 ${status}${errorCode ? ` / ${errorCode}` : ''}。`
}

export function explainStudioClientException(error: unknown, action: string) {
  const name = error instanceof Error && error.name ? error.name : 'unknown'
  return `Studio 页面处理${action}时发生前端异常（${name}）。这通常不是 token 不匹配；token 错误会显示 401 / token 缺失或不匹配。请刷新页面后重试，如果仍失败，把浏览器控制台错误发给 Codex 定位。`
}
