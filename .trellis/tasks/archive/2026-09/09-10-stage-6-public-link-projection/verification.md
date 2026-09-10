# 修复验收记录

日期：2026-09-10

## 行为验证

- `npm.cmd run public-links:projection-check` 通过：44 个实际可见目标唯一，隐藏的 Legal RAG、Chatus、ERP、Xunqiu entry 不再出现；status、evidence、documentation、repository 和 试玩入口仍存在。
- `npm.cmd run project-registry:check` 通过：9 CTA cases、9 publications、39 real link sets，12 identities / 9 publication records。
- `npm.cmd run verification:diagnostics-check` 通过，未访问网络。
- `npm.cmd run public-links:check -- --json` 只读运行得到 44 个目标。Node `HEAD/fetch` 对 Playlab/主站域名继续出现 `connection_error`，GitHub 本轮出现 timeout，Legal API 返回 200；没有写入 status snapshot。

## 质量门禁

- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过，Vite production build 完成。
- `git diff --check`：通过；仅报告工作树中已有文件的 LF/CRLF 转换提示。
- UI smoke 在本子任务代码前已于正确的 5174 临时服务上 `21/21` 通过；本子任务只修改巡检器和脚本入口，不改变 UI/runtime bundle。

## 保护边界

- 未运行 `--write-status`，未修改 `public/status/public-links-synthetic.json` 或 `public/status/blog-semi-synthetic.json`。
- 未修改 `src/`、助手 relay、AI Daily payload、生产配置、Feed/Cron 或外部服务。
- 未调用真实模型或登录生产服务。
