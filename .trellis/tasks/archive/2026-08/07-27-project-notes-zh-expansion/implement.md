# 项目技术档案中文深化实施计划

## 执行清单

- [x] 读取八份现有档案、证据登记和文档校验器。
- [x] 中文化 README、四份项目档案、跨项目比较和证据登记。
- [x] 建立 60 个证据约束主题及五角度题库生成器。
- [x] 生成 300 组中文问答并人工抽查每个范围的机制、故障和验证题。
- [x] 强化校验器：精确计数、连续编号、七字段、中文契约和证据引用。
- [x] 运行文档检查、Lint、Build 和差异检查。
- [x] 复核敏感信息与事实强度，更新任务验收状态。

## 验证命令

```powershell
npm.cmd run docs:project-notes-generate
npm.cmd run docs:project-notes-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

## 回滚点

- 题库来源、生成器和生成结果为同一提交单元；若生成合同失败，可整体回退而不影响主站运行时代码。
- 文档中文化不改变项目 ID、公开 URL、Evidence ID 或运行时数据契约。

## 验证记录

- `docs:project-notes-generate` 连续两次生成相同 SHA-256：`EEEB3A410EF10D8E49AA7999C5FF5D63CEFF299A7DA4705D8E8767E21CD4A6A7`。
- `docs:project-notes-check` 通过：Chatus 65、Anchor 60、公开助手 60、AI 日报 65、跨项目 50，总计 300，证据 44。
- `npm.cmd run lint`、`npm.cmd run build`、`git diff --check` 通过。
- 文档敏感路径/凭据模式与旧英文标题/问答字段扫描均为零命中。
