import fs from 'node:fs'
import path from 'node:path'
import { getAssistantBlogPosts, getBlogAssistantTags } from '../src/data/blogCuration'
import { getProjectAssistantSummary, getProjectAssistantTags, projects } from '../src/data/portfolio'

interface KnowledgeItem {
  id: string
  title: string
  summary: string
  href: string
  tags: string[]
  visibility: 'public'
}

const outputPath = path.resolve('server/data/public-knowledge.json')

const items: KnowledgeItem[] = [
  {
    id: 'site:intro',
    title: 'BIAU Port 站点简介',
    summary:
      'BIAU Port 泊岸是一个围绕 AI 应用、业务系统、互动体验、移动端案例与知识内容组织的展示站，强调可演示、可筛选、可落地的项目表达。',
    href: '/',
    tags: ['BIAU Port', '项目展示', '知识库', '公开站点'],
    visibility: 'public',
  },
  ...projects.map((project) => ({
    id: `project:${project.id}`,
    title: project.title,
    summary: getProjectAssistantSummary(project),
    href: `/projects/${project.id}`,
    tags: getProjectAssistantTags(project),
    visibility: 'public' as const,
  })),
  ...getAssistantBlogPosts().map((post) => ({
    id: `blog:${post.slug}`,
    title: post.title,
    summary: post.detail,
    href: `/blog/${post.slug}`,
    tags: getBlogAssistantTags(post),
    visibility: 'public' as const,
  })),
]

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(items, null, 2)}\n`)
console.log(`Generated ${items.length} public knowledge items at ${outputPath}`)
