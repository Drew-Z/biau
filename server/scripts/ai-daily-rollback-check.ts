import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createAiDailyRollbackEvidenceManifest,
  createAiDailyRollbackEvidenceRecordHash,
  evaluateAiDailyRollbackEvidenceManifest,
  sealAiDailyRollbackEvidenceManifest,
  type AiDailyRollbackEvidenceManifest,
} from '../src/aiDailyRollback.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const binding = {
  acceptanceId: 'acceptance-2026-07-20',
  editionDate: '2026-07-20',
  issueId: 'issue-2026-07-20',
  runId: 'run-2026-07-20-1',
}

const initial = createAiDailyRollbackEvidenceManifest({
  evidenceId: 'rollback-evidence-2026-07-20',
  recordedBy: 'offline-reviewer',
  recordedAt: '2026-07-20T05:00:00.000Z',
  acceptanceBinding: binding,
  reason: 'acceptance-drill',
})
const initialResult = evaluate(initial)
assert.equal(initialResult.readyToSeal, false)
assert.ok(initialResult.issues.includes('rollback-database-backup-required'))
assert.ok(initialResult.issues.includes('rollback-actions-incomplete'))

const completeManifest = complete(initial)
const completeResult = evaluate(completeManifest)
assert.equal(completeResult.readyToSeal, true)
assert.equal(completeResult.sealed, false)
assert.equal(completeResult.issues.length, 0)

const sealedManifest = sealAiDailyRollbackEvidenceManifest({ manifest: completeManifest, expectedBinding: binding })
const sealedResult = evaluateAiDailyRollbackEvidenceManifest({ manifest: sealedManifest, expectedBinding: binding, requireSealed: true })
assert.equal(sealedResult.ok, true)
if (sealedResult.ok) {
  assert.equal(sealedResult.sealed, true)
  assert.equal(sealedResult.issues.length, 0)
}

const bindingMismatch = evaluateAiDailyRollbackEvidenceManifest({
  manifest: sealedManifest,
  expectedBinding: { ...binding, runId: 'different-run' },
  requireSealed: true,
})
assert.equal(bindingMismatch.ok, true)
if (bindingMismatch.ok) assert.ok(bindingMismatch.issues.includes('rollback-acceptance-binding-mismatch'))

const tampered = evaluateAiDailyRollbackEvidenceManifest({
  manifest: { ...sealedManifest, actions: { ...sealedManifest.actions, publicFeedDisabled: 'failed' } },
  expectedBinding: binding,
  requireSealed: true,
})
assert.equal(tampered.ok, true)
if (tampered.ok) {
  assert.ok(tampered.issues.includes('rollback-actions-incomplete'))
  assert.ok(tampered.issues.includes('rollback-record-hash-mismatch'))
}

const rehashed = {
  ...sealedManifest,
  preservation: { ...sealedManifest.preservation, databaseHistoryPreserved: 'failed' as const },
  recordHash: null,
}
const rehashedResult = evaluateAiDailyRollbackEvidenceManifest({
  manifest: { ...rehashed, recordHash: createAiDailyRollbackEvidenceRecordHash(rehashed) },
  expectedBinding: binding,
  requireSealed: true,
})
assert.equal(rehashedResult.ok, true)
if (rehashedResult.ok) {
  assert.equal(rehashedResult.sealed, false)
  assert.ok(rehashedResult.issues.includes('rollback-preservation-incomplete'))
}

for (const invalid of [
  { ...completeManifest, preconditions: { ...completeManifest.preconditions, databaseBackupRecorded: false } },
  { ...completeManifest, preconditions: { ...completeManifest.preconditions, previousRenderRevisionRecorded: false } },
  { ...completeManifest, preconditions: { ...completeManifest.preconditions, migrationNames: [] } },
  { ...completeManifest, preservation: { ...completeManifest.preservation, destructiveMutationPerformed: true } },
  { ...completeManifest, decision: { ...completeManifest.decision, status: 'failed' as const } },
]) {
  const result = evaluate(invalid)
  assert.equal(result.readyToSeal, false)
}

const unknownSensitiveField = evaluateAiDailyRollbackEvidenceManifest({
  manifest: { ...completeManifest, apiKey: 'sk-not-allowed' },
})
assert.equal(unknownSensitiveField.ok, false)
if (!unknownSensitiveField.ok) assert.ok(unknownSensitiveField.issues.includes('rollback-manifest-unknown-field'))

const invalidMigration = evaluateAiDailyRollbackEvidenceManifest({
  manifest: { ...completeManifest, preconditions: { ...completeManifest.preconditions, migrationNames: ['../private.sql'] } },
})
assert.equal(invalidMigration.ok, false)
if (!invalidMigration.ok) assert.ok(invalidMigration.issues.includes('rollback-migration-name-invalid'))

const oldSchema = evaluateAiDailyRollbackEvidenceManifest({
  manifest: { ...completeManifest, schemaVersion: 'ai-daily-rollback-evidence-v0' },
})
assert.equal(oldSchema.ok, false)
if (!oldSchema.ok) assert.ok(oldSchema.issues.includes('rollback-schema-invalid'))

