# ERP 注册开关文档一致性修复

## Goal

修复 ERP 交接/部署文档中关于自助注册开关的过时说明，让接手人看到的账号创建流程与当前代码、测试、README 和 GitHub 部署文档保持一致，避免误以为生产环境默认开放普通注册。

## Requirements

- 本任务只修改 ERP 文档，不改运行代码、不部署、不改变生产环境变量。
- 文档必须统一表达当前实现：
  - 本地非生产环境在未设置 `ERP_REGISTRATION_ENABLED` 时默认开放普通自助注册。
  - `NODE_ENV=production` 且未设置 `ERP_REGISTRATION_ENABLED` 时默认关闭普通自助注册。
  - 只有 `1` / `true` / `yes` / `on` 显式开启普通自助注册。
  - `0` / `false` / `no` / `off`、空值和未知值都按关闭处理。
  - 空数据库首次 Owner 创建仍通过登录页的 bootstrap 流程开放，不等同于普通自助注册。
- 修复已发现的冲突说明：
  - `docs/hidencloud-deploy.md` 当前写着“自助注册默认开放；如需关闭...”，与生产默认关闭不一致。
  - `docs/handoff-2026-06-04.md` 当前只写“已有 Owner 后，可以在登录页注册普通账号...”和“如需关闭自助注册...”，没有说明生产默认关闭与显式开启白名单。
- 保留人工审核 gate：是否开启 ERP 生产自助注册仍必须由用户单独决定，本任务不得默认开放。
- 不写入账号、密钥、数据库连接串、SFTP 密码或新的私有生产细节。

## Evidence

- `apps/api/src/lib/runtime.ts`: `isSelfRegistrationEnabled()` 对 `ERP_REGISTRATION_ENABLED` 做白名单解析，未知值关闭，未设置时返回 `!isProductionRuntime()`。
- `apps/api/src/lib/runtime.test.ts`: 覆盖本地默认开放、生产默认关闭、显式开启值、显式关闭/未知值关闭。
- `README.md:45-48`: 已说明生产环境默认关闭普通自助注册和显式开启/关闭值。
- `docs/hidencloud-github-deploy.md:154`: 已说明生产默认关闭、bootstrap 不受普通注册开关等当前行为。
- `docs/hidencloud-deploy.md:47` 与 `docs/handoff-2026-06-04.md:116-118`: 存在需要同步的旧说法。

## Out of Scope

- 开启或关闭线上 HidenCloud 的真实 `ERP_REGISTRATION_ENABLED`。
- 新增账号管理功能、邀请注册、Owner 后台创建成员或登录 UI 重构。
- 修改 API 行为、测试逻辑或部署流程。

## Acceptance Criteria

- [x] `docs/hidencloud-deploy.md` 不再声称生产/容器云自助注册默认开放，并明确生产默认关闭、显式开启值、关闭/未知值处理和 Owner bootstrap 边界。
- [x] `docs/handoff-2026-06-04.md` 的账号创建说明与 README/current runtime 一致，不误导接手人以为已有 Owner 后生产普通注册默认可用。
- [x] 敏感信息扫描没有新增真实密钥、密码、token、数据库连接串或未确认公开的私有地址。
- [x] docs-only 验证通过：`git diff --check` 以及针对 `ERP_REGISTRATION_ENABLED` / 自助注册说明的一致性 grep 检查。

## Validation

- `git diff --name-only HEAD`: 仅 `docs/handoff-2026-06-04.md`、`docs/hidencloud-deploy.md`。
- `git diff --check`: 通过；仅显示 Windows 换行提示，无空白错误。
- `rg -n "自助注册默认开放|如需关闭自助注册，在运行环境里设置|已有 Owner 后，可以在登录页注册普通账号或直接登录" docs\hidencloud-deploy.md docs\handoff-2026-06-04.md`: 无匹配。
- `git diff --unified=0 -- docs\hidencloud-deploy.md docs\handoff-2026-06-04.md | Select-String ...`: 新增行未命中敏感信息模式；git 仅输出既有换行提示。
- `npm.cmd test --workspace @erp/api -- runtime`: 1 个测试文件、4 个用例通过。

## Notes

- 该任务为轻量 docs-only 子任务，PRD-only 足够；不需要 `design.md` / `implement.md`。
