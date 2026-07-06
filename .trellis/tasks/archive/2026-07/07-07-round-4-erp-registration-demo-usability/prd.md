# ERP registration and demo usability

## Goal

复查 ERP 的生产注册、登录和演示可用性，确保访客不会因为注册入口缺失而无法理解系统，同时保证默认角色、滥用防护和公开状态说明安全。

## Confirmed Facts

- ERP 仓库 `D:\workspace4Cursor\erp` 采用 npm workspaces，主要包含 `apps/api`、`apps/web`、`apps/extension` 和共享包。
- `apps/api/src/lib/runtime.ts` 中 `isSelfRegistrationEnabled()` 在未设置 `ERP_REGISTRATION_ENABLED` 时默认返回 `true`，显式 `0/false/no/off` 或未知值会关闭注册。
- `apps/api/src/routes/auth.ts` 中 `/api/auth/bootstrap` 会返回 `needsSetup` 和 `registrationEnabled`，`/api/auth/register` 在已有 Owner 后创建 `operator` 用户。
- `apps/api/src/routes/auth.registration.test.ts` 和 `apps/api/src/lib/runtime.test.ts` 已覆盖“生产默认开放注册”“显式关闭注册”“新用户默认 operator”。
- `apps/web/src/router/index.ts` 已存在 `/login` 和 `/register` 公共路由；`apps/web/src/views/LoginView.vue` 会根据 bootstrap 的 `registrationEnabled` 显示登录/注册切换或受控登录说明。
- 主站已有 `npm.cmd run erp:synthetic`；本轮通过公开 ERP API origin 生成了 health 与 bootstrap 证据，并确认无配置运行会保留既有报告。

## Requirements

- 进入 `D:\workspace4Cursor\erp` 前先读取本地规则和脚本。
- 检查注册开关、bootstrap 响应、登录/注册 UI、默认角色和演示路径。
- 如需生产环境变量或重启，只记录 manual gate。
- 主站项目页/状态页要同步真实 ERP 状态。
- 优先补可重复验证的公开检查；如果不能从本地获得生产 API base、demo 账号或平台日志，不猜测生产状态。
- 不把真实管理员账号、不可回收密码、部署后台 URL、数据库连接串或云平台配置写入公开页面、状态 JSON 或文档。

## Acceptance Criteria

- [x] 明确当前生产注册是否开放及证据。
  - 证据：`npm.cmd run erp:synthetic` 在公开 ERP API origin 上确认 `/api/health` 为 `online`，`/api/auth/bootstrap` 返回 `registrationEnabled=true`，生成 `public/status/erp-synthetic.json`。
- [x] 如果可本地修复注册/登录 UI 或文案，完成并验证。
  - 代码检查显示 ERP 前端已有 `/register` 路由和登录/注册切换；本轮无需重写 UI。主站状态说明已更新为“生产注册已确认开放，登录/插件 smoke 仍需低权限凭据或脱敏 fixture”。
- [x] 运行 ERP 项目内最小相关验证和主站 `erp:synthetic`。
  - ERP：`npm.cmd run test --workspace @erp/api -- auth.registration runtime` 通过，`npm.cmd run build --workspace @erp/web` 通过。
  - 主站：`npm.cmd run erp:synthetic` 通过，`npm.cmd run site:status -- --timeout 20000` 已更新聚合状态。
- [x] 不公开真实管理员账号或不可回收密码。
  - 未写入真实账号、密码、数据库 URL、店铺凭据或平台后台信息；登录 smoke 保持 `unchecked`，等待低权限 demo 凭据。
