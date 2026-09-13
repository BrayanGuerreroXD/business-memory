export interface ErrorPayload {
  code: string
  message: string
  hint?: string
  [key: string]: unknown
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j] ?? 0
  }
  return prev[b.length] ?? 0
}

export function didYouMean(input: string, candidates: string[]): string | null {
  const prefixed = candidates.filter((c) => c.startsWith(input)).sort((a, b) => a.length - b.length)
  if (prefixed[0] !== undefined) return prefixed[0]

  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const c of candidates) {
    const d = editDistance(input, c)
    if (d < bestDistance) {
      bestDistance = d
      best = c
    }
  }
  return bestDistance <= 3 ? best : null
}

export function renderError(payload: ErrorPayload): string {
  const lines = [`error: ${payload.message}  [${payload.code}]`]
  const suggestion = payload['didYouMean']
  if (typeof suggestion === 'string') lines.push(`did you mean: ${suggestion}`)
  if (payload.hint !== undefined) lines.push(`hint: ${payload.hint}`)
  return `${lines.join('\n')}\n`
}
