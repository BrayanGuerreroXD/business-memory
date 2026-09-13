export interface ParsedArgs {
  command: string | null
  positionals: string[]
  flags: Record<string, string | boolean>
}

const SHORT: Record<string, string> = { t: 'type', C: 'cwd', n: 'limit' }

export function parseArgv(argv: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string

    if (token === '--') {
      positionals.push(...argv.slice(i + 1))
      break
    }

    if (token.startsWith('--')) {
      const eq = token.indexOf('=')
      const name = eq === -1 ? token.slice(2) : token.slice(2, eq)
      let value: string | boolean
      if (eq !== -1) {
        value = token.slice(eq + 1)
      } else {
        const next = argv[i + 1]
        if (next !== undefined && !next.startsWith('--')) {
          value = next
          i++
        } else {
          value = true
        }
      }
      flags[name] = value
      continue
    }

    if (token.startsWith('-') && token.length === 2) {
      const name = SHORT[token.slice(1)]
      if (name !== undefined) {
        const next = argv[i + 1]
        if (next !== undefined && !next.startsWith('--')) {
          flags[name] = next
          i++
        } else {
          flags[name] = true
        }
        continue
      }
    }

    positionals.push(token)
  }

  if (flags['format'] === 'json') {
    flags['json'] = true
    delete flags['format']
  }

  const command = positionals.length > 0 ? (positionals.shift() as string) : null
  return { command, positionals, flags }
}
