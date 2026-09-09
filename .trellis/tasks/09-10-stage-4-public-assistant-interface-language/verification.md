# 公开助手公共界面语言验证

基线提交：`46a0a22a`（首页公共界面语言交付）。
预览：`http://127.0.0.1:5190`，使用本轮自有 Vite preview；未结束其他预览服务。
截图证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-public-assistant-language-8c5b47feb5fa4efebd4bf969443ce4ad`。

## 已验证范围

- `publicAssistantInterfaceCopy` 是公开助手固定界面语言的唯一 typed copy 源；启动器、服务状态、模式、历史、加载/恢复/错误、分支/版本、引用证据、反馈、图片和 composer 控件均按 `useSiteLanguage` 投影。
- 用户问题、回答、建议问题、分支预览、历史标题、引用标题/章节/摘要/URL、claim 文本和模型元数据保持原文；界面根节点使用 `zh-CN` 或 `en`，payload 节点使用空语言标记。
- 语言切换不改变 URL/history、面板/消息 DOM identity、当前分支/版本、草稿和请求契约；只使用本地 fixture，不调用真实模型或非本地网络。
- 检查器覆盖 320/390/430/1440 宽度、morning/nature/stellar 主题，包含启动器、历史、模式、引用/版本/反馈、加载与失败后重试、composer、request 数量和 payload 快照。

## 验证结果

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| lint | exit 0 | 本轮终端输出 |
| build | TypeScript + Vite 通过，exit 0 | 本轮终端输出 |
| performance | JS `320266 / 430000`；CSS `152582 / 222755`；route CSS `141959`；外部阻塞 stylesheet `0` | `performance:check` 输出 |
| 语言专项 | `matrixGroups=12`、`catalogGroups=24`、`emptyGroups=12`、`storageGroups=5`、`loadingGroups=1`、`detailGroups=24`、`legacyGuideGroups=4`、`detailLoadingGroups=2`、`homeInterfaceGroups=12`、`projectInterfaceGroups=60`、`statusInterfaceGroups=36`、`statusLoadingGroups=4`、`statusOverviewGroups=3`、`aiDailyInterfaceGroups=24`、`aiDailyLoadingGroups=4`、`aiDailyErrorGroups=10`、`aiDailyStateGroups=3`、`aiDailyRecoveryGroups=3`、`publicAssistantInterfaceGroups=12`、`publicAssistantModelCalls=0`、`modelCalls=0` | `language:ui` 最终输出 |
| 公开助手专项 | 12 组通过，`publicAssistantModelCalls=0`；英文错误/加载/重试和中文恢复检查通过 | `checkPublicAssistantInterfaceLanguage` 输出 |
| smoke | 21 组、0 失败 | `check:ui:smoke` 最终输出 |
| 完整 UI | 46 组、0 失败、`1475495ms`；外层 exit 0 | `check:ui` 第二次最终输出 |
| 差异校验 | `git diff --check` exit 0；仅有既有 CRLF 提示 | 本轮终端输出 |

## 负向与诊断

1. 完整 UI 第一次运行在 `/status` 430px wheel 阶段出现一次时序失败，独立重复 320/390/430 各三次均通过；未修改状态页或降低断言，第二次原检查器完整运行最终 `46/0`。
2. 公开助手语言专项的本地回答流只作为 fixture 响应，真实模型调用计数为 `0`；路由和生产 API 合同没有改动。

## 人工截图审查

已查看当前构建的两个代表视口：

- `C:/Users/zhang/AppData/Local/Temp/blog-semi-public-assistant-language-8c5b47feb5fa4efebd4bf969443ce4ad/public-assistant-320-en.png`
- `C:/Users/zhang/AppData/Local/Temp/blog-semi-public-assistant-language-8c5b47feb5fa4efebd4bf969443ce4ad/public-assistant-1440-zh.png`

320px 英文视口显示英文固定助手控件，同时历史问题、回答和站内内容仍保持中文；1440px 中文视口显示中文助手标题、证据/版本/输入控件，面板与页面内容无明显重叠或水平溢出。

## 保护边界与限制

`public/status/blog-semi-synthetic.json` SHA256 仍为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。未修改 authored assistant content、API/decoder、server、CSS、SEO、依赖或生产状态。

本轮没有 push、deploy、签名、真实模型调用、公开内容发布、业务 Feed/Cron 或 heartbeat 操作。验证使用本地 preview/fixture；Windows/Node 24 本地结果不等同于远端 CI 或生产验收。
