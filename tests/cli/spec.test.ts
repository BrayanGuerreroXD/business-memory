import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BOOLEAN_FLAGS, GLOBAL_FLAGS, SPECS, acceptedFlagNames, specFor } from '../../src/cli/spec'
import { COMMANDS } from '../../src/cli/registry'

const COMMAND_DIR = join(import.meta.dir, '..', '..', 'src', 'cli', 'commands')

/** Flag names a command source file actually reads, resolveBody included. */
function flagsRead(command: string): string[] {
  const source = readFileSync(join(COMMAND_DIR, `${command}.ts`), 'utf8')
  const body = source.includes('resolveBody(ctx)')
    ? readFileSync(join(COMMAND_DIR, '..', 'body.ts'), 'utf8')
    : ''
  const names = new Set<string>()
  for (const text of [source, body]) {
    for (const m of text.matchAll(/ctx\.(?:flag|bool|int)\('([a-z-]+)'/g)) names.add(m[1] as string)
  }
  return [...names].sort()
}

describe('pm help --json declares what the commands accept', () => {
  test('every registered command has a spec', () => {
    for (const name of Object.keys(COMMANDS)) expect(specFor(name)).not.toBeNull()
  })

  test('every flag a command reads is declared in its spec', () => {
    for (const spec of SPECS) {
      const accepted = new Set(acceptedFlagNames(spec))
      for (const name of flagsRead(spec.name)) {
        expect(`${spec.name}: --${name}${accepted.has(name) ? ' (declared)' : ' (MISSING from SPECS)'}`).toBe(
          `${spec.name}: --${name} (declared)`,
        )
      }
    }
  })

  test('every flag a spec declares is read by that command or is global', () => {
    const global = new Set(['json', 'no-color', 'cwd', 'help'])
    for (const spec of SPECS) {
      const read = new Set(flagsRead(spec.name))
      for (const flag of spec.flags) {
        if (!flag.startsWith('--')) continue
        const name = flag.slice(2)
        if (global.has(name)) continue
        expect(`${spec.name}: ${flag}${read.has(name) ? ' (read)' : ' (DECLARED BUT UNUSED)'}`).toBe(
          `${spec.name}: ${flag} (read)`,
        )
      }
    }
  })

  test('update declares --title, --source, --body and the bare - stdin form', () => {
    const spec = specFor('update')
    expect(spec?.flags).toContain('--title')
    expect(spec?.flags).toContain('--source')
    expect(spec?.flags).toContain('--body')
    expect(spec?.flags).toContain('-')
  })

  test('add declares the bare - stdin form too', () => {
    expect(specFor('add')?.flags).toContain('-')
  })

  test('the usage line of a command mentions its own flags', () => {
    for (const spec of SPECS) {
      for (const flag of spec.flags) {
        if (!flag.startsWith('--')) continue
        if (['--add-tag', '--add-link', '--add-ref', '--tags', '--refs', '--links'].includes(flag)) continue
        expect(`${spec.name} usage: ${spec.usage.includes(flag) ? flag : `${flag} MISSING`}`).toBe(
          `${spec.name} usage: ${flag}`,
        )
      }
    }
  })

  test('every boolean flag belongs to some command or is global', () => {
    const declared = new Set([
      ...SPECS.flatMap((s) => s.flags),
      ...GLOBAL_FLAGS.map((f) => f.split(' ')[0] as string),
    ].filter((f) => f.startsWith('--')).map((f) => f.slice(2)))
    for (const name of BOOLEAN_FLAGS) {
      expect(`${name}: ${declared.has(name) ? 'declared' : 'ORPHAN'}`).toBe(`${name}: declared`)
    }
  })

  test('every global flag is accepted by every command', () => {
    for (const spec of SPECS) {
      const accepted = new Set(acceptedFlagNames(spec))
      for (const flag of GLOBAL_FLAGS) {
        const name = (flag.split(' ')[0] as string).replace(/^-+/, '')
        const canonical = name === 'C' ? 'cwd' : name
        expect(`${spec.name}: --${canonical}${accepted.has(canonical) ? '' : ' NOT ACCEPTED'}`).toBe(
          `${spec.name}: --${canonical}`,
        )
      }
    }
  })

  test('the command source files and the spec list are the same set', () => {
    const files = readdirSync(COMMAND_DIR)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => f.replace(/\.ts$/, ''))
      .sort()
    expect(SPECS.map((s) => s.name).sort()).toEqual(files)
  })
})
