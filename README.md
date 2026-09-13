# project-memory

A local CLI that stores your repository's business knowledge — the *why*
behind the code — as plain Markdown, and serves it to AI coding agents as
structured context.

## Install

```sh
npm install -g project-memory
```

Requires Node.js 20 or later. No runtime dependencies — `pm` ships as a
single bundled file.

## Quick start

```sh
pm init                              # create .project-memory/ in this repo
pm skill install --target claude     # teach the agent the protocol

# write a rule as a stub: pm prints the path, you fill the body in
pm add rule --title "Refunds require manager approval over $500" --source "support ticket #4821" --stub

pm context "refund approval"         # ask: what do I need to know about this?
pm validate                          # check frontmatter, ids, links, supersession
```

`--title` is required, and `--source` is required for rules and decisions.

## Example: `pm context`

Given a rule document with a real body (`pm add rule --title "Refunds
require manager approval over $500" --source "support ticket #4821" --body
"..."`), asking for context returns:

```
$ pm context "refund approval"
# Business context: refund approval

## Rules

### rule-refunds-require-manager-approval-over-500 — Refunds require manager approval over $500
Any refund over $500 must be approved by a shift manager before it is issued. Refunds at or under $500 can be processed directly by support agents.

1 docs · 1 matched · 1 shown · 0 truncated · ~89 tokens
```

The output is plain text sized to a token budget (`--max-tokens`), so an
agent can paste it straight into a prompt.

## What goes in git

`pm init` creates `.project-memory/` with one subfolder per document type
(`rules/`, `decisions/`, `flows/`, `features/`) plus `SKILL.md`, the agent
protocol file. Everything there is meant to be committed:

- `.project-memory/**/*.md` — the knowledge documents themselves
- `.project-memory/SKILL.md` — instructions an agent reads before acting
- `.project-memory/.gitattributes` — normalizes line endings for the docs

One file is generated and **not** meant to be committed:

- `.project-memory/index.json` — a rebuildable search cache (ignored via a
  generated `.project-memory/.gitignore`; rebuild it any time with `pm
  index`)

## Commands

`init`, `add`, `update`, `show`, `path`, `list`, `search`, `context`,
`validate`, `index`, `skill install` — run `pm help` for a summary or `pm
help --json` for the machine-readable spec (also read by `pm --json` on any
command).

## Design

The full design rationale — problem statement, document model, and the
Markdown-as-database approach — lives in
`docs/specs/2026-09-12-project-memory-design.md` in this repository.

## License

GNU General Public License v3.0 or later. See [LICENSE](LICENSE).

Running `pm` on your repository does not place your code, your documents, or
anything `pm` writes under the GPL — executing a program is not distributing
it, and a program's output is not a derivative work of the program. The
copyleft applies if you distribute a modified `pm`, or link its modules into a
program you distribute.
