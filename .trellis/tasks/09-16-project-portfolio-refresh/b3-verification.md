# B3 核验记录：游湾、六游戏与主站

核对日期：2026-10-05。状态：B3 本地验收通过。用户在恢复原会话后明确“继续”；复用本任务和本地交付边界，不提交、推送、部署、改写 `public/status/*`、调用模型、启用 Feed/Cron 或分发 APK。源工程只读，没有运行其导出脚本、构建、游戏、真机或发布测试。

## 源版本与工作树

以下路径均在 `D:/workspace4Cursor/game/` 下，HEAD 在本轮实读；未 fetch，远端与线上版本不作推断。

| 工程 | HEAD | 提交日期 | 本轮开始时脏路径 |
| --- | --- | --- | --- |
| blog | b76e21511531fbada9ac14b47b35817d40c343df | 2026-07-09 | 无 |
| game-first-tetris | 94387b6444d8949be5285c67eb4ea6d0307d0303 | 2026-06-28 | README.md、docs/setup.md |
| game-next-spacewar | 89c9bd8cb060fd435119a7bfdee63f749fb8179e | 2026-06-28 | README.md |
| intespace | 1772be07d3bc51f4c6a183a50d30b46785ecbc66 | 2026-06-28 | 无 |
| raiden-prototype | ebb85aa8592e0876ffe68513034a0489bcd6bc27 | 2026-06-28 | README.md、docs/audio-sources.md、docs/development.md、docs/progress.md |
| space-war | af262926e82a59708bd15f8490eeb043486123d2 | 2026-07-09 | docs/02_core_game_loop.md、docs/12_final_playtest_runbook.md、docs/16_final_summary.md |
| spacewar II | 3e3d40eca3f7e849eabe381952c778a4a7fb69f2 | 2026-07-09 | 无 |

主站 `D:/workspace4Cursor/blog-semi`：HEAD `747174b6d1957c2e23fb375da8fd2a09015e120f`，main 与已存储 origin/main 相同，开始时有 41 项 short-status 路径；逐文件工作区审计统计口径为 54 项，二者不混用。四个历史 worktree 保留，未创建新 clone/worktree。

## 实际代码证据与修正

表中路径相对上表对应源工程。文档用于定位，以下行为以实际入口和源码为依据；实现存在不代表本轮运行通过。

| 项目 | 关键锚点 | 可说的事实与边界 |
| --- | --- | --- |
| Tetris | `project.godot:14`；`scripts/game/game_manager.gd:357,596`；`scripts/game/touch_input_bridge.gd:8,15,27`；`scripts/ui/touch_controls_runtime.gd:83,103,123` | 入口 main；软硬降、combo/B2B 与触控瞬时/持续动作、释放桥接存在。未确认当前 Web 对应源码版本，历史多尺寸记录不写成本轮真机验收。 |
| Next Spacewar | `project.godot:14`；`scripts/main_menu.gd:79,88,93`；`scripts/main.gd:4,309,351`；`scripts/player.gd:36` | 菜单和战斗标识均为 **展示版本 0.17**；场景首波与后续第二/三波编排、装甲目标、连击和结果切换已接线。M14 是盘点线索，不能替代当前标签。 |
| intespace | `scripts/autoload/game_session.gd:6,7,13,26,3307`；`scripts/entities/player.gd:176` | `0.1.0-phase06 / prototype`，触摸拖动存在；候选门禁依赖近期样本总量、chapter_1/survival/boss_trial 和路线覆盖，返回 NEED SAMPLE / BALANCE RISK / RC READY。本轮没有运行门禁或读取用户存档，因此不宣布通过。武器 v1 冻结保留为历史阶段记录。 |
| Raiden | `scripts/autoload/run_state.gd:10,938,958,997,1021`；`scripts/entities/player.gd:90` | `RC-0.4`、双关章节与自动射击实现；“可评审/强候选”取决于章节完成与评分，不能充当外部验收结论。Windows v0.4.0-rc.4 只引用已有游戏站链接，本轮未核验下载；导出脚本使用开发工程，不从旧 .publish-final 说明推断版本一致。 |
| Space War | `scripts/autoload/game_session.gd:5,39,51`；`scripts/game/stage_schedule.gd:4`；`scripts/entities/player_ship.gd:14,57,68` | 五个常规战斗阶段加最终 Boss，13 级武器、键盘操作与结算。实读本地 v1.1.1 标签指向 `bef8c90e56f1105ca0dee67a6a0d7835ca245a0a`（2026-04-11），与当前 HEAD 不同；历史 Windows 标签不是当前 Web 版本。“Web 包计划”改为有文件证据的 Web 导出。 |
| Spacewar II | `project.godot:14`；`scripts/NokiaMenu.gd:9,60`；`scripts/GameState.gd:4,14`；`scenes/NokiaBattle.tscn:3,4`；`scripts/NokiaPlayer.gd:54,58,66`；`scripts/NokiaBattle.gd:27,252,269` | 实际入口 NokiaMenu → NokiaBattle → NokiaPlayer；默认三阶段、WASD/方向键移动、空格射击、X 炸弹。**修正自动射击及移动题材与触屏验收混用**。未从旁路 Player/BattleController 推断当前玩法。 |

