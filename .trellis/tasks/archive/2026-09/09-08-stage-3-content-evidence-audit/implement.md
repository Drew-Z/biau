# 公开内容关联核验顺序

1. 阅读公开项目审计、证据登记册、manual gates 和 Studio 边界；逐个核对拟运行检查的副作用。
2. 复用 `618d83af` 上已完成的 project-details、blog:check、project-registry、manual gates、status 合同及只读 public-links 结果。
3. 运行 blog:audit、blog:knowledge-check、blog:project-notes-check、assistant:kg-check、assistant:eval；这些命令不写公开文件、不调用模型。
4. 用只读运行时数据构建 15 项矩阵，核对博客 loader/summary、助手 v1/v2 已生成投影和 sitemap 的对应；查看必要的失败路径。
5. 将真实发现写入 `audit.md`；核对仓库差异和保护快照。无需重跑本项未改变的 UI/lint/build，引用阅读子任务已通过版本并注明不是本项新跑。
6. 精确白名单提交、归档并返回父任务，选择有证据的下一项。临时 stdin 诊断不留下 runner；日志与矩阵为验收证据保留。

验收完成：10 项只读合同通过；11 篇正文元数据、助手 v1/v2 JSON、40 条 sitemap 匹配。63 个结构化站内引用发现帆灵备用状态 ID 不匹配；4 次状态浏览器观察确认错误/正确目标。助手已挂载后损坏编码路径的 8 次 SPA 导航均以 URIError 清空根节点，已保存独立复现证据。外链检查 exit 1，35 个 connection_error、1 个 HTTP 403、1 个 timeout，6 个 HTTP 200；不改 public status。详见 audit.md/evidence.json。

交付完成：9 个资料文件按精确白名单提交 `c308d09bf7bd2543ff05b2f97efabb8058dc9ae8`，12 项业务/产物哈希复核一致，子任务已归档，并实际调用 task.py start 返回父任务。父任务优先选择助手路由异常修复，状态引用列为关联路由候选。只读探子未返回可用结论，已中断，主会话承担全部审查。旧 preview 已退出，当前重启的 5184/PID 31396 留给下一项；首次没有进入 React 的一次性诊断日志已删除，其他结果与截图保留。
