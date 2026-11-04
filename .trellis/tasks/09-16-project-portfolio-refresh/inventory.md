# 项目现状盘点（2026-09-16）

本轮目标是让主站准确反映现有项目的真实进展。用户已选择先更新现有项目，再考虑新增项目或扩大公开体验。本文件为只读盘点，不是发布完成记录。

## 1. 当前站点是什么状态

| 层次 | 本轮确认结果 | 依据 |
| --- | --- | --- |
| 产品身份 | 13 个，包括主站、知航、潮讯、画帆、文航与其他关联产品 | `src/data/productRegistry.ts:1` |
| 项目数据 | `projects` 共 16 个条目 | `src/data/portfolio.ts:130`；本轮直接加载模块计数 |
| 项目目录 | `catalogProjects` 为 10 个主项目；6 个游戏被排除在目录卡片外，仍有独立详情数据与路由 | `src/data/portfolio.ts:2337` |
| 页面分组 | AI 应用、全栈开发、工具，3 个目录分组 | `src/pages/ProjectsPage.tsx:43` |
| 首页 | 9 个项目入口，未加入画帆 | `src/data/hero.ts:37`；本轮读取 `heroContent.projects` |
| 入口政策 | 10 条 publication：4 个 online、5 个 unchecked、1 个 planned；主站本身和画帆为 case-only | `src/data/projectPublication.ts:87` |
| 状态数据 | 9 个可靠性项目、8 个外部目标、36 项检查 | 本轮 `status:contract` |
| 助手知识 | 32 documents、62 chunks、177 entities、254 relations | 本轮 `assistant:kg-check` |

`Project.status` 的 `main/live/mvp/ongoing` 是展示标签，`maturity`、`availability`、`access` 则是不同维度。当前 `online` 不表示本轮已重新验证服务，更不等于已经完成生产验收。

主站已经具备统一身份、项目详情、入口政策、截图、可靠性状态和助手投影。第一轮应修正事实和同步遗漏，沿用现有页面结构。

## 2. 本地、远端与线上分别观察

- 本地 HEAD 为 `8d9624fc`。开始盘点时已有主题、排版、Roleplay 接入、状态和助手等未提交改动。
- 本轮通过 `git ls-remote origin refs/heads/main` 实时读到远端 main 为 `5fd98f5664e3469d5884dec155abdee0f6aca610`；`git rev-list --left-right --count <remote>...HEAD` 为 `0 / 117`，即本地领先 117 个提交。
- Chromium 实际读取主站 `/projects` 得到 HTTP 200、标题“项目集 | BIAU Port”，页面已展示角色剧场及其两个公开入口，未记录页面 JavaScript 错误。
- 线上可见 Roleplay，而当前接入文件在本地尚未提交。因此不能从远端 main 推断线上全部内容，也不能把当前工作树当成已审定发布版本。部署对应提交和产物尚未核实。
- 同窗口访问稳定 Pages 域名遇到 `ERR_CERT_COMMON_NAME_INVALID`，仅作为当前客户端访问限制记录，没有忽略证书错误，也不据此判断自定义域主站下线。
- 浏览器观察限制为 GET/HEAD，阻止 `/api/` 与其他方法，没有登录、生成模型回答或执行产品写入。

首次浏览器检查使用了错误的项目详情锚点选择器，因卡片通过按钮导航而超时；按现有组件读取 DOM 后确认页面正常。该选择器超时不是站点故障。

## 3. 源项目对应关系

源目录均先解析位置再只读检查。下表路径相对 blog-semi 根目录；HEAD 只表示本地检出，不自动表示远端或部署版本。存在未提交内容的项目以“HEAD + 当前工作树”描述，不能把整个工作树归入该提交。

