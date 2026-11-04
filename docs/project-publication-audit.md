# 泊岸公开项目与入口审计

更新时间：2026-10-05（B3 源码与本地产物核对；公开运行结果保留各自注明日期的观察）

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
| `roleplay-demo` | 角色剧场 Roleplay | mvp | online | public | direct | 2026-09-15 入口、角色分享页和低敏 health 观察；health 只记录服务状态 | Roleplay | 继续在独立服务维护角色来源、SFW 边界、限流和模型上游，不把入口可达扩写成长期 SLA |
| `pet-workspace` | 帆灵 SailSprite | mvp | online | public | direct | 2026-07-09 展示页与 4/4 截图通过 synthetic；2026-09-16 本地核验 release APK/AAB 归档 | Pet workspace | 展示入口可用；签名、安装/回归、版本说明和公开批准完成前继续关闭 APK 下载 |
| `ozon-erp` | 商舱 OpsDeck | active | unchecked | login-gated | status-only | 2026-08-18 浏览器访问从产品域名重定向到托管停机页并返回 403；这是历史观察，2026-10-04 未重新访问 | Ozon ERP | 先复核当前入口；若仍故障再恢复，随后用低权限身份独立验收注册、登录与业务 |
| `biau-playlab` | 游湾 BIAU Playlab | maintained | online | public | direct | 2026-08-18 内容站和抽样试玩返回 200；试玩根路径返回 404，不能作为访客入口 | BIAU Playlab | 为试玩域补一个轻量索引或保持只暴露具体游戏 URL，并继续做逐游戏加载与输入回归 |
| `anchor-learning` | 锚学 Anchor Learning | mvp | online | public | direct | 2026-07-27 浏览器 Demo 验收；v1.0.0 APK 于 2026-09-15 发布，9 月 16 日 API 核验摘要与当时本地产物一致 | Anchor Learning | 保持静态 Demo 边界；2026-09-24 readiness 复核仍 HOLD，处理 6 项阻塞后再更新移动端结论 |
| `blog-semi` | 泊岸 BIAU Port | active | unchecked | case-only | status-only | 当前项目详情只是主站案例入口；生产可靠性由独立状态页表达 | BIAU Port | 不增加指向自身的外部 CTA；继续维护主站 synthetic 与状态页 |
| `xunqiu` | 寻球 BallTrail | mvp | unchecked | public | status-only | 2026-08-18 展示页、公开文档和后端部署文档均返回 200；这仍不证明后端 health/compat 或 APK release 可用 | Xunqiu | 分别补后端 health/compat 与正式 APK release 证据，再决定是否开放产品入口 |
| `canvas` | 画帆 BIAU Canvas | mvp | planned | case-only | status-only | 已确认 Cloudflare Pages 部署主体存在；账号级 Dashboard 地址不进入公开仓库 | BIAU Port | 确认公开域名、维护边界、隐私/存储/限额/删除规则、截图和 synthetic 后申请 online |

## 2026-09-16 B1 事实复核

- 帆灵本地只读归档核验确认 release APK 0.1.0 / code 1（14,920,672 bytes，SHA-256 `ab60204e6ab0b94a84b2dccef32eb65e26b1cbba728dac56f167a8940ff89108`）和 release AAB（14,385,956 bytes，SHA-256 `0fad67e69ad1540bbe4ad23e0b6d79322cd9ab04b686db45bba785abe140777c`）。核验范围是归档结构、CRC 和 release metadata；没有把它扩写成签名、安装、完整生成流程或公开批准证据。
- 锚学 GitHub Release API 确认公开 `v1.0.0` APK（26,404,187 bytes，SHA-256 `3371870ee2691f0aa3496e2e6fb1153a6c028b840bfef33c924dbea8cf96d475`），与本地摘要一致。当前 Private Alpha readiness CLI 返回 `HOLD`，阻塞码为 `automated_gate_evidence_stale`、`android_build_bytes_mismatch`、`android_build_sha256_mismatch`、`release_day_acceptance_primary_stale`、`release_day_acceptance_fallback_stale`、`physical_device_evidence_stale`。
- Roleplay 的 health 只作为 `ok`、配置标签和角色数量等低敏服务状态记录；入口 HTTP 成功不代表上游模型长期健康、回答质量或 SLA。

## 2026-09-24 B1 本地续核

- 帆灵 APK/AAB 大小和 SHA-256 重新计算，与 9 月 16 日归档记录一致；本轮未验签、未安装、未执行完整生成流程，也未批准分发，不能把未核验写成源项目未完成。
- 锚学只读重跑 readiness CLI，退出 2 / HOLD，上述 6 个阻塞码不变。本轮未重跑 GitHub API、模型或设备验收；公开 Release 事实仍引用 9 月 16 日观察。
- 锚学源码已核对 checkpoint 恢复前的 readiness/用户决策、结束会话分支及编程练习来源核验界面；这里只确认实现存在，不替代运行验收。
- 本地内容和生成投影可更新；`public/status/*` 历史快照保持原样，状态页合并当前摘要、人工门禁与后续动作，checks 仍展示快照中的历史观察。快照刷新留待获准的状态发布步骤。

