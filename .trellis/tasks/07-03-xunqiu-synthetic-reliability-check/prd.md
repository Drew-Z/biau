# Xunqiu synthetic reliability check

## Goal

把 `/status` 中寻球的后端可靠性从纯 `planned` 推进到可运行的低敏 synthetic 检查：可选配置后端 base URL 后检查 Spring health 和几个只读兼容 API；缺少配置时生成 `unchecked` 报告；不把真实后端地址、账号、token、APK 下载地址或业务数据写入仓库。

## Evidence

- `D:\workspace4Codex\xunqiu-backend-modern\src\test\java\com\playlab\xunqiu\backend\api\CompatibilityApiTest.java`：
  - `GET /actuator/health` 返回 `{"status":"UP"}`。
  - `GET /apis/tweet/upToDateList?login_user_id=1&count=10` 使用旧版 envelope，`status=0` 且 `datas` 有动态内容。
  - `GET /apis/video/getVideosByPage?login_user_id=1&count=10` 返回视频列表。
  - `GET /apis/team/index?login_user_id=1&teamId=1` 返回球队信息。
  - `GET /api/v1/pitches?count=10` 返回球场列表。
- `D:\workspace4Codex\xunqiu-backend-modern\scripts\smoke-test.ps1` 已有线上 smoke 思路，但包含登录检查；本任务先做更低敏的公开只读检查，不提交真实 base URL。
- `D:\workspace4Codex\xunqiu-backend-modern\render.yaml` 说明生产部署存在路径前缀和 health check path；该真实部署地址只作为本地证据，不写入主站代码。

## Requirements

- 新增 `blog-semi` 脚本，不修改寻球仓库或生产部署。
- 不写死任何寻球后端 base URL；缺少 `XUNQIU_SYNTHETIC_API_BASE_URL` 时所有 live checks 显示 `unchecked` 并成功退出。
- 支持环境变量：
  - `XUNQIU_SYNTHETIC_API_BASE_URL`。
  - `XUNQIU_SYNTHETIC_TIMEOUT_MS`。
- 默认只做低敏只读请求：
  - `GET /actuator/health`。
  - `GET /apis/tweet/upToDateList?login_user_id=1&count=2`。
  - `GET /apis/video/getVideosByPage?login_user_id=1&count=2`。
  - `GET /apis/team/index?login_user_id=1&teamId=1`。
  - `GET /api/v1/pitches?count=2`。
- 输出文件为 `public/status/xunqiu-synthetic.json`，只包含低敏状态、HTTP status、耗时、checkedAt 和 issue 摘要。
- `scripts/generate-site-status.ts` 已支持自动读取 `public/status/*-synthetic.json`，本任务只需生成同契约 JSON。
- 不把真实 token、账号、后端 URL、路径前缀、APK 链接、用户内容、球队/球场详情或业务指标写入仓库。
- 生成脚本保持串行请求，不制造高并发。

## Out of Scope

- 不执行登录 smoke，不使用真实手机号、密码或 token。
- 不检查 APK 签名与下载 gate。
- 不接入定时任务、告警或 Prometheus scrape。
- 不修改寻球后端代码。

## Acceptance Criteria

- [x] 新增 `npm` script 可运行寻球 synthetic check。
- [x] 缺少 API base 时生成 `unchecked` 报告。
- [x] 提供 API base 时脚本串行尝试 health 和兼容 API，只保存低敏摘要。
- [x] `/status` 生成脚本可自动合并 `public/status/xunqiu-synthetic.json`。
- [x] `/status` 页面无需额外改动即可展示合并后的状态和证据。
- [x] 状态数据说明 env 使用方式和安全边界。
- [x] 通过验证：`npm.cmd run xunqiu:synthetic`、`npm.cmd run site:status`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`。
- [x] 提交前完成 `git diff --check` 和敏感扫描。

## Notes

- 真实线上 base URL 由部署环境或本地 shell 临时提供，不进入仓库。
