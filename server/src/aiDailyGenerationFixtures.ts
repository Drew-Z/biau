import {
  collectAiDailyCompositionReviewTargets,
  type AiDailyAtomicClaim,
  type AiDailyComposition,
  type AiDailyGenerationEvidence,
  type AiDailyGenerationProviders,
  type AiDailyGenerationRole,
  type AiDailyStructuredGenerationProvider,
  type AiDailyStructuredGenerationRequest,
  type AiDailyVerifierOutput,
} from './aiDailyGeneration.js'
import {
  createAiDailyModelEvaluationCaseContractVersion,
  loadAiDailyModelEvaluationCaseSet,
} from './aiDailyModelEvaluationCaseSet.js'
import type { AiDailyQualityCategory, AiDailyQualityNegativeTag } from './aiDailyQualityContract.js'

export function buildAiDailyGenerationEvidenceFixture(count = 10, caseId = 'base'): AiDailyGenerationEvidence[] {
  const topics = ['模型发布', '智能体工具', '开源基础设施', '安全评测', '推理平台']
  return Array.from({ length: count }, (_, index) => {
    const position = index + 1
    const domain = `official${(index % 5) + 1}.example.com`
    const sourceTier = index < 3 ? 'TIER_1' : index < 8 ? 'TIER_2' : 'TIER_3'
    const quote =
      sourceTier === 'TIER_1'
        ? `${topics[index % topics.length]} ${position} 发布了可核验更新，包含版本、API 能力、评测结果和上线范围。该证据来自原始页面，并保留了足以支持事实陈述的上下文。`
        : sourceTier === 'TIER_2'
          ? `${topics[index % topics.length]} ${position} 报道了一项可核验观察，包含性能评测、工具行为和采用范围。该证据保留了足以支持报道性陈述的上下文。`
          : `${topics[index % topics.length]} ${position} 提供了相关背景线索，可用于补充趋势判断，但不单独支持发布或日期结论。`
    return {
      evidenceId: `evidence-${caseId}-${position}`,
      candidateId: `candidate-${caseId}-${position}`,
      sourceItemId: `source-${caseId}-${position}`,
      title: `${topics[index % topics.length]} ${position}`,
      publisher: sourceTier === 'TIER_1' ? `官方来源 ${position}` : `技术媒体 ${position}`,
      url: `https://${domain}/news/${caseId}-${position}`,
      canonicalUrl: `https://${domain}/news/${caseId}-${position}`,
      sourceKind: index < 3 ? 'official' : index < 8 ? 'primary_media' : 'secondary_media',
      sourceTier,
      publishedAt: new Date(Date.UTC(2026, 6, 18, 0, -position * 5)).toISOString(),
      retrievedAt: new Date('2026-07-18T00:00:00.000Z').toISOString(),
      quote,
      locator: { heading: topics[index % topics.length], startChar: 0, endChar: 88 },
      contentHash: `fixture-content-${caseId}-${position}`,
    }
  })
}

export function buildAiDailyGenerationProvidersFixture(input: {
  extractor?: Partial<FixtureProviderOptions>
  composer?: Partial<FixtureProviderOptions>
  verifier?: Partial<FixtureProviderOptions>
  extractorFallbacks?: Partial<FixtureProviderOptions>[]
  composerFallbacks?: Partial<FixtureProviderOptions>[]
  verifierFallbacks?: Partial<FixtureProviderOptions>[]
} = {}): AiDailyGenerationProviders {
  return {
    extractor: {
      primary: createFixtureProvider('extractor', { id: 'fixture-extractor-primary', ...input.extractor }),
      fallbacks: input.extractorFallbacks?.map((options, index) =>
        createFixtureProvider('extractor', { id: `fixture-extractor-fallback-${index + 1}`, slot: 'fallback', ...options }),
      ),
      minimumQualityScore: 80,
    },
    composer: {
      primary: createFixtureProvider('composer', { id: 'fixture-composer-primary', ...input.composer }),
      fallbacks: input.composerFallbacks?.map((options, index) =>
        createFixtureProvider('composer', { id: `fixture-composer-fallback-${index + 1}`, slot: 'fallback', ...options }),
      ),
      minimumQualityScore: 85,
    },
    verifier: {
      primary: createFixtureProvider('verifier', { id: 'fixture-verifier-primary', ...input.verifier }),
      fallbacks: input.verifierFallbacks?.map((options, index) =>
        createFixtureProvider('verifier', { id: `fixture-verifier-fallback-${index + 1}`, slot: 'fallback', ...options }),
      ),
      minimumQualityScore: 82,
    },
  }
}

