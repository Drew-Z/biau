import { proxyAssistantStreamRequest, type AssistantEnv } from '../../../_shared/assistant'

interface PagesContext {
  request: Request
  env: AssistantEnv
}

export function onRequestPost({ request, env }: PagesContext) {
  return proxyAssistantStreamRequest(request, env, '/chat/public/stream')
}
