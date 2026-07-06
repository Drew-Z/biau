# Round 5 Pet APK showcase gate followup

## Goal

复查 `D:\workspace4Cursor\pet` 与主站 Pet 展示/状态页之间的 APK 发布门禁：确认当前只展示工作进展，不误公开 debug APK；实现一个本地可验证的检查或状态契约增强，让后续正式 APK 发布必须具备签名包、校验摘要、版本说明、扫描/回归证据和人工批准。

## Requirements

- R1. 进入 Pet 项目前先读取它自己的 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules`、README、构建脚本和 git 状态。
- R2. 不公开未批准 APK 直接下载链接，不提交签名文件、签名路径、私有 bucket、真实账号或 token。
- R3. 如果只发现 debug APK，状态必须保持 gated / unchecked / planned，不能写成正式发布。
- R4. 优先做本地可验证改进：APK gate 检查、展示页下载占位、状态说明、release checklist 或 synthetic 契约。
- R5. 正式 APK/AAB、签名、SHA-256、扫描、回归和上线批准都记录为人工 gate。

## Acceptance Criteria

- [x] 读取 Pet 项目规则、README、脚本和 git 状态。
- [x] 确认当前 APK 产物与展示页状态。
- [x] 完成一个本地可验证的 APK/showcase gate 改进。
- [x] 运行 Pet 或主站相关验证。
- [ ] 提交并推送 `blog-semi`；Pet 仓库只在安全且符合规则时提交/推送。

## Notes

- 当前默认不发布 APK，只把公开条件和验证边界收紧。
