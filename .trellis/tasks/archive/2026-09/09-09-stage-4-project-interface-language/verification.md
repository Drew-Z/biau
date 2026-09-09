# 项目共享公开界面双语验收

2026-09-09，规范目录 `D:/workspace4Cursor/blog-semi`，主会话 inline 实施及最终验证。基线 `9a6ff19c6533b6bf20eb5f328683095e7eba3221`，PowerShell 7.6.5 / Node 24.14.0 / Playwright Chromium，preview 为 `http://127.0.0.1:5190`。

## 当前结果

共享 CTA、明确短动作、通用访问说明、现有候选链接短标签、详情类别/状态和首页项目面板支持中英文。9 份 publication 原记录、作者标题/正文/图片/专属不可用原因、目标地址和访问判断保持。未知标签保留原文，未添加候选入口；类别 `live` 的英文为 `Page exists`，不把已有页面描述为已验证可用。

最终静态、语言、smoke 和完整 UI 门禁均通过，session 47702 正常 exit 0。工作提交 `75431775a3a079630f3e54c1cb3c9df63dfa0426` 已完成，子任务已归档且实际回切父任务；首次完整 UI 的失败和检查器就绪修复保留如下。

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| 最终源码/检查器 lint | exit 0 | `lint-readiness-final.log` |
| 最终业务 build | exit 0，包含导航、详情触控及完整动作换行修复 | `build-action-fit.log` |
| performance | exit 0；入口 JS 304440/430000，入口 CSS 152582/222755，路由 CSS 141752 bytes | `performance-action-fit.log` |
| project-registry:check | 9 CTA fixtures / 9 real publications / 39 real link sets；原 12 identities / 9 publications；exit 0 | `registry-final.log` |
| project-details:check | 15 projects，exit 0 | `project-details-check.log` |
| projects:discovery-check | 6 groups，exit 0 | `projects-discovery-check.log` |
| analytics:check | 17 route cases，exit 0 | `analytics-check.log` |
| assistant:kg-check | 31 docs / 61 chunks / 166 entities / 231 relations / 26 route suggestion cases，exit 0 | `assistant-kg-check.log` |
| 项目界面专项 | 60 groups，50060ms，exit 0；包含按钮内文字/图标边界 | `interface-action-fit.log`、`interface-action-fit-result.json` |
| 导航断点补充 | 380/381/768/769/1440 × 三主题 × 中英文，共 30 cases，exit 0 | `navigation-boundary-result.json` |
| 最终完整语言专项 | matrix 12 / catalog 24 / empty 12 / storage 5 / loading 1 / detail 24 / legacy guide 4 / detail loading 2 / project interface 60；modelCalls 0，exit 0；183628.2172ms | `language-readiness-final.log`、`language-readiness-final-result.json` |
| smoke | 21 groups、0 failures、9904ms；明确复用同一业务构建上的已通过结果 | `ui-smoke-delivery.log`、`ui-final-result.json` |
| 最终完整 UI | 46 groups、0 failures、1401545ms；外层 exit 0、1403217.7136ms，session 47702 | `ui-full-final.log`、`ui-final-result.json` |

确定性业务合同在本轮相应源码完成后运行；后续修改仅为 UI CSS、浏览器检查及规范，合同涉及的投影/数据未再改变。断点补充在导航最终版本通过，后续仅修改首页完整动作标签样式；最终四宽度语言矩阵已包含新样式。不复用第 13 轮全量结果。

## 构建与边界

`verification-final-freeze.json` 固定最终 28 个源码/检查器/规范/边界文件和 47 个 JS/CSS/HTML 构建文件。相对首次 `verification-freeze.json`，只有语言检查器与 frontend quality 规范变化，47 个业务构建文件全部相同。实际获取 preview 的 HTML、入口 JS/CSS、项目详情 JS 和路由 CSS，5 个响应均与磁盘 hash 一致；最终全量结束及交付前再次核对 28+47 个文件无漂移。最终入口为 `index-DspgprCS.js`。

