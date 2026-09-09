# 实施与验证

- [x] 完成第 13 轮交付并实际返回父任务；核对所有 publication 消费者和候选标签，发现中文子串短动作依赖。
- [x] 收敛 PRD、设计、owned/forbidden、回滚点与持续授权，读取 frontend 与复用指南；本轮主会话 inline 实施。
- [x] 扩充确定性和浏览器合同，在旧实现保存负向结果与原数据/构建快照。
- [x] 实现共享项目 UI 投影、消费者与语言语义，保持访问门禁、原文、DOM/导航生命周期。
- [x] 运行 lint/build、registry、project-details、projects discovery、analytics、助手知识及性能合同；修复实际问题后运行完整语言专项。
- [x] 人工审查手机/桌面代表截图，smoke 和完整 UI；冻结本轮最终源码/检查器/构建及保护文件。
- [x] 记录结果/限制、精确本地提交、仅归档本子任务、实际启动父任务并继续评估。

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-project-interface-20260909-a25cee24`。复用自有 5190 preview，保留原服务；本轮不创建一次性脚本，不删除原有资料。

主要命令：`npm.cmd run project-registry:check`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run project-details:check`、`npm.cmd run projects:discovery-check`、`npm.cmd run analytics:check`、`npm.cmd run assistant:kg-check`、`npm.cmd run performance:check`、`npm.cmd run language:ui`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui`。浏览器仅本地 fixture 与 network guard，生产模型调用为零。

接续进度：早期专项 60 组通过（48005ms），30 个导航边界用例通过。人工截图随后发现桌面完整动作在按钮内溢出，补充负向证据与矩形断言，修复后专项再次 60 组通过（50060ms），最新业务构建日志为 `build-action-fit.log`。品牌点击/包含、项目详情触控尺寸及按钮内部溢出属于实际界面问题；Canvas 非空假设及桌面隐藏状态按钮属于检查器场景错误，按现有合同修正。完整语言专项、最终静态门禁、smoke 和完整 UI 尚待完成，不能复用第 13 轮构建作为本轮通过。

首次完整验证：语言专项通过（185787ms），smoke 21/0（9904ms）；完整 UI session 30707 exit 1，因桌面目录进入懒加载详情时检查器只等待 URL。受控 chunk 延迟及焦点事件诊断确认，应等待详情挂载和既有标题焦点后再使用状态按钮；仅修检查器及规范，未改业务源码/构建。

最终验证：session 47702 正常 exit 0；语言专项 12+24+12+5+1+24+4+2+60 组、modelCalls 0（183628.2172ms）；完整 UI 46 组、0 失败（1401545ms，外层 1403217.7136ms）。复用同一业务构建已通过的 smoke 21/0。最终清单 verification-final-freeze.json 的 28 个源码/检查器/规范/边界文件、47 个构建文件在结束后及交付前均无漂移；5 个 preview 响应字节一致。代表最终桌面首页、320px 详情截图已再次查看。准确证据与限制见 verification.md；尚待精确本地提交、归档和实际父任务回切。

交付：工作提交 `75431775a3a079630f3e54c1cb3c9df63dfa0426`，26 个白名单文件。仅本子任务以 `archive --no-commit` 移入当前归档目录；随后实际运行 `task.py start 09-06-website-completion-roadmap` 并核对当前会话指针，见 `archive.log`、`parent-return.log`、`parent-current.log`。父循环进入第 15 轮评估，其他任务与原有资料保持。
