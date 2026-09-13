import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Ctx } from '../context'
import { CliError, EXIT } from '../exit'
import { SKILL_FILE } from '../../domain/constants'
import { atomicWrite, readText } from '../../store/fs'
import { toPosix } from '../../store/paths'
import { okEnvelope } from '../../render/json'
import { SKILL_MARKDOWN } from '../../skill/content'
import { agentsBlock, claudeAdapter, spliceBlock, type SkillTarget } from '../../skill/adapters'

const TARGETS: SkillTarget[] = ['claude', 'agents']

function isTarget(v: string | null): v is SkillTarget {
  return v === 'claude' || v === 'agents'
}

export function skillCommand(ctx: Ctx): number {
  const sub = ctx.args.positionals[0]
  if (sub !== 'install') {
    throw new CliError('USAGE', `unknown subcommand '${sub ?? ''}'`, EXIT.USAGE, {
      hint: 'pm skill install --target claude',
    })
  }

  const target = ctx.flag('target')
  if (!isTarget(target)) {
    throw new CliError('USAGE', '--target is required', EXIT.USAGE, {
      hint: `valid targets: ${TARGETS.join(', ')}`,
    })
  }

  const projectRoot = ctx.requireRoot()
  const canonicalPath = join(ctx.memRoot(), SKILL_FILE)
  const canonical = existsSync(canonicalPath) ? readText(canonicalPath) : SKILL_MARKDOWN

  let written: string
  if (target === 'claude') {
    const adapter = claudeAdapter(canonical)
    atomicWrite(join(projectRoot, ...adapter.path.split('/')), adapter.content)
    written = adapter.path
  } else {
    const abs = join(projectRoot, 'AGENTS.md')
    const existing = existsSync(abs) ? readText(abs) : ''
    atomicWrite(abs, spliceBlock(existing, agentsBlock(canonical)))
    written = 'AGENTS.md'
  }

  if (ctx.json) {
    ctx.out(okEnvelope({ target, written: toPosix(written) }))
    return EXIT.OK
  }
  ctx.out(`installed protocol for ${target}: ${written}\n`)
  return EXIT.OK
}
