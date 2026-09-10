# 本地 CI 环境与执行设计

1. 只使用已确认的本机 Docker named pipe；保留既有容器、卷、Node 22 镜像及主仓库 preview。Ubuntu 基础镜像来自官方源，记录实际 digest。
2. 为 Node 运行时来源和 CI 执行建立两个唯一任务容器；不挂载主仓库、用户目录、凭证或既有卷，不发布任何主机端口。通过 Docker 的 tar 传输复制缓存 Node 22 的 `/usr/local` 到 CI 容器 `/opt/node22`，核对二进制哈希和版本，并将其 bin 放在 PATH 首位。
3. 从固定 Git 提交导出 tar；先核对没有已跟踪的私有 `.env`/`.npmrc`，解压后证明不存在 node_modules。所有新依赖、浏览器和 dist 仅写容器层。
4. 本地临时 helper 只解析已有 YAML，将 run 字段原样保存为独立 Bash 文件和 SHA-256 manifest；容器按顺序用 `bash --noprofile --norc -eo pipefail` 执行。CI、UI_CHECK_PORT 沿用 YAML；RUNNER_TEMP 使用容器内临时目录。先安装 GitHub runner 本来已有的 ca-certificates/curl/git，单独记录 bootstrap，不计为工作流步骤。
5. 原样安装 Chromium 与 Linux 系统依赖，执行 preview readiness 和 smoke；收集每一步退出码、性能指标、preview/smoke 日志以及端口清理结果。
6. finally 将低敏日志取回 Temp，停止本轮两个容器并确认移除；不使用 Docker prune 或操作其他资源。删除本轮已无用途的源 tar/辅助传输文件，保留验收证据与可复用官方基础镜像缓存。
7. 本项不改变业务源码，完整 UI 沿用 `b3b331fb` 的 46/0；新增门禁是 Ubuntu/Node 22 下实际干净安装与现有 CI 运行步骤。最终 Git diff/冻结哈希必须证明主工作区保持原构建。

## 下载失败后的有限恢复

首轮系统包下载失败后保留全部原始证据，另建 `retry-1` 证据目录和两个任务容器。新容器重做干净安装及 build；lint、合同和预算复用同一源快照的成功结果，不把分段完成描述为一次完整 workflow 成功。Chromium 步骤仅在日志确认下载失败时原样再执行一次，仍受本轮 20 分钟步骤预算限制；不绕过系统依赖或 smoke。清理检查等待 Docker 自动删除稳定后再断言，同时保存原资源前后清单。

原样重试仍失败后，读取容器默认 APT 配置确认 `docker-clean` 会在每次 `apt-get update` 后删除已下载 deb，第二次安装日志仍需下载全部 97.6 MB。HTTPS GET 诊断也有一个包发生传输截断，另一个包下载完整且与仓库 SHA-256 一致，不能把换成 HTTPS 当作已证实的解决方案。

因此只增加一次独立 `recovery-apt` 恢复验证：在新的任务容器内通过最后加载的 APT 配置清除两项缓存删除 hook、设置每个文件最多 3 次下载重试及 30 秒传输超时；保留官方源与 HTTP 传输，先用 `apt-config dump` 确认配置生效。原样 Chromium 命令只执行一次，仍不改仓库 workflow、系统依赖清单或 smoke。恢复结果与原样环境的失败分开报告；若此轮仍因下载失败，则停止重复运行并保留外部阻塞。
