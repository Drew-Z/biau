# 公开内容与证据关联核验

核验日期：2026-09-08。源码基线 `618d83af`，本地 build 为阅读子任务已验证的 `index-3_YH5-i2.js`。模式：Codex-only scaffold/review；model channel: none。所有业务源码、公开数据、索引与状态快照保持原状。

## 当前结论

现有公开内容的主体对应关系完整：15 个项目详情、9 个目录/发布记录、11 篇公开文章、31 份助手知识和 40 条 sitemap 路由。文章 summary 与实际 loader 返回正文的 slug/title/date/tag/detail/column/series 全部一致；助手 v1/v2 的已生成 JSON 与当前源码投影一致；sitemap 与当前项目、文章及状态列表集合完全匹配。87 篇旧文章继续在 archive/rewrite queue，不进入当前 loader。

另外发现两个真实问题：助手建议问题对损坏路径编码直接 `decodeURIComponent`，在组件已加载的情况下使整页崩溃；帆灵发布记录的备用状态引用使用项目 ID，却没有使用状态项目 ID。它们由下一轮独立修复，本审计不修改公开事实或链接。

## 项目与内容矩阵

下表“状态”来自当前版本化发布记录，属于配置/历史证据，不表示本次已验收线上业务。所有 15 个详情均有助手 `project:<id>` 和 sitemap `/projects/<id>`；六个互动项目是独立详情，不在九项目录中，也没有独立 publication。

| 项目 ID | 目录 | 发布 availability / access | 关联公开文章 |
| --- | --- | --- | --- |
| legal-rag | 是 | unchecked / login-gated | legal-rag-review；legal-rag-production-upgrade-plan |
| chatus | 是 | unchecked / login-gated | 无 |
| pet-workspace | 是 | online / public | pet-workspace-pipeline |
| ozon-erp | 是 | unchecked / login-gated | ozon-erp-architecture |
| biau-playlab | 是 | online / public | game-showcase-standard |
| anchor-learning | 是 | online / public | 无 |
| blog-semi | 是 | unchecked / case-only | agentic-rag-frontier-2026；content-modeling-project-site；public-content-governance；static-site-release-verification；blog-content-system-build-log |
| canvas | 是 | planned / case-only | 无 |
| game-first-tetris | 否 | 独立互动详情 | game-showcase-standard |
| game-next-spacewar | 否 | 独立互动详情 | game-showcase-standard |
| intespace | 否 | 独立互动详情 | game-showcase-standard |
| raiden-prototype | 否 | 独立互动详情 | game-showcase-standard |
| space-war | 否 | 独立互动详情 | game-showcase-standard |
| spacewar-ii | 否 | 独立互动详情 | game-showcase-standard |
| xunqiu | 是 | unchecked / public | xunqiu-android64-rebuild |

11 篇文章均为精选公开内容：6 篇项目复盘、4 篇知识积累、1 篇构建手记。Resources 与 AI Daily 博客栏目当前没有文章，与助手的待审核/待发布说明一致。Chatus、Anchor、Canvas 没有相关公开文章不自动构成缺陷；新稿需要具体选题和证据，不能从目录覆盖数推导出发布授权。

## 实际检查

以下 10 个命令均在该源码基线上实际 exit 0，日志见下节；没有执行写入型 `assistant:index`、`sitemap:generate` 或 Studio exporter。

| 命令 | 实际结果 |
| --- | --- |
| npm.cmd run project-details:check | 15 项，正文分组/图像/来源结构通过 |
| npm.cmd run project-registry:check | 12 identities、9 publications，通过 |
| npm.cmd run blog:check | 公开禁用语与草稿结构通过 |
| npm.cmd run docs:manual-gates-check | 分类、交叉链接和低敏边界通过 |
| npm.cmd run status:contract | 8 reliability projects、7 external targets、33 checks，通过 |
| npm.cmd run blog:audit | 11 summaries/loaders/files 与 87 archive entries 一致，无 orphan/hidden loader |
| npm.cmd run blog:knowledge-check | 4 篇知识文章结构/证据边界通过 |
| npm.cmd run blog:project-notes-check | 6 篇项目复盘结构/证据边界通过 |
| npm.cmd run assistant:kg-check | 31 documents、61 chunks、166 entities、231 relations，通过且生成产物新鲜 |
| npm.cmd run assistant:eval | 17/17 本地检索用例通过，modelCalls=0 |

额外通过只读 Node/tsx 数据核对：40 条 sitemap 集合、助手 v1/v2 JSON、11 篇正文与摘要元数据一致。结构化 href/sourceUrl/发布状态字段共收集 63 个站内引用、39 个不同目标，其中一项状态 ID 不匹配导致断言 exit 1；这是真实审计发现，不能写成“所有引用通过”。该核对不等价于逐篇人工核验所有事实与外部来源。

