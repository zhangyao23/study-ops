# study-ops specification

## Goal

交付一个纯本地任务与复盘 CLI：SQLite 负责任务、事件和复盘索引，Markdown 负责每日复盘导出；第二轮补归档与周期任务。

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

## State flow

- 默认新任务为 `open`
- `done` 将任务标记完成；若任务带 `repeat_rule`，同时生成下一条 `open` 任务
- `archive` 只允许处理 `done` 任务
- 当前版本仍不暴露硬删除