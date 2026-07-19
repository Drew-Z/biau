import type { BlogPostSummary } from '../data/blogShared'
import type { Project } from '../data/portfolio'

export const SITE_URL = 'https://biau.playlab.eu.cc'
export const SITE_NAME = 'BIAU Port / 泊岸'
export const DEFAULT_TITLE = 'BIAU Port 泊岸 | AI 应用、项目展示与知识库'
export const DEFAULT_DESCRIPTION =
  'BIAU Port 泊岸用 React、Vite 与自定义设计系统组织 AI 应用、业务系统、游戏项目、移动端案例和技术知识库。'
export const DEFAULT_IMAGE = `${SITE_URL}/images/projects/showcase/blog-semi-home-desktop.png`

export interface SeoMeta {
  title: string
  description: string
  canonicalPath: string
  type?: 'website' | 'article'
  image?: string
}

function setMeta(selector: string, createAttrs: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(createAttrs).forEach(([key, value]) => element?.setAttribute(key, value))
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', url)
}

export function absoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function applySeo(meta: SeoMeta) {
  const canonicalUrl = absoluteUrl(meta.canonicalPath)
  const image = meta.image ?? DEFAULT_IMAGE

  document.title = meta.title
  setCanonical(canonicalUrl)
  setMeta('meta[name="description"]', { name: 'description' }, meta.description)
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME)
  setMeta('meta[property="og:title"]', { property: 'og:title' }, meta.title)
  setMeta('meta[property="og:description"]', { property: 'og:description' }, meta.description)
  setMeta('meta[property="og:type"]', { property: 'og:type' }, meta.type ?? 'website')
  setMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl)
  setMeta('meta[property="og:image"]', { property: 'og:image' }, image)
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image')
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, meta.title)
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, meta.description)
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, image)
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

  if (path === '/ai-daily') {
    return {
      title: 'AI 日报 | BIAU Port',
      description: '浏览 BIAU Port 泊岸经过证据整理与人工批准的近期 AI 动态和公开来源。',
      canonicalPath: '/ai-daily',
      type: 'website',
    }
  }

  if (path.startsWith('/ai-daily/')) {
    return {
      title: 'AI 日报快讯 | BIAU Port',
      description: '查看一条经过公开审核的 AI 快讯、影响说明、不确定性和来源引用。',
      canonicalPath: path,
      type: 'article',
    }
  }

  if (path === '/operator') {
    return {
      title: '泊岸站务 | BIAU Port',
      description: 'BIAU Port 的 owner-only 站务工作区。',
      canonicalPath: '/operator',
      type: 'website',
    }
  }

  if (path === '/status') {
    return {
      title: '站点入口状态 | BIAU Port',
      description: '查看 BIAU Port 泊岸主页项目入口的最近一次公开可用性检测结果。',
      canonicalPath: '/status',
      type: 'website',
    }
  }

  if (path.startsWith('/status/')) {
    return {
      title: '项目可靠性详情 | BIAU Port',
      description: '查看 BIAU Port 泊岸项目可靠性观察中的单个项目检查项、人工 gate 和后续接入方向。',
      canonicalPath: path,
      type: 'website',
    }
  }

  if (path === '/operator/settings') {
    return {
      title: '站务设置 | BIAU Port',
      description: 'BIAU Operator 的知识、RAG、记忆与低敏运行诊断。',
      canonicalPath: '/operator/settings',
      type: 'website',
    }
  }

  if (path === '/studio') {
    return {
      title: '内容工作台 | BIAU Port',
      description: 'BIAU Port 内容工作台，用于管理博客草稿、AI 日报 issue、来源池、审核和静态发布导出。',
      canonicalPath: '/studio',
      type: 'website',
    }
  }

  if (path === '/studio/ai-daily') {
    return {
      title: 'AI Daily 工作区 | BIAU Port 内容工作台',
      description: '在 BIAU Port 内容工作台中查看 AI Daily 的运行、来源、候选证据、闪报修订和 Edition 审核状态。',
      canonicalPath: '/studio/ai-daily',
      type: 'website',
    }
  }

  if (path.startsWith('/studio/ai-daily/')) {
    return {
      title: 'AI 日报详情 | BIAU Port 内容工作台',
      description: '在 BIAU Port 内容工作台中管理单期 AI 日报的来源、brief、审核状态和内容草稿转换。',
      canonicalPath: path,
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
