# Studio Production Draft Deep-Link Acceptance

## Goal

验证生产环境内部助手到 Studio 草稿深链的闭环：`/assistant` 能创建 hidden + review-needed 草稿，工具轨迹能跳转 `/studio?draft=<id>`，Studio 能用 token 加载草稿列表并定位对应草稿。若 Studio 页面显示“草稿列表加载失败”，需要诊断是 API base、Studio token、数据库、服务模式、CORS、还是接口响应问题。

## Confirmed Facts

- 代码层上一任务已实现并推送：
  - `studio.draft` artifact 使用 `/studio?draft=<id>` 安全深链。
  - `/assistant` 显示“草稿已创建...打开 Studio”。
  - `/studio?draft=<id>` 会在草稿列表加载后自动定位草稿。
- 用户截图显示：
  - `/studio` 顶部状态可显示 `API base 已配置`、`数据库在线`、`static-export`。
  - `/assistant` 工具轨迹已经出现 `Studio Draft · 草稿写入 · 已完成` 和草稿创建 artifact。
  - `/studio` 后续出现“草稿列表加载失败，暂时无法定位助手创建的草稿”，说明 health 可能成功，但 `GET /studio/api/content-drafts` 或前端请求链路失败。
- 用户愿意提供测试 token，但 token 不应直接写入聊天、仓库、Trellis 任务文件、git diff 或命令输出。

## Requirements

- R1. 使用本机临时环境变量接收生产测试配置：
  - `BIAU_STUDIO_TOKEN`
  - `BIAU_MEMBER_TOKEN`
  - `BIAU_INTERNAL_API_BASE`
  - `BIAU_STUDIO_API_BASE`
- R2. 不打印、不提交、不记录真实 token、API key、数据库 URL、私有服务地址或 Authorization header。
- R3. 先测试 Studio API：
  - health 是否可用；
  - content draft list 是否返回 200；
  - 错误时只输出 sanitized status/error code/coarse diagnosis。
- R4. 再测试内部助手 draft-write：
  - 用明确真实任务 prompt 创建一篇公开安全草稿；
  - 捕获安全 artifact 的 id/title/href；
  - 不做模型测活 ping。
- R5. 如果草稿列表失败，应定位到可执行原因，例如：
  - `VITE_STUDIO_API_BASE_URL` 指向了错误服务；
  - Studio service mode 未挂载 `/studio/api/content-drafts`；
  - Studio token 与服务端 `STUDIO_ADMIN_TOKEN` 不匹配；
  - Studio API 连接了与内部助手不同的 `STUDIO_DATABASE_URL`；
  - CORS 或部署版本不是最新；
  - 生产接口返回了前端 normalizer 不能识别的 payload。
- R6. 如果需要代码修复，必须先回到实现阶段并运行相关 no-live/local 验证；如果只是平台变量问题，则给用户明确修改步骤。

## Acceptance Criteria

- [x] 用户已在本机临时环境变量中设置测试 token/base URL，且没有把 token 写入仓库。
- [x] Studio health 结果已确认，并只记录低敏状态。
- [x] Studio draft list 结果已确认；若失败，输出 sanitized 原因和下一步。
- [x] 内部助手 draft-write 已通过一个明确真实任务 prompt 验证，或因用户未批准真实调用而记录为 manual gate。
- [x] 生成的 `/studio?draft=<id>` 链接能定位草稿，或明确定位失败原因。
- [x] 全程没有泄露 token、数据库 URL、模型 provider URL 或私有 endpoint。

## 2026-07-07 Production Acceptance Notes

- `BIAU_STUDIO_TOKEN`、`BIAU_MEMBER_TOKEN`、`BIAU_INTERNAL_API_BASE`、`BIAU_STUDIO_API_BASE` 均已确认存在；命令输出没有打印 token。
- Studio health:
  - status `200`
  - database flag `true`
  - auth `admin-token`
  - publish mode `static-export`
- Studio data list routes:
  - `GET /studio/api/content-drafts` -> `500`
  - `GET /studio/api/source-items` -> `500`
  - `GET /studio/api/ai-daily/issues` -> `500`
  - `GET /studio/api/publish-exports` -> `500`
