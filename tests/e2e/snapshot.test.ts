import { describe, expect, test, afterEach } from 'bun:test'
import { buildContext } from '../../src/query/context'
import { renderContext } from '../../src/render/context'
import { loadIndex } from '../../src/index/persist'
import { makeRepo, type Repo } from '../helpers/makeRepo'

const NOW = new Date('2026-09-12T00:00:00Z')
let repo: Repo | null = null
afterEach(() => {
  repo?.cleanup()
  repo = null
})

describe('context snapshot', () => {
  test('output is stable for a fixed corpus', () => {
    repo = makeRepo([
      { id: 'rule-open-claims-restriction', type: 'rule', title: 'Open claims restriction', tags: ['policies', 'cancellation'], links: ['dec-domain-validation'], created: '2026-08-01', body: 'A policy with an open claim cannot be manually cancelled.' },
      { id: 'rule-refund-on-cancel', type: 'rule', title: 'Refund on cancellation', tags: ['policies'], created: '2026-08-01', body: 'Cancelling within 30 days refunds the unused premium.' },
      { id: 'dec-domain-validation', type: 'decision', title: 'Domain validation', created: '2026-08-01', body: 'Cancellation validation belongs to the domain layer.' },
      { id: 'flow-policy-cancellation', type: 'flow', title: 'Policy cancellation flow', links: ['rule-open-claims-restriction'], created: '2026-08-01', body: 'Long flow description that must not appear in the output.' },
      { id: 'feature-431-policy-cancellation', type: 'feature', title: 'Feature 431: policy cancellation', links: ['rule-open-claims-restriction'], created: '2026-08-01', body: 'Long feature description that must not appear either.' },
      { id: 'rule-holiday-schedule', type: 'rule', title: 'Holiday schedule', created: '2026-08-01', body: 'Unrelated to policies.' },
    ])

    const out = renderContext(buildContext(loadIndex(repo.memRoot), 'policy cancellation'), NOW)

    expect(out).toMatchSnapshot()
    expect(out).not.toContain('must not appear')
    expect(out).not.toContain('Unrelated to policies')
  })
})
