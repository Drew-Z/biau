# 设计

1. 保留 StellarEffects 的导航、Hero、项目面板三个 owner、坐标和 motion 管理；只改变装饰层的绘制范围。
2. 将原本 148px 的顶层径向光斑改为容器大小的装饰层，径向场仍为 74px 半径、沿既有指针坐标定位，用 content-box 与 border-box 的排除蒙版只显示 2px 边缘。保留颜色、强度、screen 混合和不接收指针事件；内部透明区域避免改写文字最终颜色。
3. Stellar 桌面项目计数复用 --home-control-bg 实色表面，保持现有浅蓝灰文字、尺寸和字重；不提高文字亮度。移动计数沿用原布局。
4. 在已有首页 typography 验证中增加正常动态下的三个真实 hover 读数，中英文均检查。不得以关闭所有背景动画或移走鼠标替代回归；只读线上适配器固定已提交的 8 项项目清单，本地仍消费实际工作树数据。
5. 保存发布前负向案例、现有线上版本身份及同步工作流失败阶段，CSS 改动以本地门禁通过后精确提交。

## Owned / Forbidden

Owned: src/styles/appearance-themes.css、src/styles/hero-split.css、scripts/check-home-typography-ui.mjs、.trellis/spec/frontend/quality-guidelines.md、本任务资料及父任务记账。
Forbidden: 既有 13 份外部修改、未跟踪项目资料、公开数据、依赖、API/模型/数据库/服务配置、历史 worktree。生产只读 UI 验证拦截业务 API；不重试 RAG 同步、不手动部署后端。

## 恢复点

D:/Agent/codex/backups/tasks/2026-09-19T06-03-54-022Z-stage-4-stellar-edge-glow / manifest.json：确切 Git 字节或验证过的实体快照。基线提交 5ea0814fe978300229fb375ae16c2f3b71356132。

## 2026-09-20 复现补充

计数遮罩确认有效，上一条“漏遮文字”的口头推断已撤回。第二个独立的 stellar-panel-border-flow 运动层位于内容之上。固定真实几何对应的失败位置后约 3.41:1，单独隐藏运动层后约 7.64:1。将该层也改为全尺寸边缘蒙版，沿用 RightScrollCards 已有 x/y/size 变量；移除三个平移/尺寸内联写入，不改变路径、速度、reveal 或生命周期。新增 flow-pages.css 与 RightScrollCards.tsx 纳入 owned，已在既有 manifest 中扩展恢复点。

回归等待真实运动光斑到达计数，冻结该层当前计算后的几何与渐变一帧，避免截图延迟错过风险位置；finally 恢复。其余背景仍运行。首次孤立等待曾超时，记录为检查失败，不是产品对比度结论。最终完整矩阵含该场景并通过。
