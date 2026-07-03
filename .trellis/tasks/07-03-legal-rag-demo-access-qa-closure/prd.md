# Legal RAG 演示访问与问答监控收口

## Goal

让 Legal RAG 的公开演示入口真正可进入、可理解、可监控，同时避免公开真实管理员凭据。

## Requirements

- 公开入口必须说明清楚：
  - 访客从哪里进入 demo。
  - 是否需要登录。
  - demo 账号是否可公开。
  - 哪些后台/质量面板能力适合展示。
- 凭据规则：
  - 禁止把真实管理员密码写进文章、项目页或仓库。
  - 如需公开密码，只能使用专门 demo 账号，权限最小、可回收、可轮换。
- 功能监控至少覆盖：
  - API health。
  - 登录或 demo gate。
  - 法律问答基础响应。
  - citation / source 展示。
  - 合同审查或质量报告入口是否可用。
- 若模型 API、向量库、数据库或 Render 冷启动造成不可用，需要在状态页标记 degraded 或 blocked。

## Acceptance Criteria

- [ ] 记录 Legal RAG 当前公开演示状态：open-demo、credential-required、blocked-by-login、degraded 或 offline。
- [ ] 明确用户需要手动完成的 demo 账号/密码配置，不提交真实密码。
- [ ] synthetic 或手动流程能验证法律问答是否正常。
- [ ] 主站 Legal RAG 项目详情、状态页和演示说明一致。
- [ ] 合同审查/质量面板如不能公开，必须说明原因和替代展示路径。

## Notes

- 推荐第一步：先检查线上入口是否仍被登录挡住；如果是，优先决定公开 demo 凭据策略，而不是绕过登录。
