import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { KnowledgeItem } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const knowledgePath = path.resolve(__dirname, '../data/public-knowledge.json')

const SEARCH_KEYWORDS = [
  '站点',
  '公开内容',
  '项目方向',
  '能力',
  'ai',
  'rag',
  '知识库',
  '合同审查',
  '合同',
  '法律',
  '引用',
  '游戏',
  '互动体验',
  'godot',
  '试玩',
  '部署',
  'playlab',
  'biau',
  'pet',
  '桌宠',
  '完成',
  'wip',
  'ozon',
  'erp',
  '电商',
  '架构',
  '实现',
  '技术栈',
  '寻球',
  'xunqiu',
  '足球',
  'android',
  '后端',
  '优化',
  '后续',
  '路线',
  '生成管线',
  '人审',
  '社区',
  '移动端',
]

const SEARCH_ALIASES = [
  {
    triggers: ['rag', '知识库', '合同审查', '合同', '法律'],
    terms: ['legal rag', '引用溯源', '合同审查', '风险审查'],
  },
  {
    triggers: ['游戏', '互动体验', '试玩', 'godot', 'playlab'],
    terms: ['biau playlab', 'godot web', 'web 试玩', '互动体验'],
  },
  {
    triggers: ['pet', '桌宠', '宠物'],
    terms: ['pet-workspace', 'ai 桌宠', '生成管线', '质量门禁'],
  },
  {
    triggers: ['ozon', 'erp', '电商'],
    terms: ['ozon erp', '业务系统', '运营后台', '浏览器插件'],
  },
  {
    triggers: ['寻球', 'xunqiu', '足球', 'android', '移动端'],
    terms: ['xunqiu', '寻球', 'android 64', 'spring boot'],
  },
  {
    triggers: ['ai', '人工智能'],
    terms: ['ai 应用', 'legal rag', 'ai 桌宠'],
  },
]

function loadKnowledge(): KnowledgeItem[] {
  try {
    const raw = fs.readFileSync(knowledgePath, 'utf8')
    return JSON.parse(raw) as KnowledgeItem[]
  } catch {
    return [
      {
        id: 'site:intro',
        title: 'BIAU Port 站点简介',
        summary: 'BIAU Port 泊岸用于组织 AI 应用、业务系统、互动体验、移动端案例和技术知识库。',
        href: '/',
        tags: ['BIAU Port', '项目展示', '知识库'],
        visibility: 'public',
      },
    ]
  }
}

export const publicKnowledge = loadKnowledge()

function uniqueTerms(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)))
}

function extractQueryTerms(query: string) {
  const normalized = query.trim().toLowerCase()
  const asciiTerms = normalized.match(/[a-z0-9+#.]+/g) ?? []
  const explicitTerms = SEARCH_KEYWORDS.filter((term) => normalized.includes(term))
  const aliasTerms = SEARCH_ALIASES.flatMap((group) =>
    group.triggers.some((trigger) => normalized.includes(trigger)) ? group.terms : [],
  )

  return uniqueTerms([...asciiTerms, ...explicitTerms, ...aliasTerms])
}

function scoreKnowledgeItem(item: KnowledgeItem, normalized: string, terms: string[]) {
  const id = item.id.toLowerCase()
  const title = item.title.toLowerCase()
  const summary = item.summary.toLowerCase()
  const tags = item.tags.map((tag) => tag.toLowerCase())
  const asksForProject = normalized.includes('项目') || normalized.includes('案例') || normalized.includes('作品')
  const asksForArticle = normalized.includes('文章') || normalized.includes('博客')
  const asksForSiteOverview =
    normalized.includes('站点') || normalized.includes('主要展示') || normalized.includes('能做什么')

  let score = 0
  if (title.includes(normalized)) score += 8
  if (summary.includes(normalized)) score += 5
  if (tags.some((tag) => tag.includes(normalized))) score += 4

  for (const term of terms) {
    if (id.includes(term)) score += 4
    if (title.includes(term)) score += 5
    if (tags.some((tag) => tag.includes(term))) score += 3
    if (summary.includes(term)) score += 2
  }

  if (score > 0 && asksForProject && id.startsWith('project:')) score += 8
  if (score > 0 && asksForArticle && id.startsWith('blog:')) score += 4
  if (score > 0 && asksForSiteOverview && id === 'site:intro') score += 12

  return score
}

export function searchKnowledge(query: string, limit = 4) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return publicKnowledge.slice(0, limit)
  const terms = extractQueryTerms(query)

  return publicKnowledge
    .map((item) => {
      return { item, score: scoreKnowledgeItem(item, normalized, terms) }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item)
}
