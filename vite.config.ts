import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const operatorProxy = buildOperatorProxy(env)

  return {
    plugins: [react()],
    server: operatorProxy
      ? {
          proxy: {
            '/api/operator': operatorProxy,
          },
        }
      : undefined,
  }
})

function buildOperatorProxy(env: Record<string, string>): ProxyOptions | null {
  const target = env.OPERATOR_API_BASE_URL?.trim().replace(/\/+$/, '')
  const serviceToken = env.OPERATOR_SERVICE_TOKEN?.trim()
  const ownerId = env.OPERATOR_OWNER_ID?.trim()
  const ownerEmail = env.OPERATOR_OWNER_EMAILS?.split(',')[0]?.trim().toLowerCase()
  const ownerName = env.OPERATOR_DISPLAY_NAME?.trim() || '本地站长'
  if (!target || !serviceToken || !ownerId || !ownerEmail) return null

  return {
    target,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/operator/u, '/operator'),
    headers: {
      Authorization: `Bearer ${serviceToken}`,
      'X-Biau-Operator-Id': ownerId,
      'X-Biau-Operator-Email': ownerEmail,
      'X-Biau-Operator-Name': ownerName,
    },
  }
}
