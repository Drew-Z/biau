# CI Linux 本地验收记录

## 结论

第 39 轮对 `5fa06f51` 的本地 Ubuntu 24.04 / Node 22 验收已通过：从空缓存执行原七个 workflow run 步骤，全部 exit 0，浏览器 smoke 21 组/0 失败，preview 端口与任务容器清理通过。此次 runner 使用已验证的官方 HTTPS APT 与 npm_config_maxsockets=1，保留 TLS、签名、生命周期与审计；没有复用旧步骤或下载缓存。这不代表原默认传输环境或远端 Actions 已通过，npm 安装审计仍有 4 high。第 38、36、34 轮及更早失败、两类验证器误判和修正均保留。

## 初次源快照与环境

- 源提交：`a234e599f7b96373e859bcea0753e69195241a01`。通过 `git archive` 导出 1496 个已跟踪文件，不携带主机 node_modules、未跟踪文件、私有环境文件或 `.git`。
- workflow SHA-256：`8b2cde17faf0e78435fd2d5593129b1f254f3ec1f66ccf6f70d5c20ed5eb1438`。7 个 run 字段原样提取，逐项哈希见证据目录的 `step-manifest.json`。
- 实测环境：Ubuntu 24.04.4 LTS、Linux x64、Node v22.23.2、npm 10.9.8。锁文件 Playwright / playwright-core 均为 1.61.1。
- Ubuntu 镜像：`sha256:b2b7ea366714195a1e1c5b2b578ece85c0b3920381a8654d038d9684f009613c`；pull digest：`sha256:224a1869083a311ef3f13648a154ba79832fbef6364d31493642ca03082da254`。
- 缓存 Node 22 镜像：`sha256:6fa4cea04fca5c92ab1d8b54f46b0894993aa03a95db420fbad48d5695344f2b`。复制前后 Node 二进制 SHA-256 均为 `3517c2df0b2f8cd7f422b4b8450ef81c6889f08eb03e281d6de9079b15e6a327`。
- Playwright 1.61.1 官方 noble 镜像内置 Node 24，因此实际使用 Ubuntu 基础镜像加缓存 Node 22。官方来源保存在 `github-runners.json`、`playwright-docker.json`、`playwright-dockerfile.json`，没有更新项目依赖。
- 所有容器使用本机 Docker named pipe、唯一任务 label，无主机目录挂载、无主机端口发布、无既有卷和生产凭证。Linux Bash 仅在容器内执行。

## 旧基线的实际步骤结果

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

以上尝试均保存独立结果，没有覆盖前次失败；当时停止重复运行并记录外部阻塞。恢复需要下载条件改善，或先独立确认一个可完成下载的本地环境。若后续依赖或工作流发生变化，必须重新固定源提交与输入，不能把旧检查结果直接算作新版本通过。

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

上述失败交付时，工作状态保留为 review，`meta.validation.state=blocked`，通过父任务 `blockedChildren` 跟踪且未归档；当时实际执行 `task.py start 09-06-website-completion-roadmap` 返回父任务，按协议转入独立依赖修复。第 34 轮根据新证据恢复同一子任务，详见下节。

此前自动审批拒绝搬移/删除的 `undefined/composer-boundaries.json` 与 `undefined/composer-final-320-en.png` 仍保留且未提交，本轮没有重试该被拒绝的动作。

## 后续独立线索

初次 npm 安装提示 16 个存在告警的依赖条目（3 moderate / 13 high），不是 16 个彼此独立的漏洞。该线索已由独立依赖子任务复核并以 `eb25462f` 修复 12 个条目，剩余 Prisma 固定链 4 high；具体调用路径与残留边界见已归档依赖任务。本轮只验证新锁文件，不继续改动依赖。

## 第 34 轮：新锁文件恢复

