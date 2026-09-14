# 文字层级分析基线

来源是同一任务前次已完成的只读分析。本轮规划核对 Git HEAD 仍为 `bb771db78d5e419a3a9ea45951fb326a8baff264`，产品源码没有新增差异；没有把旧分析说成本轮重新运行的浏览器验收。

## 已测事实

浏览器为 Chromium 149.0.7827.55，1440×900、DPR 1、reduced-motion；三主题 × zh/en 六组。正式样本 API/model/page/external-request 均 0。

| Stellar 元素 | 颜色 | CSS 字重 | 当前静态背景对比度中位 |
| --- | --- | ---: | ---: |
| 卡片标题 | #E7EAF1 | 650 | 14.7:1 |
| 卡片说明 | #C3C7D6 | 500 | 11.0:1 |
| 动作按钮 | #E4FCFF | 700 | 12.0:1 |
| 非当前导航 | #B9BDD0 | 650 | 10.3:1 |
| 诗句 | #8E8BA8 / 82% | 500 | 4.2:1 |

标题实测平台字体为 SegoeUI-Bold / MicrosoftYaHeiUI-Bold；主 Hero 为 400 的 STSong。卡片宽约 434px、高 86px，正文列约 253px，前三项标题盒约 39px 高。

八张卡片强调色在各主题均只有一种：Stellar #75E1E0，Morning #438F74，Nature #3E946E。浏览器临时去除 `.app.page-home .carousel-card` 的 `--card-accent` 后，Stellar 恢复 #75E1E0 / #BF91EC / #E6B878 / #DC8BA9；已原样还原。分类选择器对 Stellar 材质/边框还存在更高优先级覆盖。

对比度通过隐藏文字而保留布局、采样实际合成背景计算，不能代表动画所有帧或整站无障碍通过；参考站只按截图观察，没有准确 CSS 推断。

## 原始证据与当前规则

- 分析目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-theme-typography-06cZqS`，包含 `analysis.md`、`manifest.json`、六组截图/JSON、`stellar-platform-fonts.json`、`stellar-cascade.json`、`accent-cascade-isolation.json`、`stellar-contrast-samples.json`、`stellar-content-density.json`。
- 用户参考图：`C:/Users/zhang/AppData/Local/Temp/codex-clipboard-d22c9555-5d0b-466a-b8e1-f9a11cf843f5.png`；本站图：`C:/Users/zhang/AppData/Local/Temp/codex-clipboard-840cabad-72da-445e-899d-ae8f49d66616.png`。
- 规划基线：`C:/Users/zhang/AppData/Local/Temp/blog-semi-theme-plan-9culjb26/baseline.json`，保存 1607 tracked 文件、13 份原资料的原字节 SHA，原 38 个父任务子项和 worktree 登记。
- `.trellis/spec/frontend/quality-guidelines.md:201` 要求现有圆角、内容容纳、多色且克制；`:212` 要求导航五项指标跨路由一致，当前示例/检查是 650；`:465` 要求三主题及至少 4.5:1 Hero/卡片标题对比度。
- `.trellis/spec/frontend/component-guidelines.md:295` 起保存首页布局、44px 控件、移动首屏和轮播响应式/原生缩放合同。
- `src/index.css:1` 的 eager CSS 导入顺序必须保留；不通过改导入顺序回避选择器优先级问题。

以上要点已持久化在本文件；原始图片/测量继续留在系统临时目录，避免将大批截图加入公开资源。若后续这些临时证据被系统回收，应按相同版本与配置重新取样，不假定文件仍在。
