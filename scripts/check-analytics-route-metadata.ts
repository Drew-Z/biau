import { getAnalyticsRouteMetadata } from '../src/utils/analytics'

interface RouteCase {
  pathname: string
  routePattern: string
  routeArea: string
  routeDepth: number
  forbidden?: string[]
}

const routeCases: RouteCase[] = [
  { pathname: '/', routePattern: '/', routeArea: 'home', routeDepth: 0 },
  { pathname: '/projects', routePattern: '/projects', routeArea: 'projects', routeDepth: 1 },
  {
    pathname: '/projects/legal-rag?token=abc#private',
    routePattern: '/projects/:id',
    routeArea: 'project-detail',
    routeDepth: 2,
    forbidden: ['legal-rag', 'token', 'abc', 'private', '?', '#'],
  },
  { pathname: '/operator', routePattern: '/operator', routeArea: 'operator', routeDepth: 1 },
  { pathname: '/operator/settings', routePattern: '/operator/settings', routeArea: 'operator-settings', routeDepth: 2 },
  { pathname: '/studio', routePattern: '/studio/*', routeArea: 'studio', routeDepth: 1 },
  {
    pathname: '/studio/ai-daily/cmrc3qokb00033lhrr6o0cq0x?token=abc',
    routePattern: '/studio/ai-daily/:issueId',
    routeArea: 'studio-ai-daily',
    routeDepth: 3,
    forbidden: ['cmrc3qokb00033lhrr6o0cq0x', 'token', 'abc', '?'],
  },
  { pathname: '/status', routePattern: '/status', routeArea: 'status', routeDepth: 1 },
  {
    pathname: '/status/legal-rag#qa',
    routePattern: '/status/:projectId',
    routeArea: 'status-detail',
    routeDepth: 2,
    forbidden: ['legal-rag', 'qa', '#'],
  },
  { pathname: '/blog', routePattern: '/blog', routeArea: 'blog', routeDepth: 1 },
  {
    pathname: '/blog/agentic-rag-frontier-2026?debug=true',
    routePattern: '/blog/:slug',
    routeArea: 'blog-post',
    routeDepth: 2,
    forbidden: ['agentic-rag-frontier-2026', 'debug', 'true', '?'],
  },
  {
    pathname: 'https://example.com/projects/legal-rag?token=abc',
    routePattern: 'not-found',
    routeArea: 'not-found',
    routeDepth: 4,
    forbidden: ['https://', 'example.com', 'legal-rag', 'token', 'abc', '?'],
  },
  {
    pathname: '/unknown/path?token=abc#hash',
    routePattern: 'not-found',
    routeArea: 'not-found',
    routeDepth: 2,
    forbidden: ['unknown/path', 'token', 'abc', 'hash', '?', '#'],
  },
]

const issues: string[] = []

function fail(message: string) {
  issues.push(message)
}

for (const routeCase of routeCases) {
  const metadata = getAnalyticsRouteMetadata(routeCase.pathname)
  if (metadata.routePattern !== routeCase.routePattern) {
    fail(`${routeCase.pathname}: routePattern=${metadata.routePattern}, expected ${routeCase.routePattern}`)
  }
  if (metadata.routeArea !== routeCase.routeArea) {
    fail(`${routeCase.pathname}: routeArea=${metadata.routeArea}, expected ${routeCase.routeArea}`)
  }
  if (metadata.routeDepth !== routeCase.routeDepth) {
    fail(`${routeCase.pathname}: routeDepth=${metadata.routeDepth}, expected ${routeCase.routeDepth}`)
  }

  const serialized = JSON.stringify(metadata)
  for (const forbidden of routeCase.forbidden ?? []) {
    if (serialized.includes(forbidden)) fail(`${routeCase.pathname}: metadata leaked "${forbidden}"`)
  }
}

if (issues.length > 0) {
  console.error(`Analytics route metadata check failed with ${issues.length} issue(s):`)
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  console.log(`Analytics route metadata check passed for ${routeCases.length} route cases.`)
}
