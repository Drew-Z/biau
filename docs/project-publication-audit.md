# 泊岸公开项目与入口审计

更新时间：2026-08-18

## 审计目的

这份清单区分项目案例是否值得展示、产品入口是否可用、访问是否受登录约束。项目入口不可用或证据不足时，主站继续保留案例、截图、技术复盘、源码和文档，但不把直接体验按钮包装成可用状态。

本清单不保存账号、token、数据库 URL、Cloudflare/Render Dashboard 地址、模型渠道或其他生产诊断。

## 状态语义

- `maturity`：案例与产品完成度，不表示线上可达性。
- `availability`：`online | degraded | offline | unchecked | planned`。
- `access`：`public | login-gated | case-only`；登录门禁不是故障状态。
- `CTA`：`direct` 直接体验、`caution` 带状态提示访问、`status-only` 只进入状态/规划页。

## 项目结论

| 项目 | 公开身份 | maturity | availability | access | CTA | 低敏证据 | Owner | 后续动作 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `legal-rag` | 律航 LexBeacon | mvp | unchecked | login-gated | status-only | 2026-07-06 API health online；RAG QA、合同审查和质量面板因缺少低权限 demo 凭据未验收 | Legal RAG | 准备可回收 demo 凭据后完成受保护核心流程验收 |
| `chatus` | 泊语 HarborTalk | active | unchecked | login-gated | status-only | 聚合状态曾确认登录入口响应，但没有本任务要求的邀请/session/核心工作流公开验收 | Chatus | 在 Chatus 自身受控流程中完成邀请入口与核心工作区验收 |
| `pet-workspace` | 帆灵 SailSprite | mvp | online | public | direct | 2026-07-09 展示页与 4/4 截图通过 synthetic | Pet workspace | 展示入口可用；APK 下载继续等待 release、签名、摘要、回归和人工批准 |
| `ozon-erp` | 商舱 OpsDeck | active | unchecked | login-gated | status-only | 2026-08-18 浏览器访问从产品域名重定向到托管停机页并返回 403；旧 synthetic 不能证明当前入口可用 | Ozon ERP | 先恢复公开入口，再用低敏生产账号复核注册、登录和核心业务流 |
| `biau-playlab` | 游湾 BIAU Playlab | maintained | online | public | direct | 2026-08-18 内容站和抽样试玩返回 200；试玩根路径返回 404，不能作为访客入口 | BIAU Playlab | 为试玩域补一个轻量索引或保持只暴露具体游戏 URL，并继续做逐游戏加载与输入回归 |
| `anchor-learning` | 锚学 Anchor Learning | mvp | online | public | direct | 2026-07-27 生产 Playwright 覆盖桌面、平板、手机与内置学习流程 | Anchor Learning | 保持静态 Demo 边界，不宣称网页端已有 Flutter 导入、云同步或实时 AI |
| `blog-semi` | 泊岸 BIAU Port | active | unchecked | case-only | status-only | 当前项目详情只是主站案例入口；生产可靠性由独立状态页表达 | BIAU Port | 不增加指向自身的外部 CTA；继续维护主站 synthetic 与状态页 |
| `xunqiu` | 寻球 BallTrail | mvp | unchecked | public | status-only | 2026-08-18 展示页、公开文档和后端部署文档均返回 200；这仍不证明后端 health/compat 或 APK release 可用 | Xunqiu | 分别补后端 health/compat 与正式 APK release 证据，再决定是否开放产品入口 |
| `canvas` | 画帆 BIAU Canvas | mvp | planned | case-only | status-only | 已确认 Cloudflare Pages 部署主体存在；账号级 Dashboard 地址不进入公开仓库 | BIAU Port | 确认公开域名、维护边界、隐私/存储/限额/删除规则、截图和 synthetic 后申请 online |

## 站点功能产品门槛

| 功能 | 当前结论 | 升级为产品级可用的必要证据 |
| --- | --- | --- |
| 知航 BIAU Beacon（公开助手） | 产品级最小闭环已通过 | 2026-08-16 经批准的真实站点问题返回 `answered / model`，单次生成、引用可达、会话清理、桌面恢复、离线恢复和 390px 移动端约束已有低敏记录；后续只做正常使用观测，不建立模型测活 |
| 潮讯 TideBrief（AI 日报） | 工程就绪，待真实 Edition | 一期真实来源采集、生成、人工审核、Publish Export、部署和公开 Feed/详情页验收 |

## 链接治理

- `entry`：受 availability/access 规则控制；不可用时替换为状态或规划入口。
- `documentation`：只要文档目标本身有效就继续保留。
- `repository`：只要仓库本身允许公开就继续保留。
- `evidence`：用于 API health、公开材料或历史证据，不因产品入口关闭而自动隐藏。
- `status`：始终使用站内状态路由，不打开外部窗口。

## 2026-08-18 只读入口观测

本轮只执行公开 GET、页面加载、标题和重定向读取，不登录、不提交表单、不调用模型，也不写入 `public/status/*`。结果用于入口治理，不替代核心业务流验收。

| 入口 | 结果 | 边界与结论 |
| --- | --- | --- |
| 泊岸主站 | `200`，标题与品牌正常 | 只证明首页入口可达 |
| Legal RAG Web / API health | `200 / 200` | 登录后 RAG 与合同审查仍未验收，保持 `unchecked + login-gated` |
| Chatus | `200`，重定向到 `/react-chat/` | 邀请/session/核心工作区未验收，保持 `unchecked + login-gated` |
| Anchor 官网 / Demo | `200 / 200` | 与既有生产浏览器证据一致，继续 `online` |
| Pet 展示页 | `200` | 展示入口可达；APK release 仍是独立 gate |
| Playlab 内容站 | `200` | 主入口可用 |
| Playlab 试玩根路径 | `404` | 不作为 CTA；具体游戏 URL 独立判断 |
| First Tetris / Raiden 抽样试玩 | `200 / 200` | 只证明 HTML 入口响应，不证明 WebGL 资源加载和真实玩法完整 |
| Next Spacewar 抽样试玩 | 浏览器提交阶段超时 | 单次超时不足以改写整个 Playlab 状态，列入逐游戏复核 |
| Xunqiu 展示页 / 两个公开文档 | `200 / 200 / 200` | 后端与 APK 未验收，保持 `unchecked` |
| Ozon ERP | 重定向到托管停机页，最终 `403` | 直接 CTA 关闭并降为 `unchecked`，等待恢复后复核 |

## 2026-08-12 网络限制

2026-08-12 的本机 `public-links:check` 检查 43 个链接，其中 37 个失败。失败几乎集中在 `*.playlab.eu.cc`；DNS 仍能解析到 Cloudflare，但 `curl` 对主站、游戏站和寻球站均在 TLS 连接阶段收到 connection reset。GitHub、Chatus、Legal RAG Web/API 同时可达，因此不能把这组同域族网络失败解释为 37 个页面同时下线。

2026-08-18 再次运行只读 `public-links:check -- --timeout 10000`，结果为 43 个链接中 38 个失败；失败仍主要集中在 `*.playlab.eu.cc`，并出现 Legal API `timeout` 与 ERP `HTTP 403`。同一时间窗内 Playwright 浏览器 GET 已确认主站、Anchor、Playlab 内容站、抽样试玩和 Xunqiu 文档可达，因此这组 Node `HEAD` 结果只作为网络栈限制记录，不作为入口离线证据。

本轮未写入新的 public status 快照，也没有用本机连接重置覆盖已有正式 synthetic 证据。缺少可靠当前证据的项目保持 `unchecked`；ERP 入口单独返回 `403`，继续保留为生产访问边界复核事项。
