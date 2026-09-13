import type { Ctx } from '../context'
import { okEnvelope } from '../../render/json'
import { EXIT } from '../exit'
import { VERSION } from '../../version'
import { FLAG_ALIASES, GLOBAL_FLAGS, SPECS } from '../spec'

export function helpCommand(ctx: Ctx): number {
  if (ctx.json) {
    ctx.out(okEnvelope({ version: VERSION, exitCodes: { ok: 0, usage: 2, notFound: 3, noMemory: 4, invalid: 5, conflict: 6 }, globalFlags: GLOBAL_FLAGS, aliases: FLAG_ALIASES, commands: SPECS }))
    return EXIT.OK
  }
  const lines = [`pm ${VERSION}`, '', 'Commands:']
  for (const s of SPECS) lines.push(`  ${s.name.padEnd(9)}${s.summary}`)
  lines.push('', `Global flags: ${GLOBAL_FLAGS.join(' ')}`, 'Machine-readable spec: pm help --json', '')
  ctx.out(lines.join('\n'))
  return EXIT.OK
}
