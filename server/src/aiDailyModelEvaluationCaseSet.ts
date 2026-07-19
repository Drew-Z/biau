import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { AiDailyGenerationRole } from './aiDailyGeneration.js'
import {
  aiDailyQualityCategories,
  aiDailyQualityContract,
  aiDailyQualityNegativeTags,
  aiDailyVerifierBlockNegativeTags,
  aiDailyVerifierClaimNegativeTags,
  isAiDailyQualityCategory,
  isAiDailyQualityNegativeTag,
  type AiDailyQualityCategory,
  type AiDailyQualityNegativeTag,
} from './aiDailyQualityContract.js'

export const aiDailyModelEvaluationCaseSetSchemaVersion = 'ai-daily-model-evaluation-case-set-v1'

export interface AiDailyModelEvaluationCaseDefinition {
  id: string
  category: AiDailyQualityCategory
  negativeTags: AiDailyQualityNegativeTag[]
  scenario: string
  editorOutcome: 'accepted' | 'minor-edit' | 'major-edit' | 'rejected'
  chineseEditorialScore: number
}

export interface AiDailyModelEvaluationCaseSet {
  schemaVersion: typeof aiDailyModelEvaluationCaseSetSchemaVersion
  caseSetId: string
  caseVersion: string
  requiredCategories: AiDailyQualityCategory[]
  requiredNegativeTags: AiDailyQualityNegativeTag[]
  cases: AiDailyModelEvaluationCaseDefinition[]
}

export interface AiDailyModelEvaluationCaseDescriptorDefinition {
  id: string
  category: string
  negativeTags: AiDailyQualityNegativeTag[]
  version: string
}

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
export const aiDailyModelEvaluationCaseSetPath = path.resolve(
  moduleDirectory,
  '../data/ai-daily-model-evaluation-cases.v1.json',
)

let cachedCaseSet: AiDailyModelEvaluationCaseSet | null = null

export function loadAiDailyModelEvaluationCaseSet(): AiDailyModelEvaluationCaseSet {
  if (cachedCaseSet) return cachedCaseSet
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(aiDailyModelEvaluationCaseSetPath, 'utf8'))
  } catch {
    throw new Error('invalid-ai-daily-model-evaluation-case-set-file')
  }
  cachedCaseSet = normalizeCaseSet(parsed)
  return cachedCaseSet
}

export function aiDailyModelEvaluationCaseSetId(role: AiDailyGenerationRole) {
  return `${loadAiDailyModelEvaluationCaseSet().caseSetId}-${role}`
}

export function buildAiDailyModelEvaluationCaseDescriptors(
  role: AiDailyGenerationRole,
): AiDailyModelEvaluationCaseDescriptorDefinition[] {
  const caseSet = loadAiDailyModelEvaluationCaseSet()
  const contractVersion = createAiDailyModelEvaluationCaseContractVersion(caseSet)
  return caseSet.cases.map((item) => ({
    id: `${role}-${item.id}`,
    category: `${role}:${item.category}`,
    negativeTags: [...item.negativeTags],
    version: contractVersion,
  }))
}

export function createAiDailyModelEvaluationCaseContractVersion(
  caseSet: Pick<AiDailyModelEvaluationCaseSet, 'caseVersion' | 'cases'>,
) {
  const contentHash = createHash('sha256').update(stableJson(caseSet.cases)).digest('hex')
  return `${caseSet.caseVersion}-${contentHash.slice(0, 16)}`
}

