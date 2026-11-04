# 验证记录（本地修复，尚未生产验收）

## 复现与修复

| 现象 | 修改前证据 | 本轮处理 |
| --- | --- | --- |
| 本站演示咨询却返回无关网页 | 截图原问题在禁用规划模型的回归中实际 route=web，site 断言失败 | 本站范围确定性路由，显式模式优先 |
| 只能看到某个项目的材料 | 本地检索的多个高分 chunk 来自同一文档，挤占其他已选项目 | 目录问题优先项目；每个文档一个证据槽 |
| 打开一段时间后无法发送 | 浏览器推进 721000ms，发送由 enabled 变 disabled，草稿保留 | TTL 不撤销当前文档就绪状态，下次打开检查 |
| 无响应一直等 | 健康/历史/聊天没有覆盖正文消费的前端截止时间 | 每健康请求 30s，生成 65s，其余助手动作 20s |
| 已收到 SSE 结果仍等待 | 原解析器等待 HTTP EOF | 终态帧完成后取消剩余 reader |
| 生产构建冷启动重试丢草稿 | 新访客出现额外 session 恢复；404 后输入清空 | 会话初始化读取不写存储，挂载完成后持久化 |

## 已通过

- 截图原问题后端回归：siteCalls=1、webCalls=0、answerCalls=1、networkCalls=0、6 条真实本站知识来源。
- 新增浏览器回归：40 场景，分别在 Vite 开发模式与最终生产构建通过；1440/320/390/430，两种语言、三种主题代表组合。
- 浏览器覆盖 health 连接/正文停滞、显式重试、20s 历史超时、65s 生成超时、无 EOF 的 result/error、JSON 兼容、无数据库的新会话、连续追问、来源链接及草稿保留；模型调用均为本地夹具。
- `build`、`lint`、`server:build`、`git diff --check`。
- `assistant:public-agent-check`、`assistant:public-image-check`、`assistant:public-model-check`、`assistant:public-metrics-check`、`assistant:public-quality-check`。
- `assistant:public-api-check`、`assistant:public-conversation-check`、`assistant:public-browser-state-check`、`assistant:public-persistence-check`、`assistant:public-rate-limit-check`。
- `assistant:public-web-check`、`assistant:public-sync-check`、`assistant:hybrid-contract`、`assistant:service-modes-smoke`、`assistant:rag-smoke`、`assistant:kg-check`。
- `server:smoke`、`cf-assistant:smoke`、`docs:deployment-check`。
- `consultation-1440.png` / `consultation-390.png` 已人工查看；数据见 `consultation-preview.json`，明确为本地无模型夹具，不是生产模型成功证据。
- 最终生产构建上的公开助手整组通过：图片 72、分支 32、历史恢复 188、反馈 72、可用性 40 场景，以及主脚本内的咨询、追问、取消与恢复断言；真实模型调用为 0。
- 已将截图原问题接入常用 `assistant:public-model-check`，实际 npm 命令退出码 0：原模型适配合同及新增 consultation 回归均通过，siteCalls=1、webCalls=0、answerCalls=1、networkCalls=0、citations=6。两个检查各在独立进程执行，避免夹具污染。

## 检查中的失败与限制

- 一次 TypeScript 构建失败：SSE 包装后的返回类型推断为 unknown；已明确声明 Promise<PublicAssistantAnswer> 后构建通过。
- 生产浏览器测试曾把全部 API 次数当作健康次数，已改为只比较 health 的前后计数。
- 后续冷启动测试失败进一步暴露真实的渲染期存储副作用，未放宽草稿/恢复断言；修复后开发和生产均通过。
- 第一轮完整 UI 在测试脚本与初始化修复期间主动停止，未计为通过。
- 后续完整回归在反馈第一条响应收尾停滞。最小 Chromium 对照确认 cancel 未读成功正文会缺少 completion event，read 正文正常完成。反馈/取消/删除已在 deadline 内消费正文；API 增加三项正文收尾断言，反馈 72 场景独立通过。测试本身的 `response.finished()` 也增加 20s 上限。该停滞运行未计为通过；修正后的完整运行已通过反馈与整个助手组。
- 最终完整 UI 退出码为 1：45 组中 44 组通过、1 组失败，用时 2341887ms。`catalog-projects` 在 `stellar-zh-1440` 的 `freezeBorderFlowNearCount` 等待 15s 后超时，最后成功阶段为 `edge-glow-navigation`，页面错误/API/模型调用均为 0。相关组件、样式、检查脚本与 HEAD 一致；不能据此认定本轮助手修改导致该失败。
- 同一构建独立复核首页排版通过：24 配置、98 背景采样、0 模型调用；暂未稳定复现全量中的超时。全量仍记为未通过，失败之后的项目展示余项及 AI 日报组未完成；未重启整套测试或扩展修改首页动效。证据见 `full-ui-result.log`、`ui-regression-result.json`、`home-typography-timeout.png`；其他检查及中断日志见 `local-check-logs.json`。

## 线上边界

- 浏览器只读 GET 两个公开 origin 的 `/api/health` 均为 200，ok/database/modelConfigured/webSearchConfigured=true；这只证明配置与健康入口，不证明模型可回答。
- Node 请求的 ECONNRESET/TimeoutError 与浏览器结果不同，不据此判断网站故障。
- 用户截图明确显示模型降级；尚未获取足以区分凭据、模型、上游或协议问题的线上日志。
- Render MCP 曾连接失败，重试后列出 My Workspace；工具要求用户确认 workspace 后才能读服务，确认仍待用户回复。
- 未调用生产 chat、模型、embedding、搜索或重放旧验收；未提交、推送、部署、修改生产配置或 public/status。

## 恢复与保留

本轮使用独立集中恢复清单（见 recovery.json）；修改前干净文件由精确 Git 提交恢复，保留原路径、SHA-256 与字节数。
13 个 Git 恢复对象已复核，清单分别记录 Git blob 与修改前工作区的字节哈希。直接 LF/CRLF 比较最初无法匹配四个混合换行文件；按保留换行在内存中还原后，13 个修改前工作区哈希全部匹配，没有为此重写源码。
后续接入回归时修改了原有脏 `package.json`，已在同一恢复组保存并验证实体基线。按字节验证仅追加一条检查命令，原有 sitemap 脚本、其他命令、依赖及换行均保持原样；没有变更浏览器/服务器运行时代码，因此沿用上述构建与助手 UI 证据。
原有脏工作区、未知目录、历史 worktree 与 B1—B3 恢复组均未清理。
已核对进程命令与监听端口并停止本轮 4184/4185 Vite 服务。已删除本轮独占临时目录 `C:\Users\zhang\AppData\Local\Temp\blog-semi-assistant-l4eoduci`（832 个文件、1 个子目录、249297008 字节）；删除前验证绝对路径与无链接，检查日志和失败证据已提取到本任务目录。
本目录的咨询预览、检查日志、全量失败截图与验证报告保留。原有 ` .trellis/`、`undefined/`、未跟踪文件、历史 worktree、构建缓存及用户提供的截图没有删除。

当前任务保持 `in_progress`：公开助手本地修复和专项验证已完成，但全量 UI 未通过，线上模型故障日志及生产回答仍待验证；未提交、推送或部署。
