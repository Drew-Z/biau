import { createHash } from 'node:crypto'

export const aiDailyGenerationRoles = ['extractor', 'composer', 'verifier'] as const
export type AiDailyGenerationRole = (typeof aiDailyGenerationRoles)[number]
export type AiDailyGenerationSlot = 'primary' | 'fallback'

export const aiDailyClaimTypes = [
  'announcement',
  'release',
  'metric',
  'date',
  'price',
  'quote',
  'interpretation',
] as const
export type AiDailyClaimType = (typeof aiDailyClaimTypes)[number]

export type AiDailySourceKind = 'official' | 'primary_media' | 'secondary_media' | 'social' | 'unknown'

export interface AiDailyGenerationEvidence {
  evidenceId: string
  candidateId: string
  sourceItemId: string | null
  title: string
  publisher: string
  url: string
  canonicalUrl: string
  sourceKind: AiDailySourceKind
  sourceTier: 'TIER_1' | 'TIER_2' | 'TIER_3'
  publishedAt: string | null
  retrievedAt: string
  quote: string
  locator: { heading?: string; startChar?: number; endChar?: number }
  contentHash?: string
}

export interface AiDailyAtomicClaim {
  claimId: string
  text: string
  claimType: AiDailyClaimType
  evidenceIds: string[]
  directSupport: boolean
  conflictingEvidenceIds: string[]
  uncertainty: 'low' | 'medium' | 'high'
}

export interface AiDailyFactExtractionOutput {
  claims: AiDailyAtomicClaim[]
}

export interface AiDailyCompositionClaimBlock {
  text: string
  claimIds: string[]
}

export interface AiDailyCompositionEvent {
  eventId: string
  title: string
  factSummary: AiDailyCompositionClaimBlock
  whyItMatters: AiDailyCompositionClaimBlock
  uncertainty: 'low' | 'medium' | 'high'
  claimIds: string[]
}

export interface AiDailyComposition {
  title: string
  subtitle: string
  introduction: AiDailyCompositionClaimBlock
  events: AiDailyCompositionEvent[]
  trends: AiDailyCompositionClaimBlock[]
}

export const aiDailyVerifierVerdicts = ['entailed', 'contradicted', 'insufficient', 'unverifiable'] as const
export type AiDailyVerifierVerdict = (typeof aiDailyVerifierVerdicts)[number]
export const aiDailyVerifierReasonCodes = [
  'exact_support',
  'scope_inflation',
  'date_mismatch',
  'number_mismatch',
  'attribution_error',
  'missing_support',
] as const
export type AiDailyVerifierReasonCode = (typeof aiDailyVerifierReasonCodes)[number]

export interface AiDailyClaimReview {
  claimId: string
  verdict: AiDailyVerifierVerdict
  supportingEvidenceIds: string[]
  reasonCode: AiDailyVerifierReasonCode
  correctedText: string | null
}

export interface AiDailyCompositionReviewTarget {
  blockId: string
  text: string
  claimIds: string[]
}

export interface AiDailyCompositionBlockReview {
  blockId: string
  verdict: AiDailyVerifierVerdict
  supportingClaimIds: string[]
  reasonCode: AiDailyVerifierReasonCode
  correctedText: string | null
}

export interface AiDailyVerifierOutput {
  reviews: AiDailyClaimReview[]
  blockReviews: AiDailyCompositionBlockReview[]
}

export interface AiDailyStructuredGenerationRequest {
  role: AiDailyGenerationRole
  schemaVersion: string
  payload: unknown
  repair?: { issues: string[]; previousOutput: unknown }
}

export interface AiDailyStructuredGenerationProvider {
  id: string
  role: AiDailyGenerationRole
  slot: AiDailyGenerationSlot
  qualityScore: number
  generate(request: AiDailyStructuredGenerationRequest): Promise<unknown>
}

export interface AiDailyGenerationProviderAttempt {
  providerId: string
  role: AiDailyGenerationRole
  slot: AiDailyGenerationSlot
  outcome: 'succeeded' | 'failed' | 'schema-rejected' | 'quality-rejected'
  calls: number
  errorCategory: 'provider_error' | 'schema_invalid' | 'provider_quality_below_floor' | null
}

export interface AiDailyGenerationFinding {
  severity: 'critical' | 'review'
  code: string
  claimId?: string
  eventId?: string
  blockId?: string
}

export interface AiDailyCompositionValidationResult {
  status: 'VALID' | 'NEEDS_EDITOR_REVIEW' | 'REJECTED'
  findings: AiDailyGenerationFinding[]
  metrics: {
    citedVerifiableClaims: number
    verifiableClaims: number
    validCitationBindings: number
    citationBindings: number
  }
}

export interface AiDailyGenerationResult {
  status: AiDailyCompositionValidationResult['status']
  claims: AiDailyAtomicClaim[]
  composition: AiDailyComposition | null
  reviews: AiDailyClaimReview[]
  blockReviews: AiDailyCompositionBlockReview[]
  findings: AiDailyGenerationFinding[]
  attempts: AiDailyGenerationProviderAttempt[]
  callCount: number
  schemaVersion: string
  promptVersion: string
}

