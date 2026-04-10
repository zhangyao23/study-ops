# study-ops specification

## Goal

Deliver a local CLI for task tracking and daily review generation.

- SQLite stores tasks, state transitions, recurring task lineage, and review rows.
- Markdown review files remain simple enough to read directly.
- Review output also acts as a stable explicit sync source for `research-vault`.

## Commands

- `add --title <title> [--project <name>] [--due <date>] [--priority low|medium|high] [--repeat daily|weekly|monthly]`
- `list [--project <name>] [--status open|done|archived]`
- `today`
- `next`
- `done <id>`
- `archive <id>`
- `reschedule <id> --due <date>`
- `review [--date <yyyy-mm-dd>]`
- `stats`

## Review contract

- Review file path is fixed as `artifacts/outputs/review-YYYY-MM-DD.md`.
- Re-running `review` for the same day updates the same file.
- Frontmatter fields are fixed: `kind`, `review_date`, `source_project`, `completed_count`, `rescheduled_count`, `unfinished_count`.
- Body sections remain `Completed`, `Rescheduled`, and `Unfinished`.
- `review` does not push or copy files into `research-vault`; sync remains explicit on the consumer side.

## State Flow

- New tasks start as `open`.
- `done` marks the task complete and spawns the next task when a repeat rule exists.
- `archive` only accepts `done` tasks.
- Hard delete is still not exposed.