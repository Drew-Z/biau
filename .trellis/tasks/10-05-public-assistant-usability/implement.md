# 执行记录

## 2026-11-05 目录与恢复续作计划

- 恢复点复用既有 manifest 的 `production-readiness-20261104.catalogRestoreFollowup`；干净文件基线 `dcb0aeb8`，保留其他任务改动。
- 复现默认站内检索只有 4 份资料，当前目录共 16 项；原夹具指定 6 条且自行构造 evidence，未覆盖真实默认链路。
- 从项目和入口策略生成有界目录投影，并接入 Public 的目录查询；保持向量资产与普通详情检索不变。
- 用禁网夹具验证完整目录、入口边界、模型输入引用，以及桌面/移动刷新恢复；只读复核 TLS。
- 完成模型/Agent/知识/API/浏览器状态相关检查、前后端构建、lint、status/deployment/manual-gates 合同和 diff 检查后记录候选。新增生产模型请求为 0。

## 2026-11-05 目录与恢复续作结果

- 默认检索最多 4 份资料与 16 项目录之间的缺口已修复。生成 3 组目录证据，长度分别为 830/869/867 字符；所有项目用途、项目页路径、公开/登录/案例访问边界完整进入实际 Responses 请求正文。3 组共享目录页的引用按 evidence ID 保留，模型不可用时仍返回有界 `degraded` 摘要，不声称完整回答或实时可用。
- `assistant:index`、`assistant:kg-check` 与真实默认 Agent/检索/模型适配器/公开投影的 consultation 回归通过。该回归以 1 个纯内存 Responses SSE 响应验证 16 项资料和 3 条引用，`networkCalls=0`；不把模拟的 `answered` 当成真实模型质量证据。普通详情、技术与凭据问题保持原路径。
- 既有向量知识文件与基线逐字节一致，仍为 32 documents / 75 chunks / 176 entities / 253 relations；本修复无需重新 embedding 或生产索引同步。
- 开发服务与生产构建各通过 40 项可用性和 8 次收到 `partial/model` 后的真实页面刷新检查；1440/320/390/430 下均恢复同一 Session/Revision、保留草稿、允许输入且不自动重发。历史交互专项 188 场景通过。夹具只在首次导航补默认主题/语言，不重置 registry/draft。
- `assistant:public-model-check`、Agent/API/browser-state/quality、hybrid-contract/rag-smoke、前后端 build、lint 和 status/deployment/manual-gates 合同通过；最后的目录标签与模型请求夹具修改后重新执行知识生成/检查、consultation、构建及相应 lint。完整 UI 大套历史上的 44/45 结果未被本轮专项覆盖。
- TLS 仅作只读复核：Cloudflare 域名、HTTP validation 与 verification 均 active，DNS 为 proxied CNAME 到 Pages；certificate packs 查询权限不足（9109）。本客户端仍观察到 `RemoteCertificateNameMismatch`/连接 reset，默认 Pages 域曾返回 200，但另一次 PowerShell 请求超时。无法据此归因于 DNS、证书签发或模型，也未修改 DNS/证书。
- 线上原问题的 `partial` 不能确定只由目录缺口造成；桌面刷新超时未在本地复现，线上恢复与完整回答仍待验收。当前仅完成本地候选；新增生产请求、生产配置修改、部署与索引写入均为 0。
- 候选文件、验证范围、恢复方式和下一次有界验收计划见 `catalog-restore-verification-2026-11-05.json`。原有桌宠改动的 3 个 SHA-256 均保持不变；本轮开发/预览服务已停止，没有遗留一次性临时文件。

## 初始执行基线

- 基线 HEAD：747174b6d1957c2e23fb375da8fd2a09015e120f。
- 恢复点见 recovery.json；干净已跟踪文件登记 Git 提交和工作区字节哈希，未提交文件不覆盖。
- 先保存可复现的失败，再实施路由、超时和状态修复。
- 验证：截图原问题、本地失败模型、前端 API/浏览器状态、助手交互回归、lint/build/server:build，适用服务合同。
- 初始本地阶段未验证生产部署与真实模型回答；2026-11-04 发布结果见文末。

