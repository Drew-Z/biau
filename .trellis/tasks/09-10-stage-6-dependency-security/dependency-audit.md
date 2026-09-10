# 依赖安全修复记录（2026-09-10）

## 审计方法与范围

对当前 package / lock 副本使用官方 npm registry 执行 `npm audit --package-lock-only --ignore-scripts --json`；明确提供空 user/global npm 配置，不读取私有配置。旧记录说明配置镜像不支持 advisory endpoint，因此审计查询使用官方源。审计只报告已知 npm 公告，不是完整应用安全证明。

初始结果为 16 个告警依赖条目：3 moderate / 13 high。定向兼容更新后，完整审计与 `--omit=dev` 审计均剩 4 high，实际退出码均为 1，错误字段为空。没有隐藏告警、修改阈值或执行 `npm audit fix --force`。

## 已修复条目

| 依赖 | 原锁定版本 | 新锁定版本 | 使用与验证范围 |
| --- | --- | --- | --- |
| baseline-browser-mapping | 2.10.35 | 2.11.21 | Browserslist / 构建目标 |
| brace-expansion | 5.0.6 | 5.0.9 | minimatch / lint 工具链 |
| browserslist | 4.28.2 | 4.28.9 | Babel / 构建目标 |
| fast-uri | 3.1.4 | 3.1.7 | Prisma streams-local 的 AJV 依赖 |
| nanoid | 3.3.12 | 3.3.18 | PostCSS 工具链 |
| postcss | 8.5.15 | 8.5.28 | Vite 样式构建 |
| qs | 6.15.3 | 6.16.0 | Express / body-parser |
| react-router、react-router-dom | 7.18.0 | 7.18.3 | 页面路由、历史、返回与阅读状态 |
| sharp | 0.35.2 | 0.35.4 | 图片证据与浏览器像素检查 |
| undici | 7.28.0 | 7.29.1 | Cheerio 的传递依赖 |
| yaml | 2.8.1 | 2.9.0 | YAML 合同解析 |

表中 React Router 占两个依赖条目，合计关闭 12 个条目。锁文件另同步了 Sharp 的平台二进制 / libvips / emnapi 依赖和 Browserslist 所要求的数据包；这些父依赖的最低范围随上游补丁一并变化。

最终共 43 个锁定节点升级，没有新增或移除节点，没有纯 metadata 改动。npm 生成候选时顺带把 cookie、escalade、set-cookie-parser 的下载域名改为官方源；它们版本与 integrity 相同，已恢复原 URL 以避免无关改动。实际升级包使用官方 npm 包地址与上游 integrity，不批量改写其他来源。

所有父依赖范围检查均通过，没有跨主版本变更。package.json 及锁文件根声明保持；Prisma、adapter-pg、client、全部 @prisma 节点以及 Playwright / playwright-core 保持。Linux x64 / Node 22.23.2 与 Windows x64 / Node 24.14.0 的适用包 engine 检查通过。32 位 Windows Sharp 可选包只支持 Node 20，按其 cpu / os 元数据排除于本次两个 x64 目标；不能把全部平台可选包混在一起判定目标环境不兼容。

## 残留项与实际路径

### deepmerge-ts / @prisma/config / prisma

- 固定链：`prisma@7.9.1 → @prisma/config@7.9.1 → deepmerge-ts@7.1.5`，最后一条是精确版本约束。
- [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) 描述合并匹配路径上的递归对象图导致同步栈耗尽；公告明确普通 JSON 本身不会生成该条件。官方 audit 标记受影响范围 `<8.0.0`。
- 本仓库只在 `prisma.config.ts` 通过 `defineConfig` 提供仓库控制的 schema 路径和 datasource 字符串；源码检索未发现 API / 页面把请求对象送入 deepmerge 或动态 Prisma 配置。当前使用路径未出现公告要求的攻击输入，不代表未来所有调用方式都安全。
- npm 给出的自动消除建议涉及将 Prisma 降到 6.19.3，跨越现用 Prisma 7 API；不采用强制降级或绕过精确版本的 override。

### mysql2 / prisma

- 固定链：`prisma@7.9.1 → mysql2@3.15.3`，是精确版本约束。
- [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) 涉及恶意 MySQL 服务的认证插件降级；[GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3) 涉及启用 MySQL 压缩协议后对服务端压缩包的无界解压。
- `prisma/schema.prisma` 的 datasource provider 为 PostgreSQL；`server/src/db.ts` 使用 `PrismaPg`。src / server / scripts / prisma 配置范围内没有 mysql2 导入或 MySQL 连接路径。本轮没有连接数据库，也没有创建 MySQL 服务进行探测。
- 残留保持可见，等待 Prisma 提供兼容的依赖修复；若引入 MySQL、动态配置或新 CLI 数据源，应重新评估这些路径。

### 为什么生产投影仍报告 4 项

虽然 prisma 写在根 devDependencies，`@prisma/client` 同时将 prisma 声明为 optional peer；当前锁文件中的 Prisma 节点没有 dev-only 标记。实际 `--omit=dev` 审计仍保留这条链。因此本记录不以“只在开发依赖”作为豁免，也不声称生产投影已归零。

### 旧 React Router 例外已关闭

7 月记录的 [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) 当时没有兼容修复；当前官方公告给出 7.18.2 补丁。本仓库 `src/main.tsx` 使用 Vite BrowserRouter，没有不稳定 RSC handler，仍主动升级到兼容的 7.18.3 并验证浏览、历史和返回合同。旧的“无兼容修复”结论不再适用。

## 验证边界

- npm 安装实际更新 17 个本机适用包，exit 0；忽略生命周期脚本，安装后 package / lock 哈希仍与审查候选一致。
- lint、前后端 build、公开助手 agent / image / model / metrics / quality / API / conversation / browser-state / persistence / rate-limit / web / sync、Cloudflare 本地桥接夹具、AI Daily source / evidence / YAML 合同、项目图片证据 / 发现 / registry / 公开链接投影、分析、预算和部署文档检查共 27 项均 exit 0。
- 浏览器 smoke 为 21/0，完整 UI 为 46/0（1306557ms），均取得实际 exit 0；完整性与资源退出结果见 verification.md。
- 本次是 Windows x64 / Node 24.14.0 下的应用回归；Node 22 的 engine 校验是静态条件检查。Ubuntu / Node 22 浏览器 CI 仍受下载条件阻塞，未被本项替代。
- npm Undici 包升级不等于升级 Node 自身内置的 HTTP 实现。本仓库对 Cheerio 的直接调用为 `load()` 解析已取得的 HTML，本轮没有改变网络访问或生产配置。

证据位于 `C:\Users\zhang\AppData\Local\Temp\blog-semi-dependency-triage-20260910T072022177Z`：audit.json、candidate-full / candidate-production audit、dependency-graph.json、final-lock-diff.json、candidate-range-check.json、engine-check-platforms.json、installed-versions.json、官方公告正文与逐项检查日志。所有 raw audit 的退出码 1 都被保留。
