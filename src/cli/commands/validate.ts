import type { Ctx } from '../context'
import { CliError, EXIT } from '../exit'
import { buildIndex } from '../../index/build'
import { buildBacklinks } from '../../index/backlinks'
import { validateIndex } from '../../domain/validate'
import { okEnvelope } from '../../render/json'

export function validateCommand(ctx: Ctx): number {
  const memRoot = ctx.memRoot()
  const { file, warnings } = buildIndex(memRoot, null)
  const findings = validateIndex(
    { file, backlinks: buildBacklinks(file), storage: 'memory', warnings },
    warnings,
    ctx.io.now,
  )

  const errors = findings.filter((f) => f.level === 'error')
  const warns = findings.filter((f) => f.level === 'warning')

  if (ctx.json) {
    if (errors.length > 0) {
      throw new CliError('VALIDATION_FAILED', `${errors.length} error(s)`, EXIT.INVALID, {
        findings,
        hint: 'pm show <id>',
      })
    }
    ctx.out(okEnvelope({ errors: 0, warnings: warns.length, findings }))
    return EXIT.OK
  }

  const lines: string[] = []
  for (const f of findings) {
    lines.push(`${f.level}: ${f.path ?? f.id ?? '?'} — ${f.message}`)
  }
  lines.push('', `${errors.length} errors, ${warns.length} warnings`, '')
  ctx.out(lines.join('\n'))

  return errors.length > 0 ? EXIT.INVALID : EXIT.OK
}
