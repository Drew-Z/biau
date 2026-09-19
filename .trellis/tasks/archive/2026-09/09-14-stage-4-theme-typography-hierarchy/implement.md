# 三主题文字层级与卡片配色实施记录

## 当前状态

规划保存于本地提交 `8d9624fc`，用户回复“可以”后已实际 start 本子任务。2026-09-16 最终 `ui-caption-contract` 实际 exit 0、46 组/0 失败；所有验收检查与主会话复审通过，三份前端规范已同步。实现已于 2026-09-16 精确本地提交为 `b4be3ce8`；2026-09-19 续作核对后进入归档和父回切收尾。

采用已确认整体方案的轻衬线默认；该选择不被记作用户单独回答了字体选项。证据根目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-theme-implementation-bfwxnc62`。

## 顺序与检查点

- [x] 恢复前次分析、规划与父任务授权；沿用原任务目录，实际 start 并读取前端规范。
- [x] 保存原 24 组截图、1614 个 tracked 文件及原 13 份未跟踪资料的哈希与所有权边界。
- [x] 2026-09-16 保存恢复基线：Roleplay 接入是既有外部改动，当前首页 9 项；保护该组内容和原资料。
- [x] 节点 A：恢复四类 accent、序号与左边框；各 variant 仅提供材质，共用规则统一投影。
- [x] 节点 B：标题/正文 400，普通信息/动作/桌面导航 500；校准三主题小字、底色与常态按钮。
- [x] 节点 C：按真实内容选择桌面 124px，移动自适应；摘要/诗句不靠新增截断挤入旧高度。
- [x] 首页专项 24 配置、90 次视口/滚动阅读取样通过；主会话查看三主题桌面前后与 320px 英文截图。
- [x] lint、build、performance 通过；原 24 组响应式轮播运动、33 场景原生缩放/滚轮和 smoke 21/0 通过。
- [x] 标题完整遮罩后的 24/90 专项、状态页三宽度 × 三次原生 wheel 定向复核和最新 lint 通过。
- [x] 同一冻结输入的完整 UI 终局通过：`ui-caption-contract` 46/0；前三次失败保留，不计为通过。
- [x] 主会话完成 trellis-check 最终结论，更新分类、文字、导航、采样与无图片说明合同。
- [x] 核对原资料、外部改动、索引白名单与源码/构建/实际 HTTP 哈希，精确本地不签名提交。
- [ ] 只归档本子任务，实际 start 父任务后再更新 round 和评估；记录日志、关闭自有预览并检查临时资源。

## 已取得的结果

| 检查 | 证据目录 | 实际结果 |
| --- | --- | --- |
| lint | lint-caption-contract | 最新说明数量合同修改后 exit 0 |
| TypeScript + Vite | build-reading-contrast | exit 0 |
| 首页层级 | typography-gsap-ready | 完整标题遮罩和 GSAP 就绪读取，含真实 Enter 轮换；24 配置 / 90 次背景取样，exit 0 |
| 响应式运动 | motion-final | 24 组，exit 0 |
| 原生缩放/滚轮 | wheel-final | 33 场景，exit 0 |
| 路由 smoke | smoke-final | 21 组 / 0 失败，exit 0 |
| 状态页原生 wheel | status-wheel-local-health | 320/390/430 各三次，9 场景，exit 0；本地 health fixture 6 次、业务 API 0 |
| 项目图文说明 | project-visual-captions | 15 项目 / 50 条说明，精确数量/文本、图片和来源数量通过，exit 0 |
| 构建体积 | performance-final | CSS 150130 / 222755 bytes；JS 320853 / 430000 bytes，exit 0 |
| 首次完整 UI | ui-final | 45 组 / 2 失败，exit 1；保留失败，不计为通过 |
| 第二次完整 UI | ui-ghost-compositor | 45 组 / 1 失败，exit 1；状态 wheel 已通过，标题 GSAP 采样未就绪 |
| 第三次完整 UI | ui-gsap-ready | 46 组 / 1 失败，exit 1；首页 24/90、wheel 33、motion 24 及 SEO 通过，唯一失败为 Roleplay 无图片说明数量 |
| 最终完整 UI | ui-caption-contract | exit 0；46 组 / 0 失败；外层 2709368ms，组累计 2707806ms |

原候选冻结于 `final-validation-input.json`；最新检查输入另存 `validation-input-caption-contract.json`。363 份源码/公开输入中仅两个检查脚本变化，174 份构建哈希全部一致，实际 HTTP index 与 dist 相符，索引仍为空。第三次全量后与其冻结记录逐项相等，不存在用新数据测旧构建的问题。复用未变化构建的 build/performance/motion/wheel/smoke 成功结果。该构建含恢复时已存在的 Roleplay 数据；不将它纳入本任务的产品提交范围。新出现的项目盘点任务、图标及原资料均保留。测试使用本机 Node 24.14.0。

最终全量后 `final-validation.json` 再次核对 363 source / 174 dist / 实际 HTTP index 全部相等。`preservation-final.json` 确认原 13 份未跟踪资料、外部 Roleplay 修改、依赖和保护快照保持；不存在范围外 tracked 变化。最终所测最低对比度为 Morning 4.767、Nature 5.177、Stellar 5.179，属于真实代表帧结果，不扩大为全站每帧保证。

## 诊断记录

- 旧构建四类 accent 只有一种，是有效回归证据。
- 108–112px 初稿容不下 95.34375px 的真实内容；124px 提供 98px 内高。
- 浅色背景下小字曾低于 4.5:1，已通过角色颜色和局部表面共同校准，未统一降低祖先 opacity。
- 移动导航曾被 late route CSS 覆盖成三列，真实语言按钮被品牌挡住；修改所属规则后真实点击通过。
- 固定底部导航后的不可见行、未结束的遮罩过渡分别造成两类取样错误。现在用视口截图、遮挡矩形、实际滚动和有限过渡等待处理；保留失败证据，未降低 4.5:1 门槛。
- 悬停经过助手触发其既有健康预热；专项使用固定本地 GET health fixture，业务 API 尝试失败，真实模型调用 0。
- 首次完整 UI 在 Stellar 英文桌面的动画背景阶段报告标题“涌”4.301:1。真实 Enter 诊断证实旧遮罩只隐藏 `.char`，标题 `::before` 残影仍为 visible；完整遮罩隐藏标题和该伪元素后 24/90 复核通过。未改产品动画、星空底色或对比度阈值。
- 同次完整 UI 的状态页 320px 原生 wheel 回到顶部。旧顺序独立诊断曾成功，不能断言唯一根因；检查现在先移动指针、等待两次 compositor frame，再读取当前 delta。三宽度各三次定向复核通过，保留 70–105px 目标、当前分区、sticky 与无溢出断言。首次定向脚本因把六次健康预热计为业务请求而失败；补齐已有 health fixture 的本地分类后通过，失败目录保留。
- 第二次完整 UI 的状态 wheel 已通过，但 Stellar 中文桌面取到了新标题“我看见未来”的 GSAP 入场帧，逐字 opacity 从 0.686 到 0；CSS 动画等待并不覆盖 GSAP 的内联更新。快照现在通过同一次 `waitForFunction` 读取验证标题/字形 opacity 为 1 且残影清除；每个桌面动画样本先真实 Enter 轮换再采样，24/90 和 lint 已通过。未跳过低对比度读数、删除角色或停止背景动画。
- 第三次完整 UI 已跑完 46 组，仅 Roleplay 说明数量失败：旧检查先筛选带图片的 visual，预期为 0；现有组件对无图片的流程/架构文字同样显示 caption，实际为 4。检查改为从全部 visual 获取 caption，并直接读取 `__caption-text`，避免把仅有来源链接的容器误计为文字。15 项目/50 说明定向复核及 lint 通过；未改项目数据或组件。
- 曾误用 npm exec 下载 Node 26 缓存；后续固定本机 Node 24，package.json / package-lock.json 未改。已结合 `typography-first` 安装记录、创建时间、版本/manifest 哈希和无活动进程核实 `D:/Agent/npm-cache/_npx/1838e33cf768caf6` 属于本轮；单独用 PowerShell 清理其 23 文件、207534733 bytes。`node26-cache-ownership.json` / `node26-cache-cleanup.json` 保存证据；共享 `_cacache` 与其他 `_npx` 目录未动。

## 验证入口

`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui`。首页专项使用 `node --import tsx scripts/check-home-typography-ui.mjs`；motion/wheel 专项沿用独立 Node 入口。每项通过 `run-check.py` 写入独立目录，设置本地 `UI_CHECK_BASE=http://127.0.0.1:5198` 和 `UI_CHECK_ARTIFACT_DIR`，保留真实 exit code。

