# CI Linux 本地验收记录

## 结论

当前为 **review / 外部下载阻塞**，未完成、未归档。Ubuntu 24.04 / Node 22 下的干净安装、lint、build、四项本地合同和性能预算已取得 exit 0；Chromium 系统依赖下载未成功，浏览器 smoke 未执行。不能将本记录称为 CI 全通过，也不能引用其他环境的 21/0 代替本项。

## 源快照与环境

- 源提交：`a234e599f7b96373e859bcea0753e69195241a01`。通过 `git archive` 导出 1496 个已跟踪文件，不携带主机 node_modules、未跟踪文件、私有环境文件或 `.git`。
- workflow SHA-256：`8b2cde17faf0e78435fd2d5593129b1f254f3ec1f66ccf6f70d5c20ed5eb1438`。7 个 run 字段原样提取，逐项哈希见证据目录的 `step-manifest.json`。
- 实测环境：Ubuntu 24.04.4 LTS、Linux x64、Node v22.23.2、npm 10.9.8。锁文件 Playwright / playwright-core 均为 1.61.1。
- Ubuntu 镜像：`sha256:b2b7ea366714195a1e1c5b2b578ece85c0b3920381a8654d038d9684f009613c`；pull digest：`sha256:224a1869083a311ef3f13648a154ba79832fbef6364d31493642ca03082da254`。
- 缓存 Node 22 镜像：`sha256:6fa4cea04fca5c92ab1d8b54f46b0894993aa03a95db420fbad48d5695344f2b`。复制前后 Node 二进制 SHA-256 均为 `3517c2df0b2f8cd7f422b4b8450ef81c6889f08eb03e281d6de9079b15e6a327`。
- Playwright 1.61.1 官方 noble 镜像内置 Node 24，因此实际使用 Ubuntu 基础镜像加缓存 Node 22。官方来源保存在 `github-runners.json`、`playwright-docker.json`、`playwright-dockerfile.json`，没有更新项目依赖。
- 所有容器使用本机 Docker named pipe、唯一任务 label，无主机目录挂载、无主机端口发布、无既有卷和生产凭证。Linux Bash 仅在容器内执行。

## 实际步骤结果

| 原 workflow 步骤 | 结果与证据 |
| --- | --- |
| `npm ci` | 初次 exit 0，445 个包安装完成；`retry-1` 重建也 exit 0。最后恢复环境的重建出现 `ECONNRESET`，该失败另行保留。 |
| `npm run lint` | 初次 exit 0；后续同源快照复用，不重复运行。 |
| `npm run build` | 初次和 `retry-1` 均 exit 0，包含 TypeScript 检查。 |
| 四项本地合同 | 初次 exit 0：博客发现 8 组、项目发现 6 组、分析路由 17 项、registry 12 identities / 9 publications；含项目动作 9 CTA / 39 link sets。 |
| `npm run performance:check` | 初次 exit 0；CSS 152582 / 222755 bytes，JS 320266 / 430000 bytes；阻塞外部样式 0、immutable cache 已配置。 |
| `npx playwright install --with-deps chromium` | 共 3 次原样命令均因 Ubuntu deb 下载 `500 / unexpected EOF` 失败，exit 1；底层 apt exit 100。 |
| 现有 preview / smoke 脚本 | 未执行，preview 未启动；本轮没有浏览器 21/0 或 preview 退出清理通过结论。 |

## 有界恢复与诊断

