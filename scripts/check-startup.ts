import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const BIN = join(import.meta.dir, '..', 'dist', 'bin.js')
const BUDGET_MS = Number(process.env.PM_STARTUP_BUDGET_MS ?? 120)
const RUNS = 5

const timings: number[] = []
for (let i = 0; i < RUNS; i++) {
  const start = performance.now()
  execFileSync('node', [BIN, 'help'], { stdio: 'pipe' })
  timings.push(performance.now() - start)
}

timings.sort((a, b) => a - b)
const median = timings[Math.floor(RUNS / 2)] as number
console.log(`startup median: ${median.toFixed(1)} ms (budget ${BUDGET_MS} ms)`)

if (median > BUDGET_MS) {
  console.error('startup budget exceeded — check for heavy top-level imports')
  process.exit(1)
}
