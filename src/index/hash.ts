import { createHash } from 'node:crypto'

export function hashContent(s: string): string {
  return `sha256:${createHash('sha256').update(s, 'utf8').digest('hex')}`
}