| 主站条目 | 源目录 | 本地版本线索 |
| --- | --- | --- |
| 角色剧场 Roleplay | `../que/seraphina-guest-frontend` | 非 Git 目录；README、Node 服务和静态前端可读 |
| 律航 LexBeacon | `../legal-rag` | `fd34e11`，2026-07-09；工作树干净 |
| 泊语 HarborTalk | `../chatus` | `a7f4148`，2026-08-10；存在未提交业务与任务改动 |
| 帆灵 SailSprite | `../pet/gamer`、`../pet/fantasy-pet-rule` | App/社区 `bd22174`，2026-07-21；生成侧 `555b192`，存在未提交内容 |
| 商舱 OpsDeck | `../erp` | `e7179e0`，2026-07-21；工作树干净 |
| 游湾 BIAU Playlab | `../game/blog` | `b76e215`，2026-07-09；工作树干净 |
| 锚学 Anchor Learning | `../learn/anchor` | `54b8e01`，2026-09-15；存在未跟踪内容 |
| 泊岸 BIAU Port | 当前仓库 | `8d9624fc` + 本轮开始前已有改动 |
| 寻球 BallTrail | `../../workspace4Codex/xunqiu/xunqiu-showcase-site`、`../../workspace4Codex/xunqiu-backend-modern` | 展示站 `d8d4ae6`（2026-07-14）；后端 `94b8f18`（2026-07-09），两者工作树干净；Android 未做完整源码审计 |
| 画帆 BIAU Canvas | 本轮未定位可核验的本地实现目录 | 仅能确认主站现有规划与准入记录；没有查询云端配置 |
| 文航 DocBeacon（候选） | `../enterprise-doc-agent` | `3e0c015` + 大量后续工作树成果；最新本地交付报告至 2026-09-16 |

Pet 是多仓工作区；展示站、App/社区、生成流程的状态不能互相代替。寻球的母目录不是本轮可用的 Git 仓库，展示站和现代后端必须分别定位。

## 4. 十个现有主项目的更新建议

