import { join } from 'node:path'
import type { Ctx } from '../context'
import { CliError, EXIT } from '../exit'
import { toPosix } from '../../store/paths'
import { okEnvelope } from '../../render/json'
import { didYouMean } from '../../render/error'

export function pathCommand(ctx: Ctx): number {
  const id = ctx.args.positionals[0]
  if (id === undefined) {
    throw new CliError('USAGE', 'pm path requires an id', EXIT.USAGE, { hint: 'pm list' })
  }

  const index = ctx.requireIndex()
  const doc = index.file.docs[id]
  if (doc === undefined) {
    const suggestion = didYouMean(id, Object.keys(index.file.docs))
    const payload: Record<string, unknown> = { hint: `pm search "${id}"` }
    if (suggestion !== null) payload['didYouMean'] = suggestion
    throw new CliError('NOT_FOUND', `no doc with id '${id}'`, EXIT.NOT_FOUND, payload)
  }

  const abs = toPosix(join(ctx.memRoot(), doc.path))
  ctx.out(ctx.json ? okEnvelope({ id, path: doc.path, absolute: abs }) : `${abs}\n`)
  return EXIT.OK
}
