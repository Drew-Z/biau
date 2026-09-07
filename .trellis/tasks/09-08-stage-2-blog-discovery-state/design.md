# 博客浏览状态设计

`src/utils/blogDiscovery.ts` 解析并序列化白名单参数，调用现有 filter 后计算页数、夹取页码和可见集合。页面和详情返回共用该纯投影，避免列表数量与返回页码各自派生。

`BlogPage` 从 React Router location 读取 search 并派生筛选/页码。输入框单独保存瞬时编辑值，blur/popstate 清空；它不进入 storage，也不决定结果集合。真实快速输入验证发现 Router 过渡可能落后于已经写入的 History，所以事件处理器从当前 `window.location.search` 合并本次编辑，避免丢字或把刚选择的栏目覆盖回旧值。

URL 不规范时用 Router replace 写入规范形式；点击栏目/页码正常导航，输入搜索 replace 当前条目。保留搜索空格避免输入多词时尾空格被吞掉；省略默认 all/page=1，固定参数顺序。浏览器检查保留零延时连续输入，不通过放慢输入掩盖过渡竞争。

进入文章时在当前详情路径携带同一组条件。`BlogPostPage` 的返回地址仅由已解析条件拼接 `/blog`，从不采纳外部/自定义返回路径；缺失文章同样返回该列表，延展阅读保留条件。直接打开没有参数的文章仍返回 `/blog`。不更改 SEO/analytics 的 pathname 模型，不引入 browser storage。

页面内容和现有控件保持不变。真实浏览器确认条件恢复，不把默认保留/跳动的 scrollY 误记为滚动恢复；后续任务另评估阅读位置和焦点。

验证分两层：纯函数使用仅在检查脚本内构造的 25 篇 fixture 覆盖多页/筛选/空结果，真实 UI 使用现有 11 篇文章验证导航。新的浏览器检查脚本同时可独立运行并接入完整 `check-ui.mjs`，统一使用现有 network guard，只有本地 preview/显式 fixture 能发请求。

React Router 依据：[7.18.0 useSearchParams 官方源码文档](https://raw.githubusercontent.com/remix-run/react-router/refs/tags/react-router@7.18.0/docs/api/hooks/useSearchParams.md)，已实际获取；setter 触发导航，不在同一 tick 依赖多次 setter 排队。沿用仓库已有 Router 7 API，无依赖更新。

回滚点：本项独立提交，只还原这两个页面、纯投影、对应检查和新增规范；保留 Stage 1 已交付成果。旧 `/blog` 和 `/blog/:slug` 始终有效。

完整回归补充：两次完整检查均在状态页模拟手动滚动时失败，整个 catalog-reading 组的重复诊断在第三次复现 `scrollY=0`、当前总体分区及吸顶 top=317px，而之前六个下拉跳转均通过。换为真实滚轮后仍复现，已排除“只改测试输入即可解决”的初始假设。状态导航的长跳转使用全局 scroll-behavior 临时覆盖及异步恢复，并在旧 rAF 中重复指定分区；连续跳转时这些副作用可能与当前滚动状态竞争。将长跳转/reduced-motion 直接交给浏览器 `behavior: 'instant'`，删除全局样式写入和延迟重设分区，让 scroll spy 跟随最终位置；CSS 和公开状态内容不变。

检查使用 Playwright mouse wheel 表达手动阅读，保留等待上限、分区与吸顶断言，并补目标落点和失败现场值。先重复完整目录组（含普通/减少动效），再执行最终完整 UI；只有实际通过后记录修复成功。额外调用跟踪会改变时序，其单独通过不作为回归通过依据。