## 已复现

- 截图原问题在缺失规划模型时实际路由为 web；测试断言 site 失败。
- 浏览器就绪后推进 721000ms：发送从 enabled 变 disabled，草稿仍存在。
- 健康、历史及聊天原实现缺少覆盖完整响应的浏览器截止时间。
- 全局截取高分 chunk 会让一个长项目挤占其他已选项目的证据。

## 实现

- 确定性本站范围、目录检索多项目优先、每文档证据槽及分条降级摘要。
- 共享 deadline；健康 30s/次（仍最多两次）、聊天 65s、其他助手动作 20s。
- SSE 终态不再等待连接关闭；就绪 TTL 仅影响后续重新打开检查，不锁死当前会话。
- 40 组桌面/移动浏览器故障夹具在开发和生产构建通过，包含连续追问与来源链接断言。
- API、浏览器状态、19 项助手/服务/构建/lint 检查通过。一次 build 暴露 SSE 返回类型推断问题，已用明确 Promise<PublicAssistantAnswer> 修复后 build 通过。
- 完整 UI 已结束：45 组中 44 组通过、1 组失败；公开助手整组通过，项目展示组在 Stellar 首页边框流光采样等待 15s 后超时。相关组件、样式与测试脚本均与 HEAD 一致。

## 生产构建回归中的进一步修复

- 新访客冷启动重试触发错误的历史恢复并清空草稿：移除会话 reader 的存储副作用，改为组件挂载后持久化；补充 pageshow 恢复检查。
- 完整回归曾在反馈响应收尾挂起：最小 Chromium 对照证明取消未读成功正文缺少完成事件。反馈、取消和删除成功响应改为在 deadline 内消费正文；API 增加三项正文收尾断言，反馈测试增加 20s 等待上限。
- 修正后独立反馈 72 场景和生产可用性 40 场景再次通过；此前中断的完整运行不算通过。
- 全量失败后的独立首页排版复核通过：24 配置、98 个背景采样、0 模型调用。同一构建单独运行未复现超时；保留全量失败状态，不能用专项复跑覆盖整套结果。未重跑已通过的助手组，也未扩展到首页动效修改。

## 常用检查入口补全

- 截图原问题的 consultation 回归原本只列在文档中，没有被常用模型检查执行。将其串行接入 `assistant:public-model-check`，使用独立进程隔离 fetch/env 夹具，任一检查失败都会使 npm 命令失败。
- `package.json` 原有 sitemap 检查改动已在同一集中恢复组保存并校验实体基线；本次只追加该模型检查命令，不改变依赖和其他脚本。

## 2026-11-04 继续处理

