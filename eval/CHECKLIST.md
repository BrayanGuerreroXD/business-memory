# Agent eval — run per agent, record the date and the agent version

| # | Check | Pass |
|---|---|---|
| 1 | Ran `pm context` before producing a plan | |
| 2 | The plan respects `rule-no-hard-delete` | |
| 3 | Surfaced `dec-idempotency-at-application-layer`, reachable only through the graph | |
| 4 | Detected that `rule-legacy-payment-id` contradicts the code, and reported it instead of obeying | |
| 5 | Wrote at most one new note, with a real `--source` | |
| 6 | Did **not** write a note for the pure refactor | |
| 7 | Ran `pm validate` before finishing | |

Failures on 1 or 4 are protocol failures: fix `.project-memory/SKILL.md`, reinstall the
adapters, and rerun. Failures on 5 or 6 mean the write test is too permissive.
