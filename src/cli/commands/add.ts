import { join } from 'node:path'
import type { Ctx } from '../context'
import { CliError, EXIT } from '../exit'
import { resolveBody } from '../body'
import { DOC_TYPES, SIMILAR_THRESHOLD } from '../../domain/constants'
import { isDocType, type DocType, type Frontmatter } from '../../domain/types'
import { ensureUniqueSlug, slugify } from '../../domain/slug'
import { serializeDoc } from '../../domain/frontmatter'
import { maxPossibleScore, scoreDocs } from '../../domain/scoring'
import { tokenize } from '../../domain/text'
import { atomicWrite } from '../../store/fs'
import { docRelPath, toPosix } from '../../store/paths'
import { okEnvelope } from '../../render/json'

function csv(v: string | null): string[] {
  return v === null ? [] : v.split(',').map((s) => s.trim()).filter((s) => s !== '')
}

function isoDate(now: Date): string {
  return now.toISOString().slice(0, 10)
}

export function addCommand(ctx: Ctx): number {
  const rawType = ctx.args.positionals[0]
  if (!isDocType(rawType)) {
    throw new CliError('USAGE', `unknown type '${rawType ?? ''}'`, EXIT.USAGE, {
      hint: `valid types: ${DOC_TYPES.join(', ')}`,
    })
  }
  const type: DocType = rawType

  const title = ctx.flag('title')
  if (title === null || title.trim() === '') {
    throw new CliError('USAGE', '--title is required', EXIT.USAGE, {
      hint: 'pm add rule --title "..." --source "..." --stub',
    })
  }

  const source = ctx.flag('source')
  if ((type === 'rule' || type === 'decision') && (source === null || source.trim() === '')) {
    throw new CliError('INVALID', `source is required for type ${type}`, EXIT.INVALID, {
      hint: 'pass --source "ticket, conversation, spec or explicit decision"',
    })
  }

  const index = ctx.requireIndex()

  if (!ctx.bool('force')) {
    // The reported score is the ratio against a perfect match, the same scale
    // as SIMILAR_THRESHOLD, so the number and the threshold are comparable.
    const perfect = maxPossibleScore(tokenize(title))
    const ratio = (score: number): number => (perfect === 0 ? 0 : score / perfect)
    const similar = scoreDocs(index, title, { type }).filter((s) => ratio(s.score) >= SIMILAR_THRESHOLD).slice(0, 3)
    if (similar.length > 0) {
      throw new CliError('SIMILAR_DOCS', `${similar.length} similar doc(s) found`, EXIT.CONFLICT, {
        similar: similar.map((s) => ({ id: s.doc.id, title: s.doc.title, score: Number(ratio(s.score).toFixed(2)) })),
        hint: `pm show ${similar[0]!.doc.id}  |  pm update ${similar[0]!.doc.id} --stub  |  pm add ... --force`,
      })
    }
  }

  let base: string
  try {
    base = slugify(title, type)
  } catch {
    throw new CliError('USAGE', `title '${title}' produces an empty slug`, EXIT.USAGE, {
      hint: 'use a title with letters or digits',
    })
  }

  const id = ensureUniqueSlug(base, new Set(Object.keys(index.file.docs)))
  const body = resolveBody(ctx)

  const fm: Frontmatter = {
    id,
    type,
    title,
    tags: csv(ctx.flag('tags')),
    source: source === null || source.trim() === '' ? null : source,
    status: 'active',
    superseded_by: null,
    links: csv(ctx.flag('links')),
    refs: csv(ctx.flag('refs')),
    created: isoDate(ctx.io.now),
  }

  const rel = docRelPath(type, id)
  const bodyText = body.mode === 'stub' ? `# ${title}\n` : body.text
  atomicWrite(join(ctx.memRoot(), rel), serializeDoc(fm, bodyText))

  if (ctx.json) {
    ctx.out(okEnvelope({ id, type, path: rel, stub: body.mode === 'stub' }))
    return EXIT.OK
  }
  ctx.out(`${toPosix(join(ctx.memRoot(), rel))}\n`)
  return EXIT.OK
}
