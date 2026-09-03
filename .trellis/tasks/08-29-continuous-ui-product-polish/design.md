# 技术设计：持续 UI 产品化审计与完善

## 边界与职责

- 主目录 `D:\workspace4Cursor\blog-semi` 只由 Codex 负责基线、浏览器审计、集成和最终验证。
- Claude leaf（如会话能力允许）使用 `D:\Agent\codex\worktrees\` 下独立托管 worktree；每次只拥有一组明确文件，不触碰 `public/status/blog-semi-synthetic.json`、生成状态、密钥和发布材料。
- 现有组件/页面负责结构，`src/styles/` 负责主题和布局，`src/data/` 负责公开内容；不把页面级数据复制进组件。

## 审计闭环

1. 冻结 Git、worktree、任务目录和现有差异。
2. 启动 `vite` 开发服务器，使用 Playwright 访问真实本地页面；建立桌面/移动 × 三主题 × 中英文的首轮证据。
3. 将问题按 P0（路径/交互不可用）、P1（主路径严重遮挡/溢出/不可读）、P2（明显一致性或无障碍缺陷）、P3（视觉微调）记录在 `ui-audit.md`。
4. 每轮只选择一个能独立验收的 bounded leaf；优先处理 P0/P1，再处理 P2/P3。
5. 修改后执行针对性浏览器检查和完整门禁；通过后更新问题清单与证据，再进入下一轮。

## 主题与响应式约束

- 根 `data-site-theme` 是唯一外观真相；沿用 `SITE_THEMES`、`SITE_THEME_META`、既有 Flow/Starfield/Stellar owners。
- 共享 class-based token 和现有 CSS import 顺序，不新增全屏 Canvas、永久 RAF 或平行背景 owner。
- 移动断点沿用项目现有 `320/390/430` 检查矩阵；移动导航和浮层必须预留安全区与底部清晰度。
- 交互控件优先语义 `button`/`Link`，图标按钮提供 `aria-label`，需要时采用 `aria-pressed`、`aria-current`、`aria-controls` 和可见 focus ring。

## 兼容与回滚

- 任何 leaf 都从当前已提交 HEAD 创建，避免覆盖主目录未提交改动。
- leaf 最多产生一个有意交接 commit；Codex 审查后再 cherry-pick/merge（本任务最终不自动提交或推送）。
- 失败时保留原 worktree 和 diff，先查状态/日志/进程再恢复；不使用破坏性 Git 命令。

## 品牌实验页边界

- `/studio/brand/logo-lab` 是按需加载的评审路由，不进入公共导航、项目目录或 sitemap。
- 当前评审面并列展示 `CodexLogoV3Mark` 与 `ClaudeLogoV3Mark`。Claude 在独立 worktree 中完成了 V3 初稿提交；其后两次限定的 refinement 均因 Claude 上游返回 `405 Not Allowed` 失败且没有产生 diff，因此由 Codex 仅在主目录完成了必要的几何收束和页面集成。不得将当前 Claude 候选表述为完全由 Claude 独立完成的最终稿。
- Codex V3 使用偏移主轴、上下两段开放岸线与横向水口；Claude V3 使用断续错位边界、开放入口和非等距状态点。两者均避开 App 方块和标准字母轮廓；更早候选文件保留为未发布实验历史。
- `logo-lab.css` 只拥有实验页布局、三主题样片和候选动效；生产 `BiauPortMark`、导航停靠动画及 favicon 保持不变。
- 选择依据按优先级为：单色唯一轮廓、`24px` 识别、`40/48px` 导航适配、三主题材质一致、动画终态稳定。
