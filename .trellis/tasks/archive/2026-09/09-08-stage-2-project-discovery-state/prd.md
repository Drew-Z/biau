# 保留项目移动分组与详情返回上下文

## Goal

让移动访客展开项目分组后，进入详情、返回、刷新或分享链接都能继续浏览同一组。依赖博客交付 `9991079a` 及父任务轮次 3 的评估；普通本地实现与提交由持续授权覆盖。

## Requirements

- R1：项目目录使用 `group` 参数保存现有 `ai/fullstack/tool` 三组，默认 `ai` 省略参数，旧 `/projects` 继续有效。只接受白名单，未知/空值回退 ai，重复参数取首值，未知参数丢弃，规范化用 replace。
- R2：显式更换分组增加一条历史，重复选择当前分组不增加历史；后退/前进、刷新和复制链接都恢复分组。URL 是唯一持久状态，不新增 storage 或第二份分组 state。
- R3：目录打开详情、相关项目和正常/缺失详情的返回保留规范化分组。返回地址固定由 `/projects` 构造，不接受外部或任意 returnTo；博客阅读、公开证据与体验链接维持各自的原地址。
- R4：移动端仍仅显示一个组；桌面仍展示全部分组与全部目录项目。跨越现有 720px 边界时保留 URL 中的分组；不改分类、排序、项目数、CSS 或公开内容。
- R5：沿用现有项目详情打开事件；不新增 query/hash/分组到 analytics，canonical 继续不带 query。不增加依赖、搜索服务或生产请求。
- R6：保留已有触控和键盘语义，新增真实浏览器验证；滚动位置、返回焦点和新开详情初始位置留给下一项独立任务。

## Acceptance Criteria

- [x] 新浏览器检查在当前未修复 build 上实际失败，并保留证据；历史 6 次返回丢分组作为补充基线。
- [x] 确定性检查覆盖三组、默认/未知/重复/编码/超长值、往返幂等和固定站内返回路径。
- [x] 1440/320/390/430 × 三主题 × 两种导航语言覆盖所有三组、刷新、分享、历史、正常/缺失/相关详情返回及键盘；720/721 断点和窗口变化另核验。
- [x] lint/build、performance、analytics、专项 UI、smoke 以及受影响的既有完整 UI 组通过。其他未变更组可复用 `9991079a` 最终完整 UI（42 组）的明确基线，不宣称新版本全量重跑。
- [x] 精确白名单本地提交、记录实际边界、归档子任务，并实际返回父任务评估阅读位置和焦点。

## Ownership And Boundaries

- Owned：`src/pages/ProjectsPage.tsx`、`src/pages/ProjectDetailPage.tsx`、`src/utils/projectDiscovery.ts`、`scripts/check-project-discovery.ts`、`scripts/check-project-discovery-ui.mjs`、`scripts/check-ui.mjs` 的新检查调用、`scripts/check-analytics-route-metadata.ts`、`package.json` 的检查入口、frontend state spec、本子任务资料及父任务记账。
- Forbidden：公开文章/项目/状态数据、保护快照、CSS、导航组件、博客业务源码、状态导航、其他任务未跟踪内容和历史 worktrees。
- 不推送/部署/签名，不调用真实生产模型，不发布内容，不启用业务 Feed/Cron，不消费 usage reset。