- 恢复依据：Windows HTTPS 与隔离 Linux 的原 Ubuntu HTTP / npm HTTPS 路径均完整下载两个曾失败字体包及 sharp-libvips-linux-x64；3 份内容跨环境 SHA-256 一致，已知字体哈希和 npm integrity 匹配。探测容器已移除，既有资源保留。小样本成功只用于判断可以恢复，不能代替完整安装。
- 新源提交：`f9c1133f1a59363ca55136b6fbf9bafbd8859649`；锁文件 SHA-256：`25A49D1911B43AEDF40C3E8892016DF5E72BC777F21EDA0275D3D3470D4F87D1`。导出 1511 个已跟踪文件，私有配置路径 0；冻结当前主工作区 678 个源/构建输入。
- 七个 run 字段重新从未修改的 workflow 原样提取，脚本哈希与既有 manifest 一致。使用原 Ubuntu 与 Node 镜像；实际确认 Ubuntu 24.04.4、Node v22.23.2、npm 10.9.8、Linux x64，以及空 node_modules、npm 和浏览器缓存。
- 所有七步重新执行，不复用旧锁文件结果；不注入主机下载包、不调整 APT 配置或官方源，不修改 workflow。单次工作流执行预算 20 分钟，失败后停止重复完整尝试。
- 新证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-ci-linux-resume-20260910T095901931286Z-72kd9_9l`。本轮执行从 `10:10:19Z` 开始，`10:13:13Z` 取得最终失败与清理结果；bootstrap exit 0，`npm ci` 从 `10:12:14Z` 至 `10:13:06Z` 以 exit 1 结束。其余六步未运行，preview 未启动。
- npm 原始 debug 日志显示 @radix-ui/primitive 和 @jridgewell/resolve-uri 的 `cdn.npmmirror.com` 请求曾 ECONNRESET，npm 内置第二次尝试均取得 200；最终 aborted 后未完成的 unpack 计时器指向 js-tiktoken。最终堆栈没有附带准确失败 URL，不能把这一线索写成已证明的唯一根因。
- 锁文件有 479 个 resolved 指向 registry.npmmirror.com，43 个指向 registry.npmjs.org。补充单包对照中，三个相关包在官方和镜像路径均完整下载，内容哈希及原 integrity 一致；因此不是镜像永久不可达的证据。整批安装失败与串行单包成功仍需区分，父任务将独立核对保持版本/integrity 的官方源候选。
- 2 个 CI 容器和 2 个探测容器均已清理，原有 17 个容器及运行集合、43 个卷保留，新增卷 0。未重复原样完整安装，未修改仓库源码、锁文件、workflow 或私有配置。
- 最终 `2026-09-10T10:30:18Z` 核对 678 个源码/构建输入和 13 份原有未跟踪文件均无漂移，保护快照保持；`final-validation.json` 明确保存 workflowPassed=false、smokeExecuted=false、previewStarted=false。
- 父任务的独立临时实验只把 479 个 resolved 地址转为官方 registry，全部版本、integrity 和其他 metadata 保持。Node 22 / Linux x64 的空缓存 `npm ci --ignore-scripts --no-audit --no-fund` 在 42612ms 实际 exit 0，445 个安装节点与原锁定版本/integrity 一致；候选容器已移除。此结果验证整批传输，不包括生命周期脚本、audit、Ubuntu 或浏览器 CI，候选当时尚未应用仓库。

## 第 36 轮：官方源锁文件正式验收

- 独立修复工作提交为 efce524e、归档提交为 d06b5ace；本次源固定 `d06b5ace84cccfb67c6694f19af55d793387e403`，锁文件 SHA-256 为 `A38EE12252FAFE0C8C243FC6CA82714AD9D83E1F598BCB05019B1571F7F59D52`。
- 在新证据子目录 `official-registry-ci` 配置原始七步，不复用旧步骤或安装缓存；helper 只更新固定源身份和前置候选证据引用，保留同一镜像、Node 二进制、Chromium 安装命令、workflow 与退出清理合同。实际执行范围见下文。
- prepare 与 PowerShell helper 语法通过；实际冻结 678 个源/构建输入，导出 1518 个已跟踪文件，私有配置路径 0，七个脚本逐字节及哈希与原 workflow 一致。
- 实际运行时间为 `2026-09-10T12:01:43.3680597Z` 至 `12:02:59.5586668Z`，工具最终 exit 1。容器内确认 Ubuntu 24.04.4、Linux x64、Node v22.23.2、npm 10.9.8，以及空 node_modules / npm / 浏览器缓存。
- bootstrap 在 `apt-get update` 下载 `noble/main/binary-amd64/Packages` 时出现 HTTP 500 / unexpected EOF，exit 100；未执行后续 ca-certificates/curl/git 安装，也未进入第一个 workflow run 步骤。七项检查全部未运行，smoke 未执行，preview 未启动，因此不存在本次 preview 退出通过结论。
- 任务容器 `f878da291a7810bc03499b4417889a038e5ee1aaabecbed5907e7fa269696ff5` 与 `2ca5b6f9d98e9b3e99f56909b49ae7c79ed7a92f6107b75d131a503d2d729886` 均在精确 label 核验后移除。原有 17 个容器、运行集合和 43 个卷保留，新增卷 0；主机原 preview 未操作。
- `2026-09-10T12:05:39.329Z` 的独立终局核对确认 678 个冻结文件、13 份原有未跟踪资料及其完整集合无漂移；保护快照和新锁文件哈希保持。两个容器再次按 ID 核实不存在，七份脚本与 YAML 原文一致。
- 新原始结果保存在 `official-registry-ci/result.json`、`bootstrap.log`、`source-baseline.json`、`step-manifest.json`、`resources-before.json`、`resources-after.json` 和 `final-validation.json`；没有 step-results、smoke 或 preview 日志，因为未执行相应步骤。旧 Temp 根目录的失败和候选实验结果未覆盖。
- 五个本轮一次性文件已按精确路径及哈希清理，共 190698308 bytes：根目录的两个字体 deb、sharp tarball、旧 source.tar 和 `official-registry-ci/source.tar`。路径、大小、SHA-256 和已删除结果见根目录 `temporary-cleanup-manifest.json`；保留日志、候选锁文件和复验 helper。新源归档哈希为 `63A8B8AAF2032C7F0005E8EA11669DB33E55B499F25FD09ED44600048155A9DD`，恢复时应在新的证据目录按固定提交重新生成。
- 不对相同环境继续完整重试。恢复条件为完整 Ubuntu 包索引及所需包下载可靠，或另行明确目标 runner；随后固定源提交，从空缓存重做全部七步。少量 tarball 下载成功不能替代包索引与完整 CI 验收。
- 旧依赖任务 npm-cache 与 undefined 两份文件此前被自动审批以 `blocked by policy` 拒绝清理，本轮没有重试，仍保留且未提交。没有推送、部署、真实模型调用、生产数据库操作或 Feed/Cron 变更。
- 本轮阻塞资料以 `22d752c8d84e60aae2dbd888b0ea66999b6e6a6c` 精确本地提交 10 个文档/状态文件。已实际执行 task.py start 返回父任务并核对指针，父任务第 37 轮 waiting，blockedChildren 继续保留本项；开发记录为 journal-3.md 的 Session 128。本任务未归档，也未登记完成提交。

## 第 38 轮：完整 APT 预检及官方源 npm 失败

- 证据根：`C:/Users/zhang/AppData/Local/Temp/blog-semi-ci-transport-20260910T1236149923932Z`。只读确认原 Ubuntu 官方 HTTP 源、默认 APT hook 与 Docker 内部代理；代理存在不是故障根因证明。官方 APT 手册支持禁用流水线和保留证书验证的 HTTPS 候选。
- HTTP 禁用 Pipeline-Depth 的单次完整预检：索引和计划 exit 0，下载 exit 100；fonts-ipafont-gothic 与 fonts-wqy-zenhei 返回 500 / unexpected EOF。该候选没有解决完整下载。
- 独立 HTTPS 候选只改两条 URIs scheme，使用缓存官方 Node 镜像的公开 CA bundle，保持 suite/component/Signed-By、APT 签名/完整性检查和 Verify-Peer/Verify-Host。空缓存索引、解析、download-only 全部 exit 0：Playwright 1.61.1 tools/chromium 加 bootstrap 的 36 直接包展开为 129 包、114398812 bytes。
- 清单名称、大小和总字节完全一致；129 份实际 SHA-256 留存。最初补充解析器误以为 print-uris 提供 SHA256，实际为 MD5Sum；误判与修正均保存。没有独立的预期 SHA-256 比较，完整性依据为 APT 原校验及成功下载，不能把解析器异常写成包损坏或掩盖它。
- 四个诊断/预检容器已移除，源与旧资料核对通过后，在 `ci-with-transport` 以固定 5fa06f51、相同镜像与 Node 二进制启动全新空缓存 CI。未注入预检 deb/npm/browser 缓存，原七个 run 字节/hash 保持，主机配置不变。
- 正式执行 2026-09-10T13:48:22.5341882Z–13:52:20.5795455Z；Ubuntu 24.04.4、Linux x64、Node v22.23.2、npm 10.9.8。bootstrap exit 0；npm ci 从 13:50:15.5374268Z 至 13:52:13.8934230Z，exit 1 / ECONNRESET / aborted。其余六步未执行，preview 未启动；没有本次 Linux smoke 或端口退出结论。
- npm debug 日志显示官方 registry audit bulk POST 200，以及多个官方 tarball 首次请求 ECONNRESET，部分由 npm 内建重试恢复；@prisma/config packument 也连接重置。最终 TLSSocket 堆栈没有唯一失败 URL。审计已启动但没有新的完整审计结论；既不能归因于旧镜像，也不能认定连接并发已是根因。
- 两个正式 CI 容器 `c4ecb2a050e7fef835d29e1d06c3c5802d12e08bd4b810005a75d5fbe7c25dfe`、`0cbcc15c22ac1ff37977feef4b4423dc1c4ccd657d8762d4906b10f10bbf9a94` 已移除。2026-09-10T17:10:48.316Z 的 `ci-with-transport/final-validation.json` 再次核对 678 个源/构建文件、13 份旧资料及七份原样脚本，均无漂移；17 个原有容器、运行集合、43 个卷保留，新增卷 0。
- 这次完整运行的尝试已用完，不原样重跑。源码 tar 暂保留用于独立单连接预检；所有旧结果与被拒绝清理目标继续保留。没有推送、部署、真实模型调用或生产更改。

## 第 39 轮：单连接完整 npm 安装预检

- `npm-single-connection/` 使用同一 5fa06f51 快照、缓存官方 Node 22.23.2 / npm 10.9.8 / Debian 12，空 npm/浏览器缓存和 node_modules。实测 npm 默认 maxsockets=15，本次执行环境为 1，audit=true、ignore-scripts=false、strict-ssl=true、官方 registry；没有主机挂载、端口或机器配置修改。
- 原样 npm ci 于 2026-09-10T17:16:37.610Z–17:21:31.782Z 完成，exit 0、294172ms；安装 445 包、审计 446 包，仍报告 4 high。Prisma preinstall、Prisma engines postinstall 与 esbuild postinstall 均 exit 0；安装节点的版本/integrity/resolved 与锁定字段一致。这是安装审计摘要，不是新一轮独立生产投影 audit 或零告警结论。
- 原 helper 外层 exit 1 源于后置 package.json 哈希比较，原始 result.json 和失败保留。离线核对发现 git archive 含 191 个 CRLF，主工作区含 180 CRLF 与 11 LF，Git blob 为 191 LF；三者规范化后的全部字节一致。容器安装后哈希 d12406b5...5029436 与导入 tar 完全一致，根锁文件 A38EE122...7F59D52 保持。最初离线 raw archive==blob 假设也失败，修正检查已将这次误判记录在 verification.json；没有改输入、完整性字段或重跑安装。
- `verification.json` 于 17:26:53Z 实际 exit 0，确认安装及后置检查通过。唯一容器 `64ba95532b7a3cac77c1bd1209be3f57062d880fc5926552b88076038a7fe154` 已移除，17 个原有容器、运行集合和 43 个卷保留，新增卷 0；678 个源/构建文件和 13 份旧资料无漂移。此预检不算 Ubuntu CI，也不证明下载永久稳定或并发为唯一根因。
- 由此恢复同一 CI 子任务；新 `ci-single-connection/` 固定同一源 tar（SHA-256 42baee8c...d10b407）、同一七个原样脚本，从新空缓存 Ubuntu 环境运行一次，保留 HTTPS APT 设置并增加 npm_config_maxsockets=1。最终结果必须独立取得，不复用 Debian 安装或任何旧 workflow 步骤。

## 第 39 轮：完整 Ubuntu 验收终局

证据目录为 `C:/Users/zhang/AppData/Local/Temp/blog-semi-ci-transport-20260910T1236149923932Z/ci-single-connection`。运行时间 2026-09-10T17:37:29.9714853Z–17:44:48.4007914Z，外层 exit 0；正式七步均在一次新运行中完成，没有复用旧版本结果。

| 原 workflow 步骤 | 本次结果 |
| --- | --- |
| npm ci | exit 0，安装 445 包/审计 446 包，生命周期开启且成功，审计仍为 4 high；167794ms。 |
| lint | exit 0；12514ms。 |
| build | exit 0，包含 TypeScript 检查；5632ms。 |
| 四项本地合同 | exit 0，博客/项目发现、分析与项目 registry 均通过；1231ms。 |
| performance:check | exit 0，CSS 152582/222755 bytes、JS 320266/430000 bytes、route CSS 142027 bytes；阻塞外部样式 0，immutable cache 已配置。 |
| Chromium 与系统依赖 | 原样 npx playwright install --with-deps chromium，exit 0；约 170 秒，实际安装 Chrome for Testing/Headless Shell 149.0.7827.55（v1228）及 FFmpeg v1011。 |
| preview 与 smoke | exit 0，smoke SUMMARY groups=21 failed=0 total=10260ms；最后实际绑定 5174 成功，确认退出端口已释放。 |

- sourceCommit 为 5fa06f51，workflow SHA-256 和七段脚本字节保持。Ubuntu 24.04.4、Linux x64、Node v22.23.2、npm 10.9.8、Playwright 1.61.1、镜像和 Node 二进制身份均与设计一致。
- 系统包由官方 HTTPS 源重新取得，保留签名、完整性检查、原缓存清理 hook 与证书/主机验证。npm 为 maxsockets=1、audit=true、ignore-scripts=false、strict-ssl=true；未把临时下载配置写入主机或仓库 workflow，不声称证明代理或并发为唯一根因。
- `final-validation.json` 于 17:45:15.516Z 实际 exit 0：445 个安装节点版本/integrity/resolved 一致，package.json 与实际导入字节前后相同，锁文件 A38EE122...7F59D52 保持；678 个源/原构建文件、13 份旧资料及集合、七个脚本无漂移。
- 本次 CI 容器 c004b5b3...9567693 与运行时来源容器 c1610d1f...9b123c 均移除；17 个原有容器、运行集合及 43 个卷保留，新增卷 0。真实模型调用 0，没有生产连接、远端 Actions、推送、部署、公开发布、Feed/Cron 或保护快照变化。
- 主机完整 UI 46/0 继续明确复用 eb25462f 的同代码/同构建证据，未额外重跑；本轮新增的是上述完整 Linux CI 与 21/0 smoke。checkout/setup-node、远端权限/cache/artifact 和默认 runner 网络仍须独立远端验收。
- 验收完成后按精确路径清理两个本任务源 tar 和冗余 package 字节诊断脚本，共 3 文件、167179382 bytes；清单为证据根 temporary-cleanup-manifest.json。两份源 tar 均为 SHA-256 42baee8c80d842c539090e2f9e1091575128c6ea7d07658f930075807d10b407；复验需先按固定源重新导出，原日志、配置、官方文档、安装 metadata 与验证 helper 均保留。旧 npm-cache / undefined 策略拒绝目标未重试。