## 规划历史

规划阶段仅验证文档与保全范围，并保存到 `8d9624fc`；其不运行产品检查、不 start、不归档的约束只属于该历史阶段。用户已批准实施，当前按父路线图本地授权完成验证、提交和归档；持续不 push/deploy/sign。

## 本地交付与恢复核对（2026-09-19）

- 工作提交为 `b4be3ce8a7dbdb91a81ce54b37c524d082877b70`，精确 13 文件、784 additions / 268 deletions；本轮确认 HEAD 与提交范围，不重复提交实现，不 push/deploy/sign。
- 本轮恢复时，旧证据根及其 originals/resume-originals/测试子目录仍在，但递归文件数为 0。前文所列 2026-09-16 测试、截图审查和输入保真结果属于已提交的历史记录；原始日志、截图和冻结哈希清单目前不可重新读取，不声称今天重新验证了当时全部输入。
- 实际 CODEX_HOME 为 `D:/Agent/codex`；续作复用既有恢复组。`manifest.json` 将本轮修改前文件关联到仓库绝对路径及 b4be3ce8；字节完全相同者使用 Git 恢复点，混合换行的记录及 JSONL 使用经过 SHA-256 核对的实体快照。此恢复点只覆盖 2026-09-19 收尾前状态，不重建或替代缺失历史基线。
- `closeout-2026-09-19-baseline.json` 记录本轮 1615 tracked、27 untracked 与 13 项外部 tracked 修改；产品 CSS/检查器/规范均与工作提交一致，保护快照及两份依赖文件哈希保持。
- 自有旧预览 PID 31092 已不存在，5198 无监听；本轮未启动新预览。归档、父回切和日志结果在实际完成后补记。
