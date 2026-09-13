import type { ContextResult } from '../domain/types'
import {
  ageLabel,
  CONTEXT_SECTION_ORDER,
  contextFooterBlock,
  contextHeadingBlock,
  contextNoResultsBlock,
  contextRelatedHeaderBlock,
  contextSectionHeaderBlock,
} from '../domain/tokens'

function footer(r: ContextResult): string {
  return contextFooterBlock(r)
}

export function renderContext(result: ContextResult, now: Date): string {
  let out = contextHeadingBlock(result.query)

  if (result.entries.length === 0) {
    out += contextNoResultsBlock(result.query)
    out += footer(result)
    return `${out}\n`
  }

  const full = result.entries.filter((e) => e.mode === 'full')
  const lines = result.entries.filter((e) => e.mode === 'line')

  for (const type of CONTEXT_SECTION_ORDER) {
    const group = full.filter((e) => e.doc.type === type)
    if (group.length === 0) continue
    out += contextSectionHeaderBlock(type)
    for (const e of group) {
      out += `### ${e.doc.id} — ${e.doc.title}${ageLabel(e.doc.created, now)}\n`
      out += `${e.doc.body.trim()}\n`
      out += '\n'
    }
  }

  if (lines.length > 0) {
    out += contextRelatedHeaderBlock()
    for (const e of lines) {
      out += `- ${e.doc.id} — ${e.doc.title}${ageLabel(e.doc.created, now)}\n`
    }
    out += '\n'
  }

  out += footer(result)
  return `${out}\n`
}
