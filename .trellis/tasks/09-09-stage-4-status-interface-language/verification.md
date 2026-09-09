# 状态公共界面语言验收

2026-09-09，主会话在规范目录完成第 15 轮验证。本轮已实际运行当前构建的完整 UI，没有复用第 14 轮全量结论。

## 变更与边界

- 新 `statusInterfaceCopy.ts` 复用中文状态/分层/类别映射，英文只覆盖固定 UI；总览/详情、缺失页、队列类型、分区和目录接入唯一语言偏好。
- 三个 formatter 接受可选语言，默认中文兼容；日期沿用原本地时区和格式选项，数值单位不变。原 parser、证据/ageText、状态 tone/code、注意分支、数量、顺序和链接保持。
- 页面作者文本显式标中文，原错误标未知语言；切换不重挂载、不修改 URL/history、不重新请求状态或重建分区监听。目录状态测试与原 outside-pointer 行为分开验证。
- 没有修改 CSS、public/server、原项目/状态数据、请求/阅读 hook、依赖、workflow 或业务自动化。原有十一份无关资料哈希保持。

## 实际验证

| 检查 | 已观察结果 |
| --- | --- |
| 最后 lint | `lint-module-final.log`，exit 0，13355.7443ms |
| 当前业务 build | `build.log`，TypeScript + Vite exit 0；其后仅检查器和文档变化 |
| status 合同 | 两语言 formatter、缺值/非法时间、数值单位、四种原 freshness parser 投影；8 项目 / 7 入口 / 33 检查通过 |
| registry / details / analytics / assistant | 9 CTA fixtures、9 publications、39 链接集合；15 项目；17 路由；31 docs / 61 chunks / 166 entities / 231 relations / 26 suggestions，均通过 |
| performance | 入口 JS 304440/430000 bytes，入口 CSS 152582/222755 bytes，独立 route CSS 141752 bytes，无外部阻塞样式 |
| 状态专项 | `status-language-control-identity.log`：36 页面组 + 4 加载/错误组 + 3 概览分支，modelCalls 0，exit 0，62494.2863ms |
| 最终完整语言 | `language-module-final.log`：12+24+12+5+1+24+4+2+60+36+4+3 组，modelCalls 0，exit 0，258244.641ms |
| 当前构建 smoke | `ui-smoke-final.log`，21 组、0 失败、9680ms；外层 exit 0，10614.228ms |
| 当前构建完整 UI | `ui-full-final.log`，46 组、0 失败、1469358ms；外层 exit 0，1471086.0303ms，session 55772 已结束 |

`verification-final-freeze.json` 保存 34 个源码/检查器/规范/边界文件与 49 个 HTML/JS/CSS 构建文件。9 个本地预览响应（入口/route CSS、两状态页、两 helper、HTML 和公开状态 JSON）与当前 dist 字节一致；15 个保护基线文件和 11 个既有资料原哈希一致。全量终局已再次核对全部受检文件、构建、既有资料和 9 个响应，无漂移，结果见 `post-run-hash-check.json`。任务 JSONL validate、archive tracking 合同和 diff 空白检查也通过。

## 失败与修复证据

1. 旧实现负向：`format-negative.log` 以“未生成”不等于“Not generated”失败；`status-language-negative.log` 在 320/Morning 英文根语言断言失败。原 19 文件与 49 构建基线保留。
2. `status-language-first.log`：检查器在中文切换后仍按旧英文 accessible name 查找同一 select。改为稳定控件定位，同时保留独立名称断言；业务源码/构建没有为此变动。
3. `language-final.log`：原 Node 入口在浏览器启动前失败，`ERR_MODULE_NOT_FOUND` 指向 statusTargets 的无扩展名 hero 导入，exit 1、527.0889ms。直接 tsx 专项没有暴露该入口差异。改用已有 `tsx/esm/api` 的作用域 `tsImport` 加载两个 fixture 模块，保留原 npm 命令、生产导入和依赖；实际 Node 入口的完整语言随后通过。

## 人工视觉核验

已查看受控 fixture 的 320/Morning 总览、1440/Nature 详情、430/Stellar 缺失页英文页头，全量终局后再次查看这三张最终截图。另用当前本地 `dist/status/site-status.json`（没有覆盖该请求）查看 320/Morning 入口卡片、320/Morning 详情检查项和 1440/Nature 人工处理/门禁/后续接入区，保留 `status-real-payload-review.json` 与三张截图。所看视口内固定英文、原文和操作均可读，没有发现需要 CSS 修复的溢出。

这是六个代表视口的人工检查，不能表述为逐张审查所有截图或验证所有项目；受控状态与本地历史公开数据都不构成新的生产可用性验收。其余矩阵由浏览器断言覆盖。

## 环境、证据与交付状态

- Windows / PowerShell 7.6.5 / Node 24.14.0 / Vite 8.0.16，本地 preview 为 127.0.0.1:5190。接续时确认 PID 10300 及 Vite preview 命令行，原 5183 服务保留。
- 所有证据位于 `C:/Users/zhang/AppData/Local/Temp/blog-semi-status-language-20260909-18585bd6`；截图/日志均有验收用途，当前没有一次性脚本或已删除文件。
- 本轮质量门禁已通过，正在精确本地工作提交；随后仅归档本子任务并实际启动父任务。没有 push、部署、签名、真实模型、内容发布、Feed/Cron 启用或 heartbeat 修改。
