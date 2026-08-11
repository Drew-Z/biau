# Unified IP naming proposal

Status: approved first-version baseline; current English conflict review recorded

## Naming architecture

- Master brand: 泊岸 / BIAU Port.
- Product names remain independent; unity comes from semantic family, visual language, information architecture, and a shared `by BIAU Port / 泊岸` attribution.
- The semantic family uses navigation, harbor, tide, beacon, sail, and creation metaphors without forcing every name to contain the master brand.
- Naming happens at the public product level. Internal repositories, reference projects, backend generations, and small game prototypes do not receive independent public IP names.
- Public display names are separate from repository directories, package IDs, database names, Render/Cloudflare service names, and stable URL slugs.
- English names are brand equivalents rather than literal translations. Every accepted candidate still requires current product/domain/trademark conflict research.

## Proposed public product registry

| Scope | Current identity | Proposed Chinese | Proposed English | Migration note |
| --- | --- | --- | --- | --- |
| Master site | BIAU Port / 泊岸 | 泊岸 | BIAU Port | Keep current canonical identity |
| Public assistant | Public Assistant | 知航 | BIAU Beacon | New public product name; keep API route stable |
| AI Daily | AI Daily | 潮讯 | TideBrief | Keep `AI 日报` as descriptor/subtitle |
| Image hosting tool | Canvas | 画帆 | BIAU Canvas | `Canvas` conflicts with Instructure Canvas and the generic HTML canvas term; use the branded public display `画帆 BIAU Canvas` while keeping technical IDs unchanged. |
| Legal RAG | Legal RAG | 律航 | LexBeacon | Keep Legal RAG as technical descriptor |
| Chatus | Chatus | 泊语 | HarborTalk | Keep repository/service names stable in phase one |
| Pet workspace | AI 桌宠社区与生成管线 | 帆灵 | SailSprite | Workspace remains multi-project internally |
| Ozon ERP | Ozon 电商 ERP | 商舱 | OpsDeck | Keep Ozon ERP as product-domain subtitle |
| Xunqiu family | 寻球 | 寻球 | BallTrail | Use Legacy/Next edition labels for old/new systems |
| Anchor Learning | Anchor Learning | 锚学 | Anchor Learning | `learn/anchor` is the public implementation |
| Enterprise document agent | Enterprise Document Agent | 文航 | DocBeacon | Keep technical repository name as subtitle |
| Playlab | BIAU Playlab | 游湾 | BIAU Playlab | Small games keep their existing names |

## Non-public and compatibility inventory

- `D:\workspace4Cursor\learn\duoduo-original`: reference-only for Anchor Learning. It must not appear as a main-site project, status target, public assistant knowledge item, or independent IP.
- `D:\workspace4Cursor\learn\aicoding-cookbook`: Anchor Learning development/content support. It is not an independent public product.
- `D:\workspace4Codex\xunqiu`: legacy implementation under the single 寻球 / BallTrail family.
- `D:\workspace4Codex\xunqiu-backend-modern`: next-generation backend under the same family.
- `game-first-tetris`, `game-next-spacewar`, `intespace`, `raiden-prototype`, `space-war`, and `spacewar II`: retain existing names and appear only inside BIAU Playlab/游湾 presentation surfaces.

## Current English conflict review

- `Canvas` has a high search-distinction conflict with Instructure Canvas and the generic HTML canvas term. The public name is therefore `BIAU Canvas`; `canvas` and `cloudflare-imgbed` remain stable technical identifiers and aliases.
- `HarborTalk` remains accepted. Harbor is also the name of the CNCF graduated container registry, but the review found no exact `HarborTalk` product-name conflict that justifies changing the approved public identity.
- The remaining English names keep the approved baseline for this migration. This is a search-distinction review for public naming consistency, not legal trademark clearance.

## Family labels

- AI and agents: 知航, 律航, 泊语, 文航.
- Content and knowledge: 潮讯, 锚学.
- Tools and operations: 画帆, 商舱.
- Companion and community: 帆灵, 寻球.
- Interactive works: 游湾 / BIAU Playlab, with existing game names unchanged.

## Migration policy

1. Review names and conflict risks before implementation.
2. Introduce a typed naming registry and compatibility aliases.
3. Change public display names, subtitles, metadata, assistant knowledge, status labels, README, and project details together.
4. Keep repository paths, package IDs, service names, database identifiers, and public URLs stable in phase one.
5. Exclude reference-only/internal directories from public projections by contract.
6. Only plan URL/slug migrations after redirects, analytics continuity, canonical URLs, and external links have owners.
