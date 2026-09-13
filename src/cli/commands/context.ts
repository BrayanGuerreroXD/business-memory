import type { Ctx } from '../context'
import { CliError, EXIT } from '../exit'
import { DEFAULT_MAX_TOKENS } from '../../domain/constants'
import { buildContext } from '../../query/context'
import { renderContext } from '../../render/context'
import { okEnvelope } from '../../render/json'

export function contextCommand(ctx: Ctx): number {
  const query = ctx.args.positionals.join(' ').trim()
  if (query === '') {
    throw new CliError('USAGE', 'pm context requires a query', EXIT.USAGE, {
      hint: 'pm context "policy cancellation"',
    })
  }

  const index = ctx.requireIndex()
  const opts: Parameters<typeof buildContext>[2] = { maxTokens: ctx.int('max-tokens', DEFAULT_MAX_TOKENS) }
  if (ctx.bool('no-expand')) opts.noExpand = true
  if (ctx.bool('all')) opts.includeSuperseded = true
  if (ctx.flag('limit') !== null) opts.limit = ctx.int('limit', 0)

  const result = buildContext(index, query, opts)

  if (ctx.json) {
    ctx.out(
      okEnvelope({
        query: result.query,
        totalDocs: result.totalDocs,
        matched: result.matched,
        shown: result.shown,
        truncated: result.truncated,
        estimatedTokens: result.estimatedTokens,
        entries: result.entries.map((e) => ({
          id: e.doc.id,
          type: e.doc.type,
          title: e.doc.title,
          origin: e.origin,
          mode: e.mode,
          body: e.mode === 'full' ? e.doc.body : null,
        })),
      }),
    )
    return EXIT.OK
  }

  ctx.out(renderContext(result, ctx.io.now))
  return EXIT.OK
}
