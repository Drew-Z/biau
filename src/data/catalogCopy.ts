import type { ProjectGroupKey } from '../utils/projectDiscovery'
import type { SiteLanguage } from '../utils/siteLanguage'

interface CatalogCopy {
  blogTitle: string
  blogDescription: string
  searchRegion: string
  searchLabel: string
  searchPlaceholder: string
  columns: string
  selectColumn: string
  pendingColumn: string
  pagination: string
  previousPage: string
  nextPage: string
  readMore: string
  readArticle: (title: string) => string
  resultSummary: (count: number, page: number, totalPages: number) => string
  projectsTitle: string
  projectsDescription: string
  projectGroups: Record<ProjectGroupKey, string>
  projectCount: (count: number) => string
  viewDetails: string
  projectDetails: (title: string) => string
}

export const catalogCopy: Record<SiteLanguage, CatalogCopy> = {
  zh: {
    blogTitle: '知识库',
    blogDescription: '从实践中提炼项目方法、技术路线和公开内容系统。',
    searchRegion: '文章检索',
    searchLabel: '搜索知识库文章',
    searchPlaceholder: '搜索文章、项目方法、技术关键词',
    columns: '知识栏目',
    selectColumn: '选择知识库栏目',
    pendingColumn: '待首发',
    pagination: '文章分页',
    previousPage: '上一页',
    nextPage: '下一页',
    readMore: '阅读全文',
    readArticle: (title) => `阅读文章：${title}`,
    resultSummary: (count, page, totalPages) => `公开精选 · ${count} 篇文章 · 第 ${page} / ${totalPages} 页`,
    projectsTitle: '项目集',
    projectsDescription: '让技术落进可演示的流程',
    projectGroups: { ai: 'AI 应用', fullstack: '全栈开发', tool: '工具' },
    projectCount: (count) => `${count} 个项目`,
    viewDetails: '查看详情',
    projectDetails: (title) => `查看项目详情：${title}`,
  },
  en: {
    blogTitle: 'Knowledge Base',
    blogDescription: 'Project methods, technical approaches and public content systems drawn from practice.',
    searchRegion: 'Article search',
    searchLabel: 'Search knowledge base articles',
    searchPlaceholder: 'Search articles or topics',
    columns: 'Knowledge columns',
    selectColumn: 'Select knowledge base column',
    pendingColumn: 'Awaiting first post',
    pagination: 'Article pagination',
    previousPage: 'Previous',
    nextPage: 'Next',
    readMore: 'Read more',
    readArticle: (title) => `Read article: ${title}`,
    resultSummary: (count, page, totalPages) => `Public selection · ${formatArticleCount(count, 'en')} · Page ${page} / ${totalPages}`,
    projectsTitle: 'Projects',
    projectsDescription: 'Technology brought into working demonstrations',
    projectGroups: { ai: 'AI Applications', fullstack: 'Full-stack Development', tool: 'Tools' },
    projectCount: (count) => `${count} ${count === 1 ? 'project' : 'projects'}`,
    viewDetails: 'View details',
    projectDetails: (title) => `View project details: ${title}`,
  },
}

export function formatArticleCount(count: number, language: SiteLanguage) {
  return language === 'zh' ? `${count} 篇` : `${count} ${count === 1 ? 'article' : 'articles'}`
}
