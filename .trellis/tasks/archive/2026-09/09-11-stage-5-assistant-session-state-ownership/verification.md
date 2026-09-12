# 验证记录

## 当前状态

- 最终 100 历史、32 分支、48 图片、lint/build、三项助手合同、performance 与 smoke 21/0（10260ms）全部通过，`final-checks-result.json` 保存九项真实 exit 0。最终 UI/文案已复看桌面和 320 截图，主会话审查源码、规范、上下文引用与 diff 通过。
- `validation-inputs.json` 已冻结 506 source、172 build、3 spec、47 实际 preview 响应；13 份旧资料与保护快照原字节保持。首次完整 UI（原工具会话 19264）已真实 exit 0、46/0、1767900ms；2026-09-12 接续确认终局，并生成 `final-validation.json` 核对全部冻结输入与重新提供的预览响应一致。
- 新基线：HEAD `160cc7f869c2329949cf7ae16ed9b33ab5ce8d0c`；1547 tracked、13 untracked、172 dist。`baseline.json` 保存原字节 hash。
- 本轮证据：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-session-state-740b1880339d40009a5f534c397f7f08`。

## 父评估负向证据

- `C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-history-2272dc2221b54956bb9f3d779884aaa3/assessment47-lifecycle-baseline-2.json`：
  - 删除 B 先完成、A 回答后完成：1440/320 均重新保存 B capability，2/2；B 草稿仍为空。反向顺序 2/2 对照正确。
  - 初次 A 被手动 B 取代，B 返回 503/过期：1440/320 共 4/4 两请求均结束后仍 loading，输入/发送禁用，恢复重试界面不可见。
- 探针是当前同源码/构建的本地静态服务与合法 fixture；8 场景执行完成，页面/外部错误 0、真实模型调用 0，静态服务已关闭并真实重绑验证。
- 首个探针因 CommonJS Playwright 导入方式不匹配在浏览器启动前 exit 1；第二个修正 require 导入并明确 Windows 路径分隔符，使用独立结果，不把探针启动失败当成产品负向证据。

## 实施与验证过程

- 旧构建的新永久检查在首个 non-current-delete-first 场景真实 exit 1：late generation must not restore a deleted capability from an older registry，actual true / expected false；`history-before.log` 和 `history-before-result.json` 保留原失败。
- Widget 所有 remember/forget 运算现读取同步 registry ref，唯一 commit 入口维护 ref、current ID 与持久化投影。手动恢复在未就绪状态接替初次恢复后，非当前 controller 的失败仍忽略，当前失败则进入可见恢复错误；当前过期仍用既有新空会话分支。
- `lint-build-result.json` 保存 lint/build 两项 exit 0；当前使用自有 preview 5198（工具会话 13555）运行 `history-after.log`，该次结果不提前记通过。
- `history-after.log` 实际 exit 0、100/100；三项助手合同、分支 32、图片 48、performance 和 smoke 21/0（9756ms）均通过。该阶段尚未执行完整 UI。
- 主会话复看 320/1440 恢复截图，发现新增错误终态误用了“回答已收到”文案，且桌面说明文字与恢复按钮重叠；新增真实文本 Range / 按钮边界检查后在未修布局构建真实 exit 1（`notice-before.log`：overlaps true）。同一子任务补充 R6，使用既有 copy.restore 和 restore notice 的两行局部纵向 CSS；不新增翻译或修改其他提示。随后使用独立最终日志重新验证受影响范围。
- 最终 Widget 为 `PublicAssistantWidget-Ck1nxuAz.js`、入口 `index-BHa-pb_v.js`、route CSS `route-pages-iybGzPmK.css`。未修改原 `check-ui.mjs` 的 46 个组或断言，新增 40 场景与布局断言沿用已有历史检查调用。

## Bug Analysis: 异步提交与恢复终态

### Root Cause Category

- C/D：chat 与非当前 DELETE 的传输可以独立并行，状态提交却读取旧 React registry 快照，测试此前只覆盖每个命令自身的结束态。
- E：取消初次恢复被等同于结束该状态；手动接替只处理成功，失败遗漏 loading 的责任转移。
- F：复用错误码时忽略现有 copy.refresh 的前提是“已有回答”；桌面 flex 提示的说明/两按钮压缩后溢出，旧状态测试没有验证真实文本与按钮边界。

### Prevention

- 单一同步 registry 提交入口，所有 remember/forget 从最新已提交值派生，保留 API/helper 与 storage 失败退化语义。
- 接替未就绪的恢复需要负责成功、瞬时失败、过期和取消终态；恢复错误只提供明确重试或 New，旧 controller 不能解除新的等待。
- 现有历史检查新增 40 个组合，观察真实 localStorage/sessionStorage、请求身份、DOM 终态与草稿；两个完成顺序都有对照，不模拟 React 私有状态。
- 固定恢复文案来自 copy.restore，限流 code/退避保持；Range 几何验证补充截图复核，规范落入 frontend state-management/quality/index。项目不存在 src/templates/markdown/spec 镜像，未创建无关目录。

### Validation Limits

所有请求为本地 fixture；registry capability 回写不等于服务器历史复活，浏览器可恢复也不代表生产 DB/relay/model 已验收。未改变翻译、依赖、公开事实、保护快照或未知 scheduler。

## 2026-09-12 接续交付核对

- 用户指定从 `01a081db-9a3f-7093-b8a2-e65d4a776ddc` 在新会话接续；原会话已停止，当前 `01a0952f-555f-7c70-a491-ba1840e626a3` 实际执行 `task.py start` 恢复本子任务，无重复建项。
- `full-ui-result.json` 与原始 `full-ui.log` 均确认 2026-09-11T05:38:39Z 完整 UI 46/0；日志同时包含历史 100、分支 32、图片 48 的通过结果。`final-checks-result.json` 九项 exit 0 和 smoke 21/0 已回读。原通过检查被明确复用，接续期间未重建或重复全量测试。
- 原 preview 已退出、5198 无监听；以同一 `dist` 新建本轮隐藏预览，PID 28444，身份记录为 `resume-01a0952f-preview.json`。`verify-inputs.mjs final-validation` 实际 exit 0：506 源文件、172 构建、3 规范、47 HTTP 响应与冻结 manifest 完全一致，原 13 份资料及保护快照保持。
- 主会话重新审查 Widget 状态提交/控制器归属、历史检查、局部 CSS 与三份规范，并复看最终 1440/320 截图；恢复文案与按钮不重叠。`task.py validate` 两份 JSONL 各 4 条及 `git diff --check` 通过。下一步仅本地未签名提交、关闭自有预览、归档本子任务并实际返回父任务。
- 工作提交 `3a5eb8cda408802ef13997ab9f8dc624a7356fdd` 已完成，15 文件暂存集合与原白名单完全一致，Git blob 和工作树原字节逐项核对，未签名、未推送；`resume-01a0952f-work-commit.json` 保存回执。自有 preview 28444 已退出，5198 无监听且实际 TCP 重绑成功，见 `resume-01a0952f-preview-cleanup.json`。
- 提交准备先遇到 Windows 默认 GBK 解码 UTF-8 任务文件，以及已有原提交计划的防覆盖保护；均在暂存前终止，随后显式 UTF-8 并复用原白名单完成提交。预览停止的首轮保护因 PowerShell 自动把 JSON 日期转为 DateTime 后重新解析而丢失小数精度，在停止前拒绝；改用 `ConvertFrom-Json -DateKind String` 后与 CIM 原时间精确一致，才执行停止。工具错误未被当作产品失败或测试重跑理由。
- `task.py archive --no-commit` 仅移动本子任务至当前目录，原路径已不存在；两份 JSONL 的 PRD 路径已更新且各 4 条引用验证通过。已实际执行 `task.py start 09-06-website-completion-roadmap`，`current --source` 确认接续会话指向父任务；父任务与历史持续任务保持开放。后续 Session、评估与最终保真记录见父第 48 轮。
