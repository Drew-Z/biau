# 补齐状态总览与详情公共界面双语

## Goal

让选择英文的读者从项目入口进入状态总览与详情后，继续理解检查状态、可靠性分层、人工任务类别、分区导航和返回操作。保留已有项目说明、检测证据、可用性及发布边界。

## Confirmed Facts

- 第 14 轮已交付 `75431775`、仅归档子任务并实际回切父任务；本轮基线为 `7b9ef8d8f1f3419ac4651323b08eeda483a19f74`，第 15 轮持续授权有效。
- `SiteStatusPage` 未消费语言偏好；`SiteStatusDetailPage` 仅给共享目录的外壳传语言，六项目录标题仍为中文。`StatusSectionNavigator` 有稳定六个 ID 和独立滚动生命周期。
- `siteStatusView` 的状态/分层/类别映射与日期格式同时供 Studio/导出使用；默认中文和原 tone/code 必须保持。`parseEvidenceFreshness` 从既有中文证据提取标签，不能把展示翻译写回证据或改变 parser。
- `useSiteStatus` 在挂载时请求一次已有 JSON，失败仍保留静态 fallback。语言不能成为请求或状态判断依赖；public/status 只读。
- 主会话已完整读取两页面、分区导航、状态 view/helper、数据加载 hook、相关测试和 frontend 规范，未发现需要新增产品决定的公共 UI 范围。

## Requirements

- R1：沿用唯一 SiteLanguage，翻译总览/详情的固定文案、状态标签与一般语义、分层/类别、队列类型、辅助名称、分区和详情目录、缺失/读取失败提示。
- R2：日期、耗时及 HTTP 的缺值提示接受可选语言，默认中文输出兼容；只扩展既有 formatter，不改变 checkedAt、时间区间、数值、HTTP 结果或 parser。
- R3：项目名/摘要、check label/description/cadence/ownerHint、原 evidence/ageText、gate/nextAction/target note/issues 均原样保留，作者文本使用中文语言标记；不确定语言的原错误使用空 lang，不虚称已翻译。
- R4：状态 tone/code、数量/顺序、首要/次要 note、队列选取、目标/href/外链安全属性不变。保持原数据及 Studio/导出的中文映射，公开状态快照和知识产物不得改写。
- R5：切换语言不得重挂载页面、清空展开目录、改变 URL/history、重发状态请求或重建滚动监听。保留六个稳定分区 ID、跳转/scroll spy、目录焦点/Escape、加载 fallback 和缺失返回。
- R6：真实浏览器覆盖 320/390/430/1440 × 三主题 × 中英文，总览、详情、缺失；补充受控延迟/失败与概览分支。保留可达性、44px、文本包含和文档语言检查，仅修本轮证实的 CSS 问题。
- R7：不 push、部署、签名、生产模型调用、公开发布、启用 Feed/Cron 或改自动化；原有十一份资料及历史 worktree 保持。

## Acceptance Criteria

- [x] 新 formatter/浏览器断言先在旧实现失败，保留负向和源码/构建基线。
- [x] 固定界面按偏好切换，原文/状态/链接/数量与默认中文合同通过确定性检查。
- [x] 三页面语言矩阵、请求不变、延迟/失败、目录与分区键盘、刷新/history、移动布局通过。
- [x] lint/build、status 合同、相关项目/analytics/助手知识、performance、语言专项、smoke 和完整 UI 通过；记录最终构建与受检文件哈希。
- [ ] 精确本地工作提交，仅归档本子任务，实际启动父任务并继续评估。

## Out of Scope

首页剩余文案、AI Daily/助手整页、作者内容/SEO翻译，状态事实或生产验收更改，新 API/schema、依赖、品牌方向及路由/读取 hook 重构。没有待答问题。
