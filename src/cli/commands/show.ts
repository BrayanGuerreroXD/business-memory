import type { Ctx } from '../context'
import { CliError, EXIT } from '../exit'
import { renderShow } from '../../render/plain'
import { okEnvelope } from '../../render/json'
import { didYouMean } from '../../render/error'

export function showCommand(ctx: Ctx): number {
  const ids = ctx.args.positionals
  if (ids.length === 0) {
    throw new CliError('USAGE', 'pm show requires at least one id', EXIT.USAGE, { hint: 'pm list' })
  }

  const index = ctx.requireIndex()
  const docs = ids.map((id) => {
    const doc = index.file.docs[id]
    if (doc === undefined) {
      const suggestion = didYouMean(id, Object.keys(index.file.docs))
      const payload: Record<string, unknown> = { hint: `pm search "${id}"` }
      if (suggestion !== null) payload['didYouMean'] = suggestion
      throw new CliError('NOT_FOUND', `no doc with id '${id}'`, EXIT.NOT_FOUND, payload)
    }
    return doc
  })

  ctx.out(ctx.json ? okEnvelope({ docs }) : renderShow(docs))
  return EXIT.OK
}
