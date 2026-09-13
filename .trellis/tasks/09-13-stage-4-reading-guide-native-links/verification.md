# 验证记录

## 基线

- HEAD：`a4dff7166ecf0e943ce0734e814ca696c6805b1d`；507 source / 172 build / 3 spec 与前项最终输入一致，1583 tracked 与原 13 untracked 已保存。
- 证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-reading-reassessment-amv2iduv`。
- 有效 `reading-modifier-before.json` 共 9 个观察：三类详情的 Ctrl 点击和 Ctrl+Enter 共 6 个问题场景，3 个原生链接对照成功；模型 0、页面与外部请求错误 0。这是修复前复现，不是修复验收。
- `reading-modifier-before-result.json` 与 `reading-modifier-before-context-result.json` 为前两次探针失败；分别错误依赖 popup 事件和在 about:blank 初始文档就绪时过早比较 URL。原始脚本、日志与中间观测保留，不计为通过。

## 实施后验收

`guide-before-valid` 在旧构建的首个真实 Ctrl 点击等待新 page 时失败（exit 1，9126ms），当前目录关闭、原页滚至 4548px，只有原文档，页面错误和 API 请求均为 0，确认永久专项能捕获缺陷。此前 `guide-before` 另记录了 about:blank 初始文档读取 localStorage 的夹具错误；已把偏好初始化限定到目标 origin，保留该次记录，采用修正后的有效失败作为回归依据。

- `lint` exit 0，32189ms；`build` exit 0，12531ms。
- `guide-final` exit 0，162933ms，75 场景全部通过；实际新文档及源页面保持、普通跳转与 Meta/Alt/取消事件合同通过，模型 0。主会话已查看 1440/320/390/430 四张代表截图，目录保留且无横向溢出。
- `performance` exit 0，433ms。
- `freeze.json`：508 source、4 spec、172 build、49 实际本地响应与最终冻结一致，原资料和保护快照保持；组件严格只增一行，原完整 UI 严格只加 import 与调用两行。专项输入与冻结之间没有运行代码或构建变化。
- `smoke` exit 0，21 组 / 0 失败，外层 11093ms、组累计 10372ms。
- 唯一一次 `full-ui`（工具会话 86957）于 2026-09-13T07:42:31Z 实际 exit 0，46 组 / 0 失败，外层 2238122ms、组累计 2234745ms。包含阅读链接 75、助手图片 72 / Branch 32 / 历史 188 / 反馈 72，模型调用均为 0；未重跑已通过的完整检查。
- `final-checks.json` 汇总六项真实通过及日志 SHA；独立专项与完整 UI 各有 75 个有效场景记录（原生新文档 48、普通跳转 24、事件归属 3），均无页面或外部请求错误。旧构建有效回归失败和前置夹具观测失败分别保留。
- `final-validation.json` 于 2026-09-13T07:53:09Z 核对 508 source、4 spec、172 build、49 实际本地响应与最终冻结完全一致；原 13 份资料、非 owned tracked 文件及保护快照保持。

## 最终复审

- `trellis-check` 已复核 PRD/design/implement、产品差异、新专项、完整 UI 接入和规范。普通主按钮/Enter 与原生或已取消事件的处理边界符合设计；既有关闭、延后滚动、焦点、href 和路由/query/fragment 语义保持。
- 新专项在 Context 级限制本地网络并覆盖新文档首个请求，初始 about:blank 不写存储，全部 Context 在 finally 关闭。三个有界事件观测不依赖操作系统的 Meta/Alt 默认动作。
- 原完整 UI 只增加两行，没有删除断言或改变既有 46 组；lint/build/性能通过，无新依赖或跨层 API 改动。`git diff --check` 通过；已知 LF/CRLF clean-filter 提示不构成检查失败，不整体改写换行。
- 已完成 component/quality/index 三份规范同步。下一步是精确本地工作提交、当前子任务归档、实际返回父任务、Session 139 与预览资源收尾；这些尚未完成的动作不计入 AC4。
