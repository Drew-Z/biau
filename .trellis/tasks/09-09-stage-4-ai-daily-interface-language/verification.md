# AI 日报公共界面双语验证

基线提交：`c2c1c7a800d7c382bd988172b24b5b16502fa715`。
证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-ai-daily-language-20260909-1dc1d2cc`。
预览：自有 `http://127.0.0.1:5190`，PID 10300 与 Vite preview 命令已在最终冻结时核对。

## 已验证范围

- 两页固定介绍、状态、加载/错误/重试/分页、日期、修正标记和固定阅读目录消费唯一共享语言。
- 页面 state 保存有限错误类别；feed 的 404/429/503/network/default 与 detail 的 missing-id/404/410-withdrawn/410-expired/network/default 保留原判断顺序。
- `source-contract-review.json` 对照基线确认：两个 load 回调仅替换错误分类，feed 的一个请求 effect、detail 的请求/SEO 两个 effect 原样保留；ETag、abort/sequence、payload 和 60 秒轮询未改。
- 日期默认中文，feed 保留月/日/时/分、detail 额外保留年；本地时区、默认 hour cycle、原数值与 revision 不变。
- 作者文本仍中文；来源原文使用未知语言标记，动作单独声明界面语言。引用 URL、安全属性、产品名称、SEO 与固定 section ID 保持。
- 共享 fixture 工厂已与 `HEAD:scripts/check-ui.mjs` 逐字对照，仅增加 export；没有复制或放宽 decoder。

## 验证结果

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| public payload | 27 非法、3 合法 payload；19 UI 错误合同、两日期 locale 与中文默认通过 | `ai-daily-public-payload-check-first.log` |
| public feed | 本地 projection、DTO、ETag/304、CORS、分页、限流、状态及时效通过 | `ai-daily-public-feed-check.log` |
| analytics | 17 路由通过 | `analytics-check.log` |
| deployment docs | 三服务 public-only 部署合同通过 | `docs-deployment-check.log` |
| assistant knowledge | 31 docs / 61 chunks / 166 entities / 231 relations / 26 suggestions 通过 | `assistant-kg-check.log` |
| lint | exit 0，11435.3595ms | `lint-notice.log` |
| build | TypeScript + Vite 通过，exit 0，5161.1413ms | `build-notice.log` |
| performance | entry JS 304444/430000；entry CSS 152582/222755；route CSS 141959 bytes；零外部阻塞 stylesheet | `performance-final.log` |
| 日报语言专项 | 24 页面 + 4 加载 + 10 错误 + 3 内容状态 + 3 恢复组；modelCalls 0；exit 0，48854.2201ms | `ai-daily-language-final.log` |
| 完整语言 | 原有全部语言组及新增日报 44 组通过；modelCalls 0；exit 0，278890.4305ms | `language-final.log` |
| smoke | 21 组、0 失败、9878ms；外层 exit 0，10654.5116ms | `ui-smoke-final.log` |
| 完整 UI | 46 组、0 失败、1387595ms；外层 exit 0，1389226.792ms | `ui-full-final.log` |

公开 Feed、analytics、deployment、助手知识和 payload 合同运行后，其相关源码没有再变。最终 CSS 修正后的 lint/build/performance、日报专项、完整语言、smoke 和完整 UI 均为当前构建，已收取 session 63849 的实际 exit 0 终局。

## 负向与诊断

1. 旧业务构建：`ai-daily-language-negative.log` 在 320/Morning/英文因根语言未变化而失败，exit 1、1403.8567ms。
2. 首次实现：`ai-daily-language-first.log` 发现英文 coverage 挤占日期，freshness 宽 47px、内容 70px。`layout-before.json` 同时保存阅读链接 21px、retry 42px、缺失页动作 40px 的证据；英文分页为 42px。移动总览改为单列，相关动作补足 44px。
3. `ai-daily-language-layout.log` 的点击命中失败经 `reachability-diagnostic.json` 确认：原生 if-needed 滚动把链接停在固定底栏后；滚到阅读区中央后正常命中。仅改测试滚动定位。
4. `ai-daily-language-reachability.log` 的目录断言经 `anchor-diagnostic.json` 确认：目标 top 92.109375px，下一节 top 226.703125px 已进入既有 240px scroll spy。改用末节引用锚点验证 focus/Escape/真实跳转，未修改共享目录。
5. `ai-daily-language-anchor.log` 发现错误说明被 retry 挤至 77px、内容 83px。移动错误说明独占图标后的 220px 行，retry 换行；`final-scrolled-review.json` 确认最终文字无溢出且按钮 44px。

上述失败原始日志/退出状态/截图均保留，后续通过没有覆盖它们。

## 人工截图审查

已查看当前构建的六个代表视口：320/Morning feed、1440/Nature feed 与 detail、320/Morning withdrawn、320/Morning scrolled feed error、430/Stellar scrolled citations。状态、日期、错误恢复和引用可读，未发现需要继续修改的布局问题。仅此六个视口为人工审查；其余矩阵由浏览器断言覆盖。

## 冻结、保留与边界

`verification-final-freeze.json` 保存 32 个受检源码/检查器/规范/边界文件、49 个 HTML/JS/CSS 构建、9 个实际 preview 响应，以及十一份原有资料哈希。全量结束后 `post-run-hash-check.json` 再次核对全部文件、构建文件集与实际响应，drift 为零。

16 个受保护原始文件未改，包含 API decoder、App/共享语言与阅读逻辑、SEO、原数据、依赖和公开状态快照。`public/status/blog-semi-synthetic.json` SHA256 仍为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。

无 push/deploy/sign、真实模型调用、内容发布、业务 Feed/Cron 或 heartbeat 操作。全部浏览器内容来自本地 fixture，不构成新生产验收。作者正文/SEO语言、首页和助手剩余界面另行评估。

本轮只创建交付源码/检查器/任务资料及应保留的验证日志、JSON和截图；没有删除文件。原有十一份资料、历史 worktree、原5183服务保留。全量门禁通过后按精确白名单本地提交，再仅归档本子任务并实际返回父任务；实际提交与归档状态记录在 `delivery-evidence.json`。
