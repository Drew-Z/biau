import type { BlogPostSummary } from '../data/blogShared'
import type { Project } from '../data/portfolio'

export const SITE_URL = 'https://biau.playlab.eu.cc'
export const SITE_NAME = 'BIAU Port'
export const DEFAULT_TITLE = 'BIAU Port 泊岸 | AI 应用、项目展示与知识库'
export const DEFAULT_DESCRIPTION =
  'BIAU Port 泊岸用 React、Vite 与 Semi Design 组织 AI 应用、业务系统、游戏项目、移动端案例和技术知识库。'
export const DEFAULT_IMAGE = `${SITE_URL}/images/projects/showcase/blog-semi-home-desktop.png`

export interface SeoMeta {
  title: string
  description: string
  canonicalPath: string
  type?: 'website' | 'article'
  image?: string
}

export function absoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function normalizePath(pathname: string) {
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '')
}

export function getStaticSeo(pathname: string): SeoMeta {
  const path = normalizePath(pathname)

  if (path === '/') {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalPath: '/',
      type: 'website',
    }
  }

  if (path === '/projects') {
    return {
      title: '项目集 | BIAU Port',
      description: '浏览 BIAU Port 泊岸的 AI 应用、业务系统、互动体验、移动端和内容平台项目。',
      canonicalPath: '/projects',
      type: 'website',
    }
  }

  if (path === '/blog') {
    return {
      title: '知识库 | BIAU Port',
      description: '阅读 BIAU Port 泊岸从真实项目中沉淀的 RAG、Agent、全栈开发、内容系统和发布验证文章。',
      canonicalPath: '/blog',
      type: 'website',
    }
  }

  return {
    title: '页面没有靠岸 | BIAU Port',
    description: '这个地址暂时没有对应内容，可以回到 BIAU Port 泊岸首页、项目集或知识库继续浏览。',
    canonicalPath: path,
    type: 'website',
  }
}

export function getProjectSeo(project: Project): SeoMeta {
  return {
    title: `${project.title} | BIAU Port 项目`,
    description: project.summary,
    canonicalPath: `/projects/${project.id}`,
    type: 'article',
    image: project.image ? absoluteUrl(project.image) : DEFAULT_IMAGE,
  }
}

export function getBlogPostSeo(post: BlogPostSummary): SeoMeta {
  return {
    title: `${post.title} | BIAU Port 知识库`,
    description: post.detail,
    canonicalPath: `/blog/${post.slug}`,
    type: 'article',
  }
}
