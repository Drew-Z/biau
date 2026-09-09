# 补齐项目公开入口与状态标签双语

## Goal

让英语读者在首页项目面板、项目目录和详情中理解项目阶段、公开访问动作及通用入口说明；保留每个项目的实际可用性、访问限制、原文事实和目标地址。

## Confirmed Facts

- 第 13 轮已交付 `87b2e01c`、仅归档并实际返回父任务；本轮基线为 `9a6ff19c6533b6bf20eb5f328683095e7eba3221`。持续授权覆盖规划、启动和精确本地提交。
- `projectPublication.ts` 的 CTA 和一般说明为中文；`getPublishedProjectLinks` 仅替换不可用 entry，其他候选标签保持原值。当前 15 个项目的卡片/案例/图源共有 41 个不同的候选短标签。
- `ColoredCard.tsx:18-22` 从中文 label 子串推导短动作，语言替换会破坏该判断；RightScrollCards 的标题、计数、辅助名称与页脚仍是中文。
- 9 份 publication 的 `unavailableReason` 是项目专属原文，不是通用字典。类别/状态原映射还被 portfolio 的助手投影使用，不能直接改写原共享数据。
- 全部消费者已定位：RightScrollCards/ColoredCard、ProjectCard、ProjectDetailPage（快速/案例/图源链接）。原数据、访问逻辑、排序和路由不需要改动。

## Requirements

- R1：沿用唯一 `SiteLanguage` 偏好，CTA、短动作、通用说明、已确认的候选链接短标签和详情类别/状态按语言投影；默认中文文本保持兼容。
- R2：CTA 短动作必须来自明确投影，不分析任何语言的显示文字。无论语言如何，mode/enabled/href/statusHref、entry 降级与去重、链接 type/intent 和顺序保持相同。
- R3：专属 unavailableReason、未知/作者标签、项目名/摘要/描述/图片/证据数据保持原文及可表达的准确语言。一般说明可翻译，作者说明不可被覆盖或作为新的生产事实。
- R4：首页项目面板的固定 UI 和卡片辅助名称接入偏好；轮播 DOM、焦点、项目数、键盘、手势/滚动和 reduced-motion 生命周期保持，不因语言更新重建面板。
- R5：320/390/430/1440 × 三主题 × 两种语言验证目标可达、文本包含和 44px；仅修正本轮浏览器证实的问题，保留既有导航、列表 URL/历史和阅读返回合同。
- R6：原 public/server、portfolio、hero、registry、文章、状态快照、生成产物、依赖、路由/hooks 和其他任务不修改。无 push、部署、签名、生产调用、内容发布、Feed/Cron 或自动化改动。

## Acceptance Criteria

- [x] 新合同/浏览器检查先在原实现上因共享项目文案仍为中文失败，保留负向证据。
- [x] 项目公共界面翻译完成；作者数据、发布事实及目标保持，未知标签仍可展示。
- [x] 确定性 CTA 状态矩阵、entry 降级/去重/无 publication 回退、原文解释、输入不变及真实项目投影通过。
- [x] 本轮语言与动作浏览器矩阵、原有目录/阅读/键盘/轮播合同、lint/build/performance/registry/相关合同、smoke 和完整 UI 通过。
- [ ] 证据、白名单本地提交、仅本子任务归档及实际父任务回切完成，继续重新评估。

## Out of Scope

首页其余内容、状态/日报/助手整页和 SEO/作者内容翻译，公开事实校正或新翻译来源、生产可用性重新认定、架构/依赖/品牌变更。没有待答产品问题。
