# Blog Knowledge Evidence Quality Gate Design

## Scope

Target public runtime blog data and validation scripts:

- `src/data/blog-posts/*`
- `src/data/blog.ts`, `src/data/blogCuration.ts`, `src/data/blogShared.ts`
- `scripts/check-public-blog.mjs` or a new focused script
- `package.json` and `scripts/verify.mjs` if the gate should become part of full verification

## Gate Direction

For `column: "knowledge"` posts, enforce a minimum editorial shape:

- concrete `knowledgePoints`, not empty labels;
- multiple substantive sections;
- reusable takeaways/checklist/principles;
- source/evidence section or explicit references in body;
- no legacy day-number framing or generic project diary shape;
- no sensitive strings.

For other columns, keep existing `blog:check` behavior unless a safe shared rule already exists.

## Safety

Do not infer facts or add unverified sources during this task. If a post fails the new gate, either fix the public post with evidence already present in the repo or record a follow-up; do not invent citations.

## Validation

Run the new/focused script, existing `blog:check`, `assistant:index` if public content changes, `lint`, `build`, and `verify` for broad confidence.
