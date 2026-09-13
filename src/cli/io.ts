import { readFileSync } from 'node:fs'

export interface Io {
  cwd: string
  env: NodeJS.ProcessEnv
  argv: string[]
  now: Date
  interactive: boolean
  stdout(s: string): void
  stderr(s: string): void
  readStdin(): string
}

export function realIo(): Io {
  const interactive =
    process.stdin.isTTY === true && process.stdout.isTTY === true && process.env['CI'] !== '1'

  return {
    cwd: process.cwd(),
    env: process.env,
    argv: process.argv.slice(2),
    now: new Date(),
    interactive,
    stdout: (s) => process.stdout.write(s),
    stderr: (s) => process.stderr.write(s),
    readStdin: () => {
      try {
        return readFileSync(0, 'utf8')
      } catch {
        return ''
      }
    },
  }
}
