好的,我已经读取了所有必要的信息。现在我将直接输出 `.agent-work/cc-plan.md` 的完整 Markdown 内容:

```markdown
# Claude Code Builder Agent 只读计划

生成时间: 2026-06-14  
项目: blog-semi  
分支: main  
工作模式: 只读计划（不修改源码、不运行改变状态的命令）

---

## 1. Read-only Findings

### 当前项目状态

**Git 工作区**
- 分支: `main`，与 `origin/main` 同步
- 未跟踪文件: `.agent-work/`、`.claude/`、`.mcp.example.json`、`CLAUDE.md`
- 最近提交: `5bd494a Refine project navigation and detail pages`
- 状态: 工作区整洁，适合继续调整

**技术架构**
- 前端: React 19.2.6 + Vite 8.0.12 + TypeScript 6.0.2 + Semi Design 2.100.0
- 样式: 全局 CSS（App.css，4200+ 行），浅暗主题、响应式布局、官网式展示风格
- 路由: 客户端状态管理，支持首页、项目、案例、博客及四类详情页
- 数据源: `src/data/portfolio.ts`（183 行），集中管理 12 个项目、4 条能力线、4 个案例、3 篇示例博客
- 部署: Vite 静态构建 + Cloudflare Pages 自动发布

**展示项目清单**（12 个）
1. **Legal RAG**（AI 应用 / 重点案例）- ✅ 已有完整详情和截图
2. **Pet Workspace**（AI 应用 / 重点案例）- ⚠️ 需补充审核后台截图
3. **Ozon 电商 ERP**（业务系统 / 重点案例）- ⚠️ 需脱敏后台截图
4. **blog-semi**（博客系统 / 建设中）- ✅ 当前站点
5. **biau-playlab**（博客系统 / 已有页面）- ✅ 旧版参考
6. **xunqiu**（移动端 / 待整理）- ⚠️ 需脱敏服务端配置
7. **game-first-tetris**（游戏 / 已有页面）- ⚠️ 需统一封面
8. **game-next-spacewar**（游戏 / 已有页面）- ⚠️ 需统一封面
9. **intespace**（游戏 / 已有页面）- ⚠️ 需统一封面
10. **raiden-prototype**（游戏 / 已有页面）- ⚠️ 需统一封面
11. **space-war**（游戏 / 已有页面）- ⚠️ 需统一封面

**资料源目录**（`/home/zhang/workspace/reference-projects/`）
- 包含上述项目的源码、README、AGENTS.md、文档和目录结构
- 用于整理信息，不直接修改

**fanhui.txt 参考情报**（`/mnt/d/workspace4Codex/ques/fanhui.txt`）
- 仅作为背景参考，不是唯一事实来源
- 可以借鉴工作流信息，但不完全套用

---

## 2. Baseline From Adoption Audit

根据 `.agent-work/adoption-audit.md` 和 `fanhui.txt`：

**当前已完成**
- ✅ 信息架构清晰：首页、项目、案例、博客职责分离
- ✅ 独立详情 URL：`/projects/:id`、`/games/:slug`、`/cases/:id`、`/blogs/:slug`
- ✅ 浅暗主题一致性：全局 CSS token + 响应式布局
- ✅ 项目详情页框架（`ProjectFullDetailView`）
- ✅ 游戏展示页框架（`GameShowcaseView`）
- ✅ 案例详情页框架（`CaseDetailView`）
- ✅ 博客文章页框架（`BlogArticleView`）
- ✅ Legal RAG 完整详情（项目 + 案例 + 博客 + 3 张运行截图）

**待补充（内容层）**
1. 运行截图
   - Ozon ERP: 脱敏后台截图（商品、订单、审批中心、任务中心）
   - Pet Workspace: 审核后台和生成任务截图
   - 游戏项目: 统一封面图（1280x720）和玩法截图
2. 案例详情内容
   - Ozon ERP: 补充证据材料和架构图
   - Pet Workspace: 补充生成管线说明和 Android 验证
   - 游戏展示规范: 作为案例讲统一展示规范
3. 博客文章
   - 需要更多真实复盘文章

**待优化（代码层，非紧急）**
- `App.tsx` 过长（1795 行），可拆分为 `views/` 目录
- 项目详情内容硬编码在 `getProjectDetailContent`，可改为 `data/project-details/` 目录
- 缺少搜索和标签过滤
- 缺少内容管理后台（保持静态数据管理即可）

---

## 3. Proposed Scope

**本轮计划聚焦：项目/案例详情内容补全、脱敏风险、列表页与详情页区分度、项目和案例按钮路由清晰度**

### 核心任务

1. **补充项目详情内容**（优先级 1）
   - Ozon ERP: 补充工程目录结构、功能模块、实现方式、后续扩展
   - Pet Workspace: 补充工作区边界、生成管线、审核闭环、Android 验证
   - 游戏项目: 补充玩法拆解、系统实现、试玩接入计划
   - xunqiu: 补充 64 位重构、服务端接口、移动端模块、发布验收

2. **补充案例详情内容**（优先级 2）
   - Ozon ERP 案例: 补充业务场景、架构图、面试讲解口径
   - Pet Workspace 案例: 补充生成管线、审核闭环、Android 验证
   - 游戏展示规范案例: 作为独立案例，讲清楚 5 个游戏的统一展示规范

3. **脱敏风险检查**（优先级 1）
   - Ozon ERP: 不暴露真实店铺凭证、数据库连接、服务器地址、账号密码
   - Pet Workspace: 不暴露云端 API、任务 JSON、模型缓存、候选素材
   - xunqiu: 不暴露服务器 IP、数据库配置、测试账号、签名文件

4. **明确列表页与详情页区分度**（优先级 2）
   - 列表页（`ProjectsView`）: 摘要、技术栈、状态标签、预览入口
   - 详情页（`ProjectFullDetailView`）: 工程目录、功能模块、实现方式、后续扩展
   - 案例页（`CaseDetailView`）: 业务场景、解决方案、证据材料、面试讲解

5. **项目和案例按钮路由清晰度**（优先级 2）
   - 项目卡片: "预览" → 列表页右侧预览、"项目详情" → `/projects/:id`、"案例" → `/cases/:id`
   - 详情页底部: "返回项目系统"、"查看对应案例"、"进入游戏展示页"

### 非目标（本轮不做）

- ❌ 不拆分 `App.tsx` 为页面组件（非紧急，当前可维护）
- ❌ 不重构 `portfolio.ts` 数据结构（当前 183 行可接受）
- ❌ 不增加搜索和标签过滤（后续优化）
- ❌ 不接入真实试玩包（需要单独准备资源）
- ❌ 不新增或扩展 `douyu`、`yihuan-helper`、`ques`
- ❌ 不大规模重构 UI（保持当前展示框架）

---

## 4. Files Expected To Change

### 主要修改文件

1. **`src/data/portfolio.ts`**（当前 183 行）
   - 补充 `Ozon ERP`、`Pet Workspace`、`xunqiu` 的详细描述
   - 补充案例 `ozon-erp`、`pet-workspace` 的详细内容
   - 补充游戏展示规范案例 `godot-showcase`
   - 补充博客文章（项目复盘、技术实践）

2. **`src/App.tsx`**（当前 1795 行）
   - 补充 `getProjectStructure` 函数中 `ozon-erp`、`pet-workspace`、`xunqiu` 的目录结构
   - 补充 `getProjectDetailContent` 函数中上述项目的详细内容
   - 补充 `getGameShowcaseContent` 函数中游戏项目的玩法拆解
   - 可能需要调整案例数据结构，增加 `godot-showcase` 案例

### 可能新增文件

- 无（本轮只修改现有数据文件）

### 不修改文件

- `src/App.css`（样式已完成，无需改动）
- `package.json`（依赖已稳定）
- `vite.config.ts`（构建配置已稳定）
- `/home/zhang/workspace/reference-projects/`（只读，不修改）

---

## 5. Implementation Steps

### Phase 1: 读取资料源项目信息（只读）

**目标**: 从 `/home/zhang/workspace/reference-projects/` 读取项目 README、AGENTS.md、目录结构，整理成可公开的项目详情和案例详情。

**步骤**:
1. 读取 `erp/README.md`、`erp/AGENTS.md`，提取工程结构、功能模块、技术栈
2. 读取 `pet/README.md`，提取工作区边界、生成管线、审核闭环
3. 读取 `xunqiu/README.md`，提取 64 位重构、服务端接口、移动端模块
4. 读取游戏项目 README（`game-first-tetris`、`game-next-spacewar`、`intespace`、`raiden-prototype`、`space-war`），提取玩法、系统、试玩状态
5. 整理脱敏清单：标记需要替换的真实店铺名、账号、IP、数据库名、签名文件路径

**输出**:
- 整理后的项目详情内容（Markdown 格式）
- 整理后的案例详情内容（Markdown 格式）
- 脱敏检查清单

### Phase 2: 补充项目详情内容（修改 `src/App.tsx`）

**目标**: 在 `getProjectDetailContent` 函数中补充 `ozon-erp`、`pet-workspace`、`xunqiu` 的详细内容。

**修改点**:
- `getProjectDetailContent` 函数中增加 `ozon-erp`、`pet-workspace`、`xunqiu` 的分支逻辑
- 每个项目包含: `subtitle`、`overview`、`modules`（功能模块）、`implementation`（实现方式）、`nextSteps`（后续扩展）
- 保持与 Legal RAG 相同的详细程度

### Phase 3: 补充项目目录结构（修改 `src/App.tsx`）

**目标**: 在 `getProjectStructure` 函数中补充 `ozon-erp`、`pet-workspace`、`xunqiu` 的目录结构。

**修改点**:
- `getProjectStructure` 函数中增加上述项目的目录结构
- 每个项目按照 `{ title: string, detail: string }[]` 格式组织
- 保持脱敏：不包含真实路径、IP、账号、数据库名

### Phase 4: 补充案例详情内容（修改 `src/data/portfolio.ts`）

**目标**: 在 `caseStudies` 数组中补充 `ozon-erp`、`pet-workspace` 案例的详细内容。

**修改点**:
- 补充 `ozon-erp` 案例: `challenge`、`solution`、`results`、`evidence`、`architecture`、`talkingPoints`
- 补充 `pet-workspace` 案例: 同上
- 新增 `godot-showcase` 案例（游戏展示规范）

### Phase 5: 补充博客文章（修改 `src/data/portfolio.ts`）

**目标**: 在 `blogPosts` 数组中增加更多真实复盘文章。

**修改点**:
- 新增博客文章: 
  - Ozon ERP 业务系统交付记录
  - Pet Workspace AI 工程化实践
  - Godot Web 游戏展示规范
  - React + Semi 博客系统搭建记录
- 每篇文章包含: `slug`、`title`、`tag`、`detail`、`date`、`readTime`、`sections`、`takeaways`

### Phase 6: 验证路由和按钮逻辑（只读验证）

**目标**: 确认项目卡片、详情页、案例页之间的跳转逻辑清晰。

**检查点**:
- 项目卡片: "预览" → 列表页右侧预览、"项目详情" → `/projects/:id`、"案例" → `/cases/:id`
- 详情页底部: "返回项目系统"、"查看对应案例"、"进入游戏展示页"
- 案例页底部: "返回案例中心"、"查看项目详情"
- 游戏展示页: "查看技术详情" → `/projects/:id`、"返回项目系统"

---

## 6. First Narrow Implementation Slice

**第一个窄实现切片**: 补充 Ozon ERP 项目详情内容

### 具体步骤

1. **读取资料源**（只读）
   - 读取 `/home/zhang/workspace/reference-projects/erp/README.md`
   - 读取 `/home/zhang/workspace/reference-projects/erp/AGENTS.md`
   - 提取工程结构、功能模块、技术栈、业务场景

2. **修改 `src/App.tsx`**
   - 在 `getProjectStructure` 函数中补充 `ozon-erp` 的目录结构
     - `apps/web`: Vue 管理后台
     - `apps/api`: Express + Prisma
     - `apps/extension`: WXT/MV3 插件
     - `worker / prisma`: BullMQ/Redis + Prisma schema
   - 在 `getProjectDetailContent` 函数中补充 `ozon-erp` 的详细内容
     - `subtitle`: 电商 ERP 全栈业务系统
     - `overview`: 面向小团队电商运营场景...
     - `modules`: 管理后台、API 与数据模型、Worker 与队列、浏览器插件
     - `implementation`: 使用 monorepo 组织...
     - `nextSteps`: 补充脱敏后台截图、整理 Prisma ER 图...

3. **脱敏检查**
   - 确认不包含真实店铺凭证、数据库连接、服务器地址、账号密码
   - 架构图只保留模块边界，不标注真实 IP、端口、数据库名

4. **验证**（只读）
   - 在浏览器中访问 `/projects/ozon-erp`
   - 检查项目详情页是否正确渲染
   - 检查工程目录、功能模块、实现方式、后续扩展是否清晰

### 预期结果

- Ozon ERP 项目详情页内容完整，与 Legal RAG 详细程度一致
- 所有敏感信息已脱敏
- 详情页与列表页区分度明确

---

## 7. Verification

### 构建验证

```bash
npm run lint
npm run build
```

**预期结果**:
- `npm run lint`: 无 ESLint 错误
- `npm run build`: Vite 构建成功，生成 `dist/` 目录

### 路由验证

**手动测试**:
1. 访问 `/projects`，选择 Ozon ERP，点击"项目详情"
2. 验证跳转到 `/projects/ozon-erp`，详情页正确渲染
3. 点击"返回项目系统"，验证返回 `/projects`
4. 点击"查看对应案例"，验证跳转到 `/cases/ozon-erp`
5. 重复上述流程，测试其他项目（Pet Workspace、xunqiu、游戏项目）

### 脱敏验证

**检查清单**:
- ✅ Ozon ERP: 无真实店铺凭证、数据库连接、服务器地址、账号密码
- ✅ Pet Workspace: 无云端 API、任务 JSON、模型缓存、候选素材
- ✅ xunqiu: 无服务器 IP、数据库配置、测试账号、签名文件
- ✅ 所有架构图只保留模块边界，不标注真实 IP、端口、数据库名

### UI QA 验证

**检查点**:
- 列表页（`ProjectsView`）: 摘要、技术栈、状态标签清晰
- 详情页（`ProjectFullDetailView`）: 工程目录、功能模块、实现方式、后续扩展清晰
- 案例页（`CaseDetailView`）: 业务场景、解决方案、证据材料、面试讲解清晰
- 浅色/暗色主题切换正常
- 响应式布局正常（桌面、平板、手机）

---

## 8. Risks / Questions

### 已知风险

1. **脱敏不完全**
   - 风险: 整理项目详情时可能遗漏真实店铺名、账号、IP、数据库名
   - 缓解: 在 Phase 1 建立脱敏检查清单，在每个项目详情中逐项检查
   - 验证: 人工审查最终输出，确认无敏感信息

2. **内容详细度不一致**
   - 风险: Ozon ERP、Pet Workspace、xunqiu 的详情可能不如 Legal RAG 详细
   - 缓解: 保持与 Legal RAG 相同的结构和详细程度
   - 验证: 人工对比 Legal RAG 和其他项目的详情页字数、模块数量

3. **案例详情与项目详情重复**
   - 风险: 案例页和项目详情页可能有大量重复内容
   - 缓解: 明确分工 — 项目详情页讲工程实现，案例页讲业务场景和证据材料
   - 验证: 人工对比项目详情页和案例页，确认内容互补而非重复

### 待确认问题

1. **游戏项目是否需要独立案例页？**
   - 问题: 5 个游戏项目是否需要 5 个独立案例页，还是合并为 1 个"游戏展示规范"案例？
   - 建议: 合并为 1 个案例，作为统一展示规范，避免案例页过多
   - 待确认: 用户是否同意合并

2. **是否需要补充更多博客文章？**
   - 问题: 当前只有 3 篇示例博客，是否需要补充更多真实复盘文章？
   - 建议: 先完成项目详情和案例详情，博客文章可以后续逐步补充
   - 待确认: 用户是否需要在本轮补充更多博客

3. **是否需要接入真实试玩包？**
   - 问题: 游戏项目是否需要接入 Godot Web 导出包，作为试玩入口？
   - 建议: 本轮只补充详情内容和截图，试玩包接入留到后续
   - 待确认: 用户是否需要在本轮接入试玩包

---

## 9. Explicit Non-actions

### 本轮明确不做的事情

1. **不拆分 `App.tsx`**
   - 理由: 当前 1795 行可维护，拆分为页面组件非紧急
   - 后续: 如果继续扩展内容，再考虑拆分

2. **不重构 `portfolio.ts` 数据结构**
   - 理由: 当前 183 行可接受，集中管理方便维护
   - 后续: 如果数据量增长到 500+ 行，再考虑拆分为 `data/projects.ts`、`data/cases.ts`、`data/blog.ts`

3. **不增加搜索和标签过滤**
   - 理由: 当前项目数量少（12 个），浏览体验尚可
   - 后续: 如果项目数量增长到 30+，再增加搜索功能

4. **不接入真实试玩包**
   - 理由: 需要单独准备 Godot Web 导出包、上传到 Cloudflare R2、配置 CORS
   - 后续: 作为独立任务，准备完成后再接入

5. **不修改 `/home/zhang/workspace/reference-projects/`**
   - 理由: 资料源目录只用于阅读和整理信息，不直接修改
   - 后续: 保持只读

6. **不收录或扩展 `douyu`、`yihuan-helper`、`ques`**
   - 理由: 项目定位明确，不扩展范围
   - 后续: 保持当前 12 个项目范围

7. **不先拆 `App.tsx`，不先重做全站 UI**
   - 理由: 当前展示框架已经足够，重点是把真实项目资料整理成可公开的展示内容
   - 后续: 内容填充完成后，再考虑代码重构

---

## 总结

本轮计划聚焦 **项目/案例详情内容补全、脱敏风险、列表页与详情页区分度、项目和案例按钮路由清晰度**，不进行大规模代码重构，不接入真实试玩包，不扩展项目范围。

核心任务是把 Ozon ERP、Pet Workspace、xunqiu、游戏项目的详情内容整理成与 Legal RAG 相同的详细程度，并确保所有敏感信息已脱敏。

第一个窄实现切片是 **补充 Ozon ERP 项目详情内容**，完成后可以验证整个流程，再逐步扩展到其他项目。

---

**下一步**: 等待用户确认本计划，然后开始实现。
```

这个计划已经完整输出为 Markdown 格式。主要特点：

1. **聚焦内容补全**：不做大规模重构，重点补充项目详情、案例详情和脱敏检查
2. **窄实现切片**：从 Ozon ERP 开始，验证流程后再扩展
3. **明确边界**：列出了本轮不做的事情，避免范围蔓延
4. **脱敏优先**：建立脱敏检查清单，确保不暴露敏感信息
5. **只读验证**：所有验证步骤都是只读的，不改变项目状态

需要我将这个内容写入 `.agent-work/cc-plan.md` 文件吗？
