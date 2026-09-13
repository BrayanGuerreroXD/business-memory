import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import type { DocType } from '../domain/types'
import { MEMORY_DIR, TYPE_DIR } from '../domain/constants'

export function toPosix(p: string): string {
  return p.split(sep).join('/').replace(/\\/g, '/')
}

export function memoryRoot(projectRoot: string): string {
  return join(projectRoot, MEMORY_DIR)
}

export function docRelPath(type: DocType, id: string): string {
  return `${TYPE_DIR[type]}/${id}.md`
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

export function findRoot(cwd: string, env: NodeJS.ProcessEnv): string | null {
  const override = env['PM_ROOT']
  if (override !== undefined && override !== '') {
    const abs = resolve(override)
    return isDir(memoryRoot(abs)) ? abs : null
  }

  let dir = resolve(cwd)
  for (;;) {
    if (isDir(memoryRoot(dir))) return dir
    if (existsSync(join(dir, '.git'))) return null
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}
