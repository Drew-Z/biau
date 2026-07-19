import { readFile, writeFile } from 'node:fs/promises'
import { XMLParser } from 'fast-xml-parser'
import { getPublicBlogPosts } from '../src/data/blogCuration.ts'
import { projects } from '../src/data/portfolio.ts'
import { reliabilityProjects } from '../src/data/statusTargets.ts'

const siteUrl = 'https://biau.playlab.eu.cc'
const today = new Date().toISOString().slice(0, 10)

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const projectIds = projects.map((project) => project.id)
const statusProjectIds = reliabilityProjects.map((project) => project.id)
const posts = getPublicBlogPosts()

async function readExistingLastMods() {
  try {
    const source = await readFile('public/sitemap.xml', 'utf8')
    const parsed = new XMLParser().parse(source)
    const entries = parsed.urlset?.url
    const urls = Array.isArray(entries) ? entries : entries ? [entries] : []
    return new Map(
      urls
        .filter((entry) => typeof entry?.loc === 'string' && typeof entry?.lastmod === 'string')
        .map((entry) => [entry.loc, entry.lastmod]),
    )
  } catch {
    return new Map()
  }
}

const staticRoutes = [
  { loc: '/pet-app-showcase/', priority: '0.7', changefreq: 'monthly' },
]

const routes = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/projects', priority: '0.9', changefreq: 'weekly' },
  { loc: '/blog', priority: '0.9', changefreq: 'weekly' },
  { loc: '/ai-daily', priority: '0.8', changefreq: 'hourly' },
  { loc: '/status', priority: '0.6', changefreq: 'daily' },
  ...staticRoutes,
  ...projectIds.map((id) => ({ loc: `/projects/${id}`, priority: '0.8', changefreq: 'monthly' })),
  ...statusProjectIds.map((id) => ({ loc: `/status/${id}`, priority: '0.6', changefreq: 'daily' })),
  ...posts.map((post) => ({ loc: `/blog/${post.slug}`, priority: '0.7', changefreq: 'monthly', lastmod: post.date })),
]

const existingLastMods = await readExistingLastMods()

const urls = routes
  .map(
    (route) => `  <url>
    <loc>${escapeXml(`${siteUrl}${route.loc}`)}</loc>
    <lastmod>${route.lastmod ?? existingLastMods.get(`${siteUrl}${route.loc}`) ?? today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

await writeFile('public/sitemap.xml', xml)
console.log(`Generated public/sitemap.xml with ${routes.length} URLs.`)
