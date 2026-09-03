# 执行计划：持续 UI 产品化审计与完善

## 阶段清单

1. [x] 记录基线、启动任务并建立 `ui-audit.md`。
2. [x] 启动开发服务器，完成首轮桌面/移动、三主题、中英文浏览器审计。
3. [x] 选择一个最高优先级 bounded leaf，明确 owned/forbidden files、base SHA 和 acceptance。
4. [x] 主会话或受控 Claude worktree 实现 leaf；不与其他写入者重叠。
5. [x] 审查 diff、文件所有权、敏感信息、视觉结果和回归风险。
6. [x] 运行 `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`、`npm.cmd run check:ui:smoke`、`git diff --check`，按影响追加专门检查。
7. [x] 重新执行受影响路径的桌面/移动/三主题/中英文浏览器验收，更新 `ui-audit.md` 和证据。
8. [x] UI-006 已完成一次受控品牌 leaf 与生产落地：Claude 在独立 worktree 交付三方向探索文档并推荐“门槛柱”；Codex 将其实现为开放四角窗口 + 中央门槛柱，保留实时停靠、reduced-motion 和三主题材质契约。视觉方向仍保留为用户最终品牌确认项。
9. [x] 已完成 `trellis-check` 质量复核、所有权与受保护文件检查，并更新 Round 16 证据；按用户要求不自动提交或推送。UI-003 仍等待正式英文文案，不伪造翻译。
10. [x] 实现 `/studio/brand/logo-lab`：Codex 定制大写 `B` 与 Claude Code `Basin & Channel` 流线小写 `b` 并排比较，覆盖单色、`24/40/48/64px`、三主题及 reduced-motion；保持生产 Logo 与 favicon 不变。
11. [x] 回看 Git 历史最早 Port 标记并增加抽象 Port Glyph：以偏移主轴、单个开放港池、穿越水口和状态点构成模糊轮廓，不要求完整识别为 `B/b`；接入相同对照矩阵和 UI smoke 断言。
12. [x] 用户否决上一轮结论后重新生成 V3：Codex 与 Claude Code 各自独立完成一套 SVG/CSS 候选初稿，当前实验页只并排展示这两套；已审查完整 diff、文件所有权、桌面/移动、三主题、单色、小尺寸和 reduced-motion。Claude 的后续 refinement 两次因上游 `405 Not Allowed` 未产生 diff，Codex 只接管必要的几何收束与集成；当前等待用户选择，生产 Logo 保持不变。

## 首轮验收命令

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

涉及背景、主题或大资源时追加：

```powershell
npm.cmd run performance:check
npm.cmd run check:ui:production-appearance
```

## 回滚点

- 浏览器审计阶段只读，不改变产品代码。
- 每个 leaf 单独保留 diff/commit，若验收失败只回退该 leaf，不触碰用户已有改动或其他 worktree。
- `public/status/blog-semi-synthetic.json` 始终列入 forbidden files。
