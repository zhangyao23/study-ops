# study-ops specification

## Goal

交付一个纯本地任务与复盘 CLI：SQLite 负责任务、事件和复盘索引，Markdown 负责每日复盘导出。

## Storage

- SQLite: `data/processed/study-ops.db`
- Review output: `artifacts/outputs/review-YYYY-MM-DD.md`
- 不提供硬删除命令

## Commands

- `add --title <title> [--project <name>] [--due <date>] [--priority low|medium|high]`
- `list [--project <name>] [--status open|done]`
- `today`
- `next`
- `done <id>`
- `reschedule <id> --due <date>`
- `review [--date <yyyy-mm-dd>]`
- `stats`

## Safety

- 所有输出留在当前项目目录
- 任务默认只能完成、延期、归档，当前版本不暴露硬删除
- 长任务日志写入 `artifacts/logs/`
- 不覆盖 `data/raw/` 与 `data/external/`