export interface AiDailyGenerationProviders {
  extractor: {
    primary: AiDailyStructuredGenerationProvider
    fallbacks?: AiDailyStructuredGenerationProvider[]
    minimumQualityScore: number
  }
  composer: {
    primary: AiDailyStructuredGenerationProvider
    fallbacks?: AiDailyStructuredGenerationProvider[]
    minimumQualityScore: number
  }
  verifier: {
    primary: AiDailyStructuredGenerationProvider
    fallbacks?: AiDailyStructuredGenerationProvider[]
    minimumQualityScore: number
  }
}

export const aiDailyGenerationSchemaVersion = 'ai-daily-generation-v2'
export const aiDailyGenerationPromptVersion = 'ai-daily-prompt-v2'

export type AiDailyExtractionStageResult =
  | {
      ok: true
      evidence: AiDailyGenerationEvidence[]
      claims: AiDailyAtomicClaim[]
      attempts: AiDailyGenerationProviderAttempt[]
    }
  | {
      ok: false
      code: string
      evidence: AiDailyGenerationEvidence[]
      attempts: AiDailyGenerationProviderAttempt[]
    }

export type AiDailyCompositionStageResult =
  | { ok: true; composition: AiDailyComposition; attempts: AiDailyGenerationProviderAttempt[] }
  | { ok: false; code: string; attempts: AiDailyGenerationProviderAttempt[] }

export type AiDailyVerificationStageResult =
  | {
      ok: true
      reviews: AiDailyClaimReview[]
      blockReviews: AiDailyCompositionBlockReview[]
      requiredReviewClaimIds: string[]
      attempts: AiDailyGenerationProviderAttempt[]
    }
  | { ok: false; code: string; requiredReviewClaimIds: string[]; attempts: AiDailyGenerationProviderAttempt[] }

export async function runAiDailyGeneration(input: {
  evidence: AiDailyGenerationEvidence[]
  providers: AiDailyGenerationProviders
  extractionBatchMaxItems?: number
  extractionBatchMaxChars?: number
}): Promise<AiDailyGenerationResult> {
  const extracted = await extractAiDailyFacts(input)
  if (!extracted.ok) return rejectedGenerationWithAttempts(extracted.code, extracted.attempts)
  const composed = await composeAiDailyFacts({ claims: extracted.claims, providers: input.providers })
  const extractionAttempts = extracted.attempts
  if (!composed.ok) {
    return rejectedGenerationWithAttempts(composed.code, [...extractionAttempts, ...composed.attempts], extracted.claims)
  }
  const verified = await verifyAiDailyComposition({
    evidence: extracted.evidence,
    claims: extracted.claims,
    composition: composed.composition,
    providers: input.providers,
  })
  const attempts = [...extractionAttempts, ...composed.attempts, ...verified.attempts]
  if (!verified.ok) {
    return rejectedGenerationWithAttempts(verified.code, attempts, extracted.claims, composed.composition)
  }
  return finalizeAiDailyGeneration({
    evidence: extracted.evidence,
    claims: extracted.claims,
    composition: composed.composition,
    reviews: verified.reviews,
    blockReviews: verified.blockReviews,
    requiredReviewClaimIds: verified.requiredReviewClaimIds,
    attempts,
  })
}

export async function extractAiDailyFacts(input: {
  evidence: AiDailyGenerationEvidence[]
  providers: AiDailyGenerationProviders
  extractionBatchMaxItems?: number
  extractionBatchMaxChars?: number
}): Promise<AiDailyExtractionStageResult> {
  const evidence = normalizeGenerationEvidence(input.evidence)
  if (evidence.length === 0) return { ok: false, code: 'evidence-pack-empty', evidence, attempts: [] }
  const attempts: AiDailyGenerationProviderAttempt[] = []
  const claims: AiDailyAtomicClaim[] = []
  const batches = batchAiDailyEvidence(evidence, {
    maxItems: input.extractionBatchMaxItems ?? 6,
    maxChars: input.extractionBatchMaxChars ?? 18_000,
  })
  for (const batch of batches) {
    const extracted = await runGenerationRole({
      role: 'extractor',
      providers: input.providers.extractor,
      payload: { evidence: batch },
      validate: (value) => normalizeFactExtractionOutput(value, new Map(batch.map((item) => [item.evidenceId, item]))),
    })
    attempts.push(...extracted.attempts)
    if (!extracted.ok) {
      return { ok: false, code: 'extractor-schema-or-provider-failure', evidence, attempts }
    }
    claims.push(...extracted.value.claims)
  }
  const normalizedClaims = normalizeUniqueClaims(claims)
  if (!normalizedClaims.ok) return { ok: false, code: normalizedClaims.issue, evidence, attempts }
  return { ok: true, evidence, claims: normalizedClaims.claims, attempts }
}

export async function composeAiDailyFacts(input: {
  claims: AiDailyAtomicClaim[]
  providers: AiDailyGenerationProviders
}): Promise<AiDailyCompositionStageResult> {
  const composed = await runGenerationRole({
    role: 'composer',
    providers: input.providers.composer,
    payload: { claims: input.claims },
    validate: (value) => normalizeCompositionOutput(value, new Set(input.claims.map((claim) => claim.claimId))),
  })
  return composed.ok
    ? { ok: true, composition: composed.value, attempts: composed.attempts }
    : { ok: false, code: 'composer-schema-or-provider-failure', attempts: composed.attempts }
}