| 项目 | 主站当前表述 | 源项目/本轮证据 | 推荐更新与顺序 |
| --- | --- | --- | --- |
| 角色剧场 Roleplay | 已有游客多角色演示、13 张角色卡、公开入口；技术栈写 `React-like static frontend` | 本轮线上主站已展示；源前端使用原生 DOM，Node 原生 HTTP 提供服务；health 只返回配置中的模型名、角色数与 `ok=true` | 第一批：修正技术栈；把服务配置响应与模型回答能力分开；把已有角色库图片绑定到正文截图块；补项目/状态 sitemap；核对既有接入记录的发布版本 |
| 锚学 Anchor Learning | 本地优先 Flutter 学习助手；Web 为 3 套数据、12 道题的静态 Demo；后续方向仍笼统写 Private Alpha 安装/迁移 | 9 月执行记录记载 DL-001—029 完成，654 项 Flutter 测试与 Web 75/93 项检查；最新发布计划记录当前候选 HOLD，部分执行摘要仍写 GO | 第一批：补来源核验、恢复、批量核验等已完成进展；明确 Web Demo 与 Android 候选；使用最新产物绑定的 HOLD 边界，不开放下载，不照抄冲突摘要 |
| 帆灵 SailSprite | App、社区与生成管线案例；明确写“当前本地只确认到 debug APK” | 7 月已加入受控 release 构建流程；本轮实际找到 release APK 和 AAB；源文档仍限制其为内部/受控分发，生成闭环有历史阻断 | 第一批：删除过时的“仅 debug”结论，改为“已有本地 release 产物，公开分发与端到端生成仍待各自验收”；同步主站内嵌展示页的对应说法 |
| 泊语 HarborTalk | 邀请制私人 AI 工作台；会话、长期记忆、路由、恢复；入口 unchecked | 源 README 将产品定位为受信任成员工作 Agent，编程/项目协作为首个能力包；具备 Skills/工具/MCP 分配、受限访客与新版后台说明；工作树仍有未提交治理改动 | 第二批：核对并补齐当前工作 Agent 的用途与能力授权；刷新可公开截图；保持邀请制、成员/访客差异；没有验收证据就不升级入口状态 |
| 律航 LexBeacon | 法律 RAG、合同风险审查、质量面板；unchecked + login-gated | 干净源仓与现有主站的功能结构基本一致；支持 mock、本地/pgvector、引用和规则审查；本轮未取得新的受保护流程验收 | 第二批：整理“导入—问答—引用—合同审查”案例，给旧观测加日期；保留工程演示和人工复核边界，不为了更新而编造新功能 |
| 商舱 OpsDeck | 店铺运营、采集插件、队列与审计；unchecked；原因仍写“当前重定向到停机页” | 源仓实现仍为 Vue/Express/Prisma/BullMQ/MV3；停机依据是 8 月 18 日历史观测，本轮未重新检查生产入口 | 第二批：把停机表述改为有日期的最近观测/待复核；说明 mock/真实写入、Owner 初始化与普通用户边界；保留业务案例，不宣称当前在线或持续故障 |
| 游湾 BIAU Playlab | Astro 内容站与 6 个 Godot 游戏；online 来自 7 月记录 | 源内容站确认相同 6 个 slug，具备独立 playable 发布管线；各游戏完成阶段不同 | 第三批：作为游戏集合入口；按下表对齐版本、玩法、操作、平台限制和素材；不把全部游戏标成相同完成度 |
| 泊岸 BIAU Port | 内容与助手平台；详情包含较早的 UI/内容说明 | 主站后续路线图已有大量浏览、语言、主题及交互成果；本地与远端存在 117 个提交差距；Roleplay 线上存在 | 第三批：以已核定版本更新自身案例、截图、导航和内容发现能力；知航/潮讯分别说明产品边界，避免把所有本地功能说成线上已交付 |
| 寻球 BallTrail | Android 64 位与现代后端迁移案例；unchecked；无 APK 公开下载 | 展示站 7 月已移除未批准下载；后端有兼容 API 与高风险第三方 stub；本轮未取得新的 Android/后端端到端证据 | 第二批：保留迁移案例，拆清展示页、后端、Android 三层进度；补最近观测日期和已知限制，不恢复下载或将 stub 写成真实接入 |
| 画帆 BIAU Canvas | planned + case-only，有上线准入清单 | 本轮没有新的可核验源码、公开域名和产品流程证据 | 保留规划项；压缩成清晰的目标与待补条件，不增首页推荐，不改为 online |

### 4.1 确定差异及可复核锚点

| 编号 | 差异 | 证据 |
| --- | --- | --- |
| F01 | 本地 sitemap 缺 `/projects/roleplay-demo` 和 `/status/roleplay-demo`，6 项既有检查均未报出这一遗漏 | 本轮对 `projects`、`reliabilityProjects` 与 `public/sitemap.xml` 做集合比较；生成器归属见 `scripts/generate-sitemap.mjs:18`、`:49` |
| F02 | Roleplay “React-like”不能准确表达当前静态实现 | 主站 `src/data/portfolio.ts:141`；源 `public/app.js:1`、`public/library.html:28`、`server.js:461`、`package.json:1` |
| F03 | Roleplay health 不会请求上游模型，不能作为模型质量/可用性的证明 | 源 `server.js:482`；主站 `src/data/projectPublication.ts:154`、`src/data/statusTargets.ts:134` |
| F04 | Roleplay 正文 `screenshot` 块未绑定图片，已有图片只用于项目封面 | `src/data/portfolio.ts:138`、`:205`；正文共 4 个 visual、0 个 image；既有详情结构检查通过不代表已证明真实截图覆盖 |
| F05 | 帆灵“仅 debug”与实际本地产物不符 | 主站 `src/data/portfolio.ts:745`；源 `gamer/docs/ops/android-release-build.md:7`；本轮只读产物检查见下表 |
| F06 | 锚学同一批文档存在 GO/HOLD 口径冲突，最新 APK 不等于旧验收对象 | 源 `docs/CURRENT_STATE.md:20` 写 GO；`docs/PRODUCTIZATION_RELEASE_PLAN.md:5`、`docs/OPEN_SOURCE_CHECKLIST.md:48` 写 HOLD；本轮 APK 哈希与后两份文件一致 |
| F07 | ERP 的历史故障仍使用“当前”表述 | 主站 `src/data/projectPublication.ts:131`；观测日期来源 `docs/project-publication-audit.md:25`、`:63` |
| F08 | 文航只存在 planned 身份，尚无项目条目，源项目已有更丰富成果 | 主站 `src/data/productRegistry.ts:128`；源 `docs/showcase/PROJECT_SHOWCASE.md:81` 及 9 月首次使用报告；按用户优先级放在后续接入 |

