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
  { name: 'init', summary: 'create .business-memory in the current repository', usage: 'pm init [--force]', flags: ['--force'] },
  { name: 'add', summary: 'create a knowledge document', usage: 'pm add <type> --title "..." [--source "..."] [--stub|--body-file <f>|--body "..."|-] [--force]', flags: ['--title', '--tags', '--refs', '--links', '--source', '--stub', '--body-file', '--body', '-', '--force'] },
  { name: 'update', summary: 'rewrite the body or status of a document', usage: 'pm update <id> [--stub|--body-file <f>|--body "..."|-] [--title "..."] [--source "..."] [--status superseded --superseded-by <id>]', flags: ['--stub', '--body-file', '--body', '-', '--title', '--source', '--status', '--superseded-by', '--add-tag', '--add-link', '--add-ref'] },
  { name: 'show', summary: 'print full documents by id', usage: 'pm show <id> [<id>...]', flags: [] },
  { name: 'path', summary: 'print the file path of a document', usage: 'pm path <id>', flags: [] },
  { name: 'list', summary: 'list what the memory contains', usage: 'pm list [--type <t>] [--tag <x>] [--all]', flags: ['--type', '--tag', '--all'] },
  { name: 'search', summary: 'rank documents by text relevance', usage: 'pm search <query> [--type <t>] [--limit <n>] [--all]', flags: ['--type', '--limit', '--all'] },
  { name: 'context', summary: 'return the relevant business context for a topic', usage: 'pm context <query> [--max-tokens <n>] [--limit <n>] [--no-expand] [--all]', flags: ['--max-tokens', '--limit', '--no-expand', '--all'] },
  { name: 'validate', summary: 'check frontmatter, ids, links and supersession', usage: 'pm validate', flags: [] },
  { name: 'index', summary: 'rebuild the cache (normally automatic)', usage: 'pm index [--force]', flags: ['--force'] },
  { name: 'skill', summary: 'install the agent protocol', usage: 'pm skill install --target <claude|agents>', flags: ['--target'] },
  { name: 'help', summary: 'print this summary, or the machine-readable spec', usage: 'pm help [--json]', flags: [] },
]

/** Aliases the parser accepts for any command, mapped to their canonical flag. */
export const FLAG_ALIASES: Record<string, string> = {
  '-t': '--type',
  '-n': '--limit',
  '-C': '--cwd',
  '--format json': '--json',
}

/**
 * Flags every command accepts, whatever its own spec declares. `--yes` asks for
 * non-interactive behaviour, which is the only behaviour this CLI has: it never
 * prompts, so the flag is accepted and changes nothing.
 */
export const GLOBAL_FLAGS = ['--json', '--no-color', '-C <dir>', '--yes', '--help']

/** Canonical names of the global flags, after alias resolution (`-C` is `cwd`). */
const GLOBAL_FLAG_NAMES: ReadonlySet<string> = new Set(['json', 'no-color', 'cwd', 'yes', 'help'])

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

export function specFor(command: string): CommandSpec | null {
  return SPECS.find((s) => s.name === command) ?? null
}

/** The flag names a command accepts, without the leading dashes. */
export function acceptedFlagNames(spec: CommandSpec): string[] {
  const own = spec.flags.filter((f) => f.startsWith('--')).map((f) => f.slice(2))
  return [...own, ...GLOBAL_FLAG_NAMES]
}

/** Flag names present in `flags` that the command does not accept. */
export function unknownFlagNames(spec: CommandSpec, flags: Record<string, string | boolean>): string[] {
  const accepted = new Set(acceptedFlagNames(spec))
  return Object.keys(flags).filter((name) => !accepted.has(name))
}

/** Everything a command accepts, as printable flags. */
export function displayFlags(spec: CommandSpec): string[] {
  return [...spec.flags, ...GLOBAL_FLAGS]
}
