# AGENTS.md

## Project Goal And Stage
- Project: `study-ops`
- Goal: deliver a durable local task and review CLI
- Stage: third round, focused on stable daily review output for explicit downstream sync

## Default Outputs
- `data/processed/study-ops.db`: tasks, events, and review metadata
- `artifacts/outputs/review-YYYY-MM-DD.md`: daily review Markdown
- `artifacts/logs/`: local logs for longer runs when needed

## Directory Responsibilities
- `src/commands/`: CLI command entry points
- `src/store/`: SQLite access, task transitions, recurring tasks, and review generation
- `src/render/`: Markdown rendering for reviews
- `data/raw/` and `data/external/`: read-only inputs by default
- `data/processed/`: local database and derived state
- `.tmp/`: disposable local scratch files

## Allowed Modifications
- Normal work may edit `src/`, `tests/`, `docs/`, `artifacts/outputs/`, `data/processed/`, and `.tmp/`
- Re-generating a daily review may overwrite the same `review-YYYY-MM-DD.md` file inside this project only

## High-Risk Confirmation Rules
Confirm before:
- deleting the database, review files, or archived outputs
- overwriting `data/raw/` or `data/external/`
- writing outside this project root
- changing shared templates or sibling projects

## Run And Logging Rules
- Long-running jobs stay inside this project and log into `artifacts/logs/` when needed
- `review` is a producer only; it does not auto-push into other projects
- Daily review frontmatter must stay machine-readable and stable for downstream sync

## Key Files
- `src/cli.js`
- `src/store/tasks.js`
- `src/render/review.js`
- `tests/run-tests.js`

## Update Log
- 2026-04-10: stabilized daily review frontmatter and same-day overwrite behavior for explicit sync consumers