以上是 2026-09-16 初盘时的差异。2026-09-25 B1 本地收口已处理 F01—F06，结果见 [b1-verification.md](b1-verification.md)；F07、F08 仍待后续批次。F06 按 2026-09-24 实际重跑的 HOLD 表达，主站不回写源项目。

### 4.2 2026-09-16 初盘时的只读产物检查

| 产物 | 字节数 | SHA-256 | 能证明的范围 |
| --- | ---: | --- | --- |
| Anchor Arm64 release APK | 26,404,187 | `3371870ee2691f0aa3496e2e6fb1153a6c028b840bfef33c924dbea8cf96d475` | 当前文件存在，哈希与最新 HOLD 计划中的候选相同；本轮未重跑 readiness、签名或设备验收 |
| Gamer release APK | 14,920,672 | `ab60204e6ab0b94a84b2dccef32eb65e26b1cbba728dac56f167a8940ff89108` | 本地 release 路径存在产物；不证明已批准分发、签名有效或生成闭环成功 |
| Gamer release AAB | 14,385,956 | `0fad67e69ad1540bbe4ad23e0b6d79322cd9ab04b686db45bba785abe140777c` | 同上 |

## 5. 六个游戏分别怎样更新

六项均保留现有 id 和详情路由，通过游湾组织展示，不默认把游戏卡片重新铺满主目录。

| 游戏 id | 源目录 / 本地 HEAD | 当前阶段依据 | 主站更新重点 |
| --- | --- | --- | --- |
| `game-first-tetris` | `../game/game-first-tetris` / `94387b6` | `README.md:9`：经典可玩主线与 Rogue 原型；`:71`、`:87` 记录小屏触控限制 | 区分稳定规则与实验强化；写清键盘/触控和窄屏限制；补对应 Web 包版本 |
| `game-next-spacewar` | `../game/game-next-spacewar` / `89c9bd8` | `README.md:5`：M14 展示版，菜单、帮助、暂停、结果和会话总结 | 强调短任务闭环与展示构建；补试玩说明/录屏，避免包装成长期内容产品 |
| `intespace` | `../game/intespace` / `1772be0` | `README.md:11`：武器 v1 冻结，统一试玩前的流程收口 | 保留进行中定位；明确战斗—升级—结算—成长流程与试玩前待验证项 |
| `raiden-prototype` | `../game/raiden-prototype` / `ebb85aa` | `README.md:5`、`:59`：RC-0.4 双关稳定展示候选 | 用 RC-0.4/Chapter Run 描述；补素材授权、人工试玩和包版本依据 |
| `space-war` | `../game/space-war` / `af26292` | `README.md:14`、`:135`：完整展示版本、推荐 v1.1.1 | 以维护中的完整样例描述；统一五 Sector、最终 Boss、版本号与截图日期 |
| `spacewar-ii` | `../game/spacewar II` / `3e3d40e` | `README.zh-CN.md:5`：Godot 纵向原型，三阶段路线与 Boss | 明确原型和移动输入边界；先补真实短视频/布局观察，再调整成熟度 |

