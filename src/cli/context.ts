import { join } from 'node:path'
import type { MemoryIndex } from '../domain/types'
import { loadIndex } from '../index/persist'
import { findRoot, memoryRoot } from '../store/paths'
import { CliError, EXIT } from './exit'
import type { Io } from './io'
import type { ParsedArgs } from './args'

export interface Ctx {
  io: Io
  args: ParsedArgs
  json: boolean
  out(s: string): void
  requireRoot(): string
  memRoot(): string
  requireIndex(): MemoryIndex
  flag(name: string): string | null
  bool(name: string): boolean
  int(name: string, fallback: number): number
}

const CACHE_WARNING: Record<'tmp' | 'memory', string> = {
  tmp: 'index cache is not writable under .project-memory; using a copy in the system temp directory',
  memory: 'index cache could not be written; the index was rebuilt in memory for this run',
}

export function makeCtx(io: Io, args: ParsedArgs): Ctx {
  const json = args.flags['json'] === true
  let cachedRoot: string | null = null
  let cachedIndex: MemoryIndex | null = null

  const flag = (name: string): string | null => {
    const v = args.flags[name]
    return typeof v === 'string' ? v : null
  }

  const requireRoot = (): string => {
    if (cachedRoot !== null) return cachedRoot
    const override = flag('cwd')
    const base = override === null ? io.cwd : join(io.cwd, override)
    const found = findRoot(base, io.env)
    if (found === null) {
      throw new CliError('NO_MEMORY', 'no .project-memory directory found', EXIT.NO_MEMORY, {
        hint: 'pm init',
      })
    }
    cachedRoot = found
    return found
  }

  return {
    io,
    args,
    json,
    out: (s) => io.stdout(s),
    requireRoot,
    memRoot: () => memoryRoot(requireRoot()),
    requireIndex: () => {
      if (cachedIndex === null) {
        cachedIndex = loadIndex(memoryRoot(requireRoot()))
        // A degraded cache still answers correctly, so the command carries on;
        // the warning goes to stderr, never to stdout or the --json envelope.
        if (cachedIndex.storage !== 'disk') {
          io.stderr(`warning: ${CACHE_WARNING[cachedIndex.storage]}\n`)
        }
        // A document the indexer had to skip is missing from every answer; say
        // so on stderr rather than letting it disappear until `pm validate`.
        for (const w of cachedIndex.warnings) io.stderr(`warning: ${w}\n`)
        if (cachedIndex.warnings.length > 0) io.stderr('hint: pm validate\n')
      }
      return cachedIndex
    },
    flag,
    bool: (name) => args.flags[name] === true,
    int: (name, fallback) => {
      const v = flag(name)
      if (v === null) return fallback
      const n = Number.parseInt(v, 10)
      if (Number.isNaN(n)) {
        throw new CliError('USAGE', `--${name} must be an integer, got '${v}'`, EXIT.USAGE)
      }
      return n
    },
  }
}
