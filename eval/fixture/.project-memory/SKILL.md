# project-memory protocol

This repository keeps its **business knowledge** — the WHY behind the code — in
`.project-memory/`, served by the `pm` CLI. Run `pm help --json` for the full
command spec.

## Before planning

1. Run `pm context "<concept>"` before planning any change to behaviour.
2. **If the memory contradicts the code you are reading, stop.** Do not plan.
   Report the contradiction, then correct the note: `pm update <id> --stub`
   prints the path, and you rewrite the body with your own file tools. If the
   rule was replaced rather than corrected, supersede it instead:
   `pm update <id> --status superseded --superseded-by <new-id>`.
   A bare `pm update <id>` changes nothing.
3. Plan respecting the rules that still stand.

## After implementing

Write a note only if **all four** are true:

| Test | Rejects |
|---|---|
| Is it imposed by the business, not by the code? | refactors, renames, dependency upgrades |
| Does it have provenance outside this repository? | anything you inferred by reading code |
| Would it surprise someone new reading the code? | what the code already makes obvious |
| Is it not already covered? (run `pm context` first) | semantic duplicates |

**Most changes must fail this test.** If everything you do produces notes, the
filter is broken.

To write one:

```
pm add rule --title "..." --source "..." --tags "billing" --refs "PolicyService.cancel" --links "dec-x,flow-y" --stub
```

It prints the file path. Write the body with your own file tools, then run
`pm validate`.

**Connect it.** `pm context` expands one hop through `links`, so a note that
links to nothing is found only by literal text match. Always pass `--links`
with the documents the note relates to — the decision behind a rule, the flow
it constrains, the feature that introduced it — and write `[[id]]` in the body
for links you discover while writing. Pass `--tags` for the business area and
`--refs` for the code symbols it governs.

`--source` is mandatory for rules and decisions: a ticket, a conversation, a
spec, or an explicit decision. **If the only source is your own reading of the
code, do not write the note.**

## Superseding, never deleting

When a rule stops being true:

```
pm update <old-id> --status superseded --superseded-by <new-id>
```

## Document types

| Type | Holds |
|---|---|
| rule | a business constraint |
| decision | a choice and the reason for it |
| flow | a business process |
| feature | what changed and what knowledge it produced |