- Interpretation:
  - `GET /studio/api/health` currently reports whether `STUDIO_DATABASE_URL` / fallback database env is configured, not whether Studio tables can be queried.
  - All Studio list routes failing with `500` points to Studio database query failure, most likely missing Studio migrations, incompatible connection string parameters, or Studio service connected to a different/bad database.
- Internal assistant health:
  - status `200`
  - service mode `internal`
  - database flag `true`
  - model label reported as configured
- Internal member-token checks:
  - `GET /me` -> `401`
  - `POST /chat/internal` draft-write prompt -> `401`
  - Interpretation: the current `BIAU_MEMBER_TOKEN` value is not accepted by the production internal assistant service; refresh it from the browser before rerunning the create-side validation.

## 2026-07-07 Studio Redeploy Recheck

- After updating Render commands and redeploying `biau-content-studio-api`, Studio API checks recovered:
  - `GET /studio/api/health` -> `200`, database flag `true`, database role `studio-dedicated`
  - `GET /studio/api/content-drafts` -> `200`, draft count `0`
  - `GET /studio/api/source-items` -> `200`, source count `0`
  - `GET /studio/api/ai-daily/issues` -> `200`, issue count `0`
  - `GET /studio/api/publish-exports` -> `200`, export count `0`
- Interpretation:
  - The previous Studio list `500` was resolved by the Render command / migration change.
  - Studio database is currently reachable and empty.
- Internal assistant recheck:
  - `GET /health` -> `200`, service mode `internal`, database flag `true`, model label configured
  - `GET /me` with current `BIAU_MEMBER_TOKEN` -> `401`
- Remaining blocker:
  - Refresh `BIAU_MEMBER_TOKEN` from the production `/assistant` browser localStorage, then rerun the create-side validation.

## 2026-07-07 Member Token Recheck

- Current local `BIAU_MEMBER_TOKEN` is still rejected by production `/me`:
  - `GET /me` -> `401`
- Screenshot-provided value represents an invite code created in the admin UI, not the member token expected by `/me` or `/chat/internal`.
- Attempting to redeem that invite code against the current `BIAU_INTERNAL_API_BASE` returned:
  - `POST /auth/redeem-invite` -> `401 invalid-invite`
- Low-sensitive token shape check indicates the current local member token value is shorter than the backend-issued `biaum_*` member token format.
- Interpretation:
  - The browser admin page may be connected to a different internal API base than local `BIAU_INTERNAL_API_BASE`, or
  - the invite was created/refreshed in another environment/database, or
  - the value copied into `BIAU_MEMBER_TOKEN` is not the redeemed member token.
- Next manual step:
  - Redeem the invite from the production `/assistant` page that uses the same frontend deployment, then copy only the resulting `biau-assistant-member-token` from browser localStorage into the local `BIAU_MEMBER_TOKEN` environment variable.
  - Do not paste the token into chat, Trellis files, or git.

## 2026-07-07 Invite Redemption And Draft Write Recheck

- The local `BIAU_MEMBER_TOKEN` value was confirmed to be an invite code, not a member token.
- Redeeming that invite code against the configured internal API succeeded:
  - `POST /auth/redeem-invite` -> `200`
  - The returned backend-issued member token was written back to the local user environment variable without printing it.
  - `GET /me` -> `200`, role `MEMBER`, status `ACTIVE`
- Internal assistant draft-write validation succeeded:
  - `POST /chat/internal` -> `200`
  - `studio.draft` tool status `completed`
  - created artifact href shape `/studio?draft=<id>`
  - artifact status `review-needed`
  - artifact visibility `hidden`
- Studio API comparison found a production database split:
  - Internal service `/studio/api/content-drafts` -> `200`, draft count `2`, matched the newly created draft.
  - Dedicated Studio service `/studio/api/content-drafts` -> `200`, draft count `0`, did not match the newly created draft.
- Interpretation:
  - The internal assistant service is writing Studio drafts to its own Studio database target, while `biau-content-studio-api` is reading a different Studio database target.
  - Most likely `biau-internal-assistant-api` does not have `STUDIO_DATABASE_URL` set to the same value as `biau-content-studio-api`; therefore it falls back to its own `DATABASE_URL`.
