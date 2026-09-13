import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { toPosix } from './paths'

export function ensureDir(abs: string): void {
  mkdirSync(abs, { recursive: true })
}

export function readText(abs: string): string {
  return readFileSync(abs, 'utf8').replace(/\r\n/g, '\n')
}

export function atomicWrite(abs: string, content: string): void {
  ensureDir(dirname(abs))
  const normalized = content.replace(/\r\n/g, '\n')
  const tmpPath = `${abs}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tmpPath, normalized, 'utf8')

  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      renameSync(tmpPath, abs)
      return
    } catch (err) {
      lastError = err
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY') break
      const until = Date.now() + 20 * (attempt + 1)
      while (Date.now() < until) {
        /* short spin: Windows antivirus holds the handle briefly */
      }
    }
  }

  rmSync(tmpPath, { force: true })
  throw lastError
}

export function walkMarkdown(memRoot: string): string[] {
  const out: string[] = []

  const walk = (abs: string, rel: string): void => {
    let entries
    try {
      entries = readdirSync(abs, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        walk(join(abs, entry.name), childRel)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push(toPosix(childRel))
      }
    }
  }

  walk(memRoot, '')
  return out.sort()
}
