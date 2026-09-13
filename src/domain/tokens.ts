import { AGE_WARN_MONTHS } from './constants'

export function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4)
}

export function monthsBetween(created: string, now: Date): number {
  const [y, m, d] = created.split('-').map((n) => Number.parseInt(n, 10))
  if (y === undefined || m === undefined || d === undefined) return 0
  let months = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m)
  if (now.getUTCDate() < d) months -= 1
  return Math.max(0, months)
}

export function ageLabel(created: string, now: Date): string {
  const months = monthsBetween(created, now)
  return months >= AGE_WARN_MONTHS ? ` (${months} months old)` : ''
}
