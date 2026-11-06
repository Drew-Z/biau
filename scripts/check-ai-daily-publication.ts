import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { configurationHash, contentBranch, packageEdition, publish } from './horizon/editions.ts'
import { editionFixture } from './lib/ai-daily-edition-fixtures.ts'

const directory = await mkdtemp(join(tmpdir(), 'biau-daily-git-check-'))
const previousCwd = process.cwd()
function git(args: string[], input?: string) {
  return execFileSync('git', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
}
try {
  const remote = join(directory, 'remote.git')
  const checkout = join(directory, 'site')
  git(['init', '--bare', '--initial-branch=main', remote])
  git(['init', '--initial-branch=main', checkout])
  process.chdir(checkout)
  git(['config', 'user.name', 'Fixture'])
  git(['config', 'user.email', 'fixture@example.com'])
  git(['remote', 'add', 'origin', remote])
  await writeFile('unrelated.txt', 'original\n')
  git(['add', 'unrelated.txt'])
  git(['commit', '-m', 'fixture baseline'])
  await writeFile('unrelated.txt', 'uncommitted user work\n')
  const initialStatus = git(['status', '--porcelain'])
  const morning = await packageEdition(await editionFixture(), '2026-11-05T00:11:00Z')
  const evening = await packageEdition(await editionFixture('evening'), '2026-11-05T12:11:00Z')
  const gate = { enabled: true, configurationHash: await configurationHash(), firstEditionId: morning.edition.editionId, firstContentSha256: morning.edition.contentSha256 }
  const first = await publish(morning, gate, join(directory, 'publication-index'))
  assert.equal(first.published, true)
  const second = await publish(evening, gate, join(directory, 'publication-index'))
  assert.equal(second.published, true)
  assert.equal((await publish(evening, gate, join(directory, 'publication-index'))).published, false)
  const ref = `refs/heads/${contentBranch}`
  const head = git(['--git-dir', remote, 'rev-parse', ref])
  const index = JSON.parse(git(['--git-dir', remote, 'show', `${ref}:index.json`]))
  assert.equal(index.latestEditionId, evening.edition.editionId)
  assert.equal(index.editions.length, 2)
  const paths = git(['--git-dir', remote, 'ls-tree', '-r', '--name-only', ref]).split('\n')
  assert.equal(paths.length, 5)
  assert.ok(paths.every((path) => path === 'index.json' || path.startsWith('editions/')))
  await assert.rejects(publish(morning, { ...gate, enabled: false }, join(directory, 'publication-index')))
  assert.equal(git(['--git-dir', remote, 'rev-parse', ref]), head)
  // Staging only part of an issue never exposes it until the final ref update.
  git(['hash-object', '-w', '--stdin'], 'partial upload fixture')
  assert.equal(git(['--git-dir', remote, 'rev-parse', ref]), head)
  const tree = git(['rev-parse', `${head}^{tree}`])
  const competing = git(['commit-tree', tree, '-p', head, '-m', 'concurrent publication A'])
  const stale = git(['commit-tree', tree, '-p', head, '-m', 'concurrent publication B'])
  git(['push', 'origin', `${competing}:${ref}`])
  assert.throws(() => git(['push', 'origin', `${stale}:${ref}`]))
  assert.equal(git(['--git-dir', remote, 'rev-parse', ref]), competing)
  assert.deepEqual(JSON.parse(git(['--git-dir', remote, 'show', `${ref}:index.json`])), index)
  assert.equal(git(['branch', '--show-current']), 'main')
  assert.equal(git(['status', '--porcelain']), initialStatus)
  assert.equal(await readFile('unrelated.txt', 'utf8'), 'uncommitted user work\n')
  console.log(JSON.stringify({ ok: true, atomicPublication: true, idempotence: true, conflictRejected: true, workingTreePreserved: true, externalRequests: 0 }))
} finally {
  process.chdir(previousCwd)
  // Only this test's freshly-created temporary repository is removed.
  await rm(directory, { recursive: true })
}