源内容站 `game/blog/src/content/games/` 已有分别维护的阶段与里程碑。主站摘要应引用这些证据，不再创造另一套含义不同的阶段。代码存在、导出存在、Web 页面响应和真实可玩性分别验证。本轮没有运行游戏或重验 playable 资源。

## 6. 其余三个产品身份与新增候选

| 身份 | 现状 | 规划处理 |
| --- | --- | --- |
| 知航 BIAU Beacon | 已集成在主站；`docs/manual-gates.md:165` 记录 8 月 16 日一次真实问题的产品最小闭环 | 随主站案例更新公开知识与引用能力；注明旧验收时间，不做主动模型测活，不额外复制一个重复项目卡片 |
| 潮讯 TideBrief | 工程流水线完整度较高；`docs/manual-gates.md:201`—`:209` 最近记录为真实 Edition 限流终止，Feed/生成/自动化保持关闭 | 继续明确“工程实现、产品待验收”；不能写成持续发布中的 AI 日报，保持已有独立生产任务 |
| 文航 DocBeacon | planned 身份；企业文档/Agent/权限/审计及 staging 有历史证据；9 月已推进多企业准入、邀请、上传、售前响应、用量和首次使用本地闭环 | 现有项目同步后单独做候选接入。建议以“企业文档与售前响应工作台”形成案例，保留工程底座说明，先评估可公开截图/只读演示 |

文航的重要边界：`09-15-saas-first-use-acceptance/report.md:3`、`:66`、`:68` 说明完整首次使用是本地合成 IdP、受控模型与 embedding 的技术验证，真实客户、实际身份服务和收费试点未验收。`09-16-saas-public-trial-kit/README.md:3`、`:16`、`:18` 记录 3 个案例、30 道题、12 份官方资料摘录和服务选型，选型尚未部署，不能据此称为对外营业的 SaaS。

本轮不把其他工作区目录自动升级为主站产品。`douyu`、`yihuan-helper`、`ques` 沿用明确的展示排除规则。

## 7. 检查结果与证据限度

| 本轮执行 | 结果 |
| --- | --- |
| `npm.cmd run project-registry:check` | 通过：13 身份、10 publication、9 CTA fixture、41 实际链接组 |
| `npm.cmd run project-details:check` | 通过：16 个详情数据；Canvas 按 planned 例外处理 |
| `npm.cmd run status:contract` | 通过：9 可靠性项目、8 外部目标、36 检查 |
| `npm.cmd run public-links:projection-check` | 通过：46 个可见目标的本地投影；不是 46 个公网链接测活 |
| `npm.cmd run assistant:kg-check` | 通过：32/62/177/254 与 26 个路由建议用例 |
| `npm.cmd run projects:discovery-check` | 通过；脚本报告 6 个合同用例组，不是页面有 6 个栏目 |
| sitemap 项目/状态集合对照 | 发现 Roleplay 的 2 条遗漏，未改写 XML |
| Chromium 主站观察 | `/projects` HTTP 200，Roleplay 可见；范围仅为页面读取 |
| 三个 APK/AAB 文件 | 存在且完成只读大小/哈希核对；没有安装、签名操作或发布 |

源项目报告里的测试数量均是本轮读取到的既有记录，没有在源项目重跑。规划阶段未运行全站 lint/build/UI，也未部署、推送、修改状态快照或调用模型。

## 8. 本轮文件边界

只新增/维护本任务的 `task.json`、`prd.md`、`inventory.md`、`design.md`、`implement.md`，以及 Trellis 创建的 `implement.jsonl`、`check.jsonl` 两份上下文清单。清单只关联本轮证据、规划与既有规范，不代表已开始实现。源项目与主站业务数据保持只读。

浏览器实例均通过 `finally` 关闭，未创建需保留的截图、下载或临时脚本。`blog-semi/ .trellis/`（目录名含前导空格）和 `blog-semi/undefined/` 在本轮开始前即存在、用途未确认，继续保留；其他既有未跟踪文件与历史 worktree 同样保留。
