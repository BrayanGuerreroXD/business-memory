import type { IndexedDoc, ScoredDoc } from '../domain/types'

export function renderSearch(query: string, hits: ScoredDoc[], totalDocs: number): string {
  if (hits.length === 0) {
    return [
      `0 results for "${query}" (${totalDocs} docs indexed)`,
      'Try: pm list --type rule',
      '',
    ].join('\n')
  }
  const lines = hits.map((h) => `${h.score.toFixed(2).padStart(6)}  ${h.doc.id} — ${h.doc.title}`)
  return `${[...lines, '', `${hits.length} of ${totalDocs} docs`].join('\n')}\n`
}

export function renderList(docs: IndexedDoc[], totalDocs: number): string {
  if (docs.length === 0) {
    return ['0 documents', 'Create one with: pm add rule --title "..." --source "..." --stub', ''].join('\n')
  }
  const lines = docs.map((d) => {
    const flag = d.status === 'superseded' ? '  [superseded]' : ''
    return `${d.type.padEnd(6)}${d.id} — ${d.title}${flag}`
  })
  return `${[...lines, '', `${docs.length} of ${totalDocs} docs`].join('\n')}\n`
}

export function renderShow(docs: IndexedDoc[]): string {
  const blocks = docs.map((d) => {
    const head = `# ${d.id} — ${d.title}`
    const flag = d.status === 'superseded' ? `\nSUPERSEDED by ${d.supersededBy ?? 'unknown'}` : ''
    const meta = [
      `type: ${d.type}`,
      d.tags.length > 0 ? `tags: ${d.tags.join(', ')}` : null,
      d.refs.length > 0 ? `refs: ${d.refs.join(', ')}` : null,
      d.links.length > 0 ? `links: ${d.links.join(', ')}` : null,
      `path: ${d.path}`,
    ]
      .filter((l): l is string => l !== null)
      .join('\n')
    return `${head}${flag}\n${meta}\n\n${d.body.trim()}\n`
  })
  return `${blocks.join('\n---\n\n')}`
}