## 游湾导出与素材

- `blog/package.json:13-20` 定义内容审计、dist 审计、Web 导出/检查和发布命令；实际脚本在 `tools/`，并非 `scripts/`。本轮只读检查，不运行这些带写入的源工程命令。
- `tools/export_r2_play_manual.cmd:14-18,44-63,74-87` 定义六源目录、字体/主题变更、导出和镜像复制；没有执行。它没有绑定当前源提交、产物摘要与线上版本。
- `tools/check_r2_play_exports.mjs:8-23,86` 定义本地 `deploy/r2-play`、1365×768/390×844 视口和 canvas 检查。这只证明测试覆盖定义；canvas/布局不证明通关或触屏。
- 六条 `src/content/games/*.md` 的 `updatedDate` 均为 2026-06-28。`git log` 显示图片/视频最近入库提交为 `579195c`（2026-06-28），这些都不是精确采集日。
- `public/videos/projects/` 实存 first-tetris、next-spacewar、intespace、raiden、space-war 五个 playtest MP4；`tools/render_project_playtest_videos.py:12-58` 使用对应 AVI 源。这里只核对文件和处理链路，没有重新看片或替其证明当前人工试玩质量；不再把五个已有录制写成缺失。Spacewar II 同类短视频仍未找到。
- `deploy/r2-play/<slug>/` 六套 HTML/JS/WASM/PCK 均存在。下表摘要仅标识当前本地文件，**没有获取线上资源、运行 Web 游戏或证明源码/导出/部署一致**。

| slug | PCK bytes | PCK SHA-256 |
| --- | ---: | --- |
| first-tetris | 15368744 | c39574c998843988734cac82c1f998e8518ee03738c33c0ff28ff3883e405474 |
| intespace | 14791088 | 4e6894226fd8e4ec2578a1b05ab48213d39ec85fb54be2ae53132238f43146b9 |
| next-spacewar | 14501052 | 2b6ce4d6f0f2b916d6380c36dad4973483579179e50c7637a226a51d4ed6a192 |
| raiden | 45086068 | 893a502ddb089572ccd6e875d2b490cf9827775cb97b99b418d934b8d877fa3d |
| space-war | 14636760 | 3cdffd7dd48764f901647caa1706c216f0d53822292c348015942a0e04318c0b |
| spacewar-ii | 14566588 | 6b53d5896bd876d3fbbe045b596716f5aaf7e8c459d7131b1b8f13ecb01628cd |

六份 `index.wasm` 均为 37,685,705 bytes / SHA-256 `99962b29677e42f3ba0258bd90fdc52ad90295954c4473e816ad02cfe5ff1d4f`。相同引擎文件不证明各游戏内容一致；HTML/JS/PCK/WASM 完整摘要登记在恢复清单的 B3 产物核对字段中。

## 主站本地与历史产品验收

- `src/pages/ProjectsPage.tsx:43-54` 实际为 ai/fullstack/tool 三组；`portfolio.ts` 的 catalog 排除 interactive，保持 10 个目录项目、6 个独立游戏详情。修正旧“两组”文案。
- `src/pages/BlogPage.tsx:30-45,67-82,127-129` 实现栏目/关键词/分页 URL 状态和阅读入口；`ProjectsPage.tsx:19-39` 保存分组和详情返回入口。
- `src/utils/appearance.ts:5-13` 与 `src/hooks/useSiteTheme.ts:20-39` 实现晨曦/自然/星辰、偏好保存和 reduced motion；`src/utils/siteLanguage.ts:1-18`、`src/hooks/useSiteLanguage.ts:10-19` 实现 zh/en 偏好。公共界面切换不自动翻译 authored 正文/历史素材。
- `docs/public-assistant-product-acceptance.md:57-84` 记录 2026-08-16 同源 SSE answered/model、一次生成和一条 verified 引用，与此前恢复及 390px 观察组成历史产品门禁；未重跑，不扩写长期 SLA。
- `docs/ai-daily-product-acceptance.md:100-117` 记录 2026-08-18 v7 Edition extractor 限流、Revision 15 REJECTED/DISCARDED，未有 draft/公开 Feed。沿用待验收，不调用模型、不启用 Feed/Cron。
- 首页、详情、状态摘要/门禁、助手知识与审计同步。状态 checks 保留历史快照；未更新 publication 字段、URL 或 verifiedAt。

