import { readFile, writeFile } from 'node:fs/promises'
import { getPublicBlogPosts } from '../src/data/blogCuration.ts'

const siteUrl = 'https://biau.playlab.eu.cc'
const today = new Date().toISOString().slice(0, 10)

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const portfolio = await readFile('src/data/portfolio.ts', 'utf8')

const projectIds = [...portfolio.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1])
const posts = getPublicBlogPosts()

const routes = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/projects', priority: '0.9', changefreq: 'weekly' },
  { loc: '/blog', priority: '0.9', changefreq: 'weekly' },
  ...projectIds.map((id) => ({ loc: `/projects/${id}`, priority: '0.8', changefreq: 'monthly' })),
  ...posts.map((post) => ({ loc: `/blog/${post.slug}`, priority: '0.7', changefreq: 'monthly', lastmod: post.date })),
]

const urls = routes
  .map(
    (route) => `  <url>
    <loc>${escapeXml(`${siteUrl}${route.loc}`)}</loc>
    <lastmod>${route.lastmod ?? today}</lastmod>
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