1. 初次运行 `05:30:21–05:36:54 UTC`：前五步通过；`fonts-ipafont-gothic`、`libicu74` 下载中断。原始 `result.json` 与日志保留。
2. `retry-1`，`06:59:55–07:11:04 UTC`：在新容器重建 npm / build，复用 lint / 合同 / 预算；Chromium 原样执行两次，仍在不同系统包上下载中断，没有降低断言或修改工作流。
3. 只读诊断发现 Ubuntu Docker 的 `docker-clean` 在每次 `apt-get update` 后清除 deb 缓存，第二次安装仍需下载全部 97.6 MB。HTTPS GET 的一个字体包发生传输截断，另一个返回 200 且 SHA-256 与 apt 元数据一致，不能据此认定 HTTPS 已解决问题。
4. `recovery-apt` 在 `07:14:08 UTC` 结束于本地 helper 预检查：APT 清除 hook 后保留空条目，检查器误判为配置未生效。未执行 npm 或浏览器安装；失败记录保留。
5. 修正检查器后，`recovery-apt-fixed` 在新容器确认下载恢复配置生效：最后加载的 APT 配置保留缓存、每个文件最多 3 次重试、30 秒传输超时，官方 HTTP 源保持。`npm ci` 在 `07:19:20 UTC` 以 `ECONNRESET` 失败，因此没有进入 Chromium 阶段。该环境调整的有效性仅验证到配置；不能声称它修好了 Ubuntu 下载。

所有尝试均保存独立结果，没有覆盖前次失败。现已停止重复运行；恢复需要下载条件改善，或先独立确认一个可完成下载的本地环境。若后续依赖或工作流发生变化，必须重新固定源提交与输入，不能把旧检查结果直接算作新版本通过。

## 源码与资源核对

- `2026-09-10T07:27:32.1864796Z` 最终核对：678 个冻结源码、配置、公开文件和主机原 dist 无漂移。
- 保护快照 SHA-256 保持 `D744AD0698C429FC3ECD33AF3CAE16911E00234C6E4D28AD30E5805BB9414909`。
- 4 轮准备共创建 8 个任务容器，按精确 ID 确认全部移除；原有 17 个容器、运行集合与 43 个卷均保留，新增卷 0。
- 初次报告的 CI 容器 `removed=false` 来自停止后的即时查询；恢复后按精确 ID 确认已移除，补充 `cleanup-postcheck.json`，不改写原报告。
- 实际最终工具退出码均已取得，无遗留 CI 进程。原主机 preview 和历史 worktree 未操作。
- 零真实模型调用、未调用远端 Actions、未推送或部署。本地未执行 checkout/setup-node/upload-artifact 插件，任何容器结果都不等于远端 CI 验收。
- 本项只写任务证据与父任务记账，不改源码、workflow、package、锁文件或质量断言。质量规范已有本地/远端及 smoke 边界；本轮一次性下载配置与 helper 纠错留在任务记录，不新增产品规范。

## 证据与恢复

证据根目录：`C:\Users\zhang\AppData\Local\Temp\blog-semi-ci-linux-20260910T044412002Z`。

- `final-validation.json`：阻塞结论、源哈希核对、容器/卷清理。
- 原始 `result.json`、`step-results.json`、7 个原样 Bash 文件和各步骤日志。
- `retry-1/`：两次安装日志、APT 默认配置、HTTPS 诊断和资源前后清单。
- `recovery-apt/`：预检查误判及实际 APT 配置；`recovery-apt-fixed/`：修正后的 helper、有效配置与 npm 网络失败。
- 源 tar SHA-256：`0C874E85F7BE4D571D7E30A0D6CE714CB5A4BF25E13F927AEDB75278300300BA`。一次性 tar 与两份重复的官方正文 stdout 日志已删除；精确路径、大小与哈希保存在 `temporary-cleanup-manifest.json`。恢复脚本运行前必须重新导出所需源快照。

工作状态保留为 review，`meta.validation.state=blocked`；通过父任务 `blockedChildren` 跟踪，暂不归档。已实际执行 `task.py start 09-06-website-completion-roadmap` 并核对当前会话指针；按父任务协议转入独立可执行项，下载条件变化后再恢复本项。

此前自动审批拒绝搬移/删除的 `undefined/composer-boundaries.json` 与 `undefined/composer-final-320-en.png` 仍保留且未提交，本轮没有重试该被拒绝的动作。

## 后续独立线索

初次 npm 安装提示 16 个存在告警的依赖条目（3 moderate / 13 high），不是 16 个彼此独立的漏洞。对 package / lock 副本的官方 registry 只读审计复现同样数量。7 月旧记录曾保留 React Router RSC 告警；当前审计已给出兼容修复，因此应由父任务单独核对依赖升级和残留风险，不在 CI 记录任务中改依赖。
