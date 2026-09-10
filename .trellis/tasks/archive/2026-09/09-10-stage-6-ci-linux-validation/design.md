# 本地 CI 环境与执行设计

1. 只使用已确认的本机 Docker named pipe；保留既有容器、卷、Node 22 镜像及主仓库 preview。Ubuntu 基础镜像来自官方源，记录实际 digest。
2. 为 Node 运行时来源和 CI 执行建立两个唯一任务容器；不挂载主仓库、用户目录、凭证或既有卷，不发布任何主机端口。通过 Docker 的 tar 传输复制缓存 Node 22 的 `/usr/local` 到 CI 容器 `/opt/node22`，核对二进制哈希和版本，并将其 bin 放在 PATH 首位。
3. 从固定 Git 提交导出 tar；先核对没有已跟踪的私有 `.env`/`.npmrc`，解压后证明不存在 node_modules。所有新依赖、浏览器和 dist 仅写容器层。
4. 本地临时 helper 只解析已有 YAML，将 run 字段原样保存为独立 Bash 文件和 SHA-256 manifest；容器按顺序用 `bash --noprofile --norc -eo pipefail` 执行。CI、UI_CHECK_PORT 沿用 YAML；RUNNER_TEMP 使用容器内临时目录。先安装 GitHub runner 本来已有的 ca-certificates/curl/git，单独记录 bootstrap，不计为工作流步骤。
5. 原样安装 Chromium 与 Linux 系统依赖，执行 preview readiness 和 smoke；收集每一步退出码、性能指标、preview/smoke 日志以及端口清理结果。
6. finally 将低敏日志取回 Temp，停止本轮两个容器并确认移除；不使用 Docker prune 或操作其他资源。删除本轮已无用途的源 tar/辅助传输文件，保留验收证据与可复用官方基础镜像缓存。
7. 本项不改变业务源码。初次运行沿用 `b3b331fb` 的完整 UI；新锁文件恢复沿用依赖修复 `eb25462f` 的 Windows 完整 UI 46/0。新增门禁是 Ubuntu/Node 22 下实际干净安装与现有 CI 运行步骤；不得将 Windows 全量或旧锁文件结果当作新版本 Linux 通过。最终 Git diff/冻结哈希必须证明主工作区保持原构建。

## 下载失败后的有限恢复

首轮系统包下载失败后保留全部原始证据，另建 `retry-1` 证据目录和两个任务容器。新容器重做干净安装及 build；lint、合同和预算复用同一源快照的成功结果，不把分段完成描述为一次完整 workflow 成功。Chromium 步骤仅在日志确认下载失败时原样再执行一次，仍受本轮 20 分钟步骤预算限制；不绕过系统依赖或 smoke。清理检查等待 Docker 自动删除稳定后再断言，同时保存原资源前后清单。

原样重试仍失败后，读取容器默认 APT 配置确认 `docker-clean` 会在每次 `apt-get update` 后删除已下载 deb，第二次安装日志仍需下载全部 97.6 MB。HTTPS GET 诊断也有一个包发生传输截断，另一个包下载完整且与仓库 SHA-256 一致，不能把换成 HTTPS 当作已证实的解决方案。

因此只增加一次独立 `recovery-apt` 恢复验证：在新的任务容器内通过最后加载的 APT 配置清除两项缓存删除 hook、设置每个文件最多 3 次下载重试及 30 秒传输超时；保留官方源与 HTTP 传输，先用 `apt-config dump` 确认配置生效。原样 Chromium 命令只执行一次，仍不改仓库 workflow、系统依赖清单或 smoke。恢复结果与原样环境的失败分开报告；若此轮仍因下载失败，则停止重复运行并保留外部阻塞。

## 新锁文件的恢复（第 34 轮）

2026-09-10 后续探测已在 Windows HTTPS 和隔离 Linux 的原 Ubuntu HTTP / npm HTTPS 路径完整下载此前失败的两个字体包及新锁文件中的 sharp-libvips-linux-x64；三份内容 SHA-256 一致，已知字体 SHA-256 和 npm integrity 匹配。探测只使用缓存 Node 22 镜像中的网络工具，其容器已清理；不把该 Debian 探测环境当作 Ubuntu CI 验收。

据此在新的 Temp 证据目录恢复同一 CI 子任务，固定 `f9c1133f` 与锁文件 `25A49D19...4F87D1`。复用原准备/执行 helper，更新源身份校验，采用已验证的精确标签检查与 Docker 自动移除等待；全部七个原样 run 步骤重新执行，不复用旧锁文件的 lint/合同/预算。使用同一官方 Ubuntu 24.04、Node 22 镜像与二进制，干净 npm/浏览器缓存，不注入 host 下载包、不修改 APT 配置/源或工作流。只允许一次完整运行；仍失败则保存新的准确失败点并返回父任务，不无限重试。

