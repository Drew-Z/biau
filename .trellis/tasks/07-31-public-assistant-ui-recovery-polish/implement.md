# Implementation

1. 为历史抽屉建立不透明背景、隔离层级和稳定滚动区。
2. 为 `select`/`option` 设置主题一致的原生控件背景、前景和 `color-scheme`。
3. 收敛全屏布局为居中内容列，保证消息区独立滚动、composer 固定在网格底部。
4. 限制问题编辑器尺寸，并为桌面全屏及 320/390/430px 调整按钮布局。
5. 调整同故障域备用模型的 `400/422` 重试矩阵，并补充 agent fixture。
6. 增加真实请求驱动的进程内自适应排序，冻结每个请求的渠道顺序并补充无网络 fixture。
7. 扩展 UI 静态检查；使用 Playwright 捕获桌面全屏、历史抽屉、编辑态和 390px 视口。
8. 运行 `check:ui`、`assistant:public-agent-check`、`assistant:public-model-check`、`lint`、`build`、`git diff --check`。
9. 更新规范、提交、推送并手动触发 Render 部署，核对部署 revision。
