import { readDailyEditions, type DailyEditionsEnv } from '../../../_shared/aiDailyEditions'

export function onRequestGet({ request, env, params }: { request: Request; env: DailyEditionsEnv; params: { editionId?: string } }) {
  return readDailyEditions(request, env, params.editionId ?? '')
}
