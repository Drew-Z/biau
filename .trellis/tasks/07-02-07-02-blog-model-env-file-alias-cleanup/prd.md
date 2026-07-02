# 博客模型工具 env-file 别名清理

## Goal

移除或拒绝 blog:model 的 --env-file 别名，避免新版 Node 参数抢占；保留 --local-env 并补离线验证。

## Requirements

- 清理 `npm.cmd run blog:model -- ...` 中的 `--env-file` 别名，避免新版 Node 或外层命令把它识别为 Node 自身参数造成歧义。
- 保留并推荐 `--local-env` / `--local-env=PATH` 作为私有 env 文件选择方式。
- 当用户直接传入 `--env-file` 或 `--env-file=...` 时，应输出明确错误和恢复建议，而不是静默接受。
- 不读取 `.env.local` 的真实值、不打印 API key、不运行 `doctor --live`，只做离线验证。
- 同步帮助文本或恢复文案，确保用户知道应该改用 `--local-env`。

## Acceptance Criteria

- [x] `configure-blog-model.mjs` 不再静默接受 `--env-file`。
- [x] `--env-file` / `--env-file=...` 输出明确错误，提示使用 `--local-env`。
- [x] `--local-env` / `--local-env=...` 仍可用于 `status` 或 `doctor` 离线命令。
- [x] 验证通过：离线 CLI 命令、`npm.cmd run lint`、`npm.cmd run build`、`git diff --check` 和敏感信息扫描。

## Notes

- 来自父任务候选：`--env-file` 可能被新版 Node 抢占；当前 usage 已推荐 `--local-env`。

## Validation Log

- 离线 CLI 验证通过：`setup --non-interactive --local-env <tmp>`、`status --local-env <tmp>`、`doctor --local-env <tmp>` 均为 0；`status --env-file <tmp>` 与 `status --env-file=<tmp>` 均为 1，并输出 `--local-env` 恢复建议。
- 临时 placeholder env 文件已删除，未留下未跟踪配置文件。
- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过；Vite 输出既有动态导入 chunk 提示，不影响构建。
- `git diff --check` 通过，仅输出 Windows 行尾提示。
- 敏感信息扫描仅命中脚本已有的密钥字段变量名、placeholder 示例和父任务 slug，均为误报；未新增真实密钥或私有地址。
