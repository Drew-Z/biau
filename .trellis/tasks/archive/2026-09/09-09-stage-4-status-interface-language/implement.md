# 实施与验证

- [x] 完成第 14 轮三阶段本地交付、仅归档并实际返回父任务；读取当前状态 UI、helper/请求边界及旧检查。
- [x] 收敛 PRD、design、owned/forbidden、验收与回滚点；沿用已有持续授权，主会话 inline 实施。
- [x] 保存基线，扩充状态 formatter 合同和浏览器断言，先在旧实现取得负向结果。
- [x] 实现字典、状态页面/分区导航和格式化参数，保留原文与状态/请求/滚动合同。
- [x] 运行确定性合同、lint/build/性能、专项与完整语言检查；审查真实截图，修复有证据的问题。
- [x] 冻结最终源码/检查器/构建/保护文件，运行 smoke 和完整 UI，保存准确结果。
- [x] 精确本地提交、仅归档本子任务、实际启动父任务并继续下一轮。

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-status-language-20260909-18585bd6`。复用并重新核对自有 5190 preview；证据日志/截图为交付资料，原有文件保留。没有一次性脚本。

命令：`npm.cmd run status:contract`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run project-registry:check`、`npm.cmd run project-details:check`、`npm.cmd run analytics:check`、`npm.cmd run assistant:kg-check`、`npm.cmd run performance:check`、状态浏览器模块的同一 exported function、`npm.cmd run language:ui`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui`。浏览器 API 全部由本地 fixture 隔离，禁止真实模型调用。

负向证据：`format-negative.log` 在旧实现以“未生成”不等于“Not generated”失败；`status-language-negative.log` 在 320/Morning 英文根节点语言断言失败。原实现 19 个源码/保护文件与 49 个构建文件记录于 `baseline-source.json`；5190 的 PID 10300 命令行及 HTML 字节已核对。

实施后 lint/build、状态/registry/details/analytics/assistant 五项合同和 performance 均 exit 0；入口 JS 304440 bytes、入口 CSS 152582 bytes、独立 route CSS 141752 bytes。未修改 CSS、状态数据、parser/聚合/队列或请求 hook。

首次状态专项因选择器绑定旧英文辅助名称，在切换中文后无法重新解析原 select 而失败；仅将该处改为稳定控件定位，并单独保留英文名称断言。修正后 36 页面组、4 加载/错误组、3 概览分支全部通过，modelCalls 0，exit 0，62494.2863ms。原失败日志和结果保留；业务源码和构建未因此改变。

接续已重新核对当前 HEAD、任务指针、5190/PID 10300 与进程命令行；没有遗留验证命令。人工查看 320/Morning 总览、1440/Nature 详情、430/Stellar 缺失页的英文页头截图，未发现该视口的文字/操作溢出。九张专项截图为受控本地 fixture，不代表生产状态验收；下方证据和完整回归仍待检查。已补齐状态语言/formatter 规范。

完整命令首次集成：`lint-final.log` exit 0（13733.4423ms），`language-final.log` 在浏览器启动前以 `ERR_MODULE_NOT_FOUND` 失败（527.0889ms），原 Node 入口不能解析新检查器静态导入的 TypeScript 数据中的无扩展名 hero 导入。检查器改用已安装 tsx 的作用域 `tsImport` API 加载两份 fixture 模块，保留 Node/tsx 两个原入口、业务源码和依赖；必须重新运行实际 npm 命令验证，不能把此前直接 tsx 专项当成集成成功。

修复后 `lint-module-final.log` exit 0（13355.7443ms）；`language-module-final.log` 的完整语言 12+24+12+5+1+24+4+2+60+36+4+3 组、modelCalls 0，exit 0（258244.641ms）。补充实际本地公开 payload 的三个下方视口截图并人工查看，未发现溢出。冻结 34 受检文件和 49 构建，9 个 preview 响应与 dist 一致，15 个保护基线和 11 份既有资料原哈希保持；smoke 21 组通过（外层 10614.228ms）。完整 UI 正在运行，等待实际终局和无漂移核对。

最终完整 UI：46 组、0 失败、1469358ms，外层 exit 0、1471086.0303ms（session 55772 已结束）。终局重新核对 34 受检文件、49 构建、9 响应和 11 份既有资料，全部无漂移；三张最终状态页头截图复看完成。完整验收与限制见 verification.md，进入精确本地交付。

已以 `68b3e16222521a3a098062efb1de749ef046314f` 精确提交 21 个文件；归档前运行只读工作区审计并验证移动的精确源/目标，随后 `archive --no-commit` 仅归档本项。实际执行 `task.py start 09-06-website-completion-roadmap` 并核对当前会话指针，进入第 16 轮评估。没有推送、部署或删除原有文件。
