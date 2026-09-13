# Agent eval results

Status: **PENDING**. No runs have been recorded yet.

Spec section 17, criterion 8 requires the checklist in `eval/CHECKLIST.md` to
pass all seven checks on at least two distinct agents before V1 can be
considered accepted. Performing that run requires a human to drive an actual
coding agent (Claude Code, Codex, etc.) interactively against
`eval/fixture/` with the prompt in `eval/TASK.md`, and to transcribe the
outcome of each checklist row here. That could not be done as part of this
task: this session has no way to drive a second agent interactively, and
fabricating a result would defeat the entire purpose of the eval.

**Whoever picks this up next must:**

1. Copy `eval/fixture/` to a scratch location (or use it in place) as the
   agent's working directory.
2. Run `pm skill install --target <agent>` there so the agent's protocol
   adapter is actually installed (`.claude/skills/project-memory/SKILL.md`
   for Claude, the `AGENTS.md` block for Codex/OpenCode).
3. Give the agent the exact contents of `eval/TASK.md` as its task, with no
   further hints.
4. Walk `eval/CHECKLIST.md` against the transcript and fill in one row below
   per agent run.

## Runs

| Date | Agent | Version | 1. Ran `pm context` first | 2. Respected `rule-no-hard-delete` | 3. Surfaced `dec-idempotency-at-application-layer` | 4. Reported the `rule-legacy-payment-id` contradiction | 5. At most one note, real `--source` | 6. No note for the pure refactor | 7. Ran `pm validate` before finishing | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | |
| | | | | | | | | | | |

Fill in Pass / Fail per cell. A run that fails check 1 or 4 is a protocol
failure — see the remediation note at the bottom of `eval/CHECKLIST.md`
before re-running.
