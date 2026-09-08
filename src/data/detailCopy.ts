import type { ProjectDetailContentKey, ProjectVisualBlockType } from './portfolio'
import type { SiteLanguage } from '../utils/siteLanguage'

interface DetailCopy {
  reading: {
    navigation: string
    statusNavigation: string
    progress: string
    outline: string
    sectionCount: (count: number) => string
  }
  furtherReading: string
  blog: {
    loadingTitle: string
    loadingDescription: string
    missingTitle: string
    missingDescription: string
    back: string
    knowledge: string
    scenarios: string
    practice: string
    takeaways: string
    relatedProjects: string
  }
  project: {
    missingTitle: string
    missingDescription: string
    back: string
    highlights: string
    stack: string
    links: string
    caseStudy: string
    quickLinks: (title: string) => string
    openOriginal: string
    openScreenshot: (title: string) => string
    openImage: (title: string) => string
    visualTypes: Record<ProjectVisualBlockType, string>
  }
}

export const detailCopy: Record<SiteLanguage, DetailCopy> = {
  zh: {
    reading: {
      navigation: '阅读导航',
      statusNavigation: '状态导航',
      progress: '全文阅读进度',
      outline: '本文目录',
      sectionCount: (count) => `${count} 个章节`,
    },
    furtherReading: '延展阅读',
    blog: {
      loadingTitle: '文章载入中',
      loadingDescription: '正在打开知识库内容。',
      missingTitle: '未找到该文章',
      missingDescription: '该文章可能已下线或链接有误。',
      back: '返回知识库',
      knowledge: '知识点',
      scenarios: '应用场景',
      practice: '实践清单',
      takeaways: '关键收获',
      relatedProjects: '关联项目',
    },
    project: {
      missingTitle: '未找到该项目',
      missingDescription: '该项目可能已下线或链接有误。',
      back: '返回项目集',
      highlights: '核心亮点',
      stack: '技术栈',
      links: '相关链接',
      caseStudy: '项目案例分析',
      quickLinks: (title) => `${title} 快速链接`,
      openOriginal: '打开原图',
      openScreenshot: (title) => `打开 ${title} 项目截图原图`,
      openImage: (title) => `打开 ${title} 原图`,
      visualTypes: { screenshot: '界面截图', architecture: '架构图', workflow: '流程图', 'data-flow': '数据流', status: '状态证据', release: '发布证据', diagram: '说明图' },
    },
  },
  en: {
    reading: {
      navigation: 'Reading guide',
      statusNavigation: 'Status navigation',
      progress: 'Reading progress',
      outline: 'On this page',
      sectionCount: (count) => `${count} ${count === 1 ? 'section' : 'sections'}`,
    },
    furtherReading: 'Further reading',
    blog: {
      loadingTitle: 'Loading article',
      loadingDescription: 'Opening the knowledge base article.',
      missingTitle: 'Article not found',
      missingDescription: 'This article may have been removed, or the link may be incorrect.',
      back: 'Back to knowledge base',
      knowledge: 'Key concepts',
      scenarios: 'Use cases',
      practice: 'Practice checklist',
      takeaways: 'Key takeaways',
      relatedProjects: 'Related projects',
    },
    project: {
      missingTitle: 'Project not found',
      missingDescription: 'This project may have been removed, or the link may be incorrect.',
      back: 'Back to projects',
      highlights: 'Highlights',
      stack: 'Technology stack',
      links: 'Links',
      caseStudy: 'Project case study',
      quickLinks: (title) => `${title} quick links`,
      openOriginal: 'Open original',
      openScreenshot: (title) => `Open original screenshot for ${title}`,
      openImage: (title) => `Open original image: ${title}`,
      visualTypes: { screenshot: 'Screenshot', architecture: 'Architecture diagram', workflow: 'Workflow', 'data-flow': 'Data flow', status: 'Status evidence', release: 'Release evidence', diagram: 'Diagram' },
    },
  },
}

export const projectDetailGroupLabelsEn: Record<ProjectDetailContentKey, string> = {
  overview: 'Overview',
  workflow: 'Workspace capabilities',
  architecture: 'Implementation and architecture',
  quality: 'Quality and verification',
  limitations: 'Current limitations',
  roadmap: 'Next improvements',
}
