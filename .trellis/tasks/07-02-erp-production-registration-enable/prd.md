# ERP 生产真实注册开启

## Goal

在用户已明确批准的前提下，把 Ozon ERP 从“生产自助注册默认关闭”推进到“生产可以真实开放注册，但仍有明确安全边界、部署开关和回归证据”的状态。

## Confirmed Facts

- 用户在 2026-07-02 明确批准开启真实生产注册。
- `D:/workspace4Cursor/erp/apps/api/src/lib/runtime.ts` 已有 `ERP_REGISTRATION_ENABLED` 显式开关：
  - 生产环境默认关闭。
  - `1/true/yes/on` 显式开启。
  - 空值、false 或未知值关闭。
- `apps/api/src/routes/auth.ts` 已有 `/auth/register`：
  - 未开启时返回 403。
  - 第一个用户为 `owner`，已有 owner 后新注册用户为 `operator`。
  - 用户名唯一冲突返回 409。
  - 用户名和密码有基础校验。
  - 注册、登录、bootstrap 已有限流中间件。
- 前端 `LoginView.vue` 会读取 `/auth/bootstrap.registrationEnabled` 并显示注册/登录切换。

## Requirements

1. 不写入真实密码、账号、生产 URL、数据库连接串或部署凭据。
2. 在 ERP 仓库补注册路由测试，证明：
   - 生产默认关闭时 `/auth/register` 返回 403。
   - 生产显式开启且已有 owner 时，新用户注册为 `operator`。
   - 重复用户名返回 409。
3. 更新 ERP 文档/部署说明，明确生产开启方式为 `ERP_REGISTRATION_ENABLED=true`，并说明新注册用户默认 `operator`。
4. 更新 BIAU Port 主站 Ozon ERP 项目详情和助手知识，把“注册关闭”改成“用户已批准开启生产注册，待/已按部署开关开放”的准确表述。
5. 运行 ERP 和主站最小验证，提交并推送对应仓库。

## Acceptance Criteria

- [ ] ERP auth route 测试覆盖生产注册开关、operator 默认角色和重复用户名。
- [ ] ERP 文档说明真实生产注册开启方式与安全边界。
- [ ] 主站 ERP 项目详情/助手知识不再把生产注册描述为固定关闭。
- [ ] `erp` 相关测试、`npm.cmd run test --workspace @erp/api` 或等价最小验证通过。
- [ ] `blog-semi` 重新生成 assistant knowledge，并通过 `blog:check`、`lint`、`build`。
- [ ] 两仓库 `git diff --check` 与 changed-file sensitive scan 通过。

## Out Of Scope

- 不直接部署线上环境。
- 不公开真实 admin/owner 密码。
- 不修改生产数据库中的真实用户。
- 不把注册开放当成免审核权限提升；默认注册角色仍应是 `operator`。
