import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  approveAiDailyModelManualSelectionProposal,
  approveAiDailyModelEvaluationProposal,
  createAiDailyModelArtifactHash,
  createAiDailyModelEvaluationProposal,
  createAiDailyModelManualSelectionProposal,
  type AiDailyModelApprovalArtifact,
  validateAiDailyModelApprovalArtifact,
  validateAiDailyModelApprovalBundle,
  validateAiDailyModelManualSelectionProposal,
} from '../src/aiDailyModelArtifacts.js'
import { createAiDailyResponsesProvider } from '../src/aiDailyModelProvider.js'
import {
  buildAiDailyProductionProviders,
  defaultAiDailyModelApprovalFile,
  loadAiDailyModelApprovalBundle,
  summarizeAiDailyModelApprovalBundle,
} from '../src/aiDailyModelProduction.js'
import { resolveAiDailyRunnerGenerationMode } from '../src/aiDailyRunnerMode.js'
import {
  normalizeAiDailyModelRuntimeConfig,
  summarizeAiDailyModelRuntime,
  validateAiDailyModelEvaluationPool,
  type AiDailyModelRuntimeConfig,
} from '../src/aiDailyModelRuntime.js'
import {
  createAiDailyEvaluationCaseSetHash,
  type AiDailyModelEvaluationCandidateInput,
} from '../src/aiDailyModelEvaluation.js'
import {
  aiDailyModelEvaluationCaseSetId,
  buildAiDailyModelEvaluationCaseDescriptors,
} from '../src/aiDailyModelEvaluationCaseSet.js'
import {
  aiDailyGenerationPromptVersion,
  aiDailyGenerationSchemaVersion,
  type AiDailyGenerationRole,
  type AiDailyQualityCaseResult,
} from '../src/aiDailyGeneration.js'
import { assert, assertDeepEqual, assertEqual } from './ai-daily-check-helpers.js'

