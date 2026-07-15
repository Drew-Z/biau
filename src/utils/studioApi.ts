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
  if (status === 409 || errorCode === 'duplicate-slug') return 'slug 已存在，请换一个公开路径。'
  if (errorCode === 'duplicate-ai-daily-date') return '这一天的 AI 日报 issue 已经存在。'
  if (errorCode === 'sensitive-content-detected') return '内容里疑似包含密钥、连接串或 token，请先移除。'
  if (errorCode === 'invalid-slug') return 'slug 只能使用小写字母、数字和短横线。'
  if (errorCode === 'invalid-column') return '请选择有效博客栏目。'
  if (errorCode === 'invalid-url') return '来源 URL 必须是公开 http(s) 链接。'
  if (errorCode === 'invalid-source-tier') return '请选择有效来源等级。'
  if (errorCode === 'draft-not-approved') return '草稿还没有通过审核，不能进入发布导出记录。'
  if (errorCode === 'ai-daily-issue-not-found') return '没有找到这个 AI 日报 issue。'
  if (errorCode === 'invalid-ai-daily-status') return '请选择有效的 AI 日报状态。'
  if (errorCode === 'invalid-source-ids') return '来源列表里包含不存在的 source id。'
  if (errorCode === 'invalid-brief-json') return 'brief JSON 必须是对象，并且不能过大。'
  if (errorCode === 'ai-daily-issue-needs-sources') return '请先给这期 AI 日报选择至少一个来源。'
  if (errorCode === 'ai-daily-issue-not-ready') return '这期 AI 日报还没有满足审核入口，请先补齐 brief 和来源证据。'
  return `Studio API 返回 ${status}${errorCode ? ` / ${errorCode}` : ''}。`
}

export function explainStudioClientException(error: unknown, action: string) {
  const name = error instanceof Error && error.name ? error.name : 'unknown'
  return `Studio 页面处理${action}时发生前端异常（${name}）。这通常不是 token 不匹配；token 错误会显示 401 / token 缺失或不匹配。请刷新页面后重试，如果仍失败，把浏览器控制台错误发给 Codex 定位。`
}
