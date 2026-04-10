# study-ops

`study-ops` is a local task and daily review CLI.

It stores tasks, events, and review metadata in `data/processed/study-ops.db`, then writes daily review Markdown into `artifacts/outputs/`.

## Current workflow

- `add`, `done`, `reschedule`, and `archive` manage a conservative task lifecycle.
- `today` and `next` compress the current queue.
- `review` writes a stable daily Markdown file that can be consumed by `research-vault`.
- Re-running `review` for the same date overwrites the same file path.

## Review output contract

Every review file now starts with fixed frontmatter:

```yaml
---
kind: study-review
review_date: 2026-04-10
source_project: study-ops
completed_count: 1
rescheduled_count: 0
unfinished_count: 2
---
```

The body keeps the same human-readable sections:

- `Completed`
- `Rescheduled`
- `Unfinished`

## Commands

```powershell
node --no-warnings src/index.js add --title "Weekly planning" --due 2026-04-11 --repeat weekly
node --no-warnings src/index.js done 3
node --no-warnings src/index.js archive 3
node --no-warnings src/index.js list --status archived
node --no-warnings src/index.js review --date 2026-04-10
```

## Tests

```powershell
node --no-warnings tests/run-tests.js
```