# ERP synthetic reliability check

## Goal

把 `/status` 中 Ozon ERP 的关键可靠性检查从纯 `planned` 推进到可运行的低敏 synthetic 检查：公开 health 和注册策略可无凭据检测；登录检查在提供环境变量凭据时执行；结果写入公开状态 JSON，但不保存 API base、账号、密码、token、业务数据或私有后台细节。

## Evidence

- `D:\workspace4Cursor\erp\apps\api\src\server.ts`：
  - `GET /api/health` 公开返回 `status`、`adapter`、`nodeEnv`、`extensionVersion`、`gitCommit`、`runtimeMarker`、`runtimeStartedAt`。
  - `app.use("/api/auth", authRouter)` 暴露 auth bootstrap/login/register/refresh。
- `D:\workspace4Cursor\erp\apps\api\src\routes\auth.ts`：
  - `GET /api/auth/bootstrap` 返回 `needsSetup` 和 `registrationEnabled`。
  - `POST /api/auth/login` 返回 token、refreshToken 和 user。
  - `POST /api/auth/register` 受 `isRegistrationEnabled()` 控制；已有 Owner 后新账号默认 `operator`。
- `D:\workspace4Cursor\erp\apps\api\src\lib\runtime.ts`：
  - 生产环境未显式设置 `ERP_REGISTRATION_ENABLED` 时自助注册关闭。
  - 显式 `1/true/yes/on` 开启，`0/false/no/off` 或未知值关闭。

## Requirements

- 新增 `blog-semi` 脚本，不修改 ERP 生产部署。
- 不写死任何 ERP API base URL；缺少 `ERP_SYNTHETIC_API_BASE_URL` 时所有 live checks 显示 `unchecked`。
- 支持环境变量：
  - `ERP_SYNTHETIC_API_BASE_URL`。
  - `ERP_SYNTHETIC_USERNAME`。
  - `ERP_SYNTHETIC_PASSWORD`。
  - `ERP_SYNTHETIC_TIMEOUT_MS`。
- 默认无凭据时只检查 health 与 `/api/auth/bootstrap` 注册策略，不执行登录，不创建账号。
- 提供凭据时执行登录 smoke，只验证返回 token/user role 结构；不持久化 token。
- 输出文件为 `public/status/erp-synthetic.json`，只包含低敏状态、HTTP status、耗时、checkedAt 和 issue 摘要。
- `scripts/generate-site-status.ts` 读取该 JSON，如果存在且格式有效，就把 Ozon ERP 对应 check 状态从 `planned` 合并为 `online`、`degraded`、`offline` 或 `unchecked`。
- 不把真实凭据、token、店铺信息、SKU、订单/商品指标、生产部署细节或私有后台信息写入仓库。
- 生成脚本保持串行请求，不制造高并发。

## Out of Scope

- 不在本子任务中创建真实 ERP 用户。
- 不在本子任务中开启或修改生产自助注册。
- 不在本子任务中公开 demo 账号或密码。
- 不在本子任务中接入 CI、定时任务、告警或 Prometheus scrape。
- 不在本子任务中修改 ERP 仓库代码。

## Acceptance Criteria

- [x] 新增 `npm` script 可运行 ERP synthetic check。
- [x] 缺少 API base 时生成 `unchecked` 报告。
- [x] 提供 API base 但无凭据时，脚本至少尝试 health 和注册策略检查，登录相关项显示 `unchecked`。
- [x] 提供凭据时，脚本能串行尝试登录并验证低敏结构。
- [x] `/status` 生成脚本能合并 `public/status/erp-synthetic.json`。
- [x] `/status` 页面无需额外改动即可展示合并后的状态和证据。
- [x] 文档或任务记录说明 env 使用方式和安全边界。
- [x] 通过验证：`npm.cmd run erp:synthetic`、`npm.cmd run site:status`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 提交前完成 `git diff --check` 和敏感扫描。
