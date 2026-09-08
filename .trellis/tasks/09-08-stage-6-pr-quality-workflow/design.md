# 基础质量工作流设计

## 入口与检查顺序

新增一个 `site-quality` job，Ubuntu、Node 22、20 分钟总超时。沿用现有 Actions v5，普通 PR 不作路径过滤；main push 与手动运行也执行相同命令。按 workflow/ref 分组取消过期运行，权限仅为 contents: read。

执行顺序是 npm ci、lint、build、博客发现/项目发现/analytics/registry 四项纯本地合同、构建性能预算、Chromium 安装、本地 preview smoke。沿用 `check-ui-smoke.mjs` 的 7 路由 × 3 视口及外部网络阻断，保留完整 `check:ui` 作为本地交付要求。避免创建第二套检查器或改动 verify.mjs。

## Preview 生命周期

显式 Bash 使用 fail-fast/pipefail。先用 Node net 验证固定 loopback 端口空闲，再直接启动 Vite 的 Node 进程，保存唯一 PID；使用 --strictPort，避免自动换端口。HTTP 就绪轮询有固定次数和请求超时，期间检查子进程是否仍在。EXIT/INT/TERM 触发自有 PID 清理，不结束其他服务。

日志写入 RUNNER_TEMP 下独立目录，上传步骤只选 preview.log 和 smoke.log，保留 7 天；不上传工作区、构建目录、公开状态或配置。smoke 通过 tee 记录，pipefail 保留失败退出码。没有业务 cron、生产凭证或远端发布命令。

## 验证与限制

用标准 YAML 解析器检查事件/权限/命令引用及 Bash 语法；本地运行 YAML 中的原始步骤，使用空闲端口验证真实 smoke。再用仅存在于测试进程的 npm 函数返回 17，验证失败传播与 cleanup；预先占用固定端口时必须失败且保留原服务。故障注入不改 workflow 文件或既有检查源码。

当前机器 Node 为 24.14.0，Windows 上以绝对路径 Git Bash 执行 workflow 的 POSIX 步骤。不能把这些结果称为 Ubuntu/Node 22 的实际 CI 通过。业务源码与完整 UI 检查器未变时，明确复用第 9 轮最终完整 45 组证据及同一构建哈希。

## 依据与回滚

2026-09-08 实际读取 [Playwright CI](https://playwright.dev/docs/ci) 与 [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)，CLI/抓取证据路径见父任务 remaining-gates.md。沿用仓库两个现有 workflow 的 Node/Actions 约定，不顺带升级。

回滚单位是本项独立提交；移除新增 workflow 并恢复对应规范即可，业务构建、内容和已有工作流不受影响。
