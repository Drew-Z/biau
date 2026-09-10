# 网站持续评估与执行协议

本协议只适用于 `website-completion-roadmap` 及其明确关联的子任务。2026-09-08 用户要求“分析现状 → 制定下一子任务 → 完成 → 再次调用主任务 → 继续”，已授权常规范围内的规划、启动、修改、检查及本地提交。保留完整规划和质量门禁，不逐轮重复请求“继续”。

## 每次进入

1. 读取父任务 `prd.md → design.md → implement.md`、本文件、`assessment.md` 和 `task.json.meta.loop`；后续同回合只重读发生变化的记录。
2. 在规范目录核对 `git status --short --branch`、`task.py current --source`、父子状态及运行中的检查。检查索引，保留其他来源的修改；不创建兄弟 clone/worktree。
3. `enabled=false`、用户要求停止或当前会话不是 `ownerThreadId` 时不自动写入。若其他会话正在修改本目录，记录冲突并等待，不派第二个实现者。
4. `activeChild` 存在且未交付时只恢复该项。状态与 Git 不一致时先核实：完成的 commit 不重做；测试仍运行则等待；中断测试不能记为通过；已归档子任务先回写父任务，不创建重复项。

## 评估与选择

按以下顺序选一个可执行候选：已证实的严重回归；前一阶段必要的交付收尾；妨碍项目理解/内容发现的可复现问题；有明确收益的内容一致性、可访问性、质量缺口。每项记录现象、证据、用户收益、范围、依赖、验证成本和是否需要新决定。

只读审查发现的问题才进入修复队列。仅有猜测时先把“复现/核验并给出结论”拆成有终点的小任务。不要预先创建整个六阶段任务树，不以持续 UI 审查永不结束为理由阻止进入 Stage 2。

## 执行一个子任务

1. 用 `task.py create --parent 09-06-website-completion-roadmap` 建立独立子任务；现有同范围任务优先恢复。创建目录前遵守工作区只读审计约定。
2. 完成 PRD 收敛、复杂任务的 design/implement、owned/forbidden 文件、成功标准、验证命令和回滚点。普通范围由本次持续授权覆盖；超出范围的候选记为待决策并选择其他工作。
3. 回写父任务 `activeChild`、`phase=execute` 和下一动作，用 `task.py start` 激活子任务。主会话按 `trellis-before-dev` 实施，不派实现/检查代理。
4. `phase=verify`：检查本次完整范围，运行必要 lint/build/确定性合同/浏览器检查。复用当前同一代码状态已通过的检查时记录来源，不能把旧版本或部分验证说成全量通过。
5. `phase=deliver`：展示精确提交范围，检查暂存白名单并本地提交。禁止 push/deploy/sign、真实生产模型调用、公开内容发布、业务 Feed/Cron 启用及修改保护状态快照；不得自动消费账户 usage reset。
6. 保存验收结果、commit 和剩余限制。用 `task.py archive <child> --no-commit` 归档该子任务，再只提交该子任务的移动和父任务记账；不归档父任务或历史持续任务。归档根目录被忽略，首次跟踪仅对本子任务的精确归档目录使用 `git add -f`，再核对原路径删除与目标完整文件集；不得 force 整个 archive。命令部分成功时先检查索引，再补未完成部分。
7. 实际运行 `task.py start 09-06-website-completion-roadmap`，把 `activeChild` 清空、`lastCompletedChild` 更新、`round` 增加、`phase=assess`，在 `assessment.md` 写下新评估。直接进入下一项，无需用户再次发消息。

## 恢复、等待和停止

- 同一失败先诊断、有限修复；重复相同外部失败且没有新证据时记录阻塞，不无限重跑。还有其他独立可执行项就继续：未通过的子任务保留 `review` 与 `meta.validation.state=blocked`，不得标记完成或归档；父任务以 `blockedChildren` 记录它，清空 `activeChild` 后实际返回父任务，再选择独立项。仅在记录的外部条件变化后恢复阻塞项。
- 剩余工作全部依赖新产品事实、生产批准或外部条件时，`phase=waiting`，列出精确所需输入并暂停 heartbeat；用户补充后先重新评估。
- 授权范围全部完成时，或用户停止时，关闭 `enabled` 并暂停 heartbeat。不得为了让循环一直运行而生成无价值修改。
- 原生会话 heartbeat 每 15 分钟提供恢复机会，只使用本会话和规范目录；正在工作的回合连续执行。它不承诺机器休眠、应用退出、额度/服务错误后仍能执行。成功创建与未来实际触发分别记录。
- 状态无变化或没有可行动事项时不重复通知；子任务完成、重要失败或需要用户行动时报告。中途检查日志可以概括，但不可声称还未发生的结果。

## 最小恢复命令

```powershell
git status --short --branch
python ./.trellis/scripts/task.py current --source
python ./.trellis/scripts/task.py list
python ./.trellis/scripts/task.py start 09-06-website-completion-roadmap
```

先读取 `meta.loop.activeChild` 决定恢复父任务还是子任务；上面的最后一条只用于没有未完成子任务、刚完成子任务并返回评估，或已按上文保存外部阻塞并转入其他独立工作的情况。`blockedChildren` 不能计入 `lastCompletedChild`。
