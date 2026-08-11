# 泊岸公开项目与入口审计

更新时间：2026-08-11

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
| `ozon-erp` | 商舱 OpsDeck | active | online | login-gated | direct | 2026-07-06 API health 与开放注册 bootstrap 通过 | Ozon ERP | 后续用低敏生产账号复核注册、登录和核心业务流；入口必须继续提示登录边界 |
| `biau-playlab` | 游湾 BIAU Playlab | maintained | online | public | direct | 2026-07-09 验证 3/3 页面、6/6 试玩页和 36/36 资源 | BIAU Playlab | 按游戏分别持续做移动端输入、加载和资源回归，不给小游戏单独创建 IP |
| `anchor-learning` | 锚学 Anchor Learning | mvp | online | public | direct | 2026-07-27 生产 Playwright 覆盖桌面、平板、手机与内置学习流程 | Anchor Learning | 保持静态 Demo 边界，不宣称网页端已有 Flutter 导入、云同步或实时 AI |
| `blog-semi` | 泊岸 BIAU Port | active | unchecked | case-only | status-only | 当前项目详情只是主站案例入口；生产可靠性由独立状态页表达 | BIAU Port | 不增加指向自身的外部 CTA；继续维护主站 synthetic 与状态页 |
| `xunqiu` | 寻球 BallTrail | mvp | unchecked | public | status-only | 2026-07-14 后端 base 未配置、兼容 API 未检查；APK 只有 stage 产物且未批准公开 | Xunqiu | 分别补展示入口、后端 health/compat 与正式 APK release 证据 |
| `canvas` | 画帆 BIAU Canvas | mvp | planned | case-only | status-only | 已确认 Cloudflare Pages 部署主体存在；账号级 Dashboard 地址不进入公开仓库 | BIAU Port | 确认公开域名、维护边界、隐私/存储/限额/删除规则、截图和 synthetic 后申请 online |

## 站点功能产品门槛

| 功能 | 当前结论 | 升级为产品级可用的必要证据 |
| --- | --- | --- |
| 知航 BIAU Beacon（公开助手） | 工程就绪，生产生成降级，待重新验收 | 先处理当前上游 `5xx`，再用一次经批准的真实业务请求完成有用回答、引用核对、刷新持久化、浏览器侧失败恢复和手机视口观察 |
| 潮讯 TideBrief（AI 日报） | 工程就绪，待真实 Edition | 一期真实来源采集、生成、人工审核、Publish Export、部署和公开 Feed/详情页验收 |

## 链接治理

- `entry`：受 availability/access 规则控制；不可用时替换为状态或规划入口。
- `documentation`：只要文档目标本身有效就继续保留。
- `repository`：只要仓库本身允许公开就继续保留。
- `evidence`：用于 API health、公开材料或历史证据，不因产品入口关闭而自动隐藏。
- `status`：始终使用站内状态路由，不打开外部窗口。

## 本轮网络限制

2026-08-12 的本机 `public-links:check` 检查 43 个链接，其中 37 个失败。失败几乎集中在 `*.playlab.eu.cc`；DNS 仍能解析到 Cloudflare，但 `curl` 对主站、游戏站和寻球站均在 TLS 连接阶段收到 connection reset。GitHub、Chatus、Legal RAG Web/API 同时可达，因此不能把这组同域族网络失败解释为 37 个页面同时下线。

本轮未写入新的 public status 快照，也没有用本机连接重置覆盖已有正式 synthetic 证据。缺少可靠当前证据的项目保持 `unchecked`；ERP 入口单独返回 `403`，继续保留为生产访问边界复核事项。
