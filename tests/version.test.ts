import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VERSION } from '../src/version'

describe('VERSION', () => {
  test('matches the version in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, '..', 'package.json'), 'utf8'))
    expect(VERSION).toBe(pkg.version)
  })
})