## 恢复与验证

- 恢复组：`D:/Agent/codex/backups/tasks/20260924T122253.742Z-project-portfolio-refresh-b1/manifest.json`，新增 `B3-start`，13 项登记；原 B1/B2 基线不覆盖。首次修改前验算源文件/实体 SHA-256，并搜索已有恢复实体以避免重复复制。
- 临时目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-b3-ae11aox1`。基线包含 1652 个文件摘要和结构化 project/catalog/hero/reliability/publication 投影。
- B4 不在本批自动启动，任务不归档。

| 验证 | 结果 |
| --- | --- |
| assistant:index / assistant:kg-check | 32 docs、75 chunks、176 entities、253 relations；26 个建议路由用例通过 |
| project-registry:check | 13 identities、10 publication records，9 CTA 用例与 41 组链接合同通过 |
| project-details:check | 16 项目正文结构、图片与 WebP 证据合同通过 |
| public-links:projection-check | 46 个可见目标通过；不访问公网 |
| projects:discovery-check | 6 组合同通过，实际目录为 3 个分组 |
| status:contract | 9 项目、8 外部目标、36 checks 通过 |
| docs:manual-gates-check | 通过，未弱化检查 |
| sitemap:check | 42 URL，16 项目、9 状态、11 文章及静态路由通过；无需重新生成 |
| lint / build | ESLint、TypeScript 与 Vite 构建通过 |
| check:ui:smoke | 21 组、0 失败，7 路由 × 3 视口，10,323ms |
| B3 定向 UI | 240 组、0 失败：8 详情 + 2 状态 × 320/390/430/1440 × 3 主题 × 2 语言；图片 decode、横向溢出、日期与关键边界通过。1 个本地 health fixture、0 模型调用、0 外网请求/页面错误 |
| 截图复核 | 8 张 320/nature/zh 质量段落截图逐一查看；文字可读，沿用素材正常显示。长段落可滚动阅读，不把局部截图中的固定导航位置误写为内容永久遮挡 |
| 结构化保护 | 非 B3 project/hero/reliability、所有 publication 字段、全部 links/detailLink、目录与记录顺序、checks 保持一致 |
| 文件保护 | 1652 项基线仅有 12 个既有文件预期修改，另新增本记录；9 个公开状态文件与 sitemap 原字节保留 |
| 完整 check:ui | 46 组、0 失败，17 路由及专项矩阵，2,654,460ms（44 分 14 秒），命令退出 0；助手/日报使用本地夹具、真实模型调用为 0 |

定向临时脚本首次启动遇 Windows ESM 绝对路径格式错误；将 import 改为 `file:///D:/...` 后执行成功。该错误未运行页面测试、未改变产品源码，也未导致额外模型调用。

## 交付与清理

- B3 于 2026-10-05 本地验收完成，AC13—AC15 已勾选；B4 待办，任务继续 `in_progress`、`parent: null`。没有提交、推送、部署、公开状态发布或源项目修改。
- 正式增量为 12 个既有文件与本核验记录；最终 `git diff --check` 通过。全部恢复实体重新验算 SHA-256，B1/B2 原始基线保留，B3 结果摘要写入同一 manifest。
- 本轮 Vite preview PID 30328（loopback 4183）已停止。18 个临时文件（8 张截图、2 份投影、文件摘要基线、产物摘要、2 个临时脚本、定向结果和3份日志）在结果落档、逐文件验算后删除，空临时目录已移除。
- 原本存在的 `D:/workspace4Cursor/blog-semi/ .trellis/`（前导空格）、`D:/workspace4Cursor/blog-semi/undefined/`、`D:/workspace4Cursor/blog-semi/public/biau-port-icon.svg` 及旧 UI/Roleplay 任务资料继续保留。四个历史 `D:/Agent/codex/worktrees/blog-semi-*` 的精确路径沿用本任务既有记录，未做清理或归属推断。
