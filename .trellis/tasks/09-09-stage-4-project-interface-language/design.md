# 项目共享界面语言设计

新增 `src/data/projectInterfaceCopy.ts`，仅 type import 现有领域类型，保存固定动作/说明、候选短标签英文映射、首页项目面板文案和类别/状态英文投影。中文类别/状态仍由详情页面已有 portfolio 导入选择，防止数据进入入口 chunk；未知候选标签精确保留，不用任意子串替换。

`getProjectCta(publication, language = 'zh')` 保持原门禁顺序与返回地址，增加明确 `compactLabel`、标签语言与说明语言。专属 unavailableReason 标记中文，一般说明按 UI 偏好；不能以语言影响 enabled/mode。`getPublishedProjectLinks(publication, links, language = 'zh')` 在同一边界翻译标签，保持候选顺序、type/intent、不可用 entry 单次降级和原文回退。所有消费者同步传入偏好，正文数据不修改。

ColoredCard 直接消费 compactLabel，保留显式项目 actionLabel 的原文语义，其他辅助名称使用既有目录字典/动作。原文和公共标签分别标记 lang；若同一原生操作承载原文 tooltip 与译后可见标签，使用内部文本语言标记，不把专属说明冒充英文。RightScrollCards 只接入固定文案，所有轮播 effect 的依赖保持不含语言。

ProjectCard/ProjectDetailPage 同步消费投影，详情类别/状态及相关项目类别用对应语言映射；作者标题、正文、图注/alt 及数据保持。保留链接安全属性、按钮事件传播与来源导航。URL/section id 不由文案派生。

确定性检查扩充既有 `check-product-registry.ts`，覆盖具体合法状态、非中文投影的门禁等价、原文说明、候选降级/去重、无 publication 与未知标签、输入不变。浏览器扩充现有 language 入口：分别保存作者内容与动作目标/类型快照，单独检查译文/语言与专属说明；新增首页/目录/各类项目详情矩阵和真实键盘动作。桌面目录保留仅详情操作的原布局，状态访问走详情入口；手机直接使用可见状态按钮，必须先断言可见及焦点。Canvas 没有候选链接，显式验证零动作。旧完整 UI 仅同步 ProjectCard 分语言文本形成的状态按钮辅助名称，ColoredCard 的原有名称保持对应结构，不能全局替换或删除行为门禁。

实测必要的 CSS：320px 英文首页品牌越界可截获语言按钮点击，初次窄断点修复后 390px 仍有文字溢出；最终统一在既有 768px 断点使用可收缩品牌列与自然换行，保留按钮尺寸和原 380px 紧凑间距。320px 中文 Legal RAG 详情的快速/普通/图源链接分别测得 36/32/28px，限定项目详情在既有 720px 断点补齐 44px。边界检查另覆盖 380/381、768/769 与 1440px、三主题、中英文。

人工截图另发现桌面首页的完整英文动作超出 88px 按钮：文字宽 99.609px，文字左边和图标右边均越界。原页面包含断言没有覆盖按钮内部；新增文字/图标相对按钮的矩形断言，取得负向结果后，仅为既有完整标签增加收缩与自然换行，保留短标签、按钮列宽和字体。最新 60 组专项包含这个回归断言并已通过。

首次完整 UI 暴露桌面目录到懒加载详情的检查器就绪缺口：URL 已变，目录仍可能挂载；仅等详情根出现后马上聚焦也会与既有标题定位生命周期竞争。受控阻塞详情 chunk 的诊断复现并验证真实事件顺序。检查器现在依次等详情根可见、标题获得既有焦点，再聚焦状态操作并 Enter；保留生产阅读 hook 和焦点合同。最终语言专项与完整 UI 在该检查器上通过。

Owned：新 UI 字典、projectPublication 函数/投影类型（原 records 禁止修改）、RightScrollCards、ColoredCard、ProjectCard、ProjectDetailPage、check-product-registry.ts、check-site-language-ui.mjs、check-ui.mjs、navigation.css、route-pages.css、hero-split.css、frontend 规范、本子任务与父任务资料。

Forbidden：public/server、portfolio/hero/productRegistry/siteLinks 原数据、文章和 curation、生成产物、依赖、路由/阅读/语言 hooks、其他任务和 worktree。以本轮工作提交独立回滚，不撤销前序交付。