新证据保存主仓库当前源码、依赖、公开文件与 dist 的冻结哈希，以及每步真实退出码、smoke 21 组结果、preview 端口释放和本轮资源前后清单。原始失败证据不覆盖；旧源 tar 已删除，因此重新导出当前提交。

## 官方源修复后的正式验收（第 36 轮）

第 34 轮原样恢复仍在 npm 解包阶段 ECONNRESET。随后独立子任务仅改 479 个 resolved 地址，保持全部版本/integrity；空缓存 Linux 传输实验安装 445 包成功，主机 lint/build/performance 通过，677 个非锁文件输入和全部构建字节保持。该修复已提交 efce524e 并归档。

本次固定包含修复的 `d06b5ace` 与锁文件 `A38EE122...7F59D52`，在独立 `official-registry-ci` 证据目录重新导出源并执行完整七步；Node/Ubuntu/浏览器版本、空缓存、原始命令、APT 配置和源、20 分钟步骤预算与资源边界不变。无需复制或注入临时实验的包缓存，不能用传输试验替代本次正式检查。仅做一次包含新修复的完整验收，保留此前所有原始失败。

## 第 38 轮：完整 APT 下载预检与传输调整

第 36 轮已在原始 APT 环境失败并完整收尾。本次先测试一个有官方手册依据的不同配置：禁用 HTTP Pipeline-Depth，单次传输超时 30 秒，APT::Update::Error-Mode=any，保持默认签名/完整性检查及原 apt 缓存清理 hook。原源、suite、component 和 Signed-By 不变，不修改主机代理，也不认定代理已被证明是根因。

预检从原 Ubuntu 镜像的空索引与包缓存开始，用锁定 Playwright 1.61.1 的实际 tools/chromium 集合与 ca-certificates/curl/git，更新全部索引并完整 download-only，保存逐步退出码、包清单/大小/哈希和资源清理。HTTP 候选最多一次、总预算 600 秒。只有该候选失败时才允许同源 HTTPS 候选一次；HTTPS 使用官方 Node 镜像公开 CA bundle，验证复制哈希、Verify-Peer/Verify-Host，保持官方 keyring。两种失败后停止，不继续追加同类变体。

完整预检通过是恢复条件，不是 CI 成功。恢复时新建独立空缓存 Ubuntu / Node 22 容器，固定源与锁文件，在容器内设置相同传输配置，原样执行七个 workflow run 步骤一次；不复用预检 deb/npm/browser 缓存。所有结果独立标明配置变化，保留默认环境失败和远端 Actions 未执行的边界。

## 第 39 轮：npm 单连接完整安装预检

第 38 轮正式 CI 已在官方 npm 源的多个 tarball 请求出现 ECONNRESET；HTTPS APT 成功并未解决 npm 整批传输。已保存的 [npm 10 配置文档](https://docs.npmjs.com/cli/v10/using-npm/config#maxsockets) 说明 maxsockets 限制每个 origin 的最大连接数，npm_config_ 环境变量可设置配置。这只支持连接并发假设，尚未证明网络或代理根因；实际默认值须在容器中读取。

在本轮证据根的独立 `npm-single-connection` 目录保留新结果，复用固定 5fa06f51 的 source.tar，核对源身份、tar SHA-256 和锁文件。使用缓存官方 node:22-bookworm 镜像的唯一临时容器，空 node_modules/npm/浏览器缓存，无主机目录挂载、端口发布或凭据。该 Debian / Node 22 试验只验证 npm 安装，不能算 Ubuntu 或 Chromium 验收。

只对执行命令设置 `npm_config_maxsockets=1`；读取 Node/npm、默认与生效 maxsockets、audit、ignore-scripts、strict-ssl 与 registry。保持 `audit=true`、`ignore-scripts=false` 和证书验证，原样执行 `npm ci` 一次，900 秒超时；不加 ignore-scripts/no-audit/offline、不注入缓存、不改依赖或机器配置。保存真实退出码、npm debug 日志、生命周期结果、完整安装摘要、实际安装节点版本/integrity 与根锁文件哈希；npm ci 成功不等于零安全告警。

无论成败都精确核对所有权后回收唯一容器，核对既有资源、678 个源/构建文件与 13 份旧资料。只有安装及上述核对全部通过，才在另一个证据目录准备全新空缓存 Ubuntu / Node 22 CI，沿用已验证 HTTPS APT 配置并增加相同容器级 npm 设置，原样执行七步一次，不复用预检安装缓存。预检仍失败则停止追加同类变体，保存外部阻塞并返回父任务；完整 CI 失败也不原样重跑。
