# 验证记录

## 最终验证结果

- 最终完整 UI 为第四轮自己的完整结果：`full-ui-4.log` / `full-ui-4-result.json`，实际 exit 0，46 groups / 0 failed，1395263ms，17 路由 × 2 视口及全部专项组；2026-09-10T23:01:40Z–23:24:57Z。没有拼接前面各轮的通过组。
- 图片专项最终 48/48，且在该完整 UI 中再次通过；smoke 21/0（9844ms），lint 无 warning，build、三项助手合同、performance 均 exit 0。阅读专项为 48 矩阵 + 4 正常动效 + 22 边界。
- `validation-summary.json` 在完整进程结束后核对 504 源文件、172 构建、47 preview 响应、1523 初始 tracked 文件的变更白名单、原有 13 份未跟踪资料及保护 SHA-256；全部通过，索引为空。已复看最终构建的 1440 中文和 320 英文图片截图。
- 已知验证风险：第三轮状态页一次滚轮失败未在 24 个独立对照、3 次原阅读组或同一版本第四轮完整 UI 中复现，根因仍未确认；保留失败及诊断证据，不宣称修复了状态页。所有浏览器操作使用本地 preview/fixture，真实模型调用 0，不代表生产验收。

## 初始证据

- 基线 HEAD：75c66203ab84da4119fb7b12392039ef75edc34f；已跟踪工作树/索引干净，原有未跟踪资料 13 份。
- 证据根：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-image-s795go`。`baseline.json` 保存 1523 个原 tracked、13 个 untracked 和 172 个 dist 文件的 SHA-256。
- 独立 preview：loopback 5198，本轮新启动；没有使用归属不明的旧服务。
- `probe-image-race-v2.mjs` exit 0：1440/320 × 新会话/处理中 Enter，4/4 重现。新会话清空后旧预览为 1；Enter 请求不含 attachment。所有请求本地 fixture，页面异常/外部请求 0，真实模型 0。
- 第一次探针因 fixture 把不存在会话的恢复当作 503，等待就绪超时；原 `image-race-baseline.json` 为空结果，不作为通过。`readiness-diagnostic.json` 确认健康成功、自动恢复进入错误；补齐 404/session-not-found 后得到上述复现，未改业务代码。

## 实施及逐次验证

- 新增 `check-public-assistant-image-ui.mjs` 后，旧构建实际 exit 1：`1440/morning/zh/send-gate` 检出 Enter 产生 1 次请求、预期 0。`image-ui-before.log` 与失败截图保留。
- Widget 使用当前 preparation/session 身份检查覆盖成功、错误和 finally；统一图片重置；提交入口在创建请求之前阻断图片准备。原图片压缩和 API 未改。
- lint 第一次为新增 callback 依赖 warning；稳定 callback 后 React Compiler 要求显式列出捕获的 state setters，第二次 exit 1。遵循组件既有 useCallback 依赖写法修正后，第三次 lint exit 0、无 warning；没有抑制规则。英语夹具使用实际 `New session` 标签。
- `build-1.log`：TypeScript 与 Vite 构建实际 exit 0。三项助手 API/会话/browser-state 合同实际 exit 0；performance exit 0，CSS 152582/222755、route CSS 142027、JS 320266/430000 bytes。
- 图片专项 `image-ui-after-1.log` 实际 exit 0，40 cases、真实模型 0。覆盖四个代表配置的新会话/历史切换/删除当前/移除替换图 × 旧成功/失败，以及 Enter/Shift+Enter/组合输入/正常图文发送和当前失败恢复。所有请求由本地 fixture 接管，图片未进入浏览器存储。已复看 1440 中文和 320 英文截图。
- smoke 实际 exit 0，21/0，9766ms。`validation-inputs.json` 冻结 504 个源输入、172 个构建文件，并逐字节比对 47 个当前 preview 响应；原有 13 份资料与保护状态快照保持。
- 第一次完整 `npm.cmd run check:ui` 实际 exit 1（会话 `82845`），`full-ui.log` / `full-ui-result.json` / `full-ui/` 保留：2026-09-10T21:34:01Z–21:49:48Z，5 groups / 1 fail，累计 944609ms。导航字体、语言、博客发现、项目发现已通过，阅读导航在 `fixture must delay the actual article module` 处失败，不作为全量通过。
- `diagnose-reading-module.mjs` / `reading-module-diagnostic.json` 对同一构建独立复现 12 次，exit 0：第 8/11 次 loading 可见比模块拦截回调分别早约 0.354/0.255ms；12 次均真实捕获模块、释放前无文章正文、释放后正文加载，无页面或外部请求错误。确认是测试回调同步缺口，不是文章模块缺失或图片修改引发页面回归。
- 阅读检查改为最多等待 5 秒的真实拦截握手，并断言释放前正文仍未加载；保留完成、交互取消、离开以及全部原焦点/滚动阈值。只改检查脚本，阅读业务代码和当前 dist 保持。需要阅读专项、lint 和新的完整 UI 终局。
- 本轮 preview 执行会话 `75434`、loopback 5198 继续供验证使用；不得在检查完成前停止。第一次冻结证据继续保留，后续源输入以独立新 manifest 记录。
- 修正后的阅读专项 `reading-ui-after.log` / `reading-ui-after-result.json` 实际 exit 0：48 个矩阵、4 个正常动效、22 个边界场景。`node --check` 与第四次完整 lint 均 exit 0，lint 无 warning。
- `validation-inputs-2.json` 冻结 504 源输入、172 构建和 47 preview 响应；与首轮相比只有阅读检查脚本变化。第二次完整 UI（会话 `64120`）运行于 2026-09-10T21:58:04Z–22:09:11Z，因下面新复核出的同范围边界主动中止，实际 exit -1；导航/语言/博客三个已完成组保留在 `full-ui-2.log`，没有完整 summary，不作为通过。
- 继续逐个核对 session registry 提交入口，发现从历史列表重开已过期的当前会话也会改变当前 ID，但未重置图片。`diagnose-expired-image-v2.mjs` / `expired-image-diagnostic.json` 两个受控成功/失败场景均复现：旧图未出现，但旧处理结束后 attach 仍 disabled，chat/page/external errors 均为 0。最初诊断入口误用 Playwright CommonJS 导出，未进入浏览器；保留原脚本，再使用 ESM 入口才得到真实结果。
- 中止前保存 `full-ui-2-interruption.json` 的精确 Node/Chromium 进程树，仅停止本轮 UI Node PID 32324；其六个已记录进程全部退出，preview 37300/5198 仍在。后续修改发生于该检查终止之后。
- 将过期当前会话 × 旧成功/失败纳入四个代表配置，图片专项扩展至 48 场景。同一新增断言在补充修复前实际 exit 1：`expired-current: reset must release image preparation immediately`；日志及截图为独立 `image-ui-expiry-before.log` / `image-ui-expiry-before/`，未覆盖最初图片或阅读失败证据。
- `commitSessionRegistry` 现对所有当前 ID 变化同步调用统一图片 reset；成功同一会话恢复/分支、显式移除等路径仍按原 helper 清空。后续重新 lint/build、相关合同、48 图片专项、performance/smoke，并在新冻结输入上执行完整 UI。
- 中央 reset 引入新的 callback 捕获后，第五次 lint exit 0 但报告 restore effect 缺少 `commitSessionRegistry` 依赖。将其改为依赖 `[resetImageAttachment, setSessionRegistry]` 的稳定 callback，并加入原 effect 依赖；第六次 lint exit 0、无 warning。第二、三次 build 均 exit 0，最终构建以第三次为准：`PublicAssistantWidget-f6CPo7mZ.js` / `index-QnxizCBe.js`。
- 补充修复后的 API/会话/browser-state 合同实际 exit 0；`image-ui-after-2.log` 实际 exit 0，48 cases、真实模型 0；新的 performance exit 0，预算数字保持；`smoke-2.log` 实际 exit 0，21/0、9844ms。
- `validation-inputs-3.json` 对最终 504 源输入、172 构建、47 preview 响应逐字节冻结并核对原有资料和保护状态。相对第二轮只允许 Widget 与图片检查器变化，阅读检查器保持。第三次完整 UI 已启动（会话 `77511`），独立证据为 `full-ui-3.log` / `full-ui-3-result.json` / `full-ui-3/`，当前尚未取得终局，不得重建或修改受检源码。
- 第三次完整 UI 真实终局为 exit 1，46 groups / 1 fail、1492895ms（2026-09-10T22:19:19Z–22:44:13Z）。阅读导航、修正后的延迟模块夹具、48 图片场景和完整助手组均通过；唯一失败组是 catalog-reading 的 390px 状态页同一次滚轮动作，scrollY=0 / selected=status-overview，触发人工区位置、当前章节和吸顶位置三条断言。没有把 45 个通过组拼成完整通过。
- `diagnose-status-wheel.mjs` / `status-wheel-diagnostic.json` 在同一构建进行 12 次原顺序及 12 次额外两帧等待的独立对照，24 次均通过，未据此认定增加等待能修复问题，未修改状态页或原滚轮断言。继续重放原完整 catalog-reading 组确认上下文差异，保留该未复现失败。
- 从实际 `check-ui.mjs` 提取原完整 catalog-reading 组及其原 helpers，仅为 Temp 入口重定位 import/文件 URL，连续重放 3 次全部通过（15576/15804/14922ms），没有改组内操作、阈值或应用代码。结果为 `catalog-reading-replay.json` / `.log`。临时入口生成时两处换行转义曾导致语法检查失败，修正后重新 `node --check` 通过才执行，不作为浏览器失败或产品修复。
- 仍未确认第三轮滚轮失败的根因；不声称状态页或该偶发验证问题已修复。完成上述有界诊断后，第四轮完整 UI 在完全相同的源码/构建/断言上复验（会话 `45249`）。`full-ui-4-input-check.json` 确认相对第三轮 504 源文件、172 构建、47 响应及原有资料无变化；沿用 `validation-inputs-3.json`，新日志/结果/截图使用 `full-ui-4` 前缀，尚未取得终局。
- 第四轮后续实际 exit 0、46/0，最终结果及输入核对见上方“最终验证结果”。之前各轮的失败、中止和中途状态仅为历史记录。

## 故障复盘：图片任务归属与测试时序

### 1. 根因类别

- 图片原缺陷属于 E（隐含假设）与 D（覆盖缺口）：假设图片转换完成前不会改变会话，且按钮 disabled 足以阻断所有发送入口；实际上 Enter 直接调用提交函数。
- 首次修复的遗漏属于 C（变更传播不完整）：补上显式新建/切换/删除/移除，却漏掉过期当前会话也会提交新的 registry ID。忽略旧 finally 后，该遗漏表现为 busy 无法解除。
- 阅读失败属于 E：loading DOM 提交与 Node 收到 Playwright 拦截回调不是同一个事件。独立计时证据确认其间可有约 0.3ms 间隔，模块本身并未缺失。

### 2. 早期修复为何不足

最初 40 场景验证了四个显式重置动作，但没有过期恢复导致 ID 变化的路径。主会话逐项检查 registry 写入点后才补出这一边界；新增永久断言在修复前实际失败，不能用最初 40 场景的通过代替最终 48 场景。

### 3. 防止重复

| 优先级 | 机制 | 具体措施 | 当前状态 |
| --- | --- | --- | --- |
| P0 | 归属边界 | 唯一 preparation 对象与 session ID 同时校验 success/catch/finally | 已实现，48 专项通过 |
| P0 | 统一入口 | 当前 session ID 改变时同步 reset；同 ID 的 history/Branch 和 remove 继续 reset | 已实现，过期成功/失败均覆盖 |
| P0 | 提交门禁 | React busy 投影与同步 ref 在 analytics/API 之前共同阻断 | Enter/Shift+Enter/组合输入/正常图文发送通过 |
| P1 | 浏览器同步 | 最多 5 秒等待实际模块拦截，释放前必须无正文 | 48+4+22 阅读专项通过 |
| P1 | 最终质量 | 冻结源/构建并执行完整 UI | 第四轮原完整 UI 46/0；终局输入核对通过，旧失败仍保留 |

### 4. 有界扩展

已核对组件的 registry 赋值入口，当前 ID 只由 `commitSessionRegistry` 写入；历史、分支和 chat 原有控制器及 late-result 合同保留。未把未复现的其他助手或页面线索混入本项，不新增状态库、转换器或业务数据格式。

### 5. 规范沉淀

`frontend/state-management.md` 写入图片身份、ID 提交边界、同会话重置及共享发送门禁；`frontend/quality-guidelines.md` 以七节记录新增 Node/tsx 共用检查入口、环境键、48 场景和错误矩阵，并补充阅读夹具握手要求；frontend index 同步描述。本仓库不存在 `src/templates/markdown/spec` 镜像目录，未为通用技能额外创建模板树。任务 JSONL 的全部 8 个引用及差异格式检查通过。

## 待完成

实现与最终验证完成；待执行精确本地提交、仅本子任务归档、实际返回父任务、开发日志和自有资源清理。