await runCliRoundTrip()

console.log('AI Daily rollback evidence contract passed (networkCalls=0, providerCalls=0, tamperCases=5, cliRoundTrip=1)')

function evaluate(manifest: unknown) {
  const result = evaluateAiDailyRollbackEvidenceManifest({ manifest, expectedBinding: binding })
  assert.equal(result.ok, true, result.ok ? undefined : result.issues.join(', '))
  if (!result.ok) throw new Error(result.issues.join(', '))
  return result
}

function complete(manifest: AiDailyRollbackEvidenceManifest): AiDailyRollbackEvidenceManifest {
  return {
    ...manifest,
    preconditions: {
      databaseBackupRecorded: true,
      previousRenderRevisionRecorded: true,
      migrationNames: ['20260718010000_ai_daily_generation_runner', '20260719020000_ai_daily_public_feed_index'],
    },
    actions: {
      ingestCronPaused: 'passed',
      editorialCronPaused: 'passed',
      productionGenerationDisabled: 'passed',
      publicFeedDisabled: 'passed',
    },
    preservation: {
      studioManualEditingAvailable: 'passed',
      studioReviewAvailable: 'passed',
      offlineExportAvailable: 'passed',
      databaseHistoryPreserved: 'passed',
      destructiveMutationPerformed: false,
    },
    decision: { status: 'passed', reason: 'acceptance-drill' },
  }
}

async function runCliRoundTrip() {
  const directory = await mkdtemp(resolve(repoRoot, 'server/data/.rollback-check-'))
  const outsideDirectory = await mkdtemp(resolve(tmpdir(), 'biau-rollback-outside-'))
  try {
    const manifestPath = resolve(directory, 'rollback.local.json')
    runCli([
      'init',
      '--evidence-id', 'rollback-cli-fixture',
      '--recorded-by', 'offline-reviewer',
      '--recorded-at', '2026-07-20T05:00:00.000Z',
      '--acceptance-id', binding.acceptanceId,
      '--edition-date', binding.editionDate,
      '--issue-id', binding.issueId,
      '--run-id', binding.runId,
      '--reason', 'acceptance-drill',
      '--out', repoRelative(manifestPath),
    ])
    const initialized = JSON.parse(await readFile(manifestPath, 'utf8')) as AiDailyRollbackEvidenceManifest
    await writeFile(manifestPath, `${JSON.stringify(complete(initialized), null, 2)}\n`, 'utf8')
    runCliJsonFailure(
      ['check', '--manifest', repoRelative(manifestPath), '--require-sealed'],
      'rollback-record-hash-required',
    )
    const check = runCli(['check', '--manifest', repoRelative(manifestPath)])
    assert.equal(check.readyToSeal, true)
    runCli(['seal', '--manifest', repoRelative(manifestPath)])
    runCli(['seal', '--manifest', repoRelative(manifestPath)])
    const sealed = runCli(['check', '--manifest', repoRelative(manifestPath), '--require-sealed'])
    assert.equal(sealed.sealed, true)
    runCliFailure(['check', '--unknown', 'value'], 'unknown-option:unknown')
    runCliFailure(['check', '--manifest', '../outside.local.json'], 'path-outside-repository:manifest')
    runCliFailure(['check', '--require-sealed=false'], 'invalid-option-value:require-sealed')
    const outsideLink = resolve(directory, 'outside-link')
    await symlink(outsideDirectory, outsideLink, process.platform === 'win32' ? 'junction' : 'dir')
    runCliFailure(['check', '--manifest', `${repoRelative(outsideLink)}/rollback.local.json`], 'path-outside-repository:manifest')
  } finally {
    await rm(directory, { recursive: true, force: true })
    await rm(outsideDirectory, { recursive: true, force: true })
  }
}

function runCli(args: string[]) {
  const result = spawnCli(args)
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return JSON.parse(result.stdout) as Record<string, unknown>
}

function runCliFailure(args: string[], expected: string) {
  const result = spawnCli(args)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'))
}

function runCliJsonFailure(args: string[], expectedIssue: string) {
  const result = spawnCli(args)
  assert.notEqual(result.status, 0)
  const payload = JSON.parse(result.stdout) as { issues?: unknown }
  assert.ok(Array.isArray(payload.issues) && payload.issues.includes(expectedIssue), result.stdout)
}

function spawnCli(args: string[]) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const npmArgs = ['--silent', 'run', 'ai-daily:rollback', '--', ...args]
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', [npmCommand, ...npmArgs].join(' ')], { cwd: repoRoot, encoding: 'utf8' })
    : spawnSync(npmCommand, npmArgs, { cwd: repoRoot, encoding: 'utf8' })
  return {
    status: result.status,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
  }
}

function repoRelative(path: string) {
  return relative(repoRoot, path).replaceAll('\\', '/')
}