publication 对象的规范 JSON SHA-256 与 `publication-records-before.json` 相同：`42c87f7c52586683f8464f305d2d9ee7abf6b3fa3e0e82d842b8aa7abc0b247f`。保护状态快照 SHA-256 为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。public/server、原 portfolio/hero/registry/siteLinks、hooks/App、依赖与 workflow 相对基线无修改。

## 中间失败与修复

1. 原实现负向：英文 CTA 请求仍返回“打开项目”，首页说明仍为“项目状态与访问边界”；两个负向检查均 exit 1，见 `baseline-result.json` 及 `registry-negative.log` / `interface-negative.log`。
2. 英文首页品牌：320px 第二次语言点击被越界的品牌链接截获；第一次收缩修复后 390px 仍因标题宽度失败。最终在已有 768px 断点使用可收缩品牌列和自然换行，保持按钮尺寸。原事件、几何和截图证据保留。
3. 详情触控：320px 中文 Legal RAG 的快速/普通/图源链接分别测得 36/32/28px；限定项目详情在已有 720px 断点补齐 44px。最终相关矩阵验证中英文。
4. 检查器场景：Canvas 没有候选链接，改为明确验证零动作。桌面目录原 CSS 隐藏状态按钮，聚焦失败后 Enter 会触发仍获焦的语言按钮；三主题浏览器诊断确认 `display:none`。检查现在验证手机直接状态入口、桌面详情到状态路径，先断言可见/焦点。
5. 完整动作包含：人工复看发现 88px 桌面按钮内的英文文字宽 99.609px，文字与图标分别越过左右边界。`action-containment-negative.json` / `.log` 保存真实负向；新增按钮内矩形断言，完整标签允许自然换行，保留字体、列宽和移动短标签。后续 60 组与完整语言专项通过。
6. 冻结脚本首轮误列不存在的 `useSiteLanguagePreference.ts`，在写入清单及启动语言检查前失败。实际 hook 位于 `useSiteLanguage.ts`；修正路径后生成最终清单，见 `freeze-check.log`（失败）和 `freeze-final.log`（成功）。
7. 首次完整 UI session 30707 exit 1：navigation-typography 通过（270937ms），site-language 失败（189386ms），共 2 组、1 失败（460323ms，外层 463357.7074ms）。当时地址已为 `/projects/legal-rag`，但焦点仍为目录 `btn`。`detail-readiness-focus.json` 的受控 chunk 延迟诊断实测地址变化后目录仍挂载、详情未挂载；释放后等待标题焦点，再进入状态页成功，模型调用 0。首次仅等待详情根的诊断也失败，保留 `detail-readiness-diagnostic.log`。最终检查器依次等待详情可见和既有标题 focus，未改生产阅读 hook；最终完整语言及 46 组完整 UI 均通过。失败日志 `ui-full-delivery.log` / `ui-delivery-result.json` 保留，不将它们计为全量通过。

## 人工审查与限制

已查看代表截图：首页 320/Morning、430/Stellar、1440/Nature；项目目录 320/Morning；Legal RAG 详情 320/Morning；Pet 详情 430/Stellar；Canvas 详情 1440/Nature。桌面完整动作修复后重新查看 1440/Nature 首页，文字和图标在按钮内；最终全量结束后再次查看桌面首页和 320/Morning 详情截图。主要覆盖首页、目录和详情页头视口；不冒称人工审查全部下方图源、所有项目或所有状态组合。

浏览器使用真实三类项目；通用访问状态由确定性 fixtures 补足。目录桌面状态标签的 DOM 投影接受语言检查，但可见访问路径仍经详情页。首页其余文案、状态/日报/助手整页、作者正文和 SEO 尚未全部双语。

## 交付与清理

证据统一保留于 `C:/Users/zhang/AppData/Local/Temp/blog-semi-project-interface-20260909-a25cee24`。没有 push、部署、签名、真实模型调用、公开内容发布、Feed/Cron 或自动化改动。本轮没有创建一次性脚本、没有删除文件；原有九项未跟踪记录（十一份文件）、历史 worktree 和原服务保留。全量通过后精确本地提交 26 个文件；仅本子任务 `archive --no-commit`，随后实际启动父任务并核对会话指针，三份执行日志保存在证据目录。父循环进入第 15 轮评估，不表示全站双语或生产门禁完成。
