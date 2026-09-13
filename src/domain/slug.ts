import type { DocType } from './types'
import { SLUG_MAX, TYPE_PREFIX } from './constants'

function trimDashes(s: string): string {
  return s.replace(/^-+/, '').replace(/-+$/, '')
}

export function slugify(title: string, type: DocType): string {
  const bare = trimDashes(
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-'),
  )
  if (bare === '') throw new Error('title produces an empty slug')

  const prefixed = `${TYPE_PREFIX[type]}-${bare}`
  return prefixed.length <= SLUG_MAX ? prefixed : trimDashes(prefixed.slice(0, SLUG_MAX))
}

export function ensureUniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const suffix = `-${n}`
    const room = SLUG_MAX - suffix.length
    const candidate = trimDashes(base.length > room ? base.slice(0, room) : base) + suffix
    if (!taken.has(candidate)) return candidate
  }
}
