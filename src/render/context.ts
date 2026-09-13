import type { ContextEntry, ContextResult, DocType } from '../domain/types'
import { ageLabel } from '../domain/tokens'

const SECTION_ORDER: DocType[] = ['rule', 'decision', 'flow', 'feature']
const SECTION_TITLE: Record<DocType, string> = {
  rule: 'Rules',
  decision: 'Decisions',
  flow: 'Flows',
  feature: 'Features',
}

function footer(r: ContextResult): string {
  return `${r.totalDocs} docs · ${r.matched} matched · ${r.shown} shown · ${r.truncated} truncated · ~${r.estimatedTokens} tokens`
}

export function renderContext(result: ContextResult, now: Date): string {
  const out: string[] = [`# Business context: ${result.query}`, '']

  if (result.entries.length === 0) {
    out.push(`No business context found for "${result.query}".`)
    out.push('Try: pm list --type rule')
    out.push('')
    out.push(footer(result))
    return `${out.join('\n')}\n`
  }

  const full = result.entries.filter((e) => e.mode === 'full')
  const lines = result.entries.filter((e) => e.mode === 'line')

  for (const type of SECTION_ORDER) {
    const group = full.filter((e) => e.doc.type === type)
    if (group.length === 0) continue
    out.push(`## ${SECTION_TITLE[type]}`, '')
    for (const e of group) {
      out.push(`### ${e.doc.id} — ${e.doc.title}${ageLabel(e.doc.created, now)}`)
      out.push(e.doc.body.trim())
      out.push('')
    }
  }

  if (lines.length > 0) {
    out.push('## Related — run `pm show <id>` for the body', '')
    for (const e of lines) {
      out.push(`- ${e.doc.id} — ${e.doc.title}${ageLabel(e.doc.created, now)}`)
    }
    out.push('')
  }

  out.push(footer(result))
  return `${out.join('\n')}\n`
}
