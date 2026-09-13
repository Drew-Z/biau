# 验证记录

## 基线与复现

- HEAD：`1a90dc10dec64bac7256ae41ed308012222e7044`。1591 tracked、原 13 untracked 已保存，508 source / 4 spec / 172 build 与上一项冻结一致；49 个实际 HTTP 响应匹配。
- 证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-carousel-wheel-fj7gm_p4`。
- `probe-before` 退出 0，118746ms，取得 15 个探索观察，但其中两条普通滚轮未命中轮播，不能作为正常对照。`ordinary-control` 补上显式坐标与事件真实目标断言后，三主题 3/3 普通滚轮正常，退出 0，19862ms。
- `assessment-before.json` 选取 15 个有效观察：Ctrl+wheel 和原生 pinch 共 6 个问题场景、3 个实际 pinch 放大对照、3 个普通轮播对照、3 个外部 Ctrl wheel 事件观察；真实模型/API、页面及外部请求错误均 0。
- 轮播区域三个 pinch 的 scale 均保持 1，外部三个对照约为 1.4；主会话已查看 Morning 对照截图。headless Ctrl+wheel 外部也不改变 chrome 缩放，故仅用于事件归属核验，不把该限制误写为产品 bug。

## 永久回归与实施

- `wheel-before` 退出 1，3454ms：专项错误地查找卡片中不存在的 `h3`，项目数组为空且尚未发送 wheel。这是专项准备失败，不是产品回归；原日志、JSON 和截图保留。
- 按 `ColoredCard` 的真实 `strong` 标题修正唯一选择器后，`wheel-before-valid` 在未改动的旧构建退出 1，3733ms：trusted Ctrl+wheel 实际命中轮播，位置从 758.72 立即变为 716.72（-42px），违反原生输入不推动轮播的断言。本次事件 `cancelable=false/defaultPrevented=false`，不把它误写成成功取消；错误的即时位移已独立证明产品问题。页面和 API 错误为 0。
- 只为 `RightScrollCards.handleNativeWheel` 增加 `if (event.ctrlKey) return`；完整 UI 增加 import 和原 catalog-projects 组调用两行，旧断言保持。更新 component/quality/index 三份规范。
- 修复后首次 `wheel-after` 退出 1，16285ms：Morning 五项通过，随后 Stellar 的实际 wheel 目标在轮播之外。原生缩放成功不替代目标断言；本次不计为专项通过。
- 保持全部断言的 `wheel-diagnostic` 退出 1，9437ms，记录到取点后页面从 scrollY=0 移至 280，原坐标实际命中 MAIN。准备阶段的页面位置尚未稳定；没有据此修改产品逻辑。
- 独立 `wheel-target-ready` 把准备步骤改为显式即时 `scrollIntoView` 与两帧等待，再测量并发送真实输入，33/33 通过，退出 0，53293ms。将该准备步骤及坐标/前态失败记录移入永久专项；准备进行永久入口的最终验收。所有原失败与诊断文件保留。

## 最终验收

| 检查 | 实际终局 | durationMs |
| --- | --- | ---: |
| lint-final | exit 0 | 9552 |
| build | exit 0，tsc 与 Vite 完成 | 5186 |
| wheel-final | exit 0，33/33 | 52197 |
| performance | exit 0 | 342 |
| smoke | exit 0，21/0 | 10718 |
| full-ui | exit 0，46/0 | 2319242 |

- 唯一一次本轮完整 UI 为工具会话 54817，已收取终局；组累计 2317764ms。再次包含轮播 33、阅读链接 75、助手图片 72 / Branch 32 / 历史 188 / 反馈 72，模型调用均 0。没有重跑已经通过的长测试。
- 永久专项独立及完整运行均包含 Ctrl wheel 12、原生 pinch 12、普通 wheel 9（其中桌面 3）；实际主题、语言和宽度与配置逐项匹配。两次运行的 pinch scale 均约 1.4，静态模式保持 transform=none。所有真实事件目标、事件归属、同事件即时位移、页面身份及零网络/服务调用断言通过。
- `final-checks.json` 绑定六项真实结果和日志摘要；`validation-inputs.json` 冻结 509 source / 4 spec / 172 build / 49 本地 HTTP 响应，`final-validation.json` 在完整 UI 终局后逐项确认一致。原 13 份资料、保护快照和非 owned tracked 文件原字节保持。
- `wheel-final-proof.json` 确认成功 build 后仅修改了 checker 的准备与诊断，编译源文件、build 和实际 HTTP 字节保持，因此复用该成功构建与性能结果；最终 checker 已重新 lint。未修改 CSS、依赖、API、公开数据和原完整 UI 断言。
- 主会话已检查三主题桌面和 320px 的真实缩放截图；合法视觉视口放大产生的裁切不作为文档布局缺陷。专项共保留 9 张配置截图，完整运行保留独立证据。当前待 Phase 3.4 精确本地提交、仅归档本项、实际返回第 54 轮和 Session 140。

## 本地交付

- 工作提交 `8955fa4800f0002f0609b9ecb6a2a56f66c4ea18` 已完成，精确 15 文件、490 行新增/7 行删除；索引、Git blob 与工作树原字节核对通过。提交未签名、未推送。下一步仅归档当前七份任务文件并实际返回父任务。
