export type SkillTarget = 'claude' | 'agents'

export const BEGIN = '<!-- BEGIN business-memory -->'
export const END = '<!-- END business-memory -->'

const DESCRIPTION =
  'Use before planning any change to behaviour, and after implementing one, to read and record this repository business knowledge via the pm CLI.'

export function claudeAdapter(canonical: string): { path: string; content: string } {
  const frontmatter = [
    '---',
    'name: business-memory',
    `description: ${JSON.stringify(DESCRIPTION)}`,
    '---',
    '',
  ].join('\n')
  return {
    path: '.claude/skills/business-memory/SKILL.md',
    content: `${frontmatter}\n${canonical.replace(/\r\n/g, '\n').trim()}\n`,
  }
}

export function agentsBlock(canonical: string): string {
  return `${BEGIN}\n${canonical.replace(/\r\n/g, '\n').trim()}\n${END}\n`
}

function countOccurrences(text: string, marker: string): number {
  let count = 0
  let from = 0
  for (;;) {
    const at = text.indexOf(marker, from)
    if (at === -1) return count
    count++
    from = at + marker.length
  }
}

/**
 * Either the spliced file, or the marker counts that made splicing unsafe.
 * The caller decides what a refusal means; this layer knows nothing about
 * exit codes.
 */
export type SpliceResult =
  | { ok: true; text: string }
  | { ok: false; beginCount: number; endCount: number }

export function spliceBlock(existing: string, block: string): SpliceResult {
  const text = existing.replace(/\r\n/g, '\n')
  const beginCount = countOccurrences(text, BEGIN)
  const endCount = countOccurrences(text, END)

  if (beginCount === 0 && endCount === 0) {
    const separator = text.trim() === '' ? '' : `${text.replace(/\n*$/, '')}\n\n`
    return { ok: true, text: `${separator}${block}` }
  }

  const start = text.indexOf(BEGIN)
  const end = text.indexOf(END)
  if (beginCount === 1 && endCount === 1 && end > start) {
    return {
      ok: true,
      text: `${text.slice(0, start)}${block}${text.slice(end + END.length).replace(/^\n/, '')}`,
    }
  }

  return { ok: false, beginCount, endCount }
}
