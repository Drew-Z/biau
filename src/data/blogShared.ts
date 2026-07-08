export type BlogColumn = 'knowledge' | 'project-notes' | 'resources' | 'ai-daily' | 'build-log'

export interface BlogColumnMeta {
  id: BlogColumn
  titleZh: string
  titleEn: string
  description: string
  scope: string
  avoid: string
}

export interface BlogEmptyState {
  title: string
  description: string
  note?: string
}

export const blogColumnOrder: BlogColumn[] = [
  'knowledge',
  'project-notes',
  'resources',
  'ai-daily',
  'build-log',
]

export const blogColumnMeta: Record<BlogColumn, BlogColumnMeta> = {
  knowledge: {
    id: 'knowledge',
    titleZh: '知识积累',
    titleEn: 'Knowledge Notes',
    description: '沉淀可复用的技术理解、工程方法与 AI 应用实践。',
    scope: '适合长期有效的技术总结、架构理解、工程治理、AI 应用方法。',
    avoid: '避免写成单个项目流水账、新闻搬运或没有验证的观点堆叠。',
  },
  'project-notes': {
    id: 'project-notes',
    titleZh: '项目总结',
    titleEn: 'Project Notes',
    description: '记录项目阶段复盘、关键问题、架构取舍与后续迭代方向。',
    scope: '适合项目复盘、踩坑修复、演进路线、阶段验收与架构取舍。',
    avoid: '避免复制项目详情页已有的功能清单、技术栈、演示入口和稳定事实。',
  },
  resources: {
    id: 'resources',
    titleZh: '资源分享',
    titleEn: 'Resource Picks',
    description: '分享工具、文章、仓库、模型、课程、素材等资源与个人使用笔记。',
    scope: '适合用户主动推荐并附带判断、使用场景和适用人群的资源。',
    avoid: '避免自动生成无筛选的链接堆、资源模板或没有个人判断的清单。',
  },
  'ai-daily': {
    id: 'ai-daily',
    titleZh: 'AI 日报',
    titleEn: 'AI Daily',
    description: '记录 AI 模型、工具、行业案例和可试能力的高频动态。',
    scope: '适合有来源支撑的模型更新、工具变化、行业动态和短周期观察。',
    avoid: '避免未核实消息、长期方法论文章和无法追溯来源的快讯。',
  },
  'build-log': {
    id: 'build-log',
    titleZh: '构建手记',
    titleEn: 'Build Log',
    description: '记录网站、内容系统、AI 助手与 Trellis 工作流的构建过程。',
    scope: '适合系统演进、工作流改造、内容治理、自动化和发布过程复盘。',
    avoid: '避免与项目详情页重复的稳定展示文案或无结论的过程记录。',
  },
}

const firstPublishEmptyState: Record<BlogColumn, BlogEmptyState> = {
  knowledge: {
    title: '知识积累 正在继续补全',
    description: '这个栏目只放能够长期复用的技术理解和工程方法，公开前需要补齐知识点、场景、清单和来源证据。',
    note: '没有通过知识文质量检查的草稿不会直接出现在公开列表中。',
  },
  'project-notes': {
    title: '项目总结 等待新的复盘主题',
    description: '项目总结用于沉淀跨项目复盘、版本演进和技术案例补充，不重复搬运项目详情页已有的功能清单。',
    note: '新的复盘会先确认公开证据、截图和后续迭代边界，再进入发布流程。',
  },
  resources: {
    title: '资源分享 等待人工精选',
    description: '资源分享用于记录真实使用后的工具、文章、仓库、模型或课程判断，不自动生成无筛选的链接列表。',
    note: '首发资源需要补齐适用场景、个人判断、使用边界和公开安全检查。',
  },
  'ai-daily': {
    title: 'AI 日报 正在准备首发',
    description: 'AI 日报采用 Studio-first 流程：来源池、日报 issue 和 hidden/review-needed 草稿已经分层管理。',
    note: '公开前仍需要人工审核、创建 Publish Export，并通过 Git diff 审查；未审核草稿不会展示给访客。',
  },
  'build-log': {
    title: '构建手记 暂无新的公开记录',
    description: '构建手记记录站点、助手、内容系统和 Trellis 工作流的真实演进，不发布没有结论的过程碎片。',
    note: '新的构建记录会在本地验证和低敏证据齐备后再公开。',
  },
}

export function getBlogEmptyState(column: BlogColumn | 'all', query: string): BlogEmptyState {
  const hasQuery = query.trim().length > 0

  if (hasQuery) {
    if (column === 'all') {
      return {
        title: '没有找到相关文章',
        description: '当前关键词没有匹配公开精选文章。',
        note: '可以换成项目名、技术栈、RAG、发布验证、内容治理等关键词再试一次。',
      }
    }

    return {
      title: `${blogColumnMeta[column].titleZh} 没有匹配结果`,
      description: '当前栏目下没有匹配关键词的公开文章。',
      note: '可以清空搜索词查看该栏目的全部公开内容，或回到“全部”扩大范围。',
    }
  }

  if (column === 'all') {
    return {
      title: '暂无公开文章',
      description: '公开文章需要先通过策展、审核和发布检查。',
      note: '未审核草稿和内部资料不会直接出现在公开知识库中。',
    }
  }

  return firstPublishEmptyState[column]
}

export type BlogPost = {
  slug: string
  title: string
  tag: string
  column: BlogColumn
  detail: string
  date: string
  readTime: string
  series?: string
  knowledgePoints?: string[]
  scenarios?: string[]
  practiceChecklist?: string[]
  sections: Array<{ title: string; body: string }>
  takeaways: string[]
}

export type BlogPostSummary = Pick<
  BlogPost,
  'slug' | 'title' | 'tag' | 'column' | 'detail' | 'date' | 'readTime' | 'series' | 'knowledgePoints'
>
