import fs from 'node:fs'
import path from 'node:path'
import {
  publicKnowledgeBase,
  publicKnowledgeV2,
  searchAssistantKnowledge,
  type AssistantKnowledgeItem,
} from '../src/data/assistant'
import type { AssistantKnowledgeEntityType, AssistantKnowledgeRelationType, PublicKnowledgeV2 } from '../src/data/assistantKnowledge'

const generatedPath = path.resolve('server/data/public-knowledge-v2.json')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function readGeneratedKnowledge() {
  assert(fs.existsSync(generatedPath), 'server/data/public-knowledge-v2.json is missing; run npm.cmd run assistant:index first')
  return JSON.parse(fs.readFileSync(generatedPath, 'utf8')) as PublicKnowledgeV2
}

function assertGeneratedIsFresh(generated: PublicKnowledgeV2) {
  const expected = JSON.stringify(publicKnowledgeV2)
  const actual = JSON.stringify(generated)
  assert(actual === expected, 'public-knowledge-v2.json is stale; run npm.cmd run assistant:index')
}

function assertEntityTypes(knowledge: PublicKnowledgeV2) {
  const requiredTypes: AssistantKnowledgeEntityType[] = [
    'site',
    'project',
    'tech',
    'feature',
    'demo',
    'status-check',
    'blog-post',
    'roadmap',
    'limitation',
  ]
  const existingTypes = new Set(knowledge.entities.map((entity) => entity.type))
  for (const type of requiredTypes) {
    assert(existingTypes.has(type), `knowledge V2 is missing entity type: ${type}`)
  }
}

function assertRelationTypes(knowledge: PublicKnowledgeV2) {
  const requiredTypes: AssistantKnowledgeRelationType[] = [
    'contains',
    'uses',
    'implements',
    'hasDemo',
    'monitoredBy',
    'documentedBy',
    'hasRoadmap',
    'hasLimitation',
    'relatedTo',
  ]
  const existingTypes = new Set(knowledge.relations.map((relation) => relation.type))
  for (const type of requiredTypes) {
    assert(existingTypes.has(type), `knowledge V2 is missing relation type: ${type}`)
  }
}

function expectCitation(query: string, expectedId: string) {
  const result = searchAssistantKnowledge(publicKnowledgeBase, query, { knowledge: publicKnowledgeV2 })
  assert(
    result.citations.some((citation) => citation.id === expectedId),
    `query "${query}" should cite ${expectedId}; got ${result.citations.map((citation) => citation.id).join(', ')}`,
  )
  return result
}

function assertDemoQuery() {
  const result = searchAssistantKnowledge(publicKnowledgeBase, '哪些项目可以演示？每个项目适合看什么？', {
    knowledge: publicKnowledgeV2,
  })
  const projectCitations = result.citations.filter((citation) => citation.id.startsWith('project:'))
  assert(projectCitations.length >= 2, 'demo query should return at least two project citations')
}

function assertTechQuery() {
  const result = searchAssistantKnowledge(publicKnowledgeBase, '哪些项目用了 React / Vite / TypeScript？', {
    knowledge: publicKnowledgeV2,
  })
  assert(
    result.citations.some((citation) => citation.id === 'project:blog-semi'),
    `tech query should cite project:blog-semi; got ${result.citations.map((citation) => citation.id).join(', ')}`,
  )
  assert(result.expandedEntityIds.some((id) => id.startsWith('tech:')), 'tech query should expand at least one tech entity')
}

function assertNoSensitiveValues(knowledge: PublicKnowledgeV2) {
  const serialized = JSON.stringify(knowledge)
  const secretPatterns = [
    /sk-[A-Za-z0-9_-]{16,}/,
    /Bearer\s+[A-Za-z0-9._-]{12,}/i,
    /postgres(?:ql)?:\/\/[^"'\s]+/i,
    /mysql:\/\/[^"'\s]+/i,
    /mongodb(?:\+srv)?:\/\/[^"'\s]+/i,
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  ]
  for (const pattern of secretPatterns) {
    assert(!pattern.test(serialized), `knowledge V2 matched sensitive pattern: ${pattern}`)
  }
}

function assertDocumentsArePublic(knowledge: PublicKnowledgeV2) {
  const sourceIds = new Set(publicKnowledgeBase.map((item: AssistantKnowledgeItem) => item.id))
  assert(knowledge.public_documents.length === publicKnowledgeBase.length, 'knowledge V2 document count should match publicKnowledgeBase')
  for (const document of knowledge.public_documents) {
    assert(document.visibility === 'public', `document ${document.id} is not public`)
    assert(sourceIds.has(document.id), `document ${document.id} is not present in publicKnowledgeBase`)
  }
}

const generated = readGeneratedKnowledge()
assertGeneratedIsFresh(generated)
assertDocumentsArePublic(publicKnowledgeV2)
assertEntityTypes(publicKnowledgeV2)
assertRelationTypes(publicKnowledgeV2)
expectCitation('我想问一下关于当前网站的问题', 'site:intro')
expectCitation('Legal RAG 怎么体验？我应该从哪个入口开始看？', 'project:legal-rag')
expectCitation('这个站点的可靠性状态怎么看？', 'site:status')
assertDemoQuery()
assertTechQuery()
assertNoSensitiveValues(publicKnowledgeV2)

console.log(
  `Assistant knowledge V2 check passed (${publicKnowledgeV2.public_documents.length} docs, ${publicKnowledgeV2.knowledge_chunks.length} chunks, ${publicKnowledgeV2.entities.length} entities, ${publicKnowledgeV2.relations.length} relations)`,
)
