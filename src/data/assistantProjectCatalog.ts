import { projects, type Project } from './portfolio'
import { findProjectPublication, getProjectCta, getPublishedProjectLinks } from './projectPublication'
import type { AssistantKnowledgeItemLike } from './assistantKnowledge'

// A catalog is a complete structured lookup, independent of top-k semantic RAG.
// Keep each entry whole inside the model's 900-character evidence window.
export function buildPublicProjectCatalog(): AssistantKnowledgeItemLike[] {
  const introduction = '项目目录资料快照；入口开放与实时可用性不同，最新情况请查看项目页和状态页。'
  const groups: string[][] = []
  let current: string[] = []
  for (const project of projects) {
    const entry = `${project.title}（/projects/${project.id}）：${project.summary} ${describeAccess(project)}`
    if (entry.length > 450) throw new Error('project-catalog-entry-too-long')
    if (`${introduction}\n${[...current, entry].join('\n')}`.length > 900) {
      groups.push(current)
      current = []
    }
    current.push(entry)
  }
  if (current.length > 0) groups.push(current)
  if (groups.length > 8) throw new Error('project-catalog-exceeds-evidence-budget')
  return groups.map((entries, index) => ({
    id: `site:project-catalog:${index + 1}`,
    title: `公开项目目录 ${index + 1}/${groups.length}`,
    summary: `${introduction}\n${entries.join('\n')}`,
    href: '/projects',
    tags: ['项目目录', '演示入口', '访问边界'],
    visibility: 'public',
  }))
}

function describeAccess(project: Project) {
  const publication = findProjectPublication(project.id)
  if (publication) {
    const access = publication.access === 'login-gated' ? '需登录或邀请'
      : publication.access === 'case-only' ? '仅案例/规划，无独立公开体验入口' : '面向公开访客'
    const cta = getProjectCta(publication)
    const entries = getPublishedProjectLinks(publication, project.links).filter(link => link.intent === 'entry')
    return cta.enabled
      ? `访问：${access}；项目页提供${entries.map(link => link.label).join('、') || '入口'}，开放范围以该页说明为准。`
      : `访问：${access}；当前入口未开放直达，请先查看 ${cta.href}。`
  }
  const entries = getPublishedProjectLinks(undefined, project.links).filter(link => link.intent === 'entry')
  return entries.length > 0
    ? `访问：项目页提供${entries.map(link => link.label).join('、')}；不代表本次已验证可用。`
    : '访问：仅公开项目说明，未列出体验入口。'
}
