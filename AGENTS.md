# AGENTS.md

## 项目目标与当前阶段

- 项目名：`study-ops`
- 当前目标：交付可长期使用的本地任务/复盘 CLI
- 当前阶段：成品化第一版，重点在本地可用、状态流转清晰、复盘输出稳定

## 当前默认产出物

- `data/processed/study-ops.db`：任务、事件、复盘索引
- `artifacts/outputs/review-YYYY-MM-DD.md`：每日复盘 Markdown
- `artifacts/logs/`：后台任务或调试日志

## 目录职责说明

- `src/commands/`：CLI 命令入口
- `src/store/`：SQLite 与状态流转逻辑
- `src/render/`：复盘 Markdown 渲染
- `data/raw/`、`data/external/`：默认只读输入区
- `data/processed/`：数据库与派生状态
- `.tmp/`：临时测试与调试文件

## 当前允许修改的目录

- `src/`
- `tests/`
- `docs/`
- `scripts/`
- `data/processed/`
- `artifacts/`
- `.tmp/`

## 高风险操作确认规则

以下操作必须先确认：

- 删除数据库、复盘文件或任务快照
- 覆盖 `data/raw/`、`data/external/` 内输入
- 写出项目目录之外的路径
- 修改共享模板或其他兄弟项目

## 运行与日志约定

- 长任务默认写日志到 `artifacts/logs/`
- 复盘输出统一写入 `artifacts/outputs/`
- 不把数据库或临时状态散落到项目根目录

## 关键文件登记

- `src/cli.js`
- `src/store/db.js`
- `src/store/tasks.js`
- `src/render/review.js`
- `tests/run-tests.js`

## 更新日志

- 2026-04-10：由 `project-seeder` 骨架补成任务与复盘 CLI