# Design

## Workflow Boundary

This task validates the blog content workflow itself, not a public publication
path. The output should remain in `content-drafts/` unless publication is
separately approved.

## Pilot Topic

Use `blog-content-system-build-log-draft` from `scripts/blog-rewrite-plan.json`
because it is a `build-log` topic and the current repository contains direct
evidence for the workflow changes.

## Evidence Sources

Inspect repository evidence before changing the draft:

- blog skill instructions and references
- blog draft scripts and model setup scripts
- current draft file
- Trellis task/archive notes for the model setup wizard
- package scripts and validation outputs
- relevant blog/shared data definitions

## Content Shape

The built-in `build-log` template is the default:

- starting point
- decision made
- implementation path
- verification
- what became easier
- follow-up work

If the user specifies a custom template, use it as the primary writing
structure. Keep the default template only as a coverage checklist, not as fixed
headings. Custom templates must still pass evidence, safety, column-fit,
project-page overlap, and voice review.

Recommended reusable template options:

1. Problem -> Decision -> Implementation -> Verification -> Lessons -> Next
   Steps. Best for build logs and engineering workflow posts.
2. Context -> Constraints -> Options -> Choice -> Result -> Tradeoffs. Best
   for architecture and decision-making posts.
3. Before -> After -> How It Works -> What Changed -> What Remains. Best for
   refactors, migrations, and visible product improvements.
4. Field Notes: What I Tried -> What Broke -> What Worked -> Checklist. Best
   for practical debugging or operations notes.
5. Reader Guide: Concept -> Mental Model -> Example -> Failure Modes ->
   Checklist. Best for knowledge accumulation posts.

For this pilot, use option 1 because the user approved it and the topic is a
workflow build log. The Chinese section flow is:

- 问题起点
- 关键决策
- 实现路径
- 验证方式
- 经验沉淀
- 下一步

Keep the draft visitor-readable. Do not turn it into internal execution logs.

## Model Boundary

Default path is Codex-only scaffold/rewrite. Do not run `doctor --live` or
`blog:draft --generate` unless the user explicitly approves a small model task.