`npm.cmd run public-links:check -- --timeout 10000 --json` 实际 exit 1：43 个目标，6 个 HTTP 200、35 个 `connection_error`、1 个 ERP `HTTP 403`、1 个 Legal API `timeout`。35 个连接失败集中于当前 Node 对 Playlab 域族的网络路径，与既有审计中描述的网络栈差异相近；本轮没有执行生产浏览器交叉验证，因此只记录为未确认可达。既有 ERP unchecked gate 保留，不升级或降级其他发布状态。没有 `--write-status`，所有 public/status 文件未变。

## 已证实的本地候选

### P1：损坏地址导致助手挂载后的整页崩溃

- 来源：`src/data/assistant.ts:65` 与 `:82` 直接解码路径；`src/components/PublicAssistantWidget.tsx:1636` 每次 render 调用建议问题函数；`src/App.tsx:134` 起组件首次加载后保留挂载状态。
- 确定性核对：`/blog/%`、`/blog/%E0%A4%A`、`/projects/%`、`/projects/%E0%A4%A` 均抛 `URIError`，正常未知 slug/id 返回三个默认建议。
- 浏览器：390/1440 × 面板打开/关闭 × 博客/项目，共 8 次。在正常 `/blog` 加载助手后，以 SPA history 导航至损坏地址，每次记录 `URI malformed`、`#root.childElementCount=0`。全部 API 被本地 fixture 截获；只出现 health GET，没有业务提交或外部请求。
- 验收方向：损坏编码降级到普通未知详情与默认建议；保留正文/导航/返回入口。验证已加载但关闭的助手，正常编码、合法既有详情和后退恢复；不得借修复改写知识内容。
- 初次直接请求损坏地址被 Vite preview 拒绝，未进入 React。另一次在短缺失页尝试点击助手时因 footer 隐藏 launcher 未触发组件，因此那八次 timeout 不是崩溃复现。最终八次结论只来自先加载助手的独立检查。

### P2：帆灵备用状态引用使用了错误的 ID

- `src/data/projectPublication.ts:108` 为 `/status/pet-workspace`；`src/data/statusTargets.ts:499` 的实际状态 ID 是 `pet-gamer`。
- `src/pages/SiteStatusDetailPage.tsx:162` 按状态 ID 精确查找；390/1440 两种宽度直接打开错误地址均显示“没有找到这个状态页”，正确 `/status/pet-gamer` 均显示帆灵状态正文。
- 当前帆灵为 online/public，主要 CTA 使用外部展示页；该错误是版本化备用状态引用，不夸大为当前直接体验按钮已损坏。
- 既有 registry 检查只用 `startsWith('/status')`，所以该错误未被捕获。验收方向：修正为既有状态目标，并用真实状态集合校验全部 9 个 publication；Canvas 的 `/status` 总览仍合法，不改变 availability、access 或验收时间。

## 外部条件与后续边界

- AI Daily：最新已记账的真实 Edition 被渠道限流阻塞；generation、stage diagnostics、business evaluation、Feed/Cron 的关闭结论来自既有门禁记录，本轮未读取生产配置。渠道容量、真实版次、审核和发布仍需独立决定。
- Legal/ERP/Chatus 的受控核心流程、Xunqiu/Pet 的 APK release、Canvas 公开域名/隐私及截图，继续由原门禁任务负责，不把主站审计当作验收。
- 正文翻译、额外公开文章与新产品宣称没有本轮证据/决定，不自动执行。
- 当前修改只有任务资料，因此不重跑无变化的 lint/build/44 组 UI。阅读子任务在相同业务源码上的完整验证是既有基线，不冒称本审计又执行了全量 UI。

## 证据与交付

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-discovery-20260908-4f78e2a8f7f64b4799ddd9b9e3b8da57`。本任务 `evidence.json` 保存对应矩阵、精简浏览器结果和文件哈希。

- `content-project-details-baseline.log`、`content-blog-baseline.log`、`content-registry-baseline.log`、`content-manual-gates-baseline.log`、`content-status-baseline.log`。
- `content-blog-audit.log`、`content-blog-knowledge.log`、`content-blog-project-notes.log`、`content-assistant-kg.log`、`content-assistant-eval.log`。
- `content-public-links-baseline.log`：43 项只读联网结果，不是发布快照。
- `content-reference-matrix-baseline.log`：保留一项引用失败的原始断言；`content-reference-matrix.json` 是从同一输出提取的合法 JSON。
- `content-route-baseline-v2.json`：只采用其中四次 status 路径结果，另八次没有触发助手，不作通过/失败结论。
- `content-assistant-route-baseline.json`：八次最终崩溃复现；`content-pet-status-missing.png` 与 `content-malformed-assistant-blank.png` 为代表性截图。

只读探子没有返回可用结论，已中断，未采用其结果。旧 preview 已在恢复时退出；本次在相同 5184 端口重启，PID 31396，继续供下一子任务使用。首次无法进入 React 的一次性失败日志无后续用途，删除后其结论仍记在上文；其余证据保留。原有前导空格目录和持续 UI 未跟踪资料保持原状。
