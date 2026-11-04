# 设计

共享源位于 D:/workspace4Cli/claude/pet-studio/packages/pet-runtime，通过 vendor/lingban-pet-runtime-0.1.0.tgz 固定版本消费。Pixi 仅动态加载；组件不导入工作台或私人陪伴 API。

PublicAssistantPet 为纯视觉 span，外层原按钮继续拥有事件和可访问名称。Launcher 与 Widget 共用，AbortController 取消初始化，卸载释放画布、纹理、监听器。失败时使用静态首帧；无新聊天状态源。

入口闭合时显示完整小角色和原文字；打开时使用紧凑形象，沿用浮层碰撞测量。working/blocked/needsInput 使用 idle；真实 answered 终态可触发一次 happy。idle/happy/sleepy 资产来自已接受包，公开仅 pet.json 与三张 PNG，不含创作证据、模型或聊天信息。授权信息未知，禁止宣称任意再分发许可。

恢复组：D:/Agent/codex/backups/tasks/20261012T034101524Z-pet-studio-revision，stage p1-web-runtime。已有工作区变更完整保留。
