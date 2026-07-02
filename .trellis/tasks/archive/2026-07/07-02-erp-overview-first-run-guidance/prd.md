# ERP 概览首次引导

## Goal

在 `D:/workspace4Cursor/erp` 的 ERP 登录后概览页增加轻量首次引导：展示当前用户与角色上下文、说明注册/权限边界，并给出下一步推荐路径，帮助内部小伙伴登录后更快知道该先配置什么、查看什么、如何进入核心流程。

## User Value

- 登录后不只看到指标卡，也能理解“当前账号是谁、处于什么角色、接下来做什么”。
- 新接手或旁边协作的小伙伴可以从概览页进入店铺配置、插件下载、商品同步和上架记录，而不需要猜导航。
- 保持生产自助注册关闭策略不变，只在页面上做公开安全的解释和引导。

## Confirmed Facts

- ERP 仓库当前分支为 `codex/ozon-plugin-parity`，工作树干净。
- `apps/web/src/views/OverviewView.vue` 已有概览头部、指标卡、常用功能和更新通知。
- `apps/web/src/stores/auth.ts` 已持久化 `user`，包含 `username`、`role`、`vipLevel`、`beans` 等字段。
- `apps/web/src/views/LoginView.vue` 和后端 auth 已处理 owner 初始化、自助注册 gate 和注册关闭说明；本任务不改变这些行为。
- `apps/web/src/router/index.ts` 会让已登录用户进入 `/overview`，未登录用户回到 `/login`。

## Requirements

1. 在 ERP 概览页增加一个低噪声的登录后引导区域，使用现有 auth store 的 `user` / `role` 信息。
2. 引导内容应覆盖：
   - 当前登录账号与角色。
   - Owner / 管理者负责店铺凭据、插件发布和关键配置。
   - 普通协作者应优先使用已配置好的同步、上架记录和工具流程。
   - 生产自助注册仍是人工 gate，页面不得诱导用户开启或绕过注册限制。
3. 推荐路径应复用现有路由，不添加未实现入口：
   - 店铺配置 `/shops`
   - 插件下载使用现有 `erpRelease.pluginDownloadUrl`
   - 同步 Seller 商品 `/products`
   - 上架记录 `/product/import-history`
4. 不写入真实账号、密钥、生产地址、数据库连接串、私有后台细节或未确认公开的部署信息。
5. 不修改后端鉴权、注册开关、角色权限或路由守卫行为。

## Acceptance Criteria

- [x] `/overview` 能展示当前账号名和角色；无用户信息时也有安全 fallback。
- [x] `/overview` 提供清晰的推荐下一步入口，且全部指向现有路由或现有插件下载 URL。
- [x] 页面文案明确生产自助注册不是默认开放能力，不承诺未实现 RBAC。
- [x] 桌面和移动端布局不破坏现有指标卡、常用功能和更新通知。
- [x] ERP 最小相关验证通过，至少运行 root `npm.cmd run build` 和 `npm.cmd run test`，如失败需记录是否为本任务引入。
- [x] 提交前运行 `git diff --check` 和变更文件敏感信息扫描。

## Validation

- ERP commit: `6b91b1a feat: add ERP overview first-run guidance` on `D:/workspace4Cursor/erp` branch `codex/ozon-plugin-parity`.
- ERP push: `origin/codex/ozon-plugin-parity` updated successfully.
- `npm.cmd run build` passed from ERP repo root. The existing build flow rebuilt extension output and synced the extension zip as part of current scripts; no tracked build artifact changed.
- `npm.cmd run test` passed from ERP repo root: API `17` test files / `149` tests, shared `2` test files / `4` tests.
- `git diff --check` passed.
- Sensitive-info scan over `apps/web/src/views/OverviewView.vue` found no matches after replacing UI wording with "接口凭据".

## Out Of Scope

- 不开启 `ERP_REGISTRATION_ENABLED` 或任何生产自助注册行为。
- 不新增后端权限系统或角色拦截逻辑。
- 不修改部署脚本、真实发布流程或插件包内容。
- 不改动 `blog-semi` 主站公开 ERP 项目详情页内容。
