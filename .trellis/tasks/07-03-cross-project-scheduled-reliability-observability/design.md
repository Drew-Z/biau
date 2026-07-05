# 跨项目可靠性定时观测与状态页闭环 Design

## Current Shape

仓库已经有多个可单独运行的 synthetic/status 脚本：

- `main-site:synthetic` 写入 `public/status/blog-semi-synthetic.json`。
- `legal-rag:synthetic` 写入 `public/status/legal-rag-synthetic.json`。
- `erp:synthetic` 写入 `public/status/erp-synthetic.json`。
- `xunqiu:synthetic` 写入 `public/status/xunqiu-synthetic.json`。
- `pet:synthetic` 写入 `public/status/pet-gamer-synthetic.json`。
- `site:status` 合并公开入口检测和 synthetic JSON，写入 `public/status/site-status.json`。
- `site:monitor` 是发布前/发布后页面与链接巡检工具。

状态页已经有 `/status` 与 `/status/:projectId` 路由，详情按钮会跳到独立详情页。

## Proposed Slice

新增一个聚合脚本 `scripts/check-reliability-suite.mjs`，作为本地、CI、GitHub Actions、Render Cron 或外部计划任务的统一入口。

### Command Contract

```powershell
npm.cmd run reliability:check
npm.cmd run reliability:check -- --strict
npm.cmd run reliability:check -- --timeout 15000
npm.cmd run reliability:check -- --skip site-monitor
```

默认行为：

1. 顺序运行默认安全的 synthetic scripts。
2. 运行 `site:status` 合并结果。
3. 可选运行 `site:monitor --json`，默认开启同源核心路由检查，不做外部链接批量测活。
4. 写入 `public/status/reliability-suite.json`。

### Public Report Contract

`public/status/reliability-suite.json` 只保存低敏聚合信息：

- `checkedAt`
- `ok`
- `summary`
- `steps[]`
  - `id`
  - `label`
  - `command`
  - `status`: `passed | failed | skipped`
  - `durationMs`
  - `exitCode`
  - `outputPath?`
  - `summary`
  - `issues[]`

不保存：

- 环境变量值。
- API base URL。
- 凭据、token、密码。
- 原始 stdout/stderr 全量。
- 外部平台后台链接。

### Failure Semantics

- 默认非 strict 模式下，单个 synthetic 失败不会阻止后续步骤继续运行；suite 仍产出报告。
- `--strict` 下，如果有 failed step，进程最终返回非 0，适合 CI。
- 缺少 base URL / credentials 的脚本应按现有约定产出 `unchecked`，不是 suite 失败。

### Scheduling

首选落档方案：

- GitHub Actions scheduled workflow：每日或手动运行 `npm ci`、`npm.cmd run reliability:check -- --strict`，上传 `public/status/*.json` 为 artifact。
- 不在 workflow 里提交状态 JSON 到 main，避免 CI 对仓库自动写入造成噪音；需要公开最新状态时由人工或部署流程决定是否发布 generated JSON。

备选：

- Codex/Cron/本地计划任务运行 `npm.cmd run reliability:check`。
- Cloudflare Cron 或 Render Cron 调用外部 endpoint 时，需要先有后端接收器，不作为本轮默认。

## Safety

- 不做模型测活。
- 不批量检查外部链接，除非显式传入 `site:monitor --check-external` 这类人工命令。
- 不引入真实监控平台 token。
- 所有需要平台账号、密钥、付费资源或生产告警配置的事项保留在 manual gate。
