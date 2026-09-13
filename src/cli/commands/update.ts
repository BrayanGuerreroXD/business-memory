import { join } from 'node:path'
import type { Ctx } from '../context'
import { CliError, EXIT } from '../exit'
import { resolveBody } from '../body'
import type { Frontmatter } from '../../domain/types'
import { isDocStatus } from '../../domain/types'
import { parseYamlSubset, serializeDoc, splitFrontmatter, validateFrontmatter } from '../../domain/frontmatter'
import { atomicWrite, readText } from '../../store/fs'
import { toPosix } from '../../store/paths'
import { okEnvelope } from '../../render/json'
import { didYouMean } from '../../render/error'

function csv(v: string | null): string[] {
  return v === null ? [] : v.split(',').map((s) => s.trim()).filter((s) => s !== '')
}

function union(current: string[], extra: string[]): string[] {
  const out = [...current]
  for (const e of extra) if (!out.includes(e)) out.push(e)
  return out
}

export function updateCommand(ctx: Ctx): number {
  const id = ctx.args.positionals[0]
  if (id === undefined) {
    throw new CliError('USAGE', 'pm update requires an id', EXIT.USAGE, { hint: 'pm list' })
  }

  const index = ctx.requireIndex()
  const existing = index.file.docs[id]
  if (existing === undefined) {
    const suggestion = didYouMean(id, Object.keys(index.file.docs))
    const payload: Record<string, unknown> = { hint: `pm search "${id}"` }
    if (suggestion !== null) payload['didYouMean'] = suggestion
    throw new CliError('NOT_FOUND', `no doc with id '${id}'`, EXIT.NOT_FOUND, payload)
  }

  const abs = join(ctx.memRoot(), existing.path)
  const split = splitFrontmatter(readText(abs))
  if (split === null) {
    throw new CliError('INVALID', `${existing.path}: no frontmatter block`, EXIT.INVALID)
  }
  const parsed = validateFrontmatter(parseYamlSubset(split.yaml))
  if (!parsed.ok) {
    throw new CliError('INVALID', `${existing.path}: ${parsed.errors.join('; ')}`, EXIT.INVALID)
  }

  const fm: Frontmatter = { ...parsed.value }

  const statusFlag = ctx.flag('status')
  if (statusFlag !== null) {
    if (!isDocStatus(statusFlag)) {
      throw new CliError('USAGE', `--status must be active or superseded`, EXIT.USAGE)
    }
    fm.status = statusFlag
  }

  const by = ctx.flag('superseded-by')
  if (by !== null) {
    if (index.file.docs[by] === undefined) {
      throw new CliError('NOT_FOUND', `no doc with id '${by}'`, EXIT.NOT_FOUND, { hint: 'pm list' })
    }
    fm.superseded_by = by
  }
  if (fm.status === 'superseded' && fm.superseded_by === null) {
    throw new CliError('INVALID', 'superseded_by is required when status is superseded', EXIT.INVALID, {
      hint: 'pm update <id> --status superseded --superseded-by <new-id>',
    })
  }
  if (fm.status === 'active') fm.superseded_by = null

  const title = ctx.flag('title')
  if (title !== null) fm.title = title
  const source = ctx.flag('source')
  if (source !== null) fm.source = source

  fm.tags = union(fm.tags, csv(ctx.flag('add-tag')))
  fm.links = union(fm.links, csv(ctx.flag('add-link')))
  fm.refs = union(fm.refs, csv(ctx.flag('add-ref')))

  const body = resolveBody(ctx)
  const bodyText = body.mode === 'stub' ? split.body : body.text

  atomicWrite(abs, serializeDoc(fm, bodyText))

  if (ctx.json) {
    ctx.out(okEnvelope({ id: fm.id, path: existing.path, status: fm.status }))
    return EXIT.OK
  }
  ctx.out(`${toPosix(abs)}\n`)
  return EXIT.OK
}
