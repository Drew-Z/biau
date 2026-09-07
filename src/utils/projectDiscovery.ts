const projectGroupKeys = ['ai', 'fullstack', 'tool'] as const

export type ProjectGroupKey = (typeof projectGroupKeys)[number]

export function parseProjectGroupSearch(search: string): ProjectGroupKey {
  const requested = new URLSearchParams(search).get('group')
  return projectGroupKeys.find((group) => group === requested) ?? 'ai'
}

export function serializeProjectGroupSearch(group: ProjectGroupKey) {
  if (group === 'ai') return ''
  return `?${new URLSearchParams({ group }).toString()}`
}

export function getProjectListHref(group: ProjectGroupKey) {
  return `/projects${serializeProjectGroupSearch(group)}`
}
