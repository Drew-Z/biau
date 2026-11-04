# 执行记录

- 基线 HEAD：747174b6d1957c2e23fb375da8fd2a09015e120f。
- 恢复点见 recovery.json；干净已跟踪文件登记 Git 提交和工作区字节哈希，未提交文件不覆盖。
- 先保存可复现的失败，再实施路由、超时和状态修复。
- 验证：截图原问题、本地失败模型、前端 API/浏览器状态、助手交互回归、lint/build/server:build，适用服务合同。
- 生产部署与真实模型回答尚未验证。

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
