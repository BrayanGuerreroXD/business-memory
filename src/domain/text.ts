const STOPWORDS = new Set([
  // english
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'in',
  'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to', 'with',
  // spanish
  'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'lo', 'los', 'para',
  'por', 'que', 'se', 'sin', 'sobre', 'un', 'una', 'y',
])

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function splitIdentifier(s: string): string[] {
  const parts = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/\s+/)
    .filter((p) => p !== '')
  return parts.map((p) => normalize(p))
}

export function isStopword(t: string): boolean {
  return STOPWORDS.has(t)
}

export function tokenizeAll(s: string): string[] {
  const out: string[] = []

  const push = (t: string): void => {
    if (t === '' || isStopword(t)) return
    out.push(t)
  }

  for (const raw of s.split(/[^\p{L}\p{N}]+/u)) {
    if (raw === '') continue
    push(normalize(raw))
    const parts = splitIdentifier(raw)
    if (parts.length > 1) for (const p of parts) push(p)
  }

  return out
}

export function tokenize(s: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tokenizeAll(s)) {
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}
