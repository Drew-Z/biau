export const assistantKnowledgeRelativePaths = [
  'server/data/public-knowledge.json',
  'server/data/public-knowledge-v2.json',
] as const

export const exportValidationCommands = [
  'assistant:index',
  'assistant:kg-check',
  'blog:audit',
  'blog:check',
  'blog:knowledge-check',
  'blog:project-notes-check',
  'lint',
  'build',
] as const

export function buildStudioExportedFiles(blogFiles: string[], runChecks: boolean) {
  return Array.from(new Set([
    ...blogFiles,
    ...(runChecks ? assistantKnowledgeRelativePaths : []),
  ]))
}
