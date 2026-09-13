import type { Ctx } from '../context'
import { EXIT } from '../exit'
import { buildIndex } from '../../index/build'
import { loadIndex, saveIndex } from '../../index/persist'
import { okEnvelope } from '../../render/json'

export function indexCommand(ctx: Ctx): number {
  const memRoot = ctx.memRoot()
  const force = ctx.bool('force')

  let count: number
  let storage: 'disk' | 'tmp' | 'memory'
  let warnings: string[]

  if (force) {
    const built = buildIndex(memRoot, null)
    storage = saveIndex(memRoot, built.file)
    count = Object.keys(built.file.docs).length
    warnings = built.warnings
  } else {
    const index = loadIndex(memRoot)
    storage = index.storage
    count = Object.keys(index.file.docs).length
    warnings = index.warnings
  }

  const mode = force ? 'force' : 'incremental'

  if (ctx.json) {
    ctx.out(okEnvelope({ mode, indexed: count, storage, warnings }))
    return EXIT.OK
  }

  ctx.out(`indexed ${count} docs (${storage}, ${mode})\n`)
  for (const w of warnings) ctx.io.stderr(`warning: ${w}\n`)
  return EXIT.OK
}