export async function verifyAiDailyComposition(input: {
  evidence: AiDailyGenerationEvidence[]
  claims: AiDailyAtomicClaim[]
  composition: AiDailyComposition
  providers: AiDailyGenerationProviders
}): Promise<AiDailyVerificationStageResult> {
  const evidenceById = new Map(input.evidence.map((item) => [item.evidenceId, item]))
  const requiredReviewClaimIds = classifyAiDailyRiskClaims(input.claims, evidenceById, input.composition)
  const compositionBlocks = collectAiDailyCompositionReviewTargets(input.composition)
  const verified = await runGenerationRole({
    role: 'verifier',
    providers: input.providers.verifier,
    payload: {
      claims: input.claims,
      requiredReviewClaimIds,
      compositionBlocks,
      evidence: input.evidence,
    },
    validate: (value) => normalizeVerifierOutput(
      value,
      new Set(requiredReviewClaimIds),
      evidenceById,
      new Map(compositionBlocks.map((block) => [block.blockId, block])),
    ),
  })
  return verified.ok
    ? {
        ok: true,
        reviews: verified.value.reviews,
        blockReviews: verified.value.blockReviews,
        requiredReviewClaimIds,
        attempts: verified.attempts,
      }
    : { ok: false, code: 'verifier-schema-or-provider-failure', requiredReviewClaimIds, attempts: verified.attempts }
}

export function finalizeAiDailyGeneration(input: {
  evidence: AiDailyGenerationEvidence[]
  claims: AiDailyAtomicClaim[]
  composition: AiDailyComposition
  reviews: AiDailyClaimReview[]
  blockReviews: AiDailyCompositionBlockReview[]
  requiredReviewClaimIds: string[]
  attempts: AiDailyGenerationProviderAttempt[]
}): AiDailyGenerationResult {
  const validation = validateAiDailyComposition({
    evidence: input.evidence,
    claims: input.claims,
    composition: input.composition,
    reviews: input.reviews,
    blockReviews: input.blockReviews,
    requiredReviewClaimIds: new Set(input.requiredReviewClaimIds),
  })
  return {
    status: validation.status,
    claims: input.claims,
    composition: input.composition,
    reviews: input.reviews,
    blockReviews: input.blockReviews,
    findings: validation.findings,
    attempts: input.attempts,
    callCount: input.attempts.reduce((sum, attempt) => sum + attempt.calls, 0),
    schemaVersion: aiDailyGenerationSchemaVersion,
    promptVersion: aiDailyGenerationPromptVersion,
  }
}

export function createRejectedAiDailyGeneration(input: {
  code: string
  attempts?: AiDailyGenerationProviderAttempt[]
  claims?: AiDailyAtomicClaim[]
  composition?: AiDailyComposition | null
}): AiDailyGenerationResult {
  return rejectedGenerationWithAttempts(
    input.code,
    input.attempts ?? [],
    input.claims ?? [],
    input.composition ?? null,
  )
}

export function batchAiDailyEvidence(
  evidence: AiDailyGenerationEvidence[],
  limits: { maxItems: number; maxChars: number },
) {
  const maxItems = clampInteger(limits.maxItems, 1, 20)
  const maxChars = clampInteger(limits.maxChars, 1_000, 100_000)
  const batches: AiDailyGenerationEvidence[][] = []
  let current: AiDailyGenerationEvidence[] = []
  let currentChars = 0
  for (const item of evidence) {
    const itemChars = item.quote.length
    if (current.length > 0 && (current.length >= maxItems || currentChars + itemChars > maxChars)) {
      batches.push(current)
      current = []
      currentChars = 0
    }
    current.push(item)
    currentChars += itemChars
  }
  if (current.length > 0) batches.push(current)
  return batches
}

export function normalizeFactExtractionOutput(
  value: unknown,
  evidenceById: Map<string, AiDailyGenerationEvidence>,
): { ok: true; value: AiDailyFactExtractionOutput } | { ok: false; issues: string[] } {
  if (!isRecord(value) || !Array.isArray(value.claims)) return { ok: false, issues: ['claims-required'] }
  const issues: string[] = []
  const claims: AiDailyAtomicClaim[] = []
  for (const raw of value.claims.slice(0, 120)) {
    if (!isRecord(raw)) {
      issues.push('claim-invalid')
      continue
    }
    const claimId = readIdentifier(raw.claimId, 96)
    const text = readText(raw.text, 800)
    const claimType = aiDailyClaimTypes.includes(raw.claimType as AiDailyClaimType)
      ? (raw.claimType as AiDailyClaimType)
      : null
    const evidenceIds = uniqueStrings(readStringArray(raw.evidenceIds, 20, 96))
    const conflictingEvidenceIds = uniqueStrings(readStringArray(raw.conflictingEvidenceIds, 20, 96))
    const uncertainty = readUncertainty(raw.uncertainty)
    if (!claimId) issues.push('claim-id-invalid')
    if (!text) issues.push('claim-text-required')
    if (!claimType) issues.push('claim-type-invalid')
    if (evidenceIds.length === 0) issues.push('claim-evidence-required')
    if (evidenceIds.some((id) => !evidenceById.has(id))) issues.push('claim-evidence-unknown')
    if (conflictingEvidenceIds.some((id) => !evidenceById.has(id))) issues.push('claim-conflict-evidence-unknown')
    if (!uncertainty) issues.push('claim-uncertainty-invalid')
    if (!claimId || !text || !claimType || !uncertainty || evidenceIds.length === 0) continue
    claims.push({
      claimId,
      text,
      claimType,
      evidenceIds,
      directSupport: raw.directSupport === true,
      conflictingEvidenceIds,
      uncertainty,
    })
  }
  return issues.length > 0 ? { ok: false, issues: uniqueStrings(issues) } : { ok: true, value: { claims } }
}

