# 验证记录

## 基线与复现

- HEAD：`018d28d3446e3f1529619987364956dbafb0f484`。
- `baseline-proof.json`：506 source、3 spec、172 build 与上轮最终输入一致；1575 tracked、原 13 untracked 已记录，保护快照保持。
- `feedback-probe-result.json`：2026-09-13T00:03:02Z 至 00:03:27Z，exit 0，25602ms；探针 16 场景执行完毕，其中 12 个转移交互场景复现缺陷，4 个原菜单对照正常。模型调用为 0；这不是修复后的验收结果。
- 自有本地 preview：5198，PID 11100，tool session 98201；完整进程身份见 `preview.json`。
- 证据目录：`C:\Users\zhang\AppData\Local\Temp\blog-semi-assistant-feedback-7c541gfb`。

## 修复验收

- 反馈专项初次 72 场景通过；补充菜单可滚入对话区域的几何断言后，最终 `feedback-final-verified` 仍为 72/0，exit 0，131428ms，模型 0。四配置截图已查看。
- 修复前永久专项 `feedback-before` 在 `1440-morning-zh-other-menu-success` 的实际焦点断言失败，确认测试覆盖产品缺陷，而非夹具初始化失败。
- lint/build、API/conversation/browser-state、performance 与 smoke 21/0 已通过；新增历史检查等待后的 `lint-verified` 和 `history-final` 188 场景也通过。

## 第一次完整 UI 与诊断

- `full-ui`（tool session 14956）从 2026-09-13T01:35:58Z 至 02:01:26Z，exit 1，外层 1527435ms；44 组、1 失败，组累计 1526245ms。导航、语言、发现、阅读、路由与图片 72 / Branch 32 通过；历史 `320/stellar/en/restore-success` 在等待 composer 时超时，反馈专项尚未运行。
- 失败截图 `full-ui/history-failure-320-restore-success.png` 显示助手已关闭；原冻结输入、原资料与 49 个预览响应随后再次核对一致。
- `history-diagnostic` 保留原 `checkTransition`/断言，只调整临时副本模块解析并导出私有函数；第 4 次复现相同超时。`history-diagnostic-3.json`：输入框 focusin 1432.7ms、初始化 close button focusin 1439.8ms、Enter keydown 1441.2ms 触发关闭；page error 0、chat 0。诊断 runner exit 0 表示完成了诊断，不代表四次业务检查全通过。
- 已仅在原历史成功场景重开后增加真实初始焦点等待，保留原 188 场景、超时、pending/Enter/native form 和显式发送断言。原完整失败、原始轨迹和修复后复验分别保留。

## 最终完整验收

- `full-ui-verified`，tool session 45091：2026-09-13T02:52:01.5153912Z 至 03:30:32.9505987Z，exit 0，外层 2311435ms；46 组、0 失败，组累计 2309857ms。
- 完整运行实际覆盖图片 72、Branch 32、历史 188、反馈 72，全部模型调用 0。两个目录内共 144 份反馈最终场景记录均核对通过。
- `final-checks.json` 汇总 10 项成功终局：lint-verified 11861ms、build 5075ms、API 816ms、conversation 779ms、browser-state 1453ms、performance 365ms、feedback-final-verified 131428ms、history-final 335198ms、smoke 13386ms、full-ui-verified 2311435ms。smoke 为 21/0，组累计 12546ms。
- 性能：CSS 152582/222755 bytes，route CSS 142069 bytes，entry JS 320266/430000 bytes，外部阻塞样式为 0，immutable 缓存已配置。
- `freeze-final.json` 与 `final-validation.json`：507 source、172 build、3 spec、49 实际本地 HTTP 响应逐项一致；原 13 份资料、保护快照保持。源码核对严格限定 Widget 三处替换、full UI 两行接入和历史检查四行就绪等待。
- 两次冻结之间只有历史检查和对应规范变化，构建与预览字节完全一致；未重复与其无关的已通过构建/API/会话/存储/性能/反馈/smoke 检查。首次失败不计入通过结果。
- 主会话已查看 1440/320/390/430 最终专项截图。当前菜单仍在，输入保留，无横向溢出；菜单可滚入对话区域的几何断言通过。截图不代替指针命中测试。

## 交付

工作提交 `20a5f4b196d59abe95a12ce7212f0d6db3d5f1e5` 已完成；精确 16 文件、Git blob 与受检原字节一致，索引和 tracked 工作树随后为空。当前子任务已归档、实际返回父任务并记录 Session 138，交付核对如下。未 push、deploy、签名、调用真实模型或修改保护状态快照。

- 归档提交 `3e235d6556f66591907cb3f552f0f7da3826b415` 已完成；只处理本子任务七文件移动/引用与父评估记账，关闭 rename 检测后为精确 15 路径。随后实际返回父任务，第 52 轮逐项核对 35/35 关联子任务 completed。
- 父评估中的四配置指针探针完成：滚入对话区并绘制后 20 个理由按钮中心命中正确，四次实际提交成功，模型 0；未确认额外阻塞。没有修改本次已冻结的源码或构建。
- `preview-cleanup.json` 已确认 PID 11100 身份、退出、5198 无监听与实际重绑释放；没有停止其他进程。所有复现与验收材料保留，原资料和历史 worktree 保留，没有删除文件。
- `session-138.json`：通过 `add_session.py --stdin --no-commit` 追加 Session 138，仅关联工作提交；旧 journal 的 70501 bytes 前缀和 index 的 137 条历史行保持，index 原 CRLF 与 EOF 换行保持。10 份成功检查日志哈希和原 13 份资料再次核对一致；最后记录提交后执行 `closeout.json` 字节核对，不重复已通过测试。
