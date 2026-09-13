import type { Ctx } from '../context'
import { okEnvelope } from '../../render/json'
import { EXIT } from '../exit'
import { VERSION } from '../../version'

export interface CommandSpec {
  name: string
  summary: string
  usage: string
  flags: string[]
}

export const SPECS: CommandSpec[] = [
  { name: 'init', summary: 'create .project-memory in the current repository', usage: 'pm init [--force]', flags: ['--force'] },
  { name: 'add', summary: 'create a knowledge document', usage: 'pm add <type> --title "..." [--source "..."] --stub', flags: ['--title', '--tags', '--refs', '--links', '--source', '--stub', '--body-file', '--body', '--force'] },
  { name: 'update', summary: 'rewrite the body or status of a document', usage: 'pm update <id> [--stub|--body-file <f>|-] [--status superseded --superseded-by <id>]', flags: ['--stub', '--body-file', '--status', '--superseded-by', '--add-tag', '--add-link', '--add-ref'] },
  { name: 'show', summary: 'print full documents by id', usage: 'pm show <id> [<id>...]', flags: [] },
  { name: 'path', summary: 'print the file path of a document', usage: 'pm path <id>', flags: [] },
  { name: 'list', summary: 'list what the memory contains', usage: 'pm list [--type <t>] [--tag <x>] [--all]', flags: ['--type', '--tag', '--all'] },
  { name: 'search', summary: 'rank documents by text relevance', usage: 'pm search <query> [--type <t>] [--limit <n>]', flags: ['--type', '--limit', '--all'] },
  { name: 'context', summary: 'return the relevant business context for a topic', usage: 'pm context <query> [--max-tokens <n>] [--no-expand] [--all]', flags: ['--max-tokens', '--limit', '--no-expand', '--all'] },
  { name: 'validate', summary: 'check frontmatter, ids, links and supersession', usage: 'pm validate', flags: [] },
  { name: 'index', summary: 'rebuild the cache (normally automatic)', usage: 'pm index --force', flags: ['--force'] },
  { name: 'skill', summary: 'install the agent protocol', usage: 'pm skill install --target <claude|agents>', flags: ['--target'] },
]

export function helpCommand(ctx: Ctx): number {
  if (ctx.json) {
    ctx.out(okEnvelope({ version: VERSION, exitCodes: { ok: 0, usage: 2, notFound: 3, noMemory: 4, invalid: 5, conflict: 6 }, commands: SPECS }))
    return EXIT.OK
  }
  const lines = [`pm ${VERSION}`, '', 'Commands:']
  for (const s of SPECS) lines.push(`  ${s.name.padEnd(9)}${s.summary}`)
  lines.push('', 'Global flags: --json --no-color -C <dir>', 'Machine-readable spec: pm help --json', '')
  ctx.out(lines.join('\n'))
  return EXIT.OK
}
