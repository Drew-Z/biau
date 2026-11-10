# 现状与参考核对

核对日期：2026-11-10。

## 本站已确认的问题

| 证据 | 当前行为 | 体验影响 |
| --- | --- | --- |
| `src/components/PublicAssistantLauncher.tsx:40` | 一个 button 同时包含 PublicAssistantPet 和常驻状态文字 | 角色成为大按钮里的图标 |
| `src/styles/flow-pages.css:703`、`src/styles/public-assistant-pet.css:1` | 按钮背景、描边、模糊、阴影，加 96px 高的宠物布局 | 形成截图中的大胶囊；不是素材自带背景 |
| `src/components/PublicAssistantWidget.tsx:1759`、`:1775` | 关窗时角色在入口，开窗时改为标题内 compact 角色 | 开窗后角色变成聊天框头像，独立身份不连续 |
| `src/styles/flow-pages.css:685` | is-open 隐藏原 trigger | 宠物无法独立留在聊天窗外 |
| `src/components/PublicAssistantLauncher.tsx:55`、`src/components/PublicAssistantWidget.tsx:604` | warmup error 映射 blocked，health 状态决定入口文字 | 未主动提问的访客也会看到长期失败姿态 |
| `src/components/PublicAssistantPet.tsx:33`、`node_modules/@lingban/pet-runtime/widget.d.ts:2` | 已有 mountPet / setActivity / greet / destroy | 可复用播放器，无需引入另一个桌宠引擎 |

截图像素尺寸不等于 CSS 尺寸，不能仅据截图断言桌宠被错误放大。主要问题是容器与职责绑定。

## Codex 桌宠参考

来源：[OpenAI 官方 Pets 文档](https://learn.chatgpt.com/docs/pets)，2026-11-10 已通过网页检索工具打开核对。旧 Codex app features 文档目前转向新的官方桌面文档；本文参考其当前公开交互，不推定用户本机版本与示例完全一致。

官方说明将浮动角色、附近控制、活动状态和完整聊天分开，并提供位置移动、隐藏与减少动画。状态表达真实工作进展，完成未读与系统失败分开；文档的交互示例也把角色与任务文字作为不同区域。这些原则适合本站。尺寸调节和多任务列表属于可选能力，本站不必全部复制。

本机浏览器访问该文档返回 403，因此未取得可核验的现场截图；没有声称观察到用户当前安装版本的动画、阴影或具体像素参数。下面的尺寸和点击行为是本站设计建议，非官方参数。

## 借鉴与调整

| 借鉴点 | 本站落地 |
| --- | --- |
| 角色本体独立 | 透明角色层，操作和文字位于独立邻接层 |
| 操作按需出现 | 悬停/聚焦显示小操作区；手机提供可点的选项入口 |
| 活动与完整对话分开 | 短气泡提示进度；点击进入现有研究对话 |
| 可移动、可隐藏 | 桌面拖动并贴边；手机左右切换；隐藏后有固定恢复入口 |
| 低干扰与减少动态 | 页面隐藏暂停，减少动态用静态帧，不主动全屏巡游 |

本站需要额外处理文章目录、页脚、浏览器安全区及软键盘；操作系统悬浮窗的全局快捷键、跨应用浮动、多任务活动列表不直接移植。
