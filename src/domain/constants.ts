import type { DocType } from './types'

export const DOC_TYPES = ['rule', 'flow', 'decision', 'feature'] as const

export const TYPE_PREFIX: Record<DocType, string> = {
  rule: 'rule',
  flow: 'flow',
  decision: 'dec',
  feature: 'feature',
}

export const TYPE_DIR: Record<DocType, string> = {
  rule: 'rules',
  flow: 'flows',
  decision: 'decisions',
  feature: 'features',
}

export const WEIGHTS = { title: 3.0, tags: 2.5, refs: 2.5, body: 1.0 } as const

export const BODY_HIT_CAP = 5
export const SEED_RATIO = 0.25
export const MAX_SEEDS = 5
export const NEIGHBOR_WEIGHT = 0.4
export const MAX_NEIGHBORS_PER_SEED = 3
export const DEFAULT_MAX_TOKENS = 1500
export const SIMILAR_THRESHOLD = 0.45
export const AGE_WARN_MONTHS = 12
export const SLUG_MAX = 60

export const MEMORY_DIR = '.business-memory'
export const INDEX_FILE = 'index.json'
export const SKILL_FILE = 'SKILL.md'
export const INDEX_VERSION = 1
