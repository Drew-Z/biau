import { readFile } from 'node:fs/promises'
import { XMLParser } from 'fast-xml-parser'
import { getPublicBlogPosts } from '../src/data/blogCuration.ts'
import { projects } from '../src/data/portfolio.ts'
import { reliabilityProjects } from '../src/data/statusTargets.ts'

const siteUrl = 'https://biau.playlab.eu.cc'
const sitemapPath = 'public/sitemap.xml'
const staticRoutes = ['/', '/projects', '/blog', '/ai-daily', '/status', '/pet-app-showcase/']
const expectedRoutes = [
  ...staticRoutes,
  ...projects.map((project) => `/projects/${project.id}`),
  ...reliabilityProjects.map((project) => `/status/${project.id}`),
  ...getPublicBlogPosts().map((post) => `/blog/${post.slug}`),
]

function fail(message) {
  console.error(`Sitemap coverage check failed: ${message}`)
  process.exitCode = 1
}

const source = await readFile(sitemapPath, 'utf8')
const parsed = new XMLParser().parse(source)
const rawEntries = parsed.urlset?.url
const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : []
const locations = entries.map((entry) => entry?.loc).filter((loc) => typeof loc === 'string')
const routeSet = new Set()

if (locations.length !== entries.length) fail('every <url> entry must contain one string <loc>')

for (const location of locations) {
  if (routeSet.has(location)) fail(`duplicate URL: ${location}`)
  routeSet.add(location)

  let parsedUrl
  try {
    parsedUrl = new URL(location)
  } catch {
    fail(`invalid URL: ${location}`)
    continue
  }
  if (parsedUrl.origin !== siteUrl) fail(`URL must use ${siteUrl}: ${location}`)
  if (parsedUrl.search || parsedUrl.hash) fail(`URL must not contain query/hash: ${location}`)
}

const missing = expectedRoutes
  .map((route) => `${siteUrl}${route}`)
  .filter((location) => !routeSet.has(location))

for (const location of missing) fail(`missing expected route: ${location}`)

if (new Set(expectedRoutes).size !== expectedRoutes.length) {
  fail('source data produced duplicate expected routes')
}

if (process.exitCode) {
  console.error(`Found ${locations.length} sitemap URLs; expected at least ${expectedRoutes.length}.`)
} else {
  console.log(`Sitemap coverage passed: ${locations.length} URLs, including ${projects.length} project routes, ${reliabilityProjects.length} status routes, and ${getPublicBlogPosts().length} blog routes.`)
}
