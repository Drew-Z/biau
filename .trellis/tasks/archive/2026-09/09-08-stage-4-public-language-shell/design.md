# 共享界面语言设计

## 状态与语言标记

- `src/utils/siteLanguage.ts` 统一 `SiteLanguage = zh | en`、`biau-port-language`、BCP 47 标签和带异常保护的存储读取。
- `src/hooks/useSiteLanguage.ts` 提供 App 唯一偏好状态与只读 React context。使用惰性初始化、layout effect 投影文档语言和持久化；不引入状态库、不在模块加载时读浏览器。
- App 提供 context，Navigation 继续由 props 接收同一个语言值；页脚与 lazy 404 使用 context。后续路由可复用同一状态，不建立第二个选择器。
- `html.lang` 与选择一致。阶段性保留 App 的 `lang=zh-CN` 作为尚未翻译页面和正文的默认值，已翻译的 nav/footer/loading/404 根节点用所选语言覆盖。后续页面接入时应给中文内容保留显式标记，再提升该页的 UI 语言。
- 初始 HTML 仍为中文；首次 React 可见内容绘制前通过 layout effect 同步选择。无独立语言 URL、hreflang 或未经翻译的英文 SEO 声明。当前中文内容 metadata 保持。

## 文案与交互

- 简单共享文案保持组件附近的中英映射，复用现有导航和三主题标签，不引入通用翻译框架或大型词典。
- 语言切换按钮保留现有 `中/EN` 当前状态展示与稳定尺寸，辅助名称说明目标语言。移动 tab 的辅助名称包含当前可见文案。
- 页脚英文忠实对应现有站点性质、隐私、免责、联系信息，不扩展承诺或改 URL。
- 不重挂路由或重置组件 key；切换不触发导航、刷新、主题动作或阅读定位。

## 范围

- Owned: App、Navigation、SiteFooter、NotFoundPage、共享语言 utility/hook、hero 与未启用 Layout 中的重复语言类型、必要检查与 npm 检查入口、状态/类型/质量规范、本子任务及父记账。Layout 仅合并类型来源，不启用旧布局。
- Forbidden: authored 项目/文章数据、SEO 内容投影、状态/AI Daily/助手业务逻辑、公开文件、服务端、依赖版本、已有 CI、其他任务和历史 worktree。
- 必要检查修正：博客文档打开/reload 改为按实际状态选语言，刷新必须先断言保留再继续。其他检查仅在证据显示存在重复切换假设时修改。

## 验证和回退

- 新增可独立运行并纳入完整 UI 的公共语言浏览器检查，使用本地 origin 和 `/api/**` fixture，阻止外部请求，断言模型调用为零。
- 验证真实按钮和键盘选择、路由/历史/刷新、存储异常、主题独立、当前语言与中文内容标记、延迟 lazy chunk 载入、404 恢复、四宽度三主题布局和截图。
- 先在旧构建运行新检查取得有效负向，再实施。运行 lint/build/performance、博客/项目/阅读合同及必要浏览器矩阵；完整 UI 的执行或复用依据必须准确记录。
- 回退只针对本子任务工作提交；存储键只含访客语言，旧版本会忽略它。保留其他来源未跟踪资料。
