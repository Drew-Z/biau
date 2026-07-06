# Round 6 project detail visual evidence followup

## Goal

Improve project detail visual evidence quality checks or public-safe body visuals so project pages read more like technical case studies with reliable screenshots, diagrams, captions, and source evidence.

本任务目标是继续推进用户提出的“项目详情页不能只有顶部一张图，正文应穿插示例图、流程图、架构图”的方向。优先从可自动验证的质量门入手，避免只靠肉眼记忆判断视觉证据是否足够。

## Requirements

- R1. 审计当前 `project-details:check`、项目详情数据和正文 visual 渲染方式。
- R2. 选择一个能提升项目详情页技术案例可信度的最小改进：质量检查、数据规范或一组 public-safe visual/caption/source 补强。
- R3. 不伪造真实产品截图；缺少真实截图时必须标注为流程图、架构图或公开安全占位。
- R4. 不提交本地绝对路径、后台地址、账号密码、未批准下载链接、私有监控地址或敏感指标到公开数据。
- R5. 修改后运行项目详情相关验证；如果影响 UI，运行 UI/build 验证。

## Acceptance Criteria

- [x] 已审计当前项目详情 visual 数据和检查脚本。
- [x] 完成一个可本地验证的视觉证据质量改进。
- [x] `project-details:check` 或等价新检查覆盖该改进。
- [x] 相关验证通过。
- [ ] 提交并推送 `blog-semi`。

## Notes

- 本任务默认不生成新图片；优先利用已有截图、SVG 图和公开安全说明。
