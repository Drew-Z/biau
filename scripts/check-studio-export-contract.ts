import {
  assistantKnowledgeRelativePaths,
  buildStudioExportedFiles,
  exportValidationCommands,
} from './studio-export-contract.js'

const expectedCommands = [
  'assistant:index',
  'assistant:kg-check',
  'blog:audit',
  'blog:check',
  'blog:knowledge-check',
  'blog:project-notes-check',
  'lint',
  'build',
]

assertEqual(exportValidationCommands, expectedCommands, 'Studio export validation order')

const blogFiles = ['src/data/blog.ts', 'src/data/blog-posts/example.ts']
assertEqual(buildStudioExportedFiles(blogFiles, false), blogFiles, 'unchecked export files')
assertEqual(
  buildStudioExportedFiles(blogFiles, true),
  [...blogFiles, ...assistantKnowledgeRelativePaths],
  'checked export files',
)

console.log('Studio export knowledge contract passed.')

function assertEqual(actual: readonly string[], expected: readonly string[], label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} mismatch: ${JSON.stringify(actual)}`)
  }
}
