# ERP 登录注册体验与自助注册 gate

## Goal

验证并补强 Ozon ERP 的登录/注册入口，确保现有 UI 与后端自助注册开关一致；生产环境不因为环境变量误写而意外开放注册。

## Requirements

- 不默认开启生产自助注册；是否开放生产注册仍是人工审核 gate。
- 先审计现有 `LoginView.vue`、`auth.ts` store、router、API auth route 和 runtime gate，不重复实现已经存在的 UI。
- 保持 Owner 首次初始化路径可用：系统没有 Owner 时继续通过 `/api/auth/bootstrap` 创建 Owner。
- 补强 `ERP_REGISTRATION_ENABLED` 的解析：
  - 明确开启值：`1`、`true`、`yes`、`on`。
  - 明确关闭值：`0`、`false`、`no`、`off`、空字符串。
  - 未知值按关闭处理，降低生产误配置风险。
- 更新或新增测试覆盖本地默认、生产默认、显式开启、显式关闭和未知值。
- 不读取或提交 `.env`、真实账号、密钥、连接串、Ozon 店铺凭据或私有部署信息。

## Acceptance Criteria

- [x] `ERP_REGISTRATION_ENABLED=false/off/no/空字符串/未知值` 不会开启自助注册。
- [x] `ERP_REGISTRATION_ENABLED=1/true/yes/on` 可以显式开启自助注册。
- [x] 现有 Owner bootstrap 与本地开发默认行为不被破坏。
- [x] 运行 ERP API 相关测试和必要构建命令。
- [x] 记录人工审核 gate：生产是否开放注册仍需用户明确决定。

## Notes

- 审计发现登录/注册 UI、`/register` 路由和服务端 registration gate 已存在，本任务聚焦误配置风险和验证补强。
- 代码改动发生在 `D:\workspace4Cursor\erp`，Trellis 跟踪记录保留在 BIAU Port 父任务下。
- 本轮修改 `apps/api/src/lib/runtime.ts`、`apps/api/src/lib/runtime.test.ts`、`README.md` 和 `docs/hidencloud-github-deploy.md`。
- 验证已运行：
  - `npm.cmd run test --workspace @erp/api -- src/lib/runtime.test.ts`
  - `npm.cmd run build --workspace @erp/api`
  - `npm.cmd run test --workspace @erp/api`
  - `git diff --check`
- 敏感扫描只命中文档中的占位变量名和已有公开 URL，没有发现真实密钥、连接串或私有账号。
- Human gate: 生产环境是否设置 `ERP_REGISTRATION_ENABLED=1/true/yes/on` 仍需用户明确决定；默认保持关闭。
