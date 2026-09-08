# 修复公开路由与错误地址恢复

## Goal

关闭父任务轮次 5 审计证实的两个公开路由缺口：助手加载后访问损坏编码的博客/项目地址，保留正常缺失页和返回操作；帆灵备用状态引用解析到已有状态详情。

## Requirements

- R1：助手只对博客/项目详情的路径片段做一次 URI 解码。解码失败、未知 id/slug 均使用现有默认建议，不抛异常、不匹配其他项目、不修改 URL。
- R2：已加载但打开或关闭的助手都满足该回退；普通详情、合法编码、尾部斜杠及其他页面建议保持现有语义。不要借回退吞掉其他异常或重写整个路由。
- R3：将帆灵 publication 的备用状态 href 修正为已有 `/status/pet-gamer`。所有 publication 的 statusHref 必须是 `/status` 或实际 reliability project 路径，不能只验证字符串前缀。
- R4：新增先失败后通过的确定性与浏览器回归，确认损坏地址保留根节点、导航、缺失提示和返回控件，后退可恢复正常目录；检查全部 publication 状态目标可读。
- R5：保留公开知识、项目成熟度/availability/access/证据时间、sitemap、status ID、URL 浏览条件与阅读恢复。不重新生成公开内容，不调用生产 API/模型，不改变后台或依赖。

## Acceptance Criteria

- [x] 新增确定性检查在原代码上抓住 URIError 和错误 statusHref，浏览器回归也在原 build 因根节点清空而失败，已保留负向日志。
- [x] 主会话实现有界回退和单一状态引用修正，检查源码与所有公开产物保护范围。
- [x] 浏览器覆盖 320/390/430/1440、三主题、助手打开/关闭、博客/项目、编码正常详情与状态引用；API 均为本地 fixture，无业务生成请求。
- [x] lint/build、registry、助手 kg/eval、status、专项、smoke、完整 UI 和 performance 通过；保存实际结果与限制。
- [x] 精确本地提交、归档并实际返回父任务继续评估。

## Notes

- Owned：`src/data/assistant.ts` 的建议路径解码；`src/data/projectPublication.ts` 的帆灵 statusHref；两个既有 registry/knowledge 检查器；新增公开路由浏览器检查和 check-ui/package 入口；相关 frontend 规范；本子任务/父任务资料。
- Forbidden：公开文章/项目描述与状态升级、server/data 生成产物、public 全部文件（含保护快照）、CSS、App 和路由组件、服务端、依赖/lockfile、其他任务与 worktrees。
- 不 push/deploy/sign，不发布文章或开启 Feed/Cron，不调用真实模型，不消费 usage reset。现有指向错误目标的链接修正属于本地缺陷修复，不替代发布批准。
- 基线：`cdc97640`；审计来源 `archive/2026-09/09-08-stage-3-content-evidence-audit/audit.md`。原 build 上助手已挂载的八次坏地址导航全部清空根节点；状态路径四次对照已确认。
