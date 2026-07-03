# Design

## Brand Contract

统一为父品牌 + 产品名双层结构：

```text
BIAU Port / 泊岸
<Product Name>
```

短空间允许写成：

```text
BIAU Port 泊岸 · <Product Name>
```

主站自身可以直接使用 `BIAU Port 泊岸`。项目站点不替换产品名，只把 BIAU Port / 泊岸放到浏览器壳和可见壳。

## Icon Strategy

- 首选统一 `favicon.svg`，包含 BIAU Port / 泊岸的 `b` 港湾意象；小尺寸必须能看清主体轮廓。
- 如果项目框架需要 PNG/ICO，先使用已有构建工具支持的 SVG favicon；缺少转换工具时记录后续 PNG 资产任务，不阻塞文案统一。
- 避免把大尺寸营销 logo 当 favicon；favicon 应为简洁图形。

## Repository Treatment

- 主站：更新 public shell、SEO 默认值、项目/status/assistant 数据和验证脚本预期。
- ERP：重点检查 `index.html`、manifest、登录/注册页、布局壳；同步注册入口可见性。
- Game/Playlab：检查 Astro/Vite/React 元数据、favicon、导航/页脚。
- Legal RAG：检查公开 demo 路由、登录拦截、公开说明文案和状态数据；不写真实密码。
- Pet：检查展示页入口、favicon、下载按钮 gate；APK 只做占位/待审核状态。
- 寻球：先识别是否有网页壳；如果是移动端/后端仓库，仅记录适合落品牌的页面或后续展示页任务。

## Verification

每个仓库按实际 package scripts 选择最小验证：

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run typecheck`
- 项目自带 smoke/check 脚本
- targeted `rg`：旧品牌、标题、favicon、manifest、注册入口、登录壳关键字

主站必须额外运行 `npm.cmd run lint`、`npm.cmd run build`、必要时 `npm.cmd run check:ui`。

## Risk Controls

- 先做本地静态可验证改动，不代替用户操作部署平台。
- 不读取或提交 `.env*local`、证书、签名文件。
- 若仓库已有用户未提交改动，先记录并只编辑必要文件；不回滚他人改动。
