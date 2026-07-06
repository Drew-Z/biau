# Round 6 Playlab game showcase contract

## Goal

Inspect the game/Playlab workspace and improve public-safe main-site checks for playable entries, screenshots, titles, favicon, external links, or reliability status.

本任务目标是确保 BIAU Playlab / 游戏相关项目在主站上的公开展示和状态页表达可信：哪些入口能试玩，哪些只是项目案例，哪些需要外链/截图/移动端说明，不能把不可访问或未验证的试玩入口说成 online。

## Requirements

- R1. 读取 `D:\workspace4Cursor\game` 的本地规则、README、脚本和 git 状态。
- R2. 检查 `blog-semi` 当前 Playlab/Game 项目详情、项目卡片、外链、状态目标和 `playlab:synthetic`。
- R3. 完成一个 public-safe、可本地验证的改进：优先选择状态契约、synthetic 规则、项目详情说明、链接目标或 UI 检查。
- R4. 不提交真实平台 token、私有后台、未公开构建产物、私有监控地址或本地绝对路径。
- R5. 不做破坏性 git 操作；关联仓库有脏文件时先识别并避免覆盖。

## Acceptance Criteria

- [x] 已读取 Game/Playlab 项目规则、README、脚本和 git 状态。
- [x] 已确认主站当前 Playlab/Game 展示/status/synthetic 语义。
- [x] 完成一个 public-safe、可本地验证的 Playlab/Game gate 或展示改进。
- [x] 相关验证通过，并记录不能自动处理的人工 gate。
- [ ] 提交并推送 `blog-semi`；关联仓库只有在符合仓库规则且 diff 安全时才提交/推送。

## Notes

- 本任务不要求重做游戏本体；主线是公开展示和可靠性观察的真实性。
- `D:\workspace4Cursor\game` 是聚合目录，不是 git 仓库；`blog`、`space-war`、`raiden-prototype` 是独立干净仓库，本轮只读取上下文，没有修改。
