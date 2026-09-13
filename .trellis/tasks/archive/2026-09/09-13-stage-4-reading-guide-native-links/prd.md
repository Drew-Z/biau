# 阅读目录原生链接操作

## 目标

访客通过阅读目录的链接在新标签页或窗口打开章节时，保留浏览器原生行为和原页面阅读位置；普通点击和 Enter 继续在当前页面定位章节。

## 已确认事实

- `src/components/DetailReadingGuide.tsx:143-151` 的 `handleNavigate` 对全部 click 无条件 `preventDefault()`，然后关闭目录并滚动当前页面；入口本身是带真实章节 href 的链接。
- 基线 `a4dff7166ecf0e943ce0734e814ca696c6805b1d` 的本地浏览器探针覆盖博客、项目和状态详情：Ctrl 点击与 Ctrl+Enter 共 6/6 场景均未打开新页，反而关闭目录并滚动原页面；3/3 原生导航链接对照成功打开新页，原页面未移动。页面及外部请求错误为 0，模型调用为 0。
- 有效结果见 `C:/Users/zhang/AppData/Local/Temp/blog-semi-reading-reassessment-amv2iduv/reading-modifier-before.json`。前两次探针在新页事件或初始 about:blank 就绪观测处失败，分别保留，不计为有效验收。
- 原完整 UI 在 `scripts/check-ui.mjs:5954-6146` 覆盖目录开合、普通点击、Escape、外部点击、阅读进度和布局，没有修饰键打开新页断言。
- 旧语言交互审计已确认目录普通跳转后的 Tab 能进入目标内容；本项不改变该焦点策略。

## 要求

- R1：仅未取消、无修饰键的主按钮激活由目录执行页内跳转；Ctrl、Meta、Shift、Alt、非主按钮和已取消事件保留原生或原事件所有者的处理。
- R2：Ctrl 点击和 Ctrl+Enter 能打开原 href，路径、query 和章节 fragment 完整；Shift 点击、中键仍遵循浏览器行为。新页打开不关闭原目录、不改原 URL/history、不触发原页面章节滚动。
- R3：普通点击与 Enter 仍先关闭目录再定位目标，保留正常/减少动画、滚动监听、语言、Escape 和外部点击合同。
- R4：通过本地受控浏览器验证实际新文档和保留的源页面状态，所有网络请求限制在本地；不依赖真实助手或公开 Feed。

## 验收标准

- [x] AC1：四个标准宽度、三主题、中英文配置下，博客/项目/状态详情的 Ctrl 点击、Ctrl+Enter、Shift 点击与中键均打开准确链接，原页面状态保持。
- [x] AC2：相同配置下普通点击、Enter 正常关闭并定位章节；Meta/Alt/已取消事件的有界事件观测确认目录不额外处理。
- [x] AC3：保留原完整 UI 断言；lint、build、专项、smoke、完整 UI 与性能检查通过，源码/构建/本地预览输入一致。
- [ ] AC4：精确本地提交，只归档本子任务并实际返回父路线图，记录重新评估和收尾。

## 范围与授权

沿用父任务 `loop.md` 的本地规划、启动、修复、验证和提交授权。禁止推送、部署、签名、真实模型/DB/relay、公开内容发布、Feed/Cron、保护快照修改和未知 scheduler 操作。authored/SEO 翻译继续暂缓；原 13 份资料、历史任务与 worktree 保留。
