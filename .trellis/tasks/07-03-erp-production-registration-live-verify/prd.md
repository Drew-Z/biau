# ERP 生产注册线上验证与主站同步

## Goal

确认 ERP 生产注册不只是代码侧已开放，而是在线上入口真实可用，并把主站展示与状态页同步到准确状态。

## Requirements

- 检查 ERP 代码侧事实：
  - 生产普通自助注册默认开放。
  - 已有 Owner 后，新注册用户默认是 `operator`。
  - `ERP_REGISTRATION_ENABLED=0/false/no/off` 或未知/空值会关闭注册。
- 检查线上事实：
  - 部署分支是否包含最新注册开放提交。
  - 登录页是否出现注册入口。
  - `/api/auth/bootstrap` 是否返回 `registrationEnabled`。
  - 新注册账号能否登录，权限是否不是 Owner。
- 不提交生产账号密码、JWT secret、数据库连接或 HidenCloud 私有配置。
- 若需要用户手动配置平台环境变量，写清变量含义和安全值。

## Acceptance Criteria

- [ ] 记录 ERP 当前线上注册状态：open、closed-by-env、deploy-stale、blocked 或 unchecked。
- [ ] 如线上关闭，能判断是环境变量关闭、部署分支落后、API 不可达，还是前端路由问题。
- [ ] 如线上开放，验证新账号默认权限安全，不自动获得 Owner。
- [ ] 主站 ERP 项目详情和状态页与线上事实一致。
- [ ] synthetic 检查或手动验证步骤可以复现。

## Notes

- 推荐第一步：确认 ERP 部署平台监听的分支。当前本地最新工作在 `codex/ozon-plugin-parity`，需要确认线上是否已经使用包含注册开放提交的分支。
