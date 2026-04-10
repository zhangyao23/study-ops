# study-ops

`study-ops` 是一个纯本地任务与复盘 CLI。它把任务、状态流转和每日复盘存到 `data/processed/study-ops.db`，并把每日复盘 Markdown 输出到 `artifacts/outputs/`。

## 特点

- 纯本地，离线可用
- 任务默认只允许完成、延期和复盘，不提供硬删除命令
- `today` 聚焦当天到期与高优先级未完成任务
- `next` 只给一个当前最值得先做的任务
- `review` 生成可导入 `research-vault` 的 Markdown 复盘文件

## 命令

```powershell
node --no-warnings src/index.js add --title "Write review" --project research-vault --due 2026-04-10 --priority high
node --no-warnings src/index.js list --status open
node --no-warnings src/index.js today
node --no-warnings src/index.js next
node --no-warnings src/index.js done 1
node --no-warnings src/index.js reschedule 2 --due 2026-04-12
node --no-warnings src/index.js review --date 2026-04-10
node --no-warnings src/index.js stats
```

## 目录

- `src/store/`: SQLite 存储与状态流转
- `src/render/`: 复盘 Markdown 渲染
- `src/commands/`: CLI 命令
- `data/processed/`: 本地数据库
- `artifacts/outputs/`: 每日复盘 Markdown 输出

## 测试

```powershell
node --no-warnings tests/run-tests.js
```

## 工作方式

1. 用 `add` 记录任务
2. 用 `today` 和 `next` 缩小当前焦点
3. 用 `done` 和 `reschedule` 维护状态
4. 用 `review` 生成每日复盘
5. 用 `stats` 快速看项目和优先级分布

## 说明

`node:sqlite` 在 Node 22 中仍会提示实验特性，所以示例命令默认带 `--no-warnings`，不影响本地使用。