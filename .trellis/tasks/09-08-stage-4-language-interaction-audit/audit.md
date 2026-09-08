# 语言覆盖与包容交互审计

2026-09-08，主会话在 `D:/workspace4Cursor/blog-semi` 的本地 preview `http://127.0.0.1:5184` 完成只读审计。没有修改源码、公开数据、生成知识、状态快照、依赖或生产配置。

## 语言来源清单

| 区域 | 证据 | 当前分类 | 结论 |
| --- | --- | --- | --- |
| 顶层语言状态 | `src/App.tsx:70-123` | 局部 `zh | en` React state | 只传给 `Navigation`，没有持久化，也没有传给页面或页脚 |
| 桌面/移动导航 | `src/components/Navigation.tsx:29-149` | 中英标签映射；aria 标签多为中英并列 | 切换改变品牌、导航和主操作，主题控件保持双语 |
| 首页与 Hero | `src/components/HeroSplit.tsx:42-283`、`src/data/hero.ts:13` | 展示内容和题句为数据/中文；`SiteLanguage` 类型未接入 App 页面 | 不随语言切换变化 |
| 项目目录/详情 | `src/pages/ProjectsPage.tsx:64-124`、`src/pages/ProjectDetailPage.tsx:107-244` | 固定中文界面，项目数据为公开中文事实，少量英文术语 | 没有页面级语言映射 |
| 博客目录/详情 | `src/pages/BlogPage.tsx:81-159`、`src/components/BlogColumnFilter.tsx:31-73`、`src/pages/BlogPostPage.tsx:84-195` | 固定中文界面，栏目名和术语中英并列，文章数据不翻译 | 没有页面级语言映射 |
| 状态页/详情 | `src/pages/SiteStatusPage.tsx:64-274`、`src/pages/SiteStatusDetailPage.tsx:169-200` | 固定中文界面，少量英文分层标识 | 没有页面级语言映射 |
| AI 日报 | `src/pages/AiDailyPublicPage.tsx:91-191`、`src/pages/AiDailyPublicDetailPage.tsx:80-150` | 固定中文界面和公开版次数据 | 不随语言切换变化 |
| 公开助手 | `src/components/PublicAssistantWidget.tsx:1668-2369`、`src/components/PublicAssistantMessageContent.tsx:56-86`、`src/data/assistant.ts:32-107` | 固定中文交互/错误文案，中英品牌词，建议来自中文公开数据 | 未消费 App 语言状态；模型回答语言不属于本次本地审计 |
| 页脚 | `src/components/SiteFooter.tsx:4-57` | 固定中文边界/免责声明，少量英文品牌词 | 不随语言切换变化 |
| 文档语言/SEO | `index.html:2`；`src/components/SeoManager.tsx`、`src/utils/seo.ts` | 文档根语言为 `zh-CN`，SEO/页面标题由现有中文数据投影 | 不能仅凭导航 EN 状态宣称页面已英文翻译 |
| 主题偏好 | `src/utils/appearance.ts:28-77`、`index.html:9-25` | 独立的 `morning | nature | stellar` 持久化合同 | 与语言状态分离，现有刷新迁移检查保持通过 |

## 浏览器证据

审计脚本使用 Chromium、reduced motion、本地网络 guard 和 `/api/**` 的 503 fixture。实际共 6 个组，页面错误 0，API 仅出现 4 次 GET `/api/health`，模型调用 0。

- `1440 / morning / blog` 和 `390 / stellar / blog`：点击语言按钮后显示 `EN`，导航品牌和四个主链接变为英文；进入项目目录后仍为 `EN`，主体标题仍为“项目集”。硬刷新后按钮恢复“中”，`localStorage.getItem('biau-port-language')` 为 `null`，焦点回到 `BODY`。
- `390 / stellar / blog`：筛选原生 `select` 可用键盘改变栏目，搜索框接受键盘输入，博客卡片 Enter 打开详情；阅读目录 Escape 关闭并恢复目录开关焦点。
- `320 / morning / projects`：项目分组按钮 Enter 打开目标组，目录卡片的详情入口 Enter 可打开详情。
- `430 / nature / status`：状态分区原生 `select` 的 End 键可选中最后分区。
- `390 / stellar / blog`：助手 Escape 关闭面板并在下一帧恢复 launcher 焦点。

当前只有 11 篇公开文章、每页 12 篇，未筛选目录的上一页/下一页均禁用。本次不会把实际数据无法触发的第二页操作记为浏览器通过；多页计算仍由前一阶段的隔离 fixture 合同覆盖。

## 已证实候选

### P2：桌面博客筛选器缺少语义选中状态

`blog-column-filter` 在 `721` 和 `1440` 宽度均能通过键盘选择栏目，URL 和结果变化正确，但六个桌面 `.filter-btn` 的 accessible snapshot 不含 `aria-pressed` 或 `aria-selected`。每次只有一个按钮有 `.active`，却没有向读屏/自动化暴露选中项。原生移动 `select` 不受此问题影响。候选范围是为共享筛选按钮补充 group/pressed 语义和对应回归，不需要翻译或公开事实决策。

### P3：阅读目录跳转后的焦点落点

在博客和项目详情、`320/390/430/1440` 共 8 个场景中，目录跳转后目标段落稳定落在阅读线下方约 `92-99px`，但 `document.activeElement` 是 `BODY`。随后一次 Tab 在 8/8 场景进入目标段落中的链接，因此内容仍可继续键盘访问。是否把焦点移到章节标题或保留链接顺序需要结合阅读导航的屏幕阅读策略再决定，不在本审计中直接改动。

## 需要产品决定的范围

- 全站英文覆盖需要决定翻译资源、公开数据是否提供英文事实、文档 `lang`/SEO 策略和未翻译内容的显示规则。当前证据只支持把语言按钮称为导航层切换，不支持直接补写全站翻译。
- 语言是否持久化是产品偏好：当前状态只在单次 App 生命周期内有效。若要持久化，应与主题一样定义版本化 key、非法值回退和刷新/跨路由验收，并明确它是否影响数据 authored 文案。

## 复用的既有证据

最新完整 UI `route-recovery-check-ui-final.log` 已在同一业务版本通过 45/0 组，覆盖导航焦点、主题、移动/桌面控件、阅读导航、助手面板和状态分区的既有合同；本审计只补语言来源与缺口观察，不把它重复计为新的全站运行。

机器可读结果：`browser-evidence.json`、`reading-guide-focus-baseline.json`、`blog-filter-accessibility-baseline.json`。所有日志和截图保留在共用 Temp 证据目录。

## 限制

仅 Chromium、本地 preview 和本地 API fixture；没有跨浏览器、真实生产可用性、真实模型、屏幕阅读器或内容翻译质量验收。六组临时 runner 的前几次失败分别来自依赖解析、旧标题定位和未等待助手下一帧焦点恢复，最终修正后的六组 exit 0；不能把那些检查器失败算作产品故障。旧的助手、路由恢复、状态合同和公开内容边界保持原结论。

清理自有临时 `language-interaction-audit.mjs` 和 `language-interaction-audit.json.progress.json` 的命令被自动策略以 `blocked by policy` 拒绝，两份文件保留在证据目录；没有改用其他工具绕过删除限制。原有未跟踪资料、历史 worktree、日志、截图和正式结果均保留。
