import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Ctx } from '../context'
import { EXIT } from '../exit'
import { INDEX_FILE, MEMORY_DIR, SKILL_FILE, TYPE_DIR } from '../../domain/constants'
import { atomicWrite, ensureDir } from '../../store/fs'
import { toPosix } from '../../store/paths'
import { okEnvelope } from '../../render/json'
import { SKILL_MARKDOWN } from '../../skill/content'

export function initCommand(ctx: Ctx): number {
  const projectRoot = ctx.flag('cwd') === null ? ctx.io.cwd : join(ctx.io.cwd, ctx.flag('cwd') as string)
  const mem = join(projectRoot, MEMORY_DIR)
  const force = ctx.bool('force')

  const created: string[] = []
  const kept: string[] = []

  const write = (rel: string, content: string, overwritable: boolean): void => {
    const abs = join(mem, rel)
    if (existsSync(abs) && !(overwritable && force)) {
      kept.push(`${MEMORY_DIR}/${toPosix(rel)}`)
      return
    }
    atomicWrite(abs, content)
    created.push(`${MEMORY_DIR}/${toPosix(rel)}`)
  }

  ensureDir(mem)
  for (const dir of Object.values(TYPE_DIR)) write(`${dir}/.gitkeep`, '', false)
  write(SKILL_FILE, SKILL_MARKDOWN, true)
  write('.gitignore', `${INDEX_FILE}\n`, false)
  write('.gitattributes', '* text eol=lf\n', false)

  if (ctx.json) {
    ctx.out(okEnvelope({ root: toPosix(mem), created, kept }))
    return EXIT.OK
  }

  const lines: string[] = []
  if (created.length > 0) lines.push('created:', ...created.map((p) => `  ${p}`))
  if (kept.length > 0) lines.push('kept:', ...kept.map((p) => `  ${p}`))
  lines.push('', 'Next: pm skill install --target claude', '')
  ctx.out(lines.join('\n'))
  return EXIT.OK
}
