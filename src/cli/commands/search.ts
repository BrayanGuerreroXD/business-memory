import type { Ctx } from '../context'
import { CliError, EXIT } from '../exit'
import { isDocType } from '../../domain/types'
import { DOC_TYPES } from '../../domain/constants'
import { search } from '../../query/search'
import { renderSearch } from '../../render/plain'
import { okEnvelope } from '../../render/json'

export function searchCommand(ctx: Ctx): number {
  const query = ctx.args.positionals.join(' ').trim()
  if (query === '') {
    throw new CliError('USAGE', 'pm search requires a query', EXIT.USAGE, { hint: 'pm search "cancellation"' })
  }

  const index = ctx.requireIndex()
  const type = ctx.flag('type')
  if (type !== null && !isDocType(type)) {
    throw new CliError('USAGE', `unknown type '${type}'`, EXIT.USAGE, { hint: `valid types: ${DOC_TYPES.join(', ')}` })
  }

  const opts: Parameters<typeof search>[2] = { limit: ctx.int('limit', 20) }
  if (type !== null) opts.type = type
  if (ctx.bool('all')) opts.includeSuperseded = true

  const hits = search(index, query, opts)
  const total = Object.keys(index.file.docs).length

  ctx.out(
    ctx.json
      ? okEnvelope({ query, total, hits: hits.map((h) => ({ id: h.doc.id, title: h.doc.title, type: h.doc.type, score: Number(h.score.toFixed(3)) })) })
      : renderSearch(query, hits, total),
  )
  return EXIT.OK
}
