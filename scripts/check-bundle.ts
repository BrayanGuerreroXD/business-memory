import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const FORBIDDEN = /\bBun\.(file|write|serve|spawn|\$)\b/

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    if (statSync(abs).isDirectory()) out.push(...walk(abs))
    else if (abs.endsWith('.ts')) out.push(abs)
  }
  return out
}

const offenders = walk(join(import.meta.dir, '..', 'src')).filter((f) =>
  FORBIDDEN.test(readFileSync(f, 'utf8')),
)

if (offenders.length > 0) {
  console.error('Bun-only APIs found, which breaks the npm channel:')
  for (const f of offenders) console.error(`  ${f}`)
  process.exit(1)
}
console.log('node-compatible: ok')
