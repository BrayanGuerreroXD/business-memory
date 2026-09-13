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

export function spliceBlock(existing: string, block: string): string {
  const text = existing.replace(/\r\n/g, '\n')
  const start = text.indexOf(BEGIN)
  const end = text.indexOf(END)

  if (start !== -1 && end !== -1 && end > start) {
    return `${text.slice(0, start)}${block}${text.slice(end + END.length).replace(/^\n/, '')}`
  }

  const separator = text.trim() === '' ? '' : `${text.replace(/\n*$/, '')}\n\n`
  return `${separator}${block}`
}
