import { getProjectBlogPosts } from './blogCuration'
import { projects, type Project } from './portfolio'

const maxRelatedProjects = 3
const projectOrder = new Map(projects.map((project, index) => [project.id, index]))

const statusRelatedWeight: Record<Project['status'], number> = {
  main: 4,
  live: 2,
  mvp: 0,
  ongoing: 0,
}

interface ProjectSignals {
  blogSlugs: Set<string>
  stackSignals: Set<string>
}

function getProjectOrder(project: Project) {
  return projectOrder.get(project.id) ?? projects.length
}

function getProjectBlogSlugs(projectId: Project['id']) {
  return new Set(getProjectBlogPosts(projectId).map((post) => post.slug))
}

function getStackSignals(project: Project) {
  const signals = new Set<string>()

  for (const tech of project.stack) {
    const normalized = tech
      .trim()
      .toLowerCase()
      .replace(/\b\d+(?:\.\d+)*\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!normalized) continue
    signals.add(normalized)

    if (normalized.includes('godot')) signals.add('godot')
    if (normalized.includes('android')) signals.add('android')
    if (normalized.includes('cloudflare')) signals.add('cloudflare')
    if (normalized.includes('r2')) signals.add('r2')
    if (normalized.includes('postgresql')) signals.add('postgresql')
    if (normalized.includes('express')) signals.add('express')
    if (normalized.includes('typescript')) signals.add('typescript')
    if (normalized.includes('prisma')) signals.add('prisma')
    if (normalized.includes('vite')) signals.add('vite')
    if (normalized.includes('react')) signals.add('react')
    if (normalized.includes('vue')) signals.add('vue')
  }

  return signals
}

function getProjectSignals(project: Project): ProjectSignals {
  return {
    blogSlugs: getProjectBlogSlugs(project.id),
    stackSignals: getStackSignals(project),
  }
}

function countIntersection(a: Set<string>, b: Set<string>) {
  let count = 0
  a.forEach((value) => {
    if (b.has(value)) count += 1
  })
  return count
}

function scoreRelatedProject(project: Project, currentSignals: ProjectSignals, candidate: Project) {
  const candidateSignals = getProjectSignals(candidate)
  const sharedBlogCount = countIntersection(currentSignals.blogSlugs, candidateSignals.blogSlugs)
  const sharedStackCount = countIntersection(currentSignals.stackSignals, candidateSignals.stackSignals)

  const categoryScore = candidate.category === project.category ? 50 : 0
  const blogScore = sharedBlogCount * 45
  const stackScore = Math.min(sharedStackCount * 8, 40)
  const relationScore = categoryScore + blogScore + stackScore
  const displayScore = statusRelatedWeight[candidate.status]

  return {
    project: candidate,
    relationScore,
    displayScore,
    score: relationScore + displayScore,
  }
}

export function getRelatedProjects(project: Project) {
  const currentSignals = getProjectSignals(project)
  const scored = projects
    .filter((candidate) => candidate.id !== project.id)
    .map((candidate) => scoreRelatedProject(project, currentSignals, candidate))

  const relationMatches = scored
    .filter((entry) => entry.relationScore > 0)
    .sort((a, b) => b.score - a.score || getProjectOrder(a.project) - getProjectOrder(b.project))
    .slice(0, maxRelatedProjects)

  if (relationMatches.length >= maxRelatedProjects) {
    return relationMatches.map((entry) => entry.project)
  }

  const selected = new Set(relationMatches.map((entry) => entry.project.id))
  const fallbacks = scored
    .filter((entry) => !selected.has(entry.project.id))
    .sort((a, b) => b.displayScore - a.displayScore || getProjectOrder(a.project) - getProjectOrder(b.project))
    .slice(0, maxRelatedProjects - relationMatches.length)

  return [...relationMatches, ...fallbacks].map((entry) => entry.project)
}

export function getRelatedProjectsTitle(project: Project, related: Project[]) {
  return related.some((item) => item.category !== project.category) ? '相关项目' : '同类项目'
}
