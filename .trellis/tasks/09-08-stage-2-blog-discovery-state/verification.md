# 博客浏览状态验收记录

日期：2026-09-08。基础提交 `3a6e8ee7`；主会话在规范目录实施并验证，所有变更仅用于本地开发。全部验收通过，进入精确白名单本地交付。

## 已验证的行为

- 旧 build 打开 `/blog?column=project-notes&q=RAG` 仍显示 `all`，新浏览器检查实际失败，见 `baseline.log`。
- 统一 `column/q/page` 的解析、白名单、120 Unicode 码点限制、页数夹取和返回地址；复用原 public curation/filter，不修改公开文章。
- 栏目/分页进入历史，输入搜索替换当前历史；刷新、复制列表与详情链接、后退/前进、正常/缺失详情及延展阅读保留同一条件。
- 零延时键入曾暴露 Router 过渡中的丢字/栏目覆盖，现以瞬时输入草稿和事件发生时的 browser search 合并解决。检查仍保留零延时输入。
- 浏览器辅助函数等待完整结果集合提交后断言；没有通过延长键入间隔掩盖产品问题。相关链接检查实际目标 URL。

## 验证结果

| 检查 | 实际结果 |
| --- | --- |
| `blog:discovery-check` | 8 组通过，25 篇隔离 fixture 覆盖多页、非法参数、空结果、往返序列化和固定返回路径 |
| `analytics:check` | 15 route cases 通过，新增列表/详情 query 泄漏用例 |
| `lint` | 包含状态导航修复的最终源码全量通过；完整检查器也通过 `node --check` |
| `build` | 包含状态导航修复的最终源码通过，Vite 8.0.16，入口 `index-CIPJVgde.js`，见 `build-scroll-fix.log` |
| `performance:check` | 入口 CSS 152358 / 222755 bytes，route CSS 141623 bytes，入口 JS 290729 / 430000 bytes；0 external blocking stylesheets，immutable cache configured |
| `blog:discovery-ui` | 24 组通过：1440/320/390/430 × morning/nature/stellar × zh/en |
| `check:ui:smoke` | 最终构建 21 组、7 routes × 3 viewports，通过，20173ms；`smoke-final.log` 含完整 SUMMARY 和成功结尾，实际退出码 0；旧构建首次 17863ms 的通过记录另保留 |
| 首次 `check:ui` | 42 groups，1 failed，724830ms；博客组通过，catalog-reading 内状态页 390px 的当前分区/吸顶位置两条断言失败 |
| 状态导航定向诊断 | 从当前完整检查器提取原始 statusSectionIds 检查段；320/390/430 各 5 次，共 15 次通过；分区正确、吸顶 top=8px，未修改产品或断言 |
| 第二次 `check:ui` | 42 groups，1 failed，724540ms；同一手动滚动步骤在 430px 失败，其他组通过，实际退出码 1 |
| 完整 catalog-reading 诊断 | 原组重复 3 次，前两次通过；第三次在 390/430px 复现，现场均为 scrollY=0、当前总体分区、吸顶 top=317.171875px；之前六个下拉跳转无失败 |
| 单改真实滚轮输入 | 原状态导航下第三轮仍在 390/430px 复现归零，不能把测试输入调整记为产品修复 |
| 状态导航修复后的目录组 | 普通模式 3 轮、减少动效 1 轮，共 4 个完整目录组及 12 次移动导航通过；全部目标约 86px、吸顶 8px，root inline scroll-behavior 保持空值；实际退出码 0 |
| 最终完整 UI | 42 groups、0 failed，17 routes × 2 viewports 及所有专项组通过，645929ms；`check-ui-final.log` 含完整 SUMMARY 和成功结尾，实际退出码 0 |
| task / diff / 范围审查 | 上下文引用通过；`git diff --check` 通过；公开数据/样式无差异；状态导航只改滚动调用；保护快照 SHA-256 与基线一致 |

单独提取状态段时未复现；扩大到完整目录组后取得了失败现场。换成真实滚轮仍失败，排除了仅修改测试输入的初始假设。调用跟踪增加额外等待后通过，显示时序敏感，但不将该轮计为修复证据。状态导航的长跳转/reduced-motion 现直接使用 `instant`，删除 root scroll-behavior 的临时覆盖/异步恢复及旧 rAF 对当前分区的覆盖；修复后的原目录顺序及真实滚轮检查 4 轮通过。状态页内容与 CSS 未修改。

检查不再写入页面滚动样式或派发伪 scroll 事件；增加目标落点与现场数值，保留所有既有结果断言及等待上限。`delivery-evidence.json` 记录最终构建对应的 11 个源码/规范文件及保护快照哈希，交付前重新比较，避免将中途版本当作验收版本。

保留两次完整失败、原目录组复现与修正后的检查记录，不把首次失败覆盖为成功。两个初始诊断命令因 TS/ESM 加载方式失败，未执行浏览器检查，不计入上述 15 次。

## 证据与边界

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-discovery-20260908-4f78e2a8f7f64b4799ddd9b9e3b8da57`。

保留旧实现失败、快速输入失败、结果提交时序失败、最终专项截图和所有检查日志。主会话已查看 `blog-320-nature-zh.png`、`blog-430-stellar-en.png`、`blog-1440-morning-zh.png`；未见新增横向溢出。英文是现有导航语言，不代表中文文章正文完成翻译。

真实公开文章只有 11 篇，实际多页切片由隔离 fixture 验证，不声称浏览器已验证生产多页点击。此次入口拆包的预算值不是总下载量改善的证据。返回后的滚动位置、焦点和项目移动分组均留给后续独立任务。

使用本地 preview 和网络 guard；同源 `/api/**` 在博客专项中以 503 fixture 响应，没有调用真实生产模型或服务。不推送、不部署、不签名，不发布内容或启用业务任务。

保护快照 `public/status/blog-semi-synthetic.json` 的 SHA-256 为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`，与 Stage 1 基线一致。

本轮 preview 已重启于 `127.0.0.1:5184`，OS PID `21544`、工具 session `4849`；先前 session 已结束。持续循环中的下一子任务复用本轮 preview，循环结束时核实后关闭；不触碰原有 `5183` preview。未创建临时执行脚本；实际浏览器证据文件作为验收材料保留。两个仅记录诊断加载失败的临时日志在交付时删除。原有前导空格 ` .trellis/`、持续 UI 任务资料及历史 worktrees 均保留。
