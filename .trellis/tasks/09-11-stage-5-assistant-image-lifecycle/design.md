# 公开助手图片处理生命周期设计

## 边界与数据流

本项仅改变 Widget 的内存图片准备生命周期，以及对应浏览器回归。沿用 `preparePublicAssistantImage(File)` 的解码、压缩和资源 finally；不改变图片或聊天 API payload。

选图 → 唯一处理标识（捕获当前 session）→ 原解码/压缩 → 当前标识与 session 均一致时才写入结果。清空图片的既有用户动作同步使标识失效并释放 processing 状态。解码本身可能继续完成，但失效结果不能重新进入 UI。

## 设计取舍

- 使用组件 ref 保存当前图片准备的身份，React state 仅用于禁用/加载投影。复用现有异步请求身份核对的方式，不增加全局状态或第二个图片转换器。
- `commitSessionRegistry` 在当前 session ID 变化时统一重置图片，覆盖重开已过期当前会话的异常恢复；仅忽略旧 finally 却遗漏此重置会使 processing 永不解除。成功恢复同一 session/分支时仍走既有统一清空路径。
- 将清空图片、错误、processing 和原生文件输入集中在一个局部 helper，供既有重置路径使用；组件卸载仅使标识失效，不更新已卸载 state。
- 在 `submitQuestion` 的请求创建和 analytics 之前检查图片准备状态及同步 ref，使 Enter 与按钮门禁一致；不自动补发问题。
- `then/catch/finally` 都校验当前处理身份，避免旧完成清掉后续选择的 busy 状态或文件输入。成功历史恢复仍按既有约定清空图片。

## 浏览器证据

新增可独立运行的 `scripts/check-public-assistant-image-ui.mjs`，同时从现有 `check-ui.mjs` 的助手组调用。复用本地网络 guard；所有健康/会话/聊天都由 fixture 接管。使用真实合成 PNG 的解码/压缩，对最后的 FileReader 完成施加可释放的有界延迟和受控失败，验证用户可见状态和请求 payload，而不是读取 React 内部状态。

覆盖 1440/Morning/中文、320/Stellar/英文、390/Nature/中文、430/Morning/英文；完整 UI 继续承担既有全主题/语言/宽度矩阵。先在当前旧构建运行同一断言取得负向结果，再修改源码和构建。

## 文件所有权与兼容

实现文件：`src/components/PublicAssistantWidget.tsx`。验证文件：新增图片 UI 脚本及 `scripts/check-ui.mjs` 的接入。完整 UI 发现 `scripts/check-reading-navigation-ui.mjs` 在 loading DOM 可见后立即断言网络回调已运行；独立计时探针 12 次中 2 次复现先后颠倒。该脚本也纳入本次验证文件范围，只增加最多 5 秒的真实拦截等待和释放前内容仍未加载的断言，保留全部原场景和阈值。仅在 Phase 3.3 将可复用生命周期与夹具同步合同补入 frontend state/quality spec。任务、父路线图和开发日志按白名单记账。

不改变样式、文案、API 工具、服务端、依赖、公开内容或私有配置。若新图片身份门禁导致合法发送或恢复失败，停在本地修复；可按本子任务精确文件恢复，不回滚其他任务。