const observedBodies: Array<Record<string, unknown>> = []
const observedPaths: string[] = []
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const server = createServer((request, response) => {
  const chunks: Buffer[] = []
  request.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
  request.on('end', () => {
    const requestPath = request.url ?? ''
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
    observedBodies.push(body)
    observedPaths.push(requestPath)
    if (requestPath === '/compat/responses') {
      response.writeHead(404, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'not-found' }))
      return
    }
    if (requestPath === '/upstream/responses') {
      response.writeHead(503, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'upstream-unavailable' }))
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      output: [{
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '```json\n{"claims":[]}\n```' }],
      }],
    }))
  })
})

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
try {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('loopback-address-missing')
  const runtime = buildRuntime(`http://127.0.0.1:${address.port}`)
  const summary = summarizeAiDailyModelRuntime(runtime)
  assertEqual(summary.channelCount, 2, 'runtime channel count')
  assertDeepEqual(summary.roles, { extractor: 2, composer: 2, verifier: 2 }, 'runtime role counts')
  assertEqual(summary.failureDomains.length, 2, 'independent failure domains')
  const reducedRuntime = {
    ...runtime,
    channels: runtime.channels.map((channel) => ({ ...channel, failureDomainRef: 'shared-provider-domain' })),
  }
  assertThrows(
    () => validateAiDailyModelEvaluationPool(reducedRuntime),
    'same-provider model comparison must require explicit reduced-redundancy opt-in',
  )
  const reducedPool = validateAiDailyModelEvaluationPool(reducedRuntime, { allowReducedRedundancy: true })
  assertDeepEqual(reducedPool.reducedRedundancyRoles, ['extractor', 'composer', 'verifier'], 'reduced redundancy role report')
  assertEqual(resolveAiDailyRunnerGenerationMode({ fixture: true, live: false, productionEnabled: false }), 'fixture', 'fixture runner mode')
  assertEqual(resolveAiDailyRunnerGenerationMode({ fixture: false, live: true, productionEnabled: true }), 'live', 'live runner mode')
  assertThrows(() => resolveAiDailyRunnerGenerationMode({ fixture: false, live: true, productionEnabled: false }), 'disabled live mode')
  assertThrows(() => resolveAiDailyRunnerGenerationMode({ fixture: true, live: true, productionEnabled: true }), 'conflicting runner mode')

  const provider = createAiDailyResponsesProvider({
    candidate: runtime.candidates[0],
    channel: runtime.channels[0],
    slot: 'primary',
  })
  const output = await provider.generate({ role: 'extractor', schemaVersion: aiDailyGenerationSchemaVersion, payload: { evidence: [] } })
  assertDeepEqual(output, { claims: [] }, 'provider fenced json parsing')
  assertEqual(observedBodies.length, 1, 'provider request count')
  assert(!Object.hasOwn(observedBodies[0], 'temperature'), 'provider request must omit temperature')
  assert(Array.isArray(observedBodies[0].input), 'provider request must use Responses input')
  assert(!Object.hasOwn(observedBodies[0], 'messages'), 'provider request must not use Chat Completions messages')

  const baseUrl = runtime.channels[0].baseUrl
  const compatibilityProvider = createAiDailyResponsesProvider({
    candidate: runtime.candidates[0],
    channel: { ...runtime.channels[0], baseUrl: `${baseUrl}/compat` },
    slot: 'primary',
  })
  const compatibilityOutput = await compatibilityProvider.generate({
    role: 'extractor',
    schemaVersion: aiDailyGenerationSchemaVersion,
    payload: { evidence: [] },
  })
  assertDeepEqual(compatibilityOutput, { claims: [] }, 'provider 404 endpoint compatibility fallback')
  assertDeepEqual(
    observedPaths.slice(-2),
    ['/compat/responses', '/compat/v1/responses'],
    'provider compatibility endpoint order',
  )

  const upstreamProvider = createAiDailyResponsesProvider({
    candidate: runtime.candidates[0],
    channel: { ...runtime.channels[0], baseUrl: `${baseUrl}/upstream` },
    slot: 'primary',
  })
  const beforeUpstream = observedPaths.length
  await expectFailure(
    () => upstreamProvider.generate({ role: 'extractor', schemaVersion: aiDailyGenerationSchemaVersion, payload: { evidence: [] } }),
    'ai-daily-provider-upstream-error',
  )
  assertDeepEqual(
    observedPaths.slice(beforeUpstream),
    ['/upstream/responses'],
    'upstream failure must not duplicate the model task on another guessed endpoint',
  )

  const proposal = createAiDailyModelEvaluationProposal({
    selectionId: 'business-selection-check',
    generatedAt: '2026-07-19T15:00:00.000Z',
    candidates: runtime.candidates.map((candidate, index) => buildCandidateInput(runtime, candidate.candidateId, index % 2 === 0)),
  })
  assert(proposal.selection.approvalEligible, 'business selection should be approval eligible')
  assert(proposal.selection.roles.every((role) => role.redundancy === 'full'), 'every role should have full redundancy')
  const bundle = approveAiDailyModelEvaluationProposal({
    proposal,
    review: {
      reviewedAt: '2026-07-19T15:10:00.000Z',
      reviewedBy: 'site-owner-check',
      notes: 'Contract-only approval bundle check with loopback providers.',
    },
  })
  assertEqual(validateAiDailyModelApprovalBundle(bundle).bundleHash, bundle.bundleHash, 'bundle validation')
  const providers = buildAiDailyProductionProviders({ runtime, bundle })
  assertEqual(providers.extractor.primary.id, 'extractor-a', 'approved extractor primary')
  assertEqual(providers.extractor.fallbacks?.[0]?.id, 'extractor-b', 'approved extractor fallback')
  assertEqual(providers.composer.primary.id, 'composer-a', 'approved composer primary')
  assertEqual(providers.verifier.fallbacks?.[0]?.id, 'verifier-b', 'approved verifier fallback')

  assertThrows(
    () => createAiDailyModelManualSelectionProposal({
      selectionId: 'manual-selection-check',
      generatedAt: '2026-07-23T15:00:00.000Z',
      runtime: reducedRuntime,
      candidateIds: { extractor: 'extractor-a', composer: 'composer-a', verifier: 'verifier-a' },
      acknowledgeReducedRedundancy: false,
    }),
    'manual selection must require reduced-redundancy acknowledgement',
  )
  const manualProposal = createAiDailyModelManualSelectionProposal({
    selectionId: 'manual-selection-check',
    generatedAt: '2026-07-23T15:00:00.000Z',
    runtime: reducedRuntime,
    candidateIds: { extractor: 'extractor-a', composer: 'composer-a', verifier: 'verifier-a' },
    acknowledgeReducedRedundancy: true,
  })
  assertEqual(
    validateAiDailyModelManualSelectionProposal(manualProposal).proposalHash,
    manualProposal.proposalHash,
    'manual proposal validation',
  )
  assertThrows(
    () => approveAiDailyModelManualSelectionProposal({
      proposal: manualProposal,
      review: {
        reviewedAt: '2026-07-23T15:10:00.000Z',
        reviewedBy: 'site-owner-check',
        notes: 'Approve static role mapping for first-edition business review.',
      },
      acknowledgeReducedRedundancy: false,
    }),
    'manual approval must repeat the reduced-redundancy acknowledgement',
  )
  const manualBundle = approveAiDailyModelManualSelectionProposal({
    proposal: manualProposal,
    review: {
      reviewedAt: '2026-07-23T15:10:00.000Z',
      reviewedBy: 'site-owner-check',
      notes: 'Approve static role mapping for first-edition business review.',
    },
    acknowledgeReducedRedundancy: true,
  })
  assertEqual(validateAiDailyModelApprovalArtifact(manualBundle).bundleHash, manualBundle.bundleHash, 'manual bundle validation')
  const manualProviders = buildAiDailyProductionProviders({ runtime: reducedRuntime, bundle: manualBundle })
  assertEqual(manualProviders.extractor.primary.id, 'extractor-a', 'manual extractor primary')
  assertEqual(manualProviders.extractor.fallbacks?.length, 0, 'manual extractor has no independent fallback')
  assertEqual(manualProviders.composer.primary.id, 'composer-a', 'manual composer primary')
  assertEqual(manualProviders.verifier.primary.id, 'verifier-a', 'manual verifier primary')
  const manualSummary = summarizeAiDailyModelApprovalBundle(manualBundle)
  assertEqual(manualSummary.selectionBasis, 'manual-static-selection', 'manual selection basis')
  assert(manualSummary.roles.every((role) => role.redundancy === 'reduced_redundancy'), 'manual roles must disclose reduced redundancy')
  assert(manualSummary.roles.every((role) => role.fallbackCandidateIds.length === 0), 'manual roles must not claim fallback')
  const serializedManualArtifacts = JSON.stringify({ manualProposal, manualBundle })
  for (const deniedKey of ['"endpoint"', '"baseUrl"', '"apiKey"', '"prompt"', '"rawOutput"', '"qualityScore"', '"metrics"']) {
    assert(!serializedManualArtifacts.includes(deniedKey), `manual artifacts must not contain ${deniedKey}`)
  }
  assertThrows(
    () => validateAiDailyModelManualSelectionProposal({ ...manualProposal, endpoint: 'not-allowed' }),
    'manual proposal must reject unknown fields',
  )
  const manualDriftedRuntime = {
    ...reducedRuntime,
    channels: reducedRuntime.channels.map((channel, index) => index === 0
      ? { ...channel, modelIdentifier: 'test/model-drifted' }
      : channel),
  }
  assertThrows(
    () => buildAiDailyProductionProviders({ runtime: manualDriftedRuntime, bundle: manualBundle }),
    'manual selection runtime channel drift',
  )

  const driftedRuntime = {
    ...runtime,
    channels: runtime.channels.map((channel, index) => index === 0 ? { ...channel, providerRef: 'provider-drifted' } : channel),
  }
  assertThrows(() => buildAiDailyProductionProviders({ runtime: driftedRuntime, bundle }), 'runtime channel drift')

  const tampered = { ...bundle, bundleHash: '0'.repeat(64) }
  let tamperRejected = false
  try {
    validateAiDailyModelApprovalBundle(tampered)
  } catch {
    tamperRejected = true
  }
  assert(tamperRejected, 'tampered approval bundle should be rejected')

  assertThrows(
    () => validateAiDailyModelApprovalBundle({ ...bundle, selection: { selectionId: bundle.selection.selectionId } }),
    'malformed approval bundle should fail closed',
  )
  await validateCustomApprovalBundleFile(bundle, runtime)
  await validateCustomApprovalBundleFile(manualBundle, reducedRuntime)
  await validateManualSelectionCli(reducedRuntime)

  const invalid = normalizeAiDailyModelRuntimeConfig({ schemaVersion: 'wrong', channels: [], candidates: [] })
  assert(!invalid.ok, 'invalid runtime config should fail closed')
  const unsupportedProtocolInput = runtimeInput(`http://127.0.0.1:${address.port}`)
  unsupportedProtocolInput.channels[0].protocol = 'chat-completions'
  const unsupportedProtocol = normalizeAiDailyModelRuntimeConfig(unsupportedProtocolInput, { allowLocalBaseUrl: true })
  assert(!unsupportedProtocol.ok, 'Chat Completions runtime protocol must be rejected')
  if (!unsupportedProtocol.ok) assert(unsupportedProtocol.issues.includes('channels[0].protocol-invalid'), 'protocol rejection should be explicit')
  for (const unsafeBaseUrl of [
    `http://user:password@127.0.0.1:${address.port}`,
    `http://127.0.0.1:${address.port}?api_key=secret`,
    `http://127.0.0.1:${address.port}#secret`,
  ]) {
    const unsafe = normalizeAiDailyModelRuntimeConfig(runtimeInput(unsafeBaseUrl), { allowLocalBaseUrl: true })
    assert(!unsafe.ok, 'runtime URL credentials, query, and hash must fail closed')
  }
  const approvalBundleFile = await validateConfiguredApprovalBundleFile()
  console.log(`AI Daily model runtime check passed (loopbackCalls=${observedPaths.length}, externalProviderCalls=0, approvalBundleFile=${approvalBundleFile})`)
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

function assertThrows(callback: () => unknown, label: string) {
  let threw = false
  try {
    callback()
  } catch {
    threw = true
  }
  assert(threw, label)
}

async function expectFailure(action: () => Promise<unknown>, expectedMessage: string) {
  try {
    await action()
  } catch (error) {
    if (error instanceof Error && error.message === expectedMessage) return
    throw error
  }
  throw new Error(`expected failure: ${expectedMessage}`)
}

async function validateConfiguredApprovalBundleFile() {
  try {
    await loadAiDailyModelApprovalBundle(defaultAiDailyModelApprovalFile)
    return 'valid'
  } catch (error) {
    if (isMissingFileError(error)) return 'absent'
    if (error instanceof Error && error.message === 'ai-daily-model-approval-bundle-missing') return 'absent'
    throw error
  }
}

async function validateCustomApprovalBundleFile(
  bundle: AiDailyModelApprovalArtifact,
  runtime: AiDailyModelRuntimeConfig,
) {
  const directory = await mkdtemp(path.join(tmpdir(), 'biau-ai-daily-approval-'))
  const filePath = path.join(directory, 'approval.json')
  try {
    await writeFile(filePath, `${JSON.stringify(bundle)}\n`, 'utf8')
    const loaded = await loadAiDailyModelApprovalBundle(filePath, bundle.bundleHash)
    assertEqual(loaded.bundleHash, bundle.bundleHash, 'custom approval bundle path')
    await expectFailure(
      () => loadAiDailyModelApprovalBundle(filePath, '0'.repeat(64)),
      'ai-daily-model-approval-bundle-drift',
    )
    const runnerRuntime = {
      ...runtime,
      channels: runtime.channels.map((channel, index) => ({
        ...channel,
        baseUrl: `https://relay-${index + 1}.example.invalid/v1`,
      })),
    }
    assertApprovalDeliveryCheck({ runtime: runnerRuntime, filePath, bundleHash: bundle.bundleHash })
    assertLiveRunnerConfigFailure({
      runtime: runnerRuntime,
      filePath: '',
      bundleHash: bundle.bundleHash,
      expectedMessage: 'ai-daily-model-approval-file-not-configured',
    })
    assertLiveRunnerConfigFailure({
      runtime: runnerRuntime,
      filePath: 'server/data/ai-daily-model-approval.v1.json',
      bundleHash: bundle.bundleHash,
      expectedMessage: 'ai-daily-model-approval-file-path-invalid',
    })
    assertLiveRunnerConfigFailure({
      runtime: runnerRuntime,
      filePath,
      bundleHash: '',
      expectedMessage: 'ai-daily-model-approval-bundle-hash-not-configured',
    })
    assertLiveRunnerConfigFailure({
      runtime: runnerRuntime,
      filePath,
      bundleHash: '0'.repeat(64),
      expectedMessage: 'ai-daily-model-approval-bundle-drift',
    })
    await writeFile(filePath, '{', 'utf8')
    await expectFailure(
      () => loadAiDailyModelApprovalBundle(filePath, bundle.bundleHash),
      'invalid-ai-daily-model-approval-bundle-json',
    )
    await writeFile(filePath, `${JSON.stringify({ ...bundle, bundleHash: '0'.repeat(64) })}\n`, 'utf8')
    await expectFailure(
      () => loadAiDailyModelApprovalBundle(filePath, bundle.bundleHash),
      bundle.schemaVersion === 'ai-daily-model-approval-bundle-v2'
        ? 'invalid-ai-daily-model-approval-bundle-hash'
        : 'invalid-ai-daily-model-manual-selection-bundle-hash',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function validateManualSelectionCli(runtime: AiDailyModelRuntimeConfig) {
  const directory = await mkdtemp(path.join(tmpdir(), 'biau-ai-daily-selection-'))
  const proposalPath = path.join(directory, 'selection.local.json')
  const bundlePath = path.join(directory, 'approval.local.json')
  const commandEnv = {
    ...process.env,
    NODE_ENV: 'test',
    AI_DAILY_MODEL_RUNTIME_JSON: JSON.stringify(runtime),
  }
  try {
    const selected = spawnNpmScript('ai-daily:model-select', [
      '--selection-id', 'manual-selection-cli-check',
      '--extractor', 'extractor-a',
      '--composer', 'composer-a',
      '--verifier', 'verifier-a',
      '--acknowledge-reduced-redundancy',
      '--out', proposalPath,
    ], commandEnv)
    assert(selected.status === 0, 'manual selection CLI should create a pending proposal')
    assert(selected.stdout.includes('"modelCalls": 0'), 'manual selection CLI must report zero model calls')
    assert(!selected.stdout.includes('test-key-'), 'manual selection CLI must not expose runtime credentials')
    assert(!selected.stdout.includes(runtime.channels[0].baseUrl), 'manual selection CLI must not expose runtime endpoints')

    const approved = spawnNpmScript('ai-daily:model-select-approve', [
      '--input', proposalPath,
      '--reviewed-by', 'site-owner-check',
      '--notes', 'static-mapping-approved-for-first-edition-review',
      '--acknowledge-reduced-redundancy',
      '--out', bundlePath,
    ], commandEnv)
    assert(approved.status === 0, 'manual selection approval CLI should create a bundle')
    assert(approved.stdout.includes('"modelCalls": 0'), 'manual selection approval CLI must report zero model calls')
    assert(!approved.stdout.includes('test-key-'), 'manual approval CLI must not expose runtime credentials')
    const loaded = validateAiDailyModelApprovalArtifact(JSON.parse(await readFile(bundlePath, 'utf8')))
    assertEqual(summarizeAiDailyModelApprovalBundle(loaded).selectionBasis, 'manual-static-selection', 'manual CLI artifact basis')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function spawnNpmScript(script: string, args: string[], env: NodeJS.ProcessEnv) {
  const npmArgs = ['--silent', 'run', script, '--', ...args]
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', ['npm.cmd', ...npmArgs].join(' ')], {
        cwd: repoRoot,
        env,
        encoding: 'utf8',
        timeout: 30_000,
      })
    : spawnSync('npm', npmArgs, {
        cwd: repoRoot,
        env,
        encoding: 'utf8',
        timeout: 30_000,
      })
  return {
    status: result.status,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  }
}

function assertApprovalDeliveryCheck(input: {
  runtime: AiDailyModelRuntimeConfig
  filePath: string
  bundleHash: string
}) {
  const env = {
    ...process.env,
    AI_DAILY_MODEL_RUNTIME_JSON: JSON.stringify(input.runtime),
    AI_DAILY_MODEL_APPROVAL_FILE: input.filePath,
    AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH: input.bundleHash,
  }
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm.cmd run ai-daily:model-approval-check'], {
        cwd: repoRoot,
        env,
        encoding: 'utf8',
        timeout: 30_000,
      })
    : spawnSync('npm', ['run', 'ai-daily:model-approval-check'], {
        cwd: repoRoot,
        env,
        encoding: 'utf8',
        timeout: 30_000,
      })
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  assert(result.status === 0, 'configured approval delivery check should pass')
  assert(output.includes('"networkCalls": 0'), 'approval delivery check must declare zero network calls')
  assert(output.includes(input.bundleHash), 'approval delivery check should report the approved bundle hash')
  assert(!output.includes('test-key-'), 'approval delivery check must not expose runtime credentials')
  assert(!output.includes('example.invalid'), 'approval delivery check must not expose runtime endpoints')
}

function assertLiveRunnerConfigFailure(input: {
  runtime: AiDailyModelRuntimeConfig
  filePath: string
  bundleHash: string
  expectedMessage: string
}) {
  const command = 'npm.cmd run ai-daily:editorial-tick -- --live'
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    ASSISTANT_SERVICE_MODE: 'studio',
    STUDIO_DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/fixture',
    AI_DAILY_PRODUCTION_GENERATION_ENABLED: 'true',
    AI_DAILY_MODEL_RUNTIME_JSON: JSON.stringify(input.runtime),
    AI_DAILY_MODEL_APPROVAL_FILE: input.filePath,
    AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH: input.bundleHash,
  }
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', command], {
        cwd: repoRoot,
        env,
        encoding: 'utf8',
        timeout: 30_000,
      })
    : spawnSync('npm', ['run', 'ai-daily:editorial-tick', '--', '--live'], {
        cwd: repoRoot,
        env,
        encoding: 'utf8',
        timeout: 30_000,
      })
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  assert(result.status !== 0, `live runner should reject ${input.expectedMessage}`)
  assert(output.includes(input.expectedMessage), `live runner should fail before claiming work: ${input.expectedMessage}`)
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function buildRuntime(baseUrl: string): AiDailyModelRuntimeConfig {
  const parsed = normalizeAiDailyModelRuntimeConfig(runtimeInput(baseUrl), { allowLocalBaseUrl: true })
  if (!parsed.ok) throw new Error(parsed.issues.join(','))
  return parsed.config
}