function normalizeCaseSet(value: unknown): AiDailyModelEvaluationCaseSet {
  if (!isRecord(value) || value.schemaVersion !== aiDailyModelEvaluationCaseSetSchemaVersion) {
    throw new Error('invalid-ai-daily-model-evaluation-case-set-schema')
  }
  const caseSetId = requireSlug(value.caseSetId, 'case-set-id')
  const caseVersion = requireVersion(value.caseVersion, 'case-version')
  const requiredCategories = normalizeCategoryList(value.requiredCategories, 'required-categories')
  const requiredNegativeTags = normalizeNegativeTagList(value.requiredNegativeTags, 'required-negative-tags')
  if (stableList(requiredCategories) !== stableList(aiDailyQualityCategories)) {
    throw new Error('invalid-ai-daily-model-evaluation-case-set-required-categories')
  }
  if (stableList(requiredNegativeTags) !== stableList(aiDailyQualityNegativeTags)) {
    throw new Error('invalid-ai-daily-model-evaluation-case-set-required-negative-tags')
  }
  const verifierTags = [...aiDailyVerifierClaimNegativeTags, ...aiDailyVerifierBlockNegativeTags]
  if (new Set(verifierTags).size !== verifierTags.length || stableList(verifierTags) !== stableList(aiDailyQualityNegativeTags)) {
    throw new Error('invalid-ai-daily-model-evaluation-verifier-tag-taxonomy')
  }
  if (
    !Array.isArray(value.cases) ||
    value.cases.length < aiDailyQualityContract.minimumCaseCount ||
    value.cases.length > aiDailyQualityContract.maximumCaseCount
  ) {
    throw new Error('invalid-ai-daily-model-evaluation-case-set-case-count')
  }
  const cases = value.cases.map((item, index) => normalizeCase(item, index))
  if (new Set(cases.map((item) => item.id)).size !== cases.length) {
    throw new Error('invalid-ai-daily-model-evaluation-case-set-duplicate-id')
  }
  for (const category of aiDailyQualityCategories) {
    if (cases.filter((item) => item.category === category).length < aiDailyQualityContract.minimumCategoryCaseCount) {
      throw new Error(`invalid-ai-daily-model-evaluation-case-set-category-coverage:${category}`)
    }
  }
  for (const tag of aiDailyQualityNegativeTags) {
    if (cases.filter((item) => item.negativeTags.includes(tag)).length < aiDailyQualityContract.minimumNegativeSliceCaseCount) {
      throw new Error(`invalid-ai-daily-model-evaluation-case-set-negative-coverage:${tag}`)
    }
  }
  return {
    schemaVersion: aiDailyModelEvaluationCaseSetSchemaVersion,
    caseSetId,
    caseVersion,
    requiredCategories: [...aiDailyQualityCategories],
    requiredNegativeTags: [...aiDailyQualityNegativeTags],
    cases,
  }
}

function normalizeCase(value: unknown, index: number): AiDailyModelEvaluationCaseDefinition {
  if (!isRecord(value)) throw new Error(`invalid-ai-daily-model-evaluation-case:${index}`)
  const id = requireSlug(value.id, `cases-${index}-id`)
  if (!isAiDailyQualityCategory(value.category)) {
    throw new Error(`invalid-ai-daily-model-evaluation-case-category:${id}`)
  }
  const negativeTags = normalizeNegativeTagList(value.negativeTags, `cases-${index}-negative-tags`)
  const scenario = requireText(value.scenario, `cases-${index}-scenario`, 240)
  if (!['accepted', 'minor-edit', 'major-edit', 'rejected'].includes(String(value.editorOutcome))) {
    throw new Error(`invalid-ai-daily-model-evaluation-case-editor-outcome:${id}`)
  }
  if (typeof value.chineseEditorialScore !== 'number' || value.chineseEditorialScore < 0 || value.chineseEditorialScore > 5) {
    throw new Error(`invalid-ai-daily-model-evaluation-case-editorial-score:${id}`)
  }
  return {
    id,
    category: value.category,
    negativeTags,
    scenario,
    editorOutcome: value.editorOutcome as AiDailyModelEvaluationCaseDefinition['editorOutcome'],
    chineseEditorialScore: value.chineseEditorialScore,
  }
}

function normalizeCategoryList(value: unknown, label: string): AiDailyQualityCategory[] {
  if (!Array.isArray(value) || !value.every(isAiDailyQualityCategory)) throw new Error(`invalid-${label}`)
  const normalized = [...new Set(value)].sort(compareText)
  if (normalized.length !== value.length) throw new Error(`invalid-${label}-duplicate`)
  return normalized
}

function normalizeNegativeTagList(value: unknown, label: string): AiDailyQualityNegativeTag[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > aiDailyQualityNegativeTags.length) {
    throw new Error(`invalid-${label}`)
  }
  if (!value.every(isAiDailyQualityNegativeTag)) throw new Error(`invalid-${label}`)
  const normalized = [...new Set(value)].sort(compareText)
  if (normalized.length !== value.length || stableList(value) !== stableList(normalized)) {
    throw new Error(`invalid-${label}-canonical-order`)
  }
  return normalized
}

function requireSlug(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) || value.length > 120) {
    throw new Error(`invalid-${label}`)
  }
  return value
}

function requireVersion(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/u.test(value)) {
    throw new Error(`invalid-${label}`)
  }
  return value
}

function requireText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new Error(`invalid-${label}`)
  }
  return value.trim()
}

function stableList(value: readonly string[]) {
  return [...value].sort(compareText).join('\n')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort(compareText)
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
