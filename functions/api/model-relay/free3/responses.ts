import { relayResponsesRequest, type ModelRelayEnv } from '../../../_shared/modelRelay'

interface PagesContext {
  request: Request
  env: ModelRelayEnv
}

export function onRequestPost({ request, env }: PagesContext) {
  return relayResponsesRequest(request, env, undefined, 'free3')
}