- Required production fix:
  - In Render, set `STUDIO_DATABASE_URL` on `biau-internal-assistant-api` to the exact same Studio database connection string used by `biau-content-studio-api`.
  - Keep `DATABASE_URL` on `biau-internal-assistant-api` as the internal assistant member/session database.
  - Redeploy `biau-internal-assistant-api`, then rerun this acceptance check.

## 2026-07-07 Internal Service Redeploy Recheck

- After updating `biau-internal-assistant-api` Render settings and redeploying:
  - Internal assistant health -> `200`, service mode `internal`, database flag `true`
  - Dedicated Studio health -> `200`, service mode `studio`, database flag `true`, auth configured `true`
  - Internal service `/studio/api/content-drafts` -> `200`, draft count `0`
  - Dedicated Studio service `/studio/api/content-drafts` -> `200`, draft count `0`
- Interpretation:
  - Internal service Studio API and dedicated Studio API are now aligned enough that they read the same empty Studio draft list.
  - The previous hidden test draft was created in the old fallback Studio target and is not expected to appear after alignment.
- New remaining blocker:
  - Current local `BIAU_MEMBER_TOKEN` still has the issued member-token shape, but production `/me` now returns `401 missing-or-invalid-token`.
  - Because the token was valid before redeploy, this suggests the internal assistant member/session database target may have changed, or the member token was copied from a different deployment/database.
- Required production check:
  - Confirm `biau-internal-assistant-api` keeps `DATABASE_URL` pointed at the internal assistant member/session/invite database.
  - Confirm `STUDIO_DATABASE_URL` points at the Studio database.
  - These two values should usually be different; do not replace `DATABASE_URL` with the Studio connection string.
  - If `DATABASE_URL` was intentionally changed or the member table was reset, create and redeem a new invite against the current production `/assistant` page, then update local `BIAU_MEMBER_TOKEN` with the newly issued `biaum_*` token.

## 2026-07-07 Internal Service Restart Failure

- A later `biau-internal-assistant-api` restart failed before the server started:
  - command stage: `npm run prisma:migrate`
  - Prisma error: `P1000 Authentication failed against database server`
- Interpretation:
  - The failure happened while migrating the default Prisma datasource, so it is caused by `DATABASE_URL`, not `STUDIO_DATABASE_URL`.
  - Render logs show the default datasource still targets a Supabase pooler-style host; this does not match the intended internal assistant database after splitting the services.
- Required production fix:
  - In `biau-internal-assistant-api`, set `DATABASE_URL` to the connection string from the internal assistant database resource.
  - Keep `STUDIO_DATABASE_URL` set to the content studio database connection string.
  - Retry deploy after confirming the `DATABASE_URL` username/password are copied from the current database resource and include required SSL/libpq compatibility query parameters when needed.

## 2026-07-07 Final Production Acceptance

- After correcting `biau-internal-assistant-api` database variables and redeploying:
  - Internal assistant health -> `200`, service mode `internal`, database flag `true`
  - Dedicated Studio health -> `200`, service mode `studio`, database flag `true`, auth configured `true`
  - `GET /me` -> `200`, role `MEMBER`, status `ACTIVE`
- Final draft-write task:
  - Prompt asked for a public-safe Legal RAG project-summary Studio draft for deep-link acceptance only.
  - `POST /chat/internal` -> `200`
  - `studio.draft` tool status `completed`
  - Artifact href shape `/studio?draft=<id>`
  - Artifact status `review-needed`
  - Artifact visibility `hidden`
- Cross-service Studio readback:
  - Internal service `/studio/api/content-drafts` -> `200`, draft count `1`, matched created draft.
  - Dedicated Studio service `/studio/api/content-drafts` -> `200`, draft count `1`, matched the same created draft.
  - Matched draft reports `aiAssistance=agentic-workspace`.
- Conclusion:
  - The production internal assistant -> Studio draft-write -> `/studio?draft=<id>` deep-link acceptance path is validated.
  - The remaining created draft is hidden and review-needed; it was not published or exported.

## Out Of Scope

- 不做泛化模型测活、provider ping 或无业务意义的 doctor。
- 不修改真实生产数据，除了创建一条 hidden + review-needed 的测试草稿。
- 不发布、不审核通过、不导出公开内容。
- 不把 token 保存到 `.env`、Trellis 任务、git commit 或聊天记录里。

## Open Questions

None for this acceptance task.
