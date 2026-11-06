import { readDailyEditions, type DailyEditionsEnv } from '../../_shared/aiDailyEditions'

export function onRequestGet({ request, env }: { request: Request; env: DailyEditionsEnv }) {
  return readDailyEditions(request, env)
}