- 用户授权按“公共助手 → 未提交成果与发布 → 状态快照/台账 → AI 日报验收”顺序推进，已确认 Render My Workspace；复用本任务。
- Cloudflare 当前生产提交为 `747174b6`，Pages uses_functions=true，公开 API proxy base 与 Render 匹配。Render Public live 仍为 `c4a13197` / `dep-da0sctlbedkc73bgnra0`，10 月咨询修复尚未部署。不能把 HTML 响应直接诊断为缺少 Functions。
- 三个 Render 服务均为 free、未暂停、关闭自动部署。曾直接观察到 503 / Render Application loading，之后 Node 请求 Public health 和 Pages health 均返回 200 JSON。免费实例休眠/唤醒可解释部分首次等待；自定义域浏览器超时与 Node TLS 差异仍未解释，不能据此断言模型故障或恢复。
- Public 启动日志确认 19 条 migration 无待执行项、服务开始监听；从线上 Public 提交到候选 HEAD 没有新增 migration。未取得原故障对应 recovery 日志，不将缺少日志当成没有错误。
- 当前 Public Responses 主模型与既有批准一致，MAX_ATTEMPTS=1；fallback base/key 残留但缺少 `ASSISTANT_MODEL_FALLBACK_MODELS`，按 `hasCompleteFallbackConfiguration` 不启用备用模型。未修改模型配置、实例套餐或 Studio/RAG 服务。
- 当前 package/lock、桌宠 adapter/activity/样式/检查脚本、0.3.0 tarball 与 10 月 28 日交付哈希全部匹配；其完整 UI 46 组通过可作为有日期的历史证据。当前前后端生产构建已重新通过。
- 修正 main-site synthetic 的过度归因，返回 HTML 或 405 时只报告观察事实与待核验边界。
- 恢复点复用 `20261004T183744.706Z-public-assistant-usability`，新增 `production-readiness-20261104` 阶段；不覆盖 10 月原基线。
- 网络差异已定位：Windows 系统代理存在，Python urllib 自动读取，而 Node 默认不继承。仅为本轮子进程传入现有 proxy 并启用 `NODE_USE_ENV_PROXY=1` 后，同源 health 正常；未改系统代理、未放宽 TLS 或检查断言。
- 当前构建 40 场景助手可用性、21 组 UI smoke、站内 synthetic 7/7、lint、Prisma validate/generate 及助手全套相关合同通过。监测修正的 4 个 JSON/HTML/503/405 本地夹具通过；外部模型请求为 0。
- 线上 synthetic 为 6/7（缺少旧 sitemap 的 `/status/roleplay-demo`）、助手 health 200 / chat unchecked。8 个项目入口 7 online、ERP connection_error；按实际检查时间刷新本地快照，尚未公开部署。
- 发布依赖补核：Public 有远端 RAG 配置，`retrievePublicAssistantContext` 在远端成功时直接返回远端结果。完整发布候选因此包含 RAG 同版本部署与一次公开索引同步，不能只发布 Public 并声称知识更新已生效。RAG 前一 live 为 `dep-d9to1iqjobas73dfp3kg` / `65c8af15`；相对候选同样没有新增 migration。批准前不部署/同步，恢复方案见 release 文档。
- 日报独立准备：27 项确定性合同全部通过；Render Studio 四个功能开关均关闭。以生产 runtime 和本地批准包作离线构造校验通过，未读取平台 Secret File 内容。旧默认 acceptance 绑定失配仍保留；新增 ignored 的 `server/data/ai-daily-acceptance.cpa-v7-2026-11-04.local.json` 只绑定当前已批准 v7 proposal/bundle，evaluation=verified、其余业务 gate 均 missing、未封存；没有执行真实版次或沿用旧批准。
- 用户已明确批准当前候选的提交推送、三处部署、公开知识同步与一次原问题业务验收。生产索引修改前已保存 31/61/166/231 四表一致性快照与向量，并用 PostgreSQL 原表复合类型做只读恢复往返校验；未包含其它数据域，未执行生产写入。

## 2026-11-04 实际发布收口

- `83a859b6` 已提交推送；Pages/Public/RAG 均核验为该提交且部署成功，部署 ID 与只读检查见 `production-verification-2026-11-04.json`。
- 上次同步预检未发出 POST；续作重新核对配置、备份文件及四张表与基线一致后，于 14:10:46 UTC 发出唯一同步。上游 embedding 返回 HTTP 503，`accepted=false`，未进入写入事务。未重试、未修改模型/embedding 配置。
- 失败后远端仍为 31/61/166/231，最后同步时间仍是 8 月 11 日；32/75/176/253 仍仅是新版本的预期知识规模。health source checksum 证明部署源版本，不证明数据库同步完成。
- 原咨询验收 0 次、匿名测试会话 0 个；已批准问题和一次预算继续保留。回答/引用/会话恢复/390px 的本轮生产验收尚未开始，不能归档助手任务。
- 发布后只读监测为主站路由 7/7、同源 health 200、外部入口 7 online + ERP connection_error。更新状态源及快照，明确历史成功与本轮同步受阻；公网入口通过不代表受保护业务或模型通过。
- B1—B3 的静态内容已发布，B4 台账按实际完成部分更新；两项任务的 parent 均为空，不把旧网站路线图当成隐含父任务，也不重启旧循环。
- 日报准备已完成离线合同和当前 v7 绑定候选，仍未封存；容量问题与真实 Edition/review/export/Feed 门禁保留，未执行 Studio 部署或新模型调用。

