# 本地快速开始验证（2026-09-11）

## 范围与结果

本轮只修正 README.md 和 README.zh-CN.md 的快速开始：Node 22.x 至少 22.13.0，或 Node 24.x；首次检出用 npm ci 安装已提交的锁文件；Windows 示例使用 PowerShell 7 / npm.cmd，其他系统使用相同参数的 npm。保留知识生成、前端启动和可选后端启动的原顺序。

起点为 047dbed484a94dc7b44a5c3f24db6a9b479a81c8。没有改 package / lock、运行时代码、workflow、模型或生产配置。工作提交 de9a5658362612e869da8291d6a445a0abd6d5a2 包含已核对的 10 个白名单文件，未签名、未推送；已按父任务协议仅归档本子任务并实际返回父路线图，task.py list 确认 27/27 子任务完成。父任务保留 in_progress / waiting，其他未完成任务保持。

## Node 依据

从当前 package-lock.json 读取 engines.node，并按 os / cpu 筛选 Linux x64 和 Windows x64；分别有 452 / 447 个适用节点。这是 semver 静态条件核对，不是每个 Node 版本都运行过应用。

| Node 版本 | Linux x64 不满足节点 | Windows x64 不满足节点 |
| --- | ---: | ---: |
| 22.0.0 | 18 | 17 |
| 22.12.0 | 10 | 10 |
| 22.13.0 | 0 | 0 |
| 22.23.2 | 0 | 0 |
| 24.0.0 | 0 | 0 |
| 24.14.0 | 0 | 0 |

22.12.0 的拒绝项来自已锁定的 ESLint 10 工具链，要求 ^20.19.0 || ^22.13.0 || >=24。初步联合平台检查得到 19 个拒绝 22.0.0 的节点；上表拆开目标平台，避免将不同平台的可选二进制混为同一次安装。

## 文档验证

- 两份快速开始均有同一顺序的 7 条命令：node --version、npm.cmd --version、npm.cmd ci、assistant:index、dev、prisma:generate、server:dev。4 个 npm run 入口均存在于 package.json。
- README.md 的 15 处、README.zh-CN.md 的 9 处本地文件链接目标均存在，计数包含重复引用；未把外部地址或页内锚点当作已验证文件链接。
- PowerShell 7.6.5 原生 Parser 解析合计 14 条示例语句，错误 0；本轮没有执行这些安装、知识生成或服务启动命令。
- npm.cmd run docs:manual-gates-check 实际 exit 0：分类、交叉链接和低敏边界检查通过。
- git diff --check 实际 exit 0；Git 的 LF/CRLF 提示不代表内容或验证失败。
- 519 个业务源码、脚本、public 文件、依赖和 workflow 输入的原始 SHA-256 无漂移；原有 13 份未跟踪文件的集合及内容保持。
- 保护状态文件 SHA-256 保持 d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909。

这是文档修复，采用 README 规定的最小文档门禁；没有重跑 lint、build 或 UI，也没有将过去的 CI / UI 结果冒充本轮执行。此前已归档的完整 Ubuntu 七步验收保持独立有效。

## 剩余 Prisma 告警的只读更新

官方 registry 当前 [Prisma dist-tags](https://registry.npmjs.org/-/package/prisma/dist-tags) 的 prev 为 7.10.0，latest 为 8.0.0-rc.13。[Prisma 7.10.0](https://registry.npmjs.org/prisma/7.10.0) 仍精确依赖 mysql2 3.15.3；[@prisma/config 7.10.0](https://registry.npmjs.org/%40prisma%2Fconfig/7.10.0) 仍精确依赖 deepmerge-ts 7.1.5。不能用 latest 标签直接替换现有 Prisma 7。

在独立 package / lock 副本中，以空 user/global npm 配置和白名单环境对官方 registry 执行 npm audit --package-lock-only --ignore-scripts --json，并另跑 --omit=dev。两次实际 exit 1、error 为空，均报告 4 high：prisma、@prisma/config、deepmerge-ts、mysql2。副本和主仓库 package / lock 的前后原字节相同；没有安装包、force、override 或跨主版本变更。

smart-search fetch https://github.com/advisories/GHSA-ggr8-5vv4-36mx --format json 取得 Tavily 原文，仍记录受影响 <8.0.0、补丁 8.0.0，以及需要递归对象图的触发条件。没有调用模型；本轮没有重做整个应用调用路径审计，沿用原依赖任务的范围分析。

## 规范判断与清理

本轮没有引入命令/API/数据结构或基础设施合同。已有依赖来源与验证边界规范适用，不重复新增代码规范；Node 下限的具体依据保存在本记录和 README。CONTEXT.md 在 docs/agents/domain.md 明确为可选，不按缺失文件制造任务。

本任务独占 audit 临时目录已清理 31 个副本/配置/缓存文件，共 64733247 bytes。原清单保留逐文件路径、大小和 SHA-256；其 PowerShell 汇总字段为 null，后续从已保存的逐文件大小离线计算总数，未重复删除。原始审计 JSON、官方 metadata、验证结果和复验脚本继续保存。旧任务缓存、undefined 两文件及其他来源的资料均保留，未重试此前被拒绝的清理。

证据目录：C:\Users\zhang\AppData\Local\Temp\blog-semi-quick-start-20260910T1909322779799Z。主要文件为 baseline.json、engines.json、audit-full.json、audit-production.json、audit-results.json、prisma-*.json、deepmerge-advisory.json、docs-validation.json、powershell-validation.json、temporary-cleanup-manifest.json 和 temporary-cleanup-verification.json。
