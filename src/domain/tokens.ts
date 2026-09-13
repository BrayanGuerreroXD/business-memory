import { AGE_WARN_MONTHS } from './constants'
import type { DocType } from './types'

export function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4)
}

export function monthsBetween(created: string, now: Date): number {
  const [y, m, d] = created.split('-').map((n) => Number.parseInt(n, 10))
  if (y === undefined || m === undefined || d === undefined) return 0
  let months = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m)
  if (now.getUTCDate() < d) months -= 1
  return Math.max(0, months)
}

export function ageLabel(created: string, now: Date): string {
  const months = monthsBetween(created, now)
  return months >= AGE_WARN_MONTHS ? ` (${months} months old)` : ''
}

// --- pm context: shared structural overhead --------------------------------
// `src/query/context.ts` budgets against these same blocks and
// `src/render/context.ts` emits them verbatim, so the two can never drift
// apart the way they did before (query counted only entry text; render also
// prints a document heading, per-section headers, a "Related" header and a
// footer line that were never budgeted).

export const CONTEXT_SECTION_TITLE: Record<DocType, string> = {
  rule: 'Rules',
  decision: 'Decisions',
  flow: 'Flows',
  feature: 'Features',
}

export const CONTEXT_SECTION_ORDER: DocType[] = ['rule', 'decision', 'flow', 'feature']

export const CONTEXT_RELATED_TITLE = 'Related — run `pm show <id>` for the body'

export function contextHeadingBlock(query: string): string {
  return `# Business context: ${query}\n\n`
}

export function contextSectionHeaderBlock(type: DocType): string {
  return `## ${CONTEXT_SECTION_TITLE[type]}\n\n`
}

export function contextRelatedHeaderBlock(): string {
  return `## ${CONTEXT_RELATED_TITLE}\n\n`
}

// Genuinely nothing in the memory matches the query — proceed and write a
// note if something worth recording turns up.
export function contextNoMatchesBlock(query: string): string {
  return `No business context found for "${query}".\nTry: pm list --type rule\n\n`
}

// Something matched, but the token budget was too small to show any of it.
// This must never read like "nothing found": that reads as "there is no
// business context for this" when there actually is some, and an agent that
// believes that will plan without it and never think to ask again.
export function contextBudgetTooSmallBlock(query: string, matched: number): string {
  return `${matched} document(s) matched "${query}", but none fit in the token budget.\nRaise --max-tokens, or run \`pm search "${query}"\` to see what exists.\n\n`
}

export interface ContextFooterCounts {
  totalDocs: number
  matched: number
  shown: number
  truncated: number
  estimatedTokens: number
}

export function contextFooterBlock(c: ContextFooterCounts): string {
  return `${c.totalDocs} docs · ${c.matched} matched · ${c.shown} shown · ${c.truncated} truncated · ~${c.estimatedTokens} tokens`
}