interface FixtureProviderOptions {
  id: string
  slot: 'primary' | 'fallback'
  qualityScore: number
  throwAlways: boolean
  throwOnRepair: boolean
  invalidBeforeRepair: boolean
  verifierVerdict: 'entailed' | 'contradicted' | 'insufficient' | 'unverifiable'
  verifierCompositionVerdict: 'entailed' | 'contradicted' | 'insufficient' | 'unverifiable'
  duplicateVerifierReview: boolean
  duplicateVerifierBlockReview: boolean
  sensationalComposer: boolean
  hallucinatedComposer: boolean
}

function createFixtureProvider(
  role: AiDailyGenerationRole,
  options: Partial<FixtureProviderOptions> = {},
): AiDailyStructuredGenerationProvider {
  const resolved: FixtureProviderOptions = {
    id: options.id ?? `fixture-${role}`,
    slot: options.slot ?? 'primary',
    qualityScore: options.qualityScore ?? 95,
    throwAlways: options.throwAlways ?? false,
    throwOnRepair: options.throwOnRepair ?? false,
    invalidBeforeRepair: options.invalidBeforeRepair ?? false,
    verifierVerdict: options.verifierVerdict ?? 'entailed',
    verifierCompositionVerdict: options.verifierCompositionVerdict ?? 'entailed',
    duplicateVerifierReview: options.duplicateVerifierReview ?? false,
    duplicateVerifierBlockReview: options.duplicateVerifierBlockReview ?? false,
    sensationalComposer: options.sensationalComposer ?? false,
    hallucinatedComposer: options.hallucinatedComposer ?? false,
  }
  return {
    id: resolved.id,
    role,
    slot: resolved.slot,
    qualityScore: resolved.qualityScore,
    async generate(request) {
      if (resolved.throwAlways) throw new Error('fixture-provider-error')
      if (resolved.throwOnRepair && request.repair) throw new Error('fixture-provider-repair-error')
      if (resolved.invalidBeforeRepair && !request.repair) return { invalid: true }
      switch (role) {
        case 'extractor':
          return fixtureExtract(request)
        case 'composer':
          return fixtureCompose(request, resolved.sensationalComposer, resolved.hallucinatedComposer)
        case 'verifier':
          return fixtureVerify(
            request,
            resolved.verifierVerdict,
            resolved.verifierCompositionVerdict,
            resolved.duplicateVerifierReview,
            resolved.duplicateVerifierBlockReview,
          )
      }
    },
  }
}

function fixtureExtract(request: AiDailyStructuredGenerationRequest) {
  const payload = asRecord(request.payload)
  const evidence = Array.isArray(payload.evidence) ? payload.evidence.filter(isRecord) : []
  return {
    claims: evidence.map((item, index) => {
      const sourceTier = readString(item.sourceTier)
      const claimType =
        sourceTier === 'TIER_1'
          ? index % 2 === 0
            ? 'release'
            : 'date'
          : index % 2 === 0
            ? 'announcement'
            : 'metric'
      return {
        claimId: `claim-${readString(item.evidenceId)}-${index + 1}`,
        text: `${readString(item.quote).slice(0, 120)}。`,
        claimType,
        evidenceIds: [readString(item.evidenceId)],
        directSupport: true,
        conflictingEvidenceIds: [],
        uncertainty: sourceTier === 'TIER_3' ? 'medium' : 'low',
      }
    }),
  }
}

function fixtureCompose(
  request: AiDailyStructuredGenerationRequest,
  sensational: boolean,
  hallucinated: boolean,
): AiDailyComposition {
  const payload = asRecord(request.payload)
  const claims = Array.isArray(payload.claims) ? payload.claims.filter(isAtomicClaim) : []
  const selected = claims.slice(0, 8)
  const first = selected[0]
  if (!first) {
    return {
      title: '',
      subtitle: '',
      introduction: { text: '', claimIds: [] },
      events: [],
      trends: [],
    }
  }
  return {
    title: sensational ? '史上最强 AI 革命彻底改变一切' : 'AI 日报：模型、工具与基础设施更新',
    subtitle: '基于原始证据整理的当日技术进展',
    introduction: {
      text: '今天的更新集中在模型能力、开发工具和基础设施演进。',
      claimIds: [first.claimId],
    },
    events: selected.map((claim, index) => ({
      eventId: `event-${index + 1}`,
      title: `技术更新 ${index + 1}`,
      factSummary: {
        text: hallucinated && index === 0 ? '该模型已经实现完全自主意识，且无需任何人工监督。' : claim.text,
        claimIds: [claim.claimId],
      },
      whyItMatters: { text: '这项变化会影响开发者的接入方式、评估流程和部署决策。', claimIds: [claim.claimId] },
      uncertainty: claim.uncertainty,
      claimIds: [claim.claimId],
    })),
    trends: [
      {
        text: '多个更新都在强调可验证能力、工程可控性与更清晰的上线边界。',
        claimIds: selected.slice(0, Math.min(3, selected.length)).map((claim) => claim.claimId),
      },
    ],
  }
}

