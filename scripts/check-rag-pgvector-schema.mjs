import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = await readFile(resolve(repoRoot, 'server/sql/rag-store-pgvector.sql'), 'utf8')
const tables = ['rag_documents', 'rag_chunks', 'rag_entities', 'rag_relations', 'rag_sync_runs', 'rag_eval_runs']

assert.match(schema, /create extension if not exists vector with schema extensions;/u)
assert.match(schema, /embedding extensions\.vector\(4096\)/u)
assert.doesNotMatch(schema, /using\s+(?:hnsw|ivfflat)/iu)
assert.doesNotMatch(schema, /create\s+policy/iu)
assert.doesNotMatch(schema, /grant\s+.+\s+to\s+(?:anon|authenticated)/iu)

for (const table of tables) {
  assert.match(schema, new RegExp(`create table if not exists ${table}\\s*\\(`, 'u'))
  assert.match(schema, new RegExp(`alter table ${table} enable row level security;`, 'u'))
}

assert.match(
  schema,
  /revoke all on table rag_documents, rag_chunks, rag_entities, rag_relations, rag_sync_runs, rag_eval_runs from anon, authenticated;/u,
)

console.log('RAG pgvector schema contract passed')