export function normalizeCompositionOutput(
  value: unknown,
  knownClaimIds: Set<string>,
): { ok: true; value: AiDailyComposition } | { ok: false; issues: string[] } {
  if (!isRecord(value)) return { ok: false, issues: ['composition-invalid'] }
  const issues: string[] = []
  const title = readText(value.title, 120)
  const subtitle = readText(value.subtitle, 180)
  const introduction = readClaimBlock(value.introduction, knownClaimIds, 'introduction', issues)
  const events: AiDailyCompositionEvent[] = []
  const eventIds = new Set<string>()
  if (!Array.isArray(value.events) || value.events.length === 0 || value.events.length > 10) {
    issues.push('events-count-invalid')
  } else {
    for (const raw of value.events) {
      if (!isRecord(raw)) {
        issues.push('event-invalid')
        continue
      }
      const eventId = readIdentifier(raw.eventId, 96)
      const eventTitle = readText(raw.title, 140)
      const factSummary = readClaimBlock(raw.factSummary, knownClaimIds, 'fact-summary', issues)
      const whyItMatters = readClaimBlock(raw.whyItMatters, knownClaimIds, 'why-it-matters', issues)
      const claimIds = uniqueStrings(readStringArray(raw.claimIds, 40, 96))
      const uncertainty = readUncertainty(raw.uncertainty)
      if (!eventId) issues.push('event-id-invalid')
      if (eventId && eventIds.has(eventId)) issues.push('event-id-duplicate')
      if (!eventTitle) issues.push('event-title-required')
      if (claimIds.length === 0 || claimIds.some((id) => !knownClaimIds.has(id))) issues.push('event-claim-bindings-invalid')
      if (factSummary && whyItMatters) {
        const blockClaimIds = new Set([...factSummary.claimIds, ...whyItMatters.claimIds])
        if (claimIds.some((id) => !blockClaimIds.has(id)) || [...blockClaimIds].some((id) => !claimIds.includes(id))) {
          issues.push('event-claim-bindings-inconsistent')
        }
      }
      if (!uncertainty) issues.push('event-uncertainty-invalid')
      if (eventId && eventTitle && factSummary && whyItMatters && uncertainty && claimIds.length > 0) {
        eventIds.add(eventId)
        events.push({ eventId, title: eventTitle, factSummary, whyItMatters, uncertainty, claimIds })
      }
    }
  }
  const trends = Array.isArray(value.trends)
    ? value.trends
        .slice(0, 6)
        .map((item) => readClaimBlock(item, knownClaimIds, 'trend', issues))
        .filter((item): item is AiDailyCompositionClaimBlock => Boolean(item))
    : []
  if (!title) issues.push('title-required')
  if (!subtitle) issues.push('subtitle-required')
  const allText = [title, subtitle, introduction?.text, ...events.flatMap((event) => [event.title, event.factSummary.text, event.whyItMatters.text]), ...trends.map((trend) => trend.text)]
    .filter(Boolean)
    .join('\n')
  if (/https?:\/\//iu.test(allText)) issues.push('generated-url-forbidden')
  if (!introduction) issues.push('introduction-invalid')
  return issues.length > 0 || !introduction
    ? { ok: false, issues: uniqueStrings(issues) }
    : { ok: true, value: { title, subtitle, introduction, events, trends } }
}

export function normalizeVerifierOutput(
  value: unknown,
  requiredClaimIds: Set<string>,
  evidenceById: Map<string, AiDailyGenerationEvidence>,
  compositionBlocksById: Map<string, AiDailyCompositionReviewTarget>,
): { ok: true; value: AiDailyVerifierOutput } | { ok: false; issues: string[] } {
  if (!isRecord(value) || !Array.isArray(value.reviews) || !Array.isArray(value.blockReviews)) {
    return { ok: false, issues: ['reviews-required'] }
  }
  const issues: string[] = []
  const reviews: AiDailyClaimReview[] = []
  const reviewIds = new Set<string>()
  for (const raw of value.reviews.slice(0, 120)) {
    if (!isRecord(raw)) {
      issues.push('review-invalid')
      continue
    }
    const claimId = readIdentifier(raw.claimId, 96)
    const verdict = aiDailyVerifierVerdicts.includes(raw.verdict as AiDailyVerifierVerdict)
      ? (raw.verdict as AiDailyVerifierVerdict)
      : null
    const reasonCode = aiDailyVerifierReasonCodes.includes(raw.reasonCode as AiDailyVerifierReasonCode)
      ? (raw.reasonCode as AiDailyVerifierReasonCode)
      : null
    const supportingEvidenceIds = uniqueStrings(readStringArray(raw.supportingEvidenceIds, 20, 96))
    const correctedText = raw.correctedText === null ? null : readText(raw.correctedText, 800) || null
    if (!claimId || !requiredClaimIds.has(claimId)) issues.push('review-claim-unknown')
    if (claimId && reviewIds.has(claimId)) issues.push('review-claim-duplicate')
    if (!verdict) issues.push('review-verdict-invalid')
    if (!reasonCode) issues.push('review-reason-invalid')
    if (supportingEvidenceIds.some((id) => !evidenceById.has(id))) issues.push('review-evidence-unknown')
    if (claimId && verdict && reasonCode && requiredClaimIds.has(claimId)) {
      reviewIds.add(claimId)
      reviews.push({ claimId, verdict, supportingEvidenceIds, reasonCode, correctedText })
    }
  }
  const reviewedIds = new Set(reviews.map((review) => review.claimId))
  if ([...requiredClaimIds].some((id) => !reviewedIds.has(id))) issues.push('required-review-missing')

  const blockReviews: AiDailyCompositionBlockReview[] = []
  const reviewedBlockIds = new Set<string>()
  for (const raw of value.blockReviews.slice(0, 160)) {
    if (!isRecord(raw)) {
      issues.push('block-review-invalid')
      continue
    }
    const blockId = readIdentifier(raw.blockId, 160)
    const target = blockId ? compositionBlocksById.get(blockId) : undefined
    const verdict = aiDailyVerifierVerdicts.includes(raw.verdict as AiDailyVerifierVerdict)
      ? (raw.verdict as AiDailyVerifierVerdict)
      : null
    const reasonCode = aiDailyVerifierReasonCodes.includes(raw.reasonCode as AiDailyVerifierReasonCode)
      ? (raw.reasonCode as AiDailyVerifierReasonCode)
      : null
    const supportingClaimIds = uniqueStrings(readStringArray(raw.supportingClaimIds, 40, 96))
    const correctedText = raw.correctedText === null ? null : readText(raw.correctedText, 1_200) || null
    if (!blockId || !target) issues.push('block-review-target-unknown')
    if (blockId && reviewedBlockIds.has(blockId)) issues.push('block-review-target-duplicate')
    if (!verdict) issues.push('block-review-verdict-invalid')
    if (!reasonCode) issues.push('block-review-reason-invalid')
    if (target && supportingClaimIds.some((id) => !target.claimIds.includes(id))) {
      issues.push('block-review-claim-unknown')
    }
    if (blockId && target && verdict && reasonCode) {
      reviewedBlockIds.add(blockId)
      blockReviews.push({ blockId, verdict, supportingClaimIds, reasonCode, correctedText })
    }
  }
  if ([...compositionBlocksById].some(([id]) => !reviewedBlockIds.has(id))) issues.push('required-block-review-missing')
  return issues.length > 0
    ? { ok: false, issues: uniqueStrings(issues) }
    : { ok: true, value: { reviews, blockReviews } }
}

export function classifyAiDailyRiskClaims(
  claims: AiDailyAtomicClaim[],
  evidenceById: Map<string, AiDailyGenerationEvidence>,
  composition: AiDailyComposition,
) {
  const headlineClaimIds = new Set(composition.events[0]?.claimIds ?? [])
  return claims
    .filter((claim) => {
      const sourceCount = new Set(claim.evidenceIds.map((id) => evidenceById.get(id)?.url).filter(Boolean)).size
      return (
        headlineClaimIds.has(claim.claimId) ||
        ['metric', 'date', 'price'].includes(claim.claimType) ||
        sourceCount <= 1 ||
        claim.conflictingEvidenceIds.length > 0 ||
        claim.directSupport === false ||
        /(安全|security|法律|legal|政策|policy|价格|price|可用|available|availability|版本|version|修正|correction|\d)/iu.test(claim.text)
      )
    })
    .map((claim) => claim.claimId)
}

export function validateAiDailyComposition(input: {
  evidence: AiDailyGenerationEvidence[]
  claims: AiDailyAtomicClaim[]
  composition: AiDailyComposition
  reviews: AiDailyClaimReview[]
  blockReviews: AiDailyCompositionBlockReview[]
  requiredReviewClaimIds?: Set<string>
}): AiDailyCompositionValidationResult {
  const evidenceById = new Map(input.evidence.map((item) => [item.evidenceId, item]))
  const claimsById = new Map(input.claims.map((claim) => [claim.claimId, claim]))
  const reviewsByClaimId = new Map(input.reviews.map((review) => [review.claimId, review]))
  const compositionBlocks = collectAiDailyCompositionReviewTargets(input.composition)
  const blockReviewsById = new Map(input.blockReviews.map((review) => [review.blockId, review]))
  const requiredReviewClaimIds = input.requiredReviewClaimIds ?? new Set<string>()
  const findings: AiDailyGenerationFinding[] = []
  const usedClaimIds = collectCompositionClaimIds(input.composition)
  const seenEventClaimSets = new Set<string>()

  if (reviewsByClaimId.size !== input.reviews.length) {
    findings.push({ severity: 'critical', code: 'verifier-review-duplicate' })
  }
  if (blockReviewsById.size !== input.blockReviews.length) {
    findings.push({ severity: 'critical', code: 'composition-review-duplicate' })
  }

  for (const event of input.composition.events) {
    const signature = [...event.claimIds].sort().join('|')
    if (seenEventClaimSets.has(signature)) findings.push({ severity: 'review', code: 'duplicate-event-signal', eventId: event.eventId })
    seenEventClaimSets.add(signature)
  }
  const compositionText = [
    input.composition.title,
    input.composition.subtitle,
    input.composition.introduction.text,
    ...input.composition.events.flatMap((event) => [event.title, event.factSummary.text, event.whyItMatters.text]),
    ...input.composition.trends.map((trend) => trend.text),
  ].join('\n')
  if (/https?:\/\//iu.test(compositionText)) findings.push({ severity: 'critical', code: 'generated-url-forbidden' })
  if (/(史上最|绝对|彻底|颠覆一切|guaranteed|best ever|revolutionary)/iu.test(compositionText)) {
    findings.push({ severity: 'review', code: 'sensational-wording' })
  }

  for (const block of compositionBlocks) {
    const review = blockReviewsById.get(block.blockId)
    if (!review) {
      findings.push({ severity: 'critical', code: 'composition-review-missing', blockId: block.blockId })
      continue
    }
    if (review.verdict === 'contradicted' || review.verdict === 'insufficient') {
      findings.push({ severity: 'critical', code: `composition-verifier-${review.verdict}`, blockId: block.blockId })
    } else if (review.verdict === 'unverifiable') {
      findings.push({ severity: 'review', code: 'composition-verifier-unverifiable', blockId: block.blockId })
    }
    if (review.verdict === 'entailed' && review.supportingClaimIds.length === 0) {
      findings.push({ severity: 'critical', code: 'composition-verifier-support-required', blockId: block.blockId })
    }
    if (review.supportingClaimIds.some((id) => !block.claimIds.includes(id))) {
      findings.push({ severity: 'critical', code: 'composition-verifier-introduced-claim', blockId: block.blockId })
    }
  }

  let verifiableClaims = 0
  let citedVerifiableClaims = 0
  let citationBindings = 0
  let validCitationBindings = 0
  for (const claimId of usedClaimIds) {
    const claim = claimsById.get(claimId)
    if (!claim) {
      findings.push({ severity: 'critical', code: 'composition-claim-unknown', claimId })
      continue
    }
    if (claim.claimType !== 'interpretation') verifiableClaims += 1
    if (claim.evidenceIds.length > 0 && claim.claimType !== 'interpretation') citedVerifiableClaims += 1
    citationBindings += claim.evidenceIds.length
    for (const evidenceId of claim.evidenceIds) {
      const evidence = evidenceById.get(evidenceId)
      if (!evidence) {
        findings.push({ severity: 'critical', code: 'claim-evidence-unknown', claimId })
        continue
      }
      validCitationBindings += 1
    }
    if (claim.evidenceIds.length === 0) findings.push({ severity: 'critical', code: 'factual-claim-uncited', claimId })
    if (claim.conflictingEvidenceIds.length > 0) findings.push({ severity: 'review', code: 'claim-evidence-conflict', claimId })
    if (requiresTier1Evidence(claim) && !claim.evidenceIds.some((id) => evidenceById.get(id)?.sourceTier === 'TIER_1')) {
      findings.push({ severity: 'critical', code: 'tier1-evidence-required', claimId })
    }
    if (requiredReviewClaimIds.has(claimId)) {
      const review = reviewsByClaimId.get(claimId)
      if (!review) findings.push({ severity: 'critical', code: 'required-review-missing', claimId })
      else if (review.verdict === 'contradicted' || review.verdict === 'insufficient') {
        findings.push({ severity: 'critical', code: `verifier-${review.verdict}`, claimId })
      } else if (review.verdict === 'unverifiable') {
        findings.push({ severity: 'review', code: 'verifier-unverifiable', claimId })
      }
      if (review?.verdict === 'entailed' && review.supportingEvidenceIds.length === 0) {
        findings.push({ severity: 'critical', code: 'verifier-support-required', claimId })
      }
      if (review?.supportingEvidenceIds.some((id) => !claim.evidenceIds.includes(id))) {
        findings.push({ severity: 'critical', code: 'verifier-introduced-evidence', claimId })
      }
    }
  }
  const critical = findings.some((finding) => finding.severity === 'critical')
  return {
    status: critical ? 'REJECTED' : findings.length > 0 ? 'NEEDS_EDITOR_REVIEW' : 'VALID',
    findings,
    metrics: { citedVerifiableClaims, verifiableClaims, validCitationBindings, citationBindings },
  }
}

export interface AiDailyQualityCaseResult {
  id: string
  criticalFactualErrors: number
  citedVerifiableClaims: number
  verifiableClaims: number
  validCitationBindings: number
  citationBindings: number
  editorOutcome: 'accepted' | 'minor-edit' | 'major-edit' | 'rejected'
  chineseEditorialScore: number
}

export interface AiDailyQualityReport {
  caseCount: number
  criticalFactualErrors: number
  citationPrecision: number
  citationCoverage: number
  minorEditAcceptance: number
  averageChineseEditorialScore: number
  passed: boolean
  gaps: string[]
}

export function evaluateAiDailyQualityReport(cases: AiDailyQualityCaseResult[]): AiDailyQualityReport {
  const criticalFactualErrors = cases.reduce((sum, item) => sum + item.criticalFactualErrors, 0)
  const validCitationBindings = cases.reduce((sum, item) => sum + item.validCitationBindings, 0)
  const citationBindings = cases.reduce((sum, item) => sum + item.citationBindings, 0)
  const citedVerifiableClaims = cases.reduce((sum, item) => sum + item.citedVerifiableClaims, 0)
  const verifiableClaims = cases.reduce((sum, item) => sum + item.verifiableClaims, 0)
  const acceptedCases = cases.filter((item) => item.editorOutcome === 'accepted' || item.editorOutcome === 'minor-edit').length
  const citationPrecision = citationBindings === 0 ? 0 : validCitationBindings / citationBindings
  const citationCoverage = verifiableClaims === 0 ? 0 : citedVerifiableClaims / verifiableClaims
  const minorEditAcceptance = cases.length === 0 ? 0 : acceptedCases / cases.length
  const averageChineseEditorialScore = cases.length === 0
    ? 0
    : cases.reduce((sum, item) => sum + item.chineseEditorialScore, 0) / cases.length
  const gaps: string[] = []
  if (cases.length < 30) gaps.push('minimum-quality-cases-not-met')
  if (criticalFactualErrors !== 0) gaps.push('critical-factual-errors-present')
  if (citationPrecision < 1) gaps.push('citation-precision-below-floor')
  if (citationCoverage < 0.98) gaps.push('citation-coverage-below-floor')
  if (minorEditAcceptance < 0.85) gaps.push('minor-edit-acceptance-below-floor')
  if (averageChineseEditorialScore < 4) gaps.push('chinese-editorial-score-below-floor')
  return {
    caseCount: cases.length,
    criticalFactualErrors,
    citationPrecision,
    citationCoverage,
    minorEditAcceptance,
    averageChineseEditorialScore,
    passed: gaps.length === 0,
    gaps,
  }
}

export function createAiDailyGenerationPayloadHash(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

async function runGenerationRole<T>(input: {
  role: AiDailyGenerationRole
  providers: { primary: AiDailyStructuredGenerationProvider; fallbacks?: AiDailyStructuredGenerationProvider[]; minimumQualityScore: number }
  payload: unknown
  validate: (value: unknown) => { ok: true; value: T } | { ok: false; issues: string[] }
}): Promise<{ ok: true; value: T; attempts: AiDailyGenerationProviderAttempt[] } | { ok: false; attempts: AiDailyGenerationProviderAttempt[] }> {
  const providers = [input.providers.primary, ...(input.providers.fallbacks ?? [])]
  const attempts: AiDailyGenerationProviderAttempt[] = []
  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index]
    if (!provider || provider.role !== input.role || provider.slot !== (index === 0 ? 'primary' : 'fallback')) continue
    if (provider.qualityScore < input.providers.minimumQualityScore) {
      attempts.push({
        providerId: boundedIdentifier(provider.id, 80) || input.role,
        role: input.role,
        slot: provider.slot,
        outcome: 'quality-rejected',
        calls: 0,
        errorCategory: 'provider_quality_below_floor',
      })
      continue
    }
    let calls = 0
    try {
      calls += 1
      const first = await provider.generate({ role: input.role, schemaVersion: aiDailyGenerationSchemaVersion, payload: input.payload })
      const firstValidation = input.validate(first)
      if (firstValidation.ok) {
        attempts.push({ providerId: boundedIdentifier(provider.id, 80) || input.role, role: input.role, slot: provider.slot, outcome: 'succeeded', calls, errorCategory: null })
        return { ok: true, value: firstValidation.value, attempts }
      }
      calls += 1
      const repaired = await provider.generate({
        role: input.role,
        schemaVersion: aiDailyGenerationSchemaVersion,
        payload: input.payload,
        repair: { issues: firstValidation.issues, previousOutput: first },
      })
      const repairedValidation = input.validate(repaired)
      if (repairedValidation.ok) {
        attempts.push({ providerId: boundedIdentifier(provider.id, 80) || input.role, role: input.role, slot: provider.slot, outcome: 'succeeded', calls, errorCategory: null })
        return { ok: true, value: repairedValidation.value, attempts }
      }
      attempts.push({ providerId: boundedIdentifier(provider.id, 80) || input.role, role: input.role, slot: provider.slot, outcome: 'schema-rejected', calls, errorCategory: 'schema_invalid' })
    } catch {
      attempts.push({ providerId: boundedIdentifier(provider.id, 80) || input.role, role: input.role, slot: provider.slot, outcome: 'failed', calls: Math.max(1, calls), errorCategory: 'provider_error' })
    }
  }
  return { ok: false, attempts }
}

function normalizeGenerationEvidence(evidence: AiDailyGenerationEvidence[]) {
  const seen = new Set<string>()
  return evidence
    .filter((item) => {
      if (
        !item.evidenceId ||
        seen.has(item.evidenceId) ||
        !readText(item.title, 240) ||
        !readText(item.publisher, 160) ||
        !isPublicHttpUrl(item.url) ||
        !isPublicHttpUrl(item.canonicalUrl) ||
        !item.quote.trim() ||
        Number.isNaN(Date.parse(item.retrievedAt)) ||
        (item.publishedAt !== null && Number.isNaN(Date.parse(item.publishedAt))) ||
        !['TIER_1', 'TIER_2', 'TIER_3'].includes(item.sourceTier)
      ) return false
      seen.add(item.evidenceId)
      return true
    })
    .map((item) => ({
      ...item,
      title: readText(item.title, 240),
      publisher: readText(item.publisher, 160),
      quote: readText(item.quote, 8_192),
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
      retrievedAt: new Date(item.retrievedAt).toISOString(),
    }))
}

function normalizeUniqueClaims(claims: AiDailyAtomicClaim[]): { ok: true; claims: AiDailyAtomicClaim[] } | { ok: false; issue: string } {
  const ids = new Set<string>()
  for (const claim of claims) {
    if (ids.has(claim.claimId)) return { ok: false, issue: 'duplicate-claim-id' }
    ids.add(claim.claimId)
  }
  return { ok: true, claims }
}

function rejectedGeneration(
  code: string,
  claims: AiDailyAtomicClaim[] = [],
  composition: AiDailyComposition | null = null,
): AiDailyGenerationResult {
  return {
    status: 'REJECTED',
    claims,
    composition,
    reviews: [],
    blockReviews: [],
    findings: [{ severity: 'critical', code }],
    attempts: [],
    callCount: 0,
    schemaVersion: aiDailyGenerationSchemaVersion,
    promptVersion: aiDailyGenerationPromptVersion,
  }
}

function rejectedGenerationWithAttempts(
  code: string,
  attempts: AiDailyGenerationProviderAttempt[],
  claims: AiDailyAtomicClaim[] = [],
  composition: AiDailyComposition | null = null,
): AiDailyGenerationResult {
  return {
    ...rejectedGeneration(code, claims, composition),
    attempts,
    callCount: attempts.reduce((sum, attempt) => sum + attempt.calls, 0),
  }
}

function readClaimBlock(
  value: unknown,
  knownClaimIds: Set<string>,
  label: string,
  issues: string[],
): AiDailyCompositionClaimBlock | null {
  if (!isRecord(value)) {
    issues.push(`${label}-invalid`)
    return null
  }
  const text = readText(value.text, 1_200)
  const claimIds = uniqueStrings(readStringArray(value.claimIds, 40, 96))
  if (!text) issues.push(`${label}-text-required`)
  if (claimIds.length === 0 || claimIds.some((id) => !knownClaimIds.has(id))) issues.push(`${label}-claim-bindings-invalid`)
  return text && claimIds.length > 0 ? { text, claimIds } : null
}

function collectCompositionClaimIds(composition: AiDailyComposition) {
  return uniqueStrings([
    ...composition.introduction.claimIds,
    ...composition.events.flatMap((event) => [
      ...event.claimIds,
      ...event.factSummary.claimIds,
      ...event.whyItMatters.claimIds,
    ]),
    ...composition.trends.flatMap((trend) => trend.claimIds),
  ])
}

export function collectAiDailyCompositionReviewTargets(
  composition: AiDailyComposition,
): AiDailyCompositionReviewTarget[] {
  const allClaimIds = collectCompositionClaimIds(composition)
  return [
    { blockId: 'composition:title', text: composition.title, claimIds: allClaimIds },
    { blockId: 'composition:subtitle', text: composition.subtitle, claimIds: allClaimIds },
    { blockId: 'composition:introduction', text: composition.introduction.text, claimIds: composition.introduction.claimIds },
    ...composition.events.flatMap((event) => [
      { blockId: `event:${event.eventId}:title`, text: event.title, claimIds: event.claimIds },
      { blockId: `event:${event.eventId}:fact-summary`, text: event.factSummary.text, claimIds: event.factSummary.claimIds },
      { blockId: `event:${event.eventId}:why-it-matters`, text: event.whyItMatters.text, claimIds: event.whyItMatters.claimIds },
    ]),
    ...composition.trends.map((trend, index) => ({
      blockId: `composition:trend:${index + 1}`,
      text: trend.text,
      claimIds: trend.claimIds,
    })),
  ]
}

function requiresTier1Evidence(claim: AiDailyAtomicClaim) {
  return ['release', 'price', 'date'].includes(claim.claimType) || /(官方|official|API|价格|price|可用|available|availability)/iu.test(claim.text)
}

function readUncertainty(value: unknown): AiDailyAtomicClaim['uncertainty'] | null {
  return value === 'low' || value === 'medium' || value === 'high' ? value : null
}

function readStringArray(value: unknown, limit: number, itemLimit: number) {
  return Array.isArray(value) ? value.slice(0, limit).map((item) => readText(item, itemLimit)).filter(Boolean) : []
}

function readIdentifier(value: unknown, limit: number) {
  const text = readText(value, limit)
  return /^[a-z0-9][a-z0-9._:-]*$/iu.test(text) ? text : ''
}

function boundedIdentifier(value: unknown, limit: number) {
  return readText(value, limit).replace(/[^a-z0-9._:-]/giu, '-')
}

function readText(value: unknown, limit: number) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, limit) : ''
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  } catch {
    return false
  }
}

function clampInteger(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}
