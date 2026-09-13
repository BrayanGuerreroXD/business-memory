export interface CommandSpec {
  name: string
  summary: string
  usage: string
  flags: string[]
}

/**
 * Every flag the CLI accepts is declared here once.
 *
 * `SPECS[].flags` says which flags a command accepts; `BOOLEAN_FLAGS` says which
 * of them take no value. A flag listed in a spec is value-taking unless its name
 * also appears in `BOOLEAN_FLAGS`, so the two facts live side by side and cannot
 * drift apart in separate modules: the parser reads `BOOLEAN_FLAGS`, `pm help`
 * and the unknown-flag check read `SPECS`.
 */
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
  { name: 'index', summary: 'rebuild the cache (normally automatic)', usage: 'pm index [--force]', flags: ['--force'] },
  { name: 'skill', summary: 'install the agent protocol', usage: 'pm skill install --target <claude|agents>', flags: ['--target'] },
]

/** Flags that never consume the token after them. */
export const BOOLEAN_FLAGS: ReadonlySet<string> = new Set([
  'json',
  'stub',
  'force',
  'all',
  'no-expand',
  'no-color',
  'yes',
  'help',
])
