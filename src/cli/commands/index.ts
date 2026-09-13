import type { Ctx } from '../context'
import { EXIT } from '../exit'
import { buildIndex } from '../../index/build'
import { saveIndex } from '../../index/persist'
import { okEnvelope } from '../../render/json'

export function indexCommand(ctx: Ctx): number {
  const memRoot = ctx.memRoot()
  const { file, warnings } = buildIndex(memRoot, null)
  const storage = saveIndex(memRoot, file)
  const count = Object.keys(file.docs).length

  if (ctx.json) {
    ctx.out(okEnvelope({ indexed: count, storage, warnings }))
    return EXIT.OK
  }

  ctx.out(`indexed ${count} docs (${storage})\n`)
  for (const w of warnings) ctx.io.stderr(`warning: ${w}\n`)
  return EXIT.OK
}
