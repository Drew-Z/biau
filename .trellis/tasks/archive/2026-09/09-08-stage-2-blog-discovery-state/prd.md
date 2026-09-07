# 保留博客浏览条件与详情返回上下文

## Goal

让访客筛选、搜索博客后进入文章，返回时继续浏览同一结果集，并能刷新或分享该列表状态。依赖已完成的 Stage 1 `cb327d8c`；本任务由父任务的持续授权覆盖。

## Requirements

- R1：URL 的 `column/q/page` 是栏目、搜索结果、页码的唯一来源，复用现有 public curation 和 `filterBlogPosts()`，默认链接仍为 `/blog`。输入框允许瞬时编辑草稿以避免 Router 过渡丢字，但不持久化或另行派生结果，blur/popstate 清除该草稿。
- R2：栏目只接受 `blogColumnOrder`；搜索最多 120 个 Unicode 码点且保留正在输入的空格；非法/非正/非整数/不安全整数页码回退 1，超出结果页数则夹到最后一页。重复参数取首值，未知参数丢弃，规范化不得增加历史条目。
- R3：栏目和页码的显式选择进入浏览器历史；输入搜索使用 replace，避免每个字符占用一次后退。栏目/搜索改变都重置到第一页。
- R4：列表进入详情、延展阅读和详情的正常/缺失返回都保留规范化条件；返回目的地固定为 `/blog`，不接收任意 `returnTo`。后退、前进、刷新和复制列表链接都恢复条件。
- R5：空结果沿用现有文案，页码显示稳定；SEO/analytics 继续只消费 pathname/规范化路由，不采集搜索词、query/hash 或动态 slug。
- R6：完成回归中已复现的状态页连续分区跳转后滚动归零问题的定位与修复；真实滚轮、分区、目标落点和吸顶验证通过，不降低断言或修改状态内容/CSS。

## Acceptance Criteria

- [x] 复现旧实现对带条件 URL 的忽略，并验证修复后的栏目、搜索和结果数。
- [x] 确定性检查覆盖未知/重复/Unicode/超长/非法页码/多页/零结果/往返序列化和固定返回地址。
- [x] 真实浏览器覆盖 1440/320/390/430、三主题与中英文导航；检查筛选、空结果、后退/前进、刷新、复制列表和详情链接、正常/缺失返回及键盘操作。
- [x] lint/build、analytics、性能预算、针对性浏览器、smoke 和完整 UI 通过；仅 11 篇真实文章，多页切片由确定性 fixture 覆盖，不声称生产数据已验证多页点击。
- [x] 状态导航修复后四轮完整目录组通过，最终完整 UI 42 组、0 失败；真实滚轮与减少动效保持正确目标、当前分区和吸顶位置。
- [x] 白名单本地提交 `9991079a`，记录证据，归档子任务后实际返回父任务评估项目分组。

## Ownership And Boundaries

- Owned：`src/pages/BlogPage.tsx`、`src/pages/BlogPostPage.tsx`、`src/utils/blogDiscovery.ts`、`src/components/StatusSectionNavigator.tsx` 的滚动调用、`scripts/check-blog-discovery.ts`、`scripts/check-blog-discovery-ui.mjs`、`scripts/check-ui.mjs` 的新检查调用及已复现失败的状态页手动滚动检查输入、`scripts/check-analytics-route-metadata.ts`、`package.json` 的检查入口、frontend state/quality spec、本子任务资料与父任务记账。
- Forbidden：公开文章/项目数据、生产服务、保护快照、资产、主题和导航样式、其他任务未跟踪资料；不推送/部署/签名。
- 不新增搜索服务、UI 框架或应用查询参数测试后门。项目分组、滚动位置/返回焦点以及全站翻译分别作为后续候选，不在本项中宣称完成。
