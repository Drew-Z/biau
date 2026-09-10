# 设计与边界

## 原因与选择

`PublicAssistantWidget` 使用 `rows={2}`；现有 `.public-assistant__composer textarea` 的行高为 1.45、上下 padding 各 9px、边框各 1px。320px 全屏布局保留左右操作后，英文提示需三行，两行输入高度不足。

沿用现有 `max-width: 360px` 媒体块，给该 textarea 至少三行加既有 padding/border 的高度。使用 em 推导文本空间，保留字号、文案、三列操作、120px 上限和原生内部滚动。其他宽度沿用原高度，不增加状态或测量 effect。

## 文件所有权

- `src/styles/route-pages.css`：一个窄屏 textarea 高度规则。
- `scripts/check-site-language-ui.mjs`：在已有助手语言矩阵断言空提示完整可见及必要的布局边界。
- `.trellis/spec/frontend/quality-guidelines.md`：补充输入框内部内容的验收合同。
- 本子任务资料与父任务的评估、恢复记录。

禁止触碰 `public/status/blog-semi-synthetic.json`、生产配置、公开内容、业务 TypeScript、其他既有 UI 任务文件和历史 worktree。

## 验证与回滚

负向断言使用真实空 textarea 的 `scrollHeight/clientHeight`，先等待移动全屏及字体就绪；控件矩形在 viewport 内不代表内部文字完整。保留原文及真实字号，不缩小文字来通过检查。

专项使用现有本地 API fixture 和网络 guard；最终构建重新完成完整 UI。若出现回归，只撤销本项 CSS 与对应断言，保留失败证据，不回滚其他源码或用户资料。
