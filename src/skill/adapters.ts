import { CliError, EXIT } from '../cli/exit'

export type SkillTarget = 'claude' | 'agents'

export const BEGIN = '<!-- BEGIN project-memory -->'
export const END = '<!-- END project-memory -->'

const DESCRIPTION =
  'Use before planning any change to behaviour, and after implementing one, to read and record this repository business knowledge via the pm CLI.'

export function claudeAdapter(canonical: string): { path: string; content: string } {
  const frontmatter = ['---', 'name: project-memory', `description: ${DESCRIPTION}`, '---', ''].join('\n')
  return {
    path: '.claude/skills/project-memory/SKILL.md',
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

export function spliceBlock(existing: string, block: string, fileLabel = 'AGENTS.md'): string {
  const text = existing.replace(/\r\n/g, '\n')
  const beginCount = countOccurrences(text, BEGIN)
  const endCount = countOccurrences(text, END)

  if (beginCount === 0 && endCount === 0) {
    const separator = text.trim() === '' ? '' : `${text.replace(/\n*$/, '')}\n\n`
    return `${separator}${block}`
  }

  const start = text.indexOf(BEGIN)
  const end = text.indexOf(END)
  if (beginCount === 1 && endCount === 1 && end > start) {
    return `${text.slice(0, start)}${block}${text.slice(end + END.length).replace(/^\n/, '')}`
  }

  throw new CliError(
    'CONFLICT',
    `${fileLabel} has ${beginCount} '${BEGIN}' marker(s) and ${endCount} '${END}' marker(s); expected exactly one of each, BEGIN before END`,
    EXIT.CONFLICT,
    {
      hint: `remove the stray project-memory markers from ${fileLabel}, or edit the existing block by hand`,
    },
  )
}
