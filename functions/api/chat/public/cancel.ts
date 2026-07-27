import { proxyAssistantRequest, type AssistantEnv } from '../../../_shared/assistant'

interface PagesContext {
  request: Request
  env: AssistantEnv
}

export function onRequestPost({ request, env }: PagesContext) {
  return proxyAssistantRequest(request, env, '/chat/public/cancel')
}
