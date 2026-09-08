# 阅读恢复实施计划

- [x] 返回父任务，复核博客基线并补 8 次项目基线，确认两类路径均丢失焦点/显式返回位置。
- [x] 主会话读取完整四页面、两卡片、App 路由与相关 frontend 规范，搜索已有恢复逻辑；完成 PRD/设计收敛。
- [x] 激活子任务，编写浏览器检查，在旧 build 上保存负向结果。
- [x] 实现有上限的阅读 hook、稳定入口标识及各页面接入，不改 CSS/公开内容。
- [x] 运行专项和边界用例，修复后运行 lint/build、URL 合同、analytics、performance、smoke 与完整 UI。
- [x] 主会话核对截图、源码/快照哈希和差异，更新规范与验收，精确提交 `37f93b5b` 并归档。
- [x] 实际调用 `task.py start 09-06-website-completion-roadmap` 返回父任务重新评估后续候选。

命令：`npm.cmd run reading:navigation-ui`（本地 preview 5184）、`npm.cmd run blog:discovery-check`、`npm.cmd run projects:discovery-check`、`npm.cmd run analytics:check`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui`、`git diff --check`。

继续复用本轮 preview 5184（已重新核对 OS PID 21544 和 Vite 命令行），证据复用 `C:/Users/zhang/AppData/Local/Temp/blog-semi-discovery-20260908-4f78e2a8f7f64b4799ddd9b9e3b8da57`，使用 reading 前缀。旧 5183 服务及既有不明归属文件保留。

实施检查记录：

- `reading-baseline.log` 在旧 build 上因详情焦点仍为 BODY 实际失败。
- 首轮恢复测量包含 `fadeUp` 的 16px 临时 transform，返回完成后仍偏移 16px；改为布局坐标，并在测试中等待有限入场动画结束核验最终位置。
- 相关详情切换会先更新 URL 再提交新标题 DOM；检查器改为持续重解 locator，避免持有已卸载的旧 h1。这没有改变产品断言。
- 前进位置问题在重复组通过后仍于完整矩阵复现 1130→1490；延迟项目图片的独立 fixture 稳定复现 770→1130。POP/hash 定位现在等待 eager 图片 load/error，修复后为 770→770，完整阅读专项也已通过。
- 20 个边界组已通过；指针标题入口的动作原可能在底栏外，现按实际导航边界确保焦点动作可见。
- 范围核验复现从 Status 后退会错误恢复旧文章入口（期望 y=0，实际 y=1983）；已把 POP 恢复限定为直接来自详情，追加独立回归。
- 只读探子未返回可用结论，已中断；主会话自行核对卡片调用点、CSS、路由与检查覆盖。两卡片仅由各自目录调用。

交付结果：最终 lint/build、48+4+22 组阅读专项、URL 合同、analytics、performance、21 组 smoke 及完整 UI 44 组全部通过。完整 UI 为 931080ms、0 失败，已实际取得 exit 0。13 个源码/检查器/规范/保护快照和入口哈希保持一致；主会话已复核三张代表性返回截图。22 个文件已本地提交 `37f93b5b1cafef60df54dfa97663e671ec8a1b48`，子任务已归档并实际返回父任务。完整结果见 `verification.md`。证据与共用 preview 留给后续评估复用，没有新建一次性诊断 runner；其他来源资料保持原状。
