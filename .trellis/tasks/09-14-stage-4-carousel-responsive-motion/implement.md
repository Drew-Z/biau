# 首页轮播响应式运动实施计划

## 顺序

- [x] 恢复父任务、原资料、37 个已完成子任务及源码/构建/实际响应基线。
- [x] 完成三主题真实浏览器初始窄屏及桌面对照，保存六组原始观察和截图。
- [x] 创建前运行工作区只读审计；以父路线图授权建立本子任务。
- [x] 收敛并完整复读 PRD/design/implement；填写范围与 context 后实际 start。
- [x] 用 trellis-before-dev 读取规范，在旧构建执行永久专项并保存有效失败。
- [x] 主会话修改响应式运动 effect 和 query 导出；保留现有输入策略与常量。
- [x] trellis-check：复审改动与生命周期，依次 lint/build，专项、性能、smoke 和唯一必要完整 UI。
- [x] trellis-update-spec：沉淀模式切换合同和真实样式/运动验收，不引入无关约定。
- [ ] 冻结最终源码/规范/构建/HTTP 响应，核对原资料及白名单，Phase 3.4 本地不签名提交。
- [ ] 只归档当前子任务，校正归档 context 引用并提交移动/父记账，实际 start 父任务再评估。
- [ ] 记录 Session 141、关闭自有预览、检查临时资源用途并完成最终字节/Git 核对。

## 验证

证据根：`C:/Users/zhang/AppData/Local/Temp/blog-semi-carousel-resize-ke1j094n`。每次 runner 使用独立 name，保留已存在失败与日志，不覆盖重跑。预览为本轮 PID/创建时间/命令行/端口绑定的所有权记录，以关闭前现场核对为准。

```powershell
npm.cmd run lint
npm.cmd run build
$env:UI_CHECK_BASE = 'http://127.0.0.1:5198'
node scripts/check-home-carousel-motion-ui.mjs
node scripts/check-home-carousel-wheel-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

每个构建消费者都使用冻结后的当前本地构建；源码、checker、规范或构建变化后重新判断关联验证，不能沿用旧版本的全量结论。已通过且输入未变的检查不重复。

## 门禁与保全

- 持续授权覆盖本地规划、启动、验证、精确提交和当前子任务归档；未知 scheduler 保持。
- 以 baseline 原字节保全 13 份未跟踪资料、其他任务与历史日志。禁止宽泛 add/clean/reset。
- 提交前后核对 staged 白名单、Git clean-filter blob 和工作树 SHA。归档仅用 `--no-commit` 并只 force 当前明确目标文件。
- 实际回切父任务后才递增 round 并清空 activeChild；父任务与其他持续任务不归档。