function runtimeInput(baseUrl: string) {
  return {
    schemaVersion: 'ai-daily-model-runtime-v2',
    channels: [
      { id: 'relay-a', providerRef: 'provider-a', failureDomainRef: 'failure-a', protocol: 'responses', baseUrl, apiKey: 'test-key-a', modelIdentifier: 'test/model-a' },
      { id: 'relay-b', providerRef: 'provider-b', failureDomainRef: 'failure-b', protocol: 'responses', baseUrl, apiKey: 'test-key-b', modelIdentifier: 'test/model-b' },
    ],
    candidates: [
      { candidateId: 'extractor-a', role: 'extractor', channelId: 'relay-a' },
      { candidateId: 'extractor-b', role: 'extractor', channelId: 'relay-b' },
      { candidateId: 'composer-a', role: 'composer', channelId: 'relay-a' },
      { candidateId: 'composer-b', role: 'composer', channelId: 'relay-b' },
      { candidateId: 'verifier-a', role: 'verifier', channelId: 'relay-a' },
      { candidateId: 'verifier-b', role: 'verifier', channelId: 'relay-b' },
    ],
  }
}

function buildCandidateInput(runtime: AiDailyModelRuntimeConfig, candidateId: string, primaryMetrics: boolean): AiDailyModelEvaluationCandidateInput {
  const candidate = runtime.candidates.find((item) => item.candidateId === candidateId)
  const channel = runtime.channels.find((item) => item.id === candidate?.channelId)
  if (!candidate || !channel) throw new Error('runtime-candidate-missing')
  const descriptors = buildAiDailyModelEvaluationCaseDescriptors(candidate.role as AiDailyGenerationRole)
  const cases = descriptors.map((descriptor, index) => ({
    id: descriptor.id,
    category: descriptor.category.slice(`${candidate.role}:`.length) as AiDailyQualityCaseResult['category'],
    negativeTags: [...descriptor.negativeTags],
    criticalFactualErrors: 0,
    citedVerifiableClaims: 5,
    verifiableClaims: 5,
    validCitationBindings: 5,
    citationBindings: 5,
    editorOutcome: !primaryMetrics && index === 29 ? 'major-edit' as const : 'accepted' as const,
    chineseEditorialScore: primaryMetrics ? 4.8 : 4.6,
  }))
  return {
    candidateId,
    role: candidate.role as AiDailyGenerationRole,
    profile: 'business-evaluation',
    providerRef: channel.providerRef,
    failureDomainRef: channel.failureDomainRef,
    modelIdentifier: channel.modelIdentifier,
    caseSetId: aiDailyModelEvaluationCaseSetId(candidate.role as AiDailyGenerationRole),
    caseSetHash: createAiDailyEvaluationCaseSetHash(descriptors),
    caseDescriptors: descriptors,
    promptVersion: aiDailyGenerationPromptVersion,
    generationSchemaVersion: aiDailyGenerationSchemaVersion,
    evaluatedAt: '2026-07-19T15:00:00.000Z',
    cases,
    performance: {
      attemptCount: 30,
      medianLatencyMs: primaryMetrics ? 800 : 900,
      p95LatencyMs: primaryMetrics ? 1200 : 1400,
      averageInputTokens: null,
      averageOutputTokens: null,
    },
    executionEvidence: {
      mode: 'business-evaluation',
      evaluationRunId: 'business-evaluation-check',
      evaluatorVersion: 'runtime-check-v1',
      completedCaseCount: 30,
      modelCallCount: 30,
      resultSetHash: createAiDailyModelArtifactHash(cases),
    },
  }
}