function fixtureVerify(
  request: AiDailyStructuredGenerationRequest,
  verdict: FixtureProviderOptions['verifierVerdict'],
  compositionVerdict: FixtureProviderOptions['verifierCompositionVerdict'],
  duplicateReview: boolean,
  duplicateBlockReview: boolean,
): AiDailyVerifierOutput {
  const payload = asRecord(request.payload)
  const claims = Array.isArray(payload.claims) ? payload.claims.filter(isAtomicClaim) : []
  const requiredClaimIds = new Set(
    Array.isArray(payload.requiredReviewClaimIds)
      ? payload.requiredReviewClaimIds.filter((item): item is string => typeof item === 'string')
      : [],
  )
  const compositionBlocks = Array.isArray(payload.compositionBlocks)
    ? payload.compositionBlocks.filter(isRecord)
    : collectAiDailyCompositionReviewTargets(fixtureCompose(request, false, false))
  const reviews: AiDailyVerifierOutput['reviews'] = claims.filter((claim) => requiredClaimIds.has(claim.claimId)).map((claim) => ({
      claimId: claim.claimId,
      verdict,
      supportingEvidenceIds: claim.evidenceIds,
      reasonCode: verdict === 'entailed' ? 'exact_support' : verdict === 'contradicted' ? 'number_mismatch' : 'missing_support',
      correctedText: verdict === 'entailed' ? null : '需要根据原始证据缩小表述范围。',
    }))
  const blockReviews: AiDailyVerifierOutput['blockReviews'] = compositionBlocks.map((block) => ({
    blockId: readString(block.blockId),
    verdict: compositionVerdict,
    supportingClaimIds: Array.isArray(block.claimIds)
      ? block.claimIds.filter((item): item is string => typeof item === 'string')
      : [],
    reasonCode: compositionVerdict === 'entailed'
      ? 'exact_support'
      : compositionVerdict === 'contradicted'
        ? 'scope_inflation'
        : 'missing_support',
    correctedText: compositionVerdict === 'entailed' ? null : '需要删除或缩小未被事实卡支持的正文表述。',
  }))
  if (duplicateReview && reviews[0]) reviews.push({ ...reviews[0] })
  if (duplicateBlockReview && blockReviews[0]) blockReviews.push({ ...blockReviews[0] })
  return {
    reviews,
    blockReviews,
  }
}

export interface AiDailyQualityFixtureDefinition {
  id: string
  category: AiDailyQualityCategory
  negativeTags: AiDailyQualityNegativeTag[]
  scenario: string
  version: string
  evidence: AiDailyGenerationEvidence[]
  editorOutcome: 'accepted' | 'minor-edit' | 'major-edit' | 'rejected'
  chineseEditorialScore: number
}

export function buildAiDailyQualityFixtureDefinitions(): AiDailyQualityFixtureDefinition[] {
  const caseSet = loadAiDailyModelEvaluationCaseSet()
  const contractVersion = createAiDailyModelEvaluationCaseContractVersion(caseSet)
  return caseSet.cases.map((item) => ({
    id: item.id,
    category: item.category,
    negativeTags: [...item.negativeTags],
    scenario: item.scenario,
    version: contractVersion,
    evidence: buildQualityEvidenceFixture(item.category, item.id),
    editorOutcome: item.editorOutcome,
    chineseEditorialScore: item.chineseEditorialScore,
  }))
}

function buildQualityEvidenceFixture(
  category: AiDailyQualityFixtureDefinition['category'],
  caseId: string,
): AiDailyGenerationEvidence[] {
  const count = category === 'low-evidence' ? 3 : 5
  const base = buildAiDailyGenerationEvidenceFixture(count, caseId)
  return base.map((item, index) => {
    if (category === 'multi-source') {
      return { ...item, quote: `${item.title} 由多个独立来源交叉报道，描述工具行为与采用范围。` }
    }
    if (category === 'numeric') {
      return { ...item, quote: `${item.title} 的公开评测记录为 ${80 + index} 分，报道同时说明了评测口径。` }
    }
    if (category === 'correction') {
      return { ...item, quote: `${item.title} 对此前报道进行了范围更正，并保留了更正前后的时间线。` }
    }
    if (category === 'chinese-source') {
      return { ...item, publisher: '中文技术媒体', quote: `${item.title} 发布中文报道，说明工具变化与开发者影响。` }
    }
    if (category === 'low-evidence') {
      return {
        ...item,
        sourceTier: 'TIER_2',
        sourceKind: 'primary_media',
        quote: `${item.title} 仅提供有限背景观察，不能单独支持正式发布或日期结论。`,
      }
    }
    return item
  })
}

function isAtomicClaim(value: unknown): value is AiDailyAtomicClaim {
  return isRecord(value) && typeof value.claimId === 'string' && Array.isArray(value.evidenceIds)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}
