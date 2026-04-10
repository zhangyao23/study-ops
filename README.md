# study-ops

`study-ops` 是一个纯本地任务与复盘 CLI。它把任务、状态流转和每日复盘存到 `data/processed/study-ops.db`，并把复盘 Markdown 输出到 `artifacts/outputs/`。

## 第二轮能力

- `archive <id>` 归档已完成任务
- `add --repeat daily|weekly|monthly` 创建周期任务
- `done <id>` 自动续出下一条周期任务
- `list --status archived` 可以单独回看归档任务

## 命令

```powershell
node --no-warnings src/index.js add --title "Weekly planning" --due 2026-04-11 --repeat weekly
node --no-warnings src/index.js done 3
node --no-warnings src/index.js archive 3
node --no-warnings src/index.js list --status archived
node --no-warnings src/index.js review --date 2026-04-10
```

## 测试

```powershell
node --no-warnings tests/run-tests.js
```