# 实施顺序

1. 主会话读取已修改位置的完整函数/数据、现有 registry/knowledge 检查器、App 调用点、Trellis frontend/type/quality 规范；确认这是浏览器路径输入而非可信内部 manifest。
2. 增加有界路径用例和真实 status 路径集合检查，在原代码上保存各自负向结果。
3. 实现局部安全解码和帆灵 statusHref 修正；运行相关确定性检查，确保 public knowledge v1/v2 不需重生成。
4. 新增可独立运行的浏览器组并接入完整 UI；覆盖四宽度、三主题、两种助手状态、两类详情和有效编码，检查九个 publication 的状态目标。
5. 运行 lint/build、registry、assistant kg/eval、status、performance、专项、smoke 与完整 UI。网络失败仅来自明确本地 fixture，不能调用真实模型或写 public/status。
6. 更新验收/必要规范，核对源码、构建和保护快照哈希，精确本地提交；只归档本子任务并实际返回父任务。

证据复用本轮 Temp 目录，使用 route-recovery 前缀；preview 5184 原 PID 31396 已结束，恢复后实际 PID 为 2932。三个新增负向检查已实际失败：assistant 确定性 URIError、registry 的一项不存在状态路径、browser 的 URI malformed/根节点清空。

实现与验证完成：安全解码只包围原生 decode 调用，损坏片段返回默认建议；帆灵引用改为已有 pet-gamer。26 个建议用例、9 份 publication、17 个检索用例、status、最终 lint/build/performance 和 smoke 21 组（10816ms）已通过。公开路由专项最终为 48+4+18 场景，完整 UI 为 45 组、0 失败（1156319ms）。当前 build 为 index-C16oVPxo.js，入口 JS 295681 bytes；公开文章、状态数据、生成知识、sitemap、CSS 和 lockfile 无差异。两次检查器标题定位失败及真实修正依据见 verification.md；全部证据和哈希见 delivery-evidence.json。下一步精确本地提交、归档、实际返回父任务。
