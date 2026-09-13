import type { Ctx } from '../context'
import { EXIT, CliError } from '../exit'
import { isDocType } from '../../domain/types'
import { DOC_TYPES } from '../../domain/constants'
import { renderList } from '../../render/plain'
import { okEnvelope } from '../../render/json'

export function listCommand(ctx: Ctx): number {
  const index = ctx.requireIndex()
  const type = ctx.flag('type')
  if (type !== null && !isDocType(type)) {
    throw new CliError('USAGE', `unknown type '${type}'`, EXIT.USAGE, {
      hint: `valid types: ${DOC_TYPES.join(', ')}`,
    })
  }
  const tag = ctx.flag('tag')
  const all = ctx.bool('all')

  const docs = Object.values(index.file.docs)
    .filter((d) => all || d.status === 'active')
    .filter((d) => type === null || d.type === type)
    .filter((d) => tag === null || d.tags.includes(tag))
    .sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id))

  const total = Object.keys(index.file.docs).length
  ctx.out(ctx.json ? okEnvelope({ total, docs }) : renderList(docs, total))
  return EXIT.OK
}