## 2026-10-04 B2 源码核对

本批只在主站同步源码事实与历史观察范围，未访问生产、登录、调用模型或写入业务。四项目的 availability、access、入口 URL 与 verifiedAt 均保持原政策；ERP 只纠正无日期的故障说明。

- 泊语：核对 `a7f41480` 基线及未提交工作树，Skill 可见范围、工具分配、MCP 执行器启用和确认策略分别校验；访客 Skill 为空，会话修复过滤已撤销能力。既有截图仍是已标注的合成夹具，不冒充当前生产材料。
- 律航：核对 `fd34e11c`，业务路由经过认证，导入进入文档/任务流程，RAG 返回引用与诊断，合同审查增强失败回退规则结果。mock 质量报告不证明真实模型效果，法律结论仍需人工复核。
- 商舱：核对 `e7179e00`，已有 Owner 后普通注册为 operator；写任务默认选择 real，只有显式关闭写入才阻止该路径继续检查凭据和目标。非 real 分支拒绝任务，并非完整 mock 业务；队列只是调度方式。8 月 18 日停机不能无日期地延续为今天的故障结论。
- 寻球：分别核对展示站 `d8d4ae62`、后端 `94b8f18b` 和本地 Android `0.1.0 / code 1`。展示站关闭 APK 下载；账号和通配旧接口仍有 stub；R2 配置缺失会跳过上传但生成占位 URL。三层必须各自提供运行与发布证据。

源码锚点、版本和主站验证结果见 `.trellis/tasks/09-16-project-portfolio-refresh/b2-verification.md`。本次未运行源项目测试、构建、验签或安装；`public/status/*` 保持原字节，当前摘要/门禁覆盖静态快照，checks 继续携带历史日期。

## 2026-10-05 B3 源码与本地产物核对

- 游湾继续承载六游戏集合，目录仍为 10 个主项目、3 组，6 游戏保留独立详情。入口政策、URL 和 verifiedAt 未修改。
- Tetris 已有计分与触屏动作桥接；Next Spacewar 菜单/战斗源码标识为 `0.17`，不是将历史 M14 里程碑当成当前版本；intespace 为 `0.1.0-phase06 / prototype`，候选状态依赖模式/路线试玩样本，本轮没有执行该门禁。
- Raiden 源码为 `RC-0.4`，局内“可评审/强候选”是章节评分文案，不替代发布验收。Space War 的本地 `v1.1.1` 标签对应 2026-04-11 历史提交，不能给当前源码或 Web 包直接贴此版本。
- Spacewar II 实际入口是 `NokiaMenu -> NokiaBattle -> NokiaPlayer`，默认三阶段，WASD/方向键移动、空格射击、X 炸弹。纠正“自动射击”表述；移动题材、960 × 540 视口与 canvas 检查不证明触屏可玩。
- 六套本地 HTML/JS/WASM/PCK 存在，尚未绑定源码提交和当前线上资源摘要。前五游戏存在 playtest MP4 与 AVI 处理脚本，Spacewar II 同类短视频待补；游戏条目更新于 2026-06-28，不等于素材采集日。
- 主站本地已有三组项目目录、文章搜索/分页、URL 状态、阅读返回、三主题和中英文公共界面；正文/历史素材不自动翻译。本地 main 与已存储 origin/main 相同，不证明工作树更新已上线。
- 知航沿用 2026-08-16 有范围的产品验收；潮讯 2026-08-18 v7 Edition 限流、Revision 15 拒绝并丢弃，真实 Edition/审核/Publish Export/Feed 仍待验收。未访问生产、调用模型、启用 Feed/Cron、重导出游戏或写公开状态快照。

版本、源码锚点、产物摘要与本地验证见 `.trellis/tasks/09-16-project-portfolio-refresh/b3-verification.md`。

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

2026-08-19 主站提交 `fbba41e3` 已由 Cloudflare Pages 生产部署 `3a084666` 成功构建并发布。Cloudflare 控制面显示 `biau.playlab.eu.cc` 的域名、验证与部署别名均为 active；稳定 Pages 域名随后通过 6 种外观、场景持久化、自动主题响应及浅/深色 320/390/430px 共 14 组只读生产检查。本机对自定义域名的 IPv4 TLS 请求仍收到 connection reset，因此继续按网络路径限制处理，不把它写成站点下线，也不据此改写 public status 快照。

本轮未写入新的 public status 快照，也没有用本机连接重置覆盖已有正式 synthetic 证据。缺少可靠当前证据的项目保持 `unchecked`；ERP 入口单独返回 `403`，继续保留为生产访问边界复核事项。
