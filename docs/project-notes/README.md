# 项目工程技术档案

本目录保存四套系统的源码级工程知识：Chatus、Anchor Learning、BIAU Port 公开助手和 AI 日报。内容面向架构评审、维护复盘和技术面试，不是运行时配置，也不作为持续在线或业务完成度承诺。

本轮文档采用 `Codex-only scaffold/review`，`model channel: none`。所有叙述均以仓库代码、测试、版本化合同和有范围的生产记录为依据，没有调用外部模型、搜索服务或生产 API。

## 范围与隐私边界

- Chatus 按邀请制私人工作台记录。档案不包含私有仓库地址、访问材料、成员数据、供应商身份、托管凭据、真实容量或内部运营指标。
- Anchor 浏览器 Demo 与 Flutter 客户端分开说明。Demo 只使用内置数据，不上传文件、不访问后端、不做分析、不调用实时 AI，也不代表完整 Flutter Web。
- 公开助手只记录匿名、只读、public-only 投影。内部 prompt、图状态、诊断、私有检索集合、凭据和 provider 配置不在公开合同内。
- AI 日报严格区分“代码已实现”“基础设施已部署”“生产发生过什么”和“哪些能力仍关闭”。目前真实生成仍未完成，不能把 evidence-ready 写成日报已发布。
- 文档中的路径全部为仓库相对路径；不记录开发机绝对路径、私有远程地址或 credential-bearing URL。

## 证据标签

- `source-verified`：已由版本化代码、测试或仓库合同确认。它能证明实现或合同存在，不自动证明当前生产健康。
- `production-observed`：有日期和范围的生产验收或事故记录。它只证明当时观察到的事实，不等同于持续 SLA。
- `documented-design`：明确记录的设计或上线边界，可能仍未启用或尚未完成验收。
- `portfolio-claim`：公开项目摘要，仍等待更强的仓库或生产证据。

所有 Evidence ID 统一解析到[证据登记册](./evidence-register.md)。跨仓证据使用“仓库标签 + commit SHA + repository-relative path + symbol/section”，避免依赖开发机目录。

## 文档索引

- [Chatus 技术档案](./chatus.md)
- [Anchor 技术档案](./anchor.md)
- [公开助手技术档案](./public-assistant.md)
- [AI 日报技术档案](./ai-daily.md)
- [跨项目工程模式](./cross-project-patterns.md)
- [300 组项目工程面试题库](./interview-question-bank.md)
- [证据登记册](./evidence-register.md)

## 题库结构

题库由 60 个证据约束主题生成，每个主题从五个角度展开：工作机制、设计权衡、故障恢复、安全边界、验证证据。分布固定为 Chatus 65 组、Anchor 60 组、公开助手 60 组、AI 日报 65 组、跨项目 50 组，共 300 组。

每组问答均包含：范围、问题、深入追问、参考回答、失败场景、验证方式和证据。代码符号、scope 值、Evidence ID 和路径保留英文，以保持机器校验与源码检索稳定。

## 验证方式

先运行 `npm.cmd run docs:project-notes-generate` 重新生成题库，再运行 `npm.cmd run docs:project-notes-check`。检查器要求八份文档、中文章节、300 组精确分布、连续编号、七个问答字段、最低内容密度、已登记证据、跨项目依赖、仓库安全链接和敏感模式排除。

跨仓 commit/path 检查使用维护者工作区中的 `../chatus` 与 `../learn/anchor` checkout；文档和检查器都不嵌入 Chatus 私有远程地址。
