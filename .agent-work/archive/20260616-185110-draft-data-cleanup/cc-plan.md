## 分析结果

### 可删除或简化的内容

#### 1. **`portfolio.ts` 中的 `articles` 导出（第 183–188 行）**
- **事实**：`grep` 未找到任何 `import.*articles` 匹配，说明该数据未被使用。
- **操作**：直接删除 `export const articles = [...]` 整块。

#### 2. **`ProjectStatus` 类型中的 `pending`（第 2 行）**
- **事实**：`grep` 显示 `pending` 仅在类型定义和 `statusLabels` 中出现，真实项目数据全部使用 `main/live/mvp/ongoing`。
- **操作**：从类型定义中删除 `'pending'`，同时删除 `statusLabels.pending`（第 34 行）。

#### 3. **`App.tsx` 中的 `pending` 状态分支（第 676、985 行）**
- **事实**：两处三元表达式都包含 `status === 'pending' ? 'grey'` 分支，但实际数据中无 `pending` 项目。
- **操作**：简化三元表达式，移除 `pending` 分支。

---

### 实施计划

#### **步骤 1：删除未使用的 `articles` 导出**
- 位置：`src/data/portfolio.ts` 第 183–188 行
- 操作：删除整块 `export const articles = [...]`

#### **步骤 2：清理 `pending` 状态定义**
- 位置：`src/data/portfolio.ts` 第 2、34 行
- 操作：
  - 第 2 行：`'main' | 'live' | 'mvp' | 'ongoing'`（删除 `| 'pending'`）
  - 第 34 行：删除 `pending: '待整理',`

#### **步骤 3：简化 `App.tsx` 中的颜色逻辑**
- 位置：第 676、985 行
- 操作：
  ```typescript
  // 简化前
  status === 'main' ? 'red' : status === 'live' ? 'green' : status === 'pending' ? 'grey' : 'orange'
  
  // 简化后
  status === 'main' ? 'red' : status === 'live' ? 'green' : 'orange'
  ```

---

### 必须先验证的事实

1. ✅ **`articles` 是否被 import**：已验证，无任何文件导入。
2. ✅ **`pending` 是否被项目数据使用**：已验证，所有项目状态为 `main/live/mvp/ongoing`。
3. ⚠️ **`statusLabels` 是否被动态访问**：需确认代码中是否有 `statusLabels[someVariable]` 这种运行时动态访问。

---

### 不要修改的地方

1. **`statusLabels` 对象的其他字段**：`main/live/mvp/ongoing` 都在实际使用，保持原样。
2. **`ProjectStatus` 类型的其他值**：`main/live/mvp/ongoing` 都有对应项目，不能删除。
3. **`categoryLabels`**：与清理任务无关，不要动。

---

### 验证命令与 QA 路由

#### **验证命令**
```bash
npm run lint        # TypeScript 类型检查
npm run build       # 构建验证
```

#### **浏览器 QA 路由**
1. `/` — 首页，检查首页项目卡片标签颜色
2. `/projects` — 项目页，检查所有项目状态标签渲染
3. `/projects/legal-rag` — 项目详情，检查状态标签
4. `/cases` — 案例页，检查关联项目状态
5. `/blogs` — 博客页，确认无 `articles` 相关渲染错误

---

### 风险提示

- **无风险**：`articles` 和 `pending` 确认未使用，删除不影响页面。
- **可能影响**：如果后续有动态生成项目数据的逻辑（如从 JSON 文件加载），需确保新数据不会引入 `pending` 状态。

---

**字数统计**：约 650 字（含代码示例）
