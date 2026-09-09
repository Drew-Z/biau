# 首页公共界面语言验证

基线提交：`e8154227`（AI Daily 公共界面语言交付）。
证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-home-language-20260910`。
预览：`http://127.0.0.1:5190`，使用本轮自有 Vite preview；未结束其他预览服务。

## 已验证范围

- 首页使用唯一 `useSiteLanguage` 状态和 typed `homeInterfaceCopy`，固定状态标签/值与标题操作名称随语言切换。
- authored 题句、题句副标题和 hero 正文保持原始中文文本，并继续带 `lang="zh-CN"`；首页固定界面根节点随选择设置为 `zh-CN` 或 `en`。
- 题句轮播的计时、拖拽、指针释放、移动端点击、Enter/Space 键盘操作和现有动画未改变；语言切换不重挂载首页根节点、标题或项目轮播，不写入 history。
- `SystemStatus` 仍每秒更新 `Asia/Shanghai` 时钟；项目面板继续由现有 `RightScrollCards` 与 project interface copy 所有。
- 检查器覆盖 320/390/430/1440 宽度与 morning/nature/stellar 主题，包含语言持久化、标题操作、44px 目标、文本 containment、水平溢出和本地网络/模型请求守卫。

## 验证结果

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| lint | exit 0 | 本轮终端输出 |
| build | TypeScript + Vite 通过，exit 0 | 本轮终端输出 |
| performance | JS `304952 / 430000`；CSS `152582 / 222755`；route CSS `141959`；外部阻塞 stylesheet `0` | `performance:check` 输出 |
| 语言专项 | `matrixGroups=12`、`catalogGroups=24`、`emptyGroups=12`、`storageGroups=5`、`loadingGroups=1`、`detailGroups=24`、`legacyGuideGroups=4`、`detailLoadingGroups=2`、`homeInterfaceGroups=12`、`projectInterfaceGroups=60`、`statusInterfaceGroups=36`、`statusLoadingGroups=4`、`statusOverviewGroups=3`、`aiDailyInterfaceGroups=24`、`aiDailyLoadingGroups=4`、`aiDailyErrorGroups=10`、`aiDailyStateGroups=3`、`aiDailyRecoveryGroups=3`；`modelCalls=0` | `language:ui` 最终输出 |
| smoke | 21 组、0 失败 | `check:ui:smoke` 最终输出 |
| 阅读导航回归 | `matrixGroups=48`、`normalMotionGroups=4`、`edgeGroups=22` | `reading:navigation-ui` 独立复跑 |
| 完整 UI | 46 组、0 失败、`1315453ms`；外层 exit 0 | `C:/Users/zhang/AppData/Local/Temp/blog-semi-home-language-20260910/home-ui-full-final-3.log` |
| 差异校验 | `git diff --check` exit 0；仅有既有 CRLF 提示 | 本轮终端输出 |

## 负向与诊断

1. 旧构建英文状态值仍为 `入口状态公开可见`，标题 aria label 仍含 `切换下一条泊岸题句`；小型旧构建负向断言按预期失败，日志为 `C:/Users/zhang/AppData/Local/Temp/blog-semi-home-language-20260910/home-language-negative-small.log`。
2. 第一次完整 UI 运行被主动中断；第二次完整运行的状态页 390px wheel 阶段出现已知首次失败，独立阅读导航随后通过；第三次按原检查器重跑最终 `46/0`，未降低断言或修改状态页。
3. 首页截图首次捕获了首次访问入场遮罩，后续在截图上下文预置 `biau-port-harbor-intro:v3` 后重新生成并复看。

## 人工截图审查

已查看当前构建的两个代表视口：

- `C:/Users/zhang/AppData/Local/Temp/blog-semi-home-language-20260910/home-320-en.png`
- `C:/Users/zhang/AppData/Local/Temp/blog-semi-home-language-20260910/home-1440-zh.png`

移动英文视口显示英文状态值、中文 authored 题句/正文、项目面板和底部导航；桌面中文视口显示中文固定状态与原首页布局。两者 `overflow=0`，移动标题目标约 `272x78px`，桌面标题约 `435x108px`。

## 保护边界与限制

`public/status/blog-semi-synthetic.json` SHA256 仍为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。未修改 authored hero 数据、portfolio、project publication、项目组件、Public Assistant、SEO、API/decoder、依赖或生产状态。

本轮没有 push、deploy、签名、真实模型调用、公开内容发布、业务 Feed/Cron 或 heartbeat 操作。验证使用本地 preview/fixture；Windows/Node 24 本地结果不等同于远端 CI 或生产验收。公开助手固定控件与 authored 内容语言另行评估。