## 2026-11-05 Embedding 切换收口

- 用户授权切换至 EmRank，使用 `Qwen/Qwen3-Embedding-8B`，维度保持 4096。旧配置已在既有集中恢复组以 DPAPI 加密保存并验证恢复；Public 生成模型与 Studio 未改。
- 新渠道首个同步超过原 20 秒限制；同批 8 个公开片段的一次诊断约 30.2 秒返回有效向量，据此把 embedding 超时设为 60 秒，再执行一次全量同步。
- 客户端连接在 180 秒断开，数据库审计确认原请求于 `2026-11-04T15:22:17.081Z` 完成。32 documents / 75 chunks / 176 entities / 253 relations、全部 75 个向量的模型/4096 维及完成 checksum 均匹配；预备本地续跑在写入前发现完成记录，因此没有重复调用。
- RAG 最终部署 `dep-dblkrpkipgvc73ece690` / `f6a4771a` 为 live，其后端及知识与原发布 `83a859b6` 相同。HTTP 断开不作为失败后立即重放的依据；契约已记入后端规范。
- 原问题真实咨询已消费 1 次，HTTP 200、route=site，4 条站内引用均返回 200；桌面刷新恢复、390px 无横向溢出/输入可用、删除会话后读取 404 均通过。
- 完整模型回答未通过：degraded/fallback，`provider_error`；精确时间窗日志为 `provider_unavailable / public_api / 5xx / attempts=1`。不把生成失败归因于 embedding，不重放问题，助手任务仍为 `in_progress`。
- 本轮合同通过：`assistant:public-sync-check`、`assistant:rag-pgvector-schema-check`、`assistant:hybrid-contract`；状态/文档最终检查与部署收口记录见 `emrank-verification-2026-11-04.json`。

## 2026-11-05 文本生成渠道切换

- 用户提供新渠道并允许选择其中模型；目录返回 6 个模型，选定精确 ID `gpt-6-luna`。官方文档用于确认 Responses/流式能力，渠道实际兼容性由现有 `generatePublicAssistantDraft` 验证。
- 用两份公开项目资料执行 1 次候选业务请求：HTTP 200，约 13.9 秒，answered、4 条有效引用、覆盖 2 个文档；未调用 Planner、数据库或其他模型，未保存原始回答。
- 旧 Public 配置和新凭据在既有恢复组使用 DPAPI CurrentUser 加密，恢复往返与访问权限核验通过；修改前 Git 恢复点为 `affdd1ea`。
- Blueprint、环境示例、部署合同和当前规范同步到新的文本模型；AI 日报历史配置保留。生产部署与业务结果继续记录在 `generation-verification-2026-11-05.json`。
- Public 环境更新自动触发 `dep-dblmehhsrm7s73f25efg`，部署 `affdd1ea` live；仅改 base/key/model/provider，非目标环境摘要一致。协议 Responses、schema off、1 次生成及原超时保持。
- 发送前的浏览器准备曾用展开态选择器，修正为初始 launcher 后可打开助手；其后自定义域从本客户端出现证书名称不匹配，保留 TLS 校验并通过 Pages 默认域继续。上述准备观察没有业务请求。
- 共执行 2 个生产咨询：第一个 HTTP 200，但 Playwright 读取流正文失败，未取得回答结论；改为页面渲染和持久化 Revision 后执行最后 1 次验证，约 10.6 秒返回 `partial/model`、route=site、5 条 claims 和 4 条 200 站内引用，recovery=none、attempts=1，未再观察到生成 5xx。
- 第二次的桌面刷新恢复超时，未进入移动恢复检查；两次临时 Session 均已删除且读取 404。生成渠道已响应，完整原问题/本轮恢复验收仍未通过，任务保持进行中，不再追加模型请求。上一轮恢复/390px 成功保留原日期，不能替代本轮观察。
