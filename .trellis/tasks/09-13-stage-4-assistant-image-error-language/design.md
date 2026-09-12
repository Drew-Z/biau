# 设计

## 问题与数据流

当前 `handleImageSelection` 在异步 catch 内将 `copy.image.*` 的译文保存进 `imageIssue`。状态跨助手关闭/重开保留，语言切换不会重新翻译；若失败在切换后才到达，回调还会保存开始处理时捕获的旧 copy。

修复后数据流为：图片准备异常 → 已有 `PublicAssistantImageError['code']` → 本地错误状态 → render 时按当前 `copy.image` 投影。未知异常沿用 `decode-failed`，不显示原始报错。

## 选择

- 将 `imageIssue` 收窄为已有四类错误代码或 null，不创建重复 union。
- 将当前四项映射移到渲染派生值 `imageIssueCopy`，JSX 仅展示该值。复用原字典；不增加语言 effect、不重启处理、不把翻译存进浏览器。
- catch 只保存错误代码。保持现有 imagePreparation token、session/controller 检查、finally、清理和重试流程。
- 四处组件改动是完整预期：状态类型、派生文案、catch 赋值、JSX 展示。

## 文件边界

业务与回归：`src/components/PublicAssistantWidget.tsx`、`scripts/check-public-assistant-image-ui.mjs`。

规范：`.trellis/spec/frontend/state-management.md`、`.trellis/spec/frontend/quality-guidelines.md`。

记账：本子任务七文件、父 `assessment.md`/`task.json`、收尾 journal/index。保持公共字典、图片 helper、CSS、API、依赖、其他任务、原 13 份资料和 `public/status/blog-semi-synthetic.json` 原样。

## 回归设计

扩展现有图片检查入口，每配置新增六场景：已失败后切换、读取 pending 时切换后失败、不支持格式、输入超限、输出压缩超限、未知异常兜底。沿用真实解码和受控浏览器 FileReader/canvas 边界，不读取或修改 React 内部状态。

通过可见的关闭、导航语言开关和助手重开完成两次往返；核验实际错误文字、草稿/模式/会话/Branch、请求数、处理门禁及重新选图。尺寸矩阵检查错误文字与面板包含关系，主会话复看代表截图。

原 48 个场景保留。历史 188、Branch 32 和公共界面语言在最终完整 UI 中覆盖，不另行重复这些长专项。基础助手合同、性能、smoke 仍执行一次。

## 回滚

回滚本工作提交即可恢复四处组件改动和本次回归/规范；无数据迁移、存储或 API 改动。禁止把失败重试的原 request/intent 重定向到新分支。
