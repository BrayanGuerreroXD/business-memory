import { describe, expect, test, beforeAll } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..', '..')
const BIN = join(ROOT, 'dist', 'bin.js')

beforeAll(() => {
  execFileSync('bun', ['run', 'build'], { cwd: ROOT, stdio: 'pipe' })
})

describe('bundle', () => {
  test('is a single file', () => {
    expect(existsSync(BIN)).toBe(true)
    expect(readdirSync(join(ROOT, 'dist'))).toEqual(['bin.js'])
  })

  test('starts with an LF shebang', () => {
    const head = readFileSync(BIN, 'utf8').slice(0, 40)
    expect(head.startsWith('#!/usr/bin/env node\n')).toBe(true)
    expect(head.includes('\r')).toBe(false)
  })

  test('contains no Bun-only API', () => {
    const text = readFileSync(BIN, 'utf8')
    expect(/\bBun\.(file|write|serve)\b|\bBun\.\$/.test(text)).toBe(false)
  })

  test('runs under plain node and prints help', () => {
    const out = execFileSync('node', [BIN, 'help'], { encoding: 'utf8' })
    expect(out).toContain('Commands:')
  })

  test('exposes the machine-readable spec under plain node', () => {
    const out = execFileSync('node', [BIN, 'help', '--json'], { encoding: 'utf8' })
    expect(JSON.parse(out).data.commands.length).toBeGreaterThan(5)
  })

  test('exits 4 outside a memory directory, with a usable error', () => {
    try {
      execFileSync('node', [BIN, 'list'], { cwd: require('node:os').tmpdir(), encoding: 'utf8' })
      throw new Error('expected a non-zero exit')
    } catch (err) {
      const e = err as { status: number; stderr: string }
      expect(e.status).toBe(4)
      expect(e.stderr).toContain('pm init')
    }
  })
})
