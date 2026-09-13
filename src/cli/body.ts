import { isAbsolute, join } from 'node:path'
import type { Ctx } from './context'
import { CliError, EXIT } from './exit'
import { readText } from '../store/fs'

export type BodySource = { mode: 'stub' } | { mode: 'content'; text: string }

export function resolveBody(ctx: Ctx): BodySource {
  if (ctx.bool('stub')) return { mode: 'stub' }

  const file = ctx.flag('body-file')
  if (file !== null) {
    const abs = isAbsolute(file) ? file : join(ctx.io.cwd, file)
    try {
      return { mode: 'content', text: readText(abs) }
    } catch {
      throw new CliError('NOT_FOUND', `cannot read --body-file '${file}'`, EXIT.NOT_FOUND, {
        hint: 'pass --stub instead and write the file with your own tools',
      })
    }
  }

  if (ctx.args.positionals.includes('-')) {
    return { mode: 'content', text: ctx.io.readStdin() }
  }

  const inline = ctx.flag('body')
  if (inline !== null) {
    if (inline.includes('\n')) {
      throw new CliError('USAGE', '--body accepts a single line only', EXIT.USAGE, {
        hint: 'use --stub, --body-file <path>, or pipe the body and pass -',
      })
    }
    return { mode: 'content', text: inline }
  }

  return { mode: 'stub' }
}
