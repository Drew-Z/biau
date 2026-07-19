export const aiDailyQualityCategories = [
  'official-release',
  'multi-source',
  'numeric',
  'correction',
  'chinese-source',
  'low-evidence',
] as const

export type AiDailyQualityCategory = (typeof aiDailyQualityCategories)[number]

export const aiDailyQualityNegativeTags = [
  'citation-source-match',
  'correction-boundary',
  'date-entity-alignment',
  'duplicate-attribution',
  'low-evidence-restraint',
  'numeric-integrity',
  'scope-inflation',
  'unsupported-claim',
] as const

export type AiDailyQualityNegativeTag = (typeof aiDailyQualityNegativeTags)[number]

export const aiDailyVerifierClaimNegativeTags: readonly AiDailyQualityNegativeTag[] = [
  'citation-source-match',
  'correction-boundary',
  'date-entity-alignment',
  'numeric-integrity',
  'unsupported-claim',
]

export const aiDailyVerifierBlockNegativeTags: readonly AiDailyQualityNegativeTag[] = [
  'duplicate-attribution',
  'low-evidence-restraint',
  'scope-inflation',
]

export const aiDailyQualityContract = {
  minimumCaseCount: 30,
  maximumCaseCount: 120,
  minimumCategoryCaseCount: 4,
  minimumNegativeSliceCaseCount: 3,
  minimumNegativeSliceCitationCoverage: 0.9,
  minimumNegativeSliceAcceptance: 0.8,
} as const

export function isAiDailyQualityCategory(value: unknown): value is AiDailyQualityCategory {
  return typeof value === 'string' && aiDailyQualityCategories.some((item) => item === value)
}

export function isAiDailyQualityNegativeTag(value: unknown): value is AiDailyQualityNegativeTag {
  return typeof value === 'string' && aiDailyQualityNegativeTags.some((item) => item === value)
}
