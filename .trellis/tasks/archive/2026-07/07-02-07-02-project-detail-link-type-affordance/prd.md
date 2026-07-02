# 项目详情链接类型识别

## Goal

让项目详情页的链接徽标区分外部链接和站内链接，改善访客对演示入口、文档、源码和相关文章入口的理解。

## Requirements

- Project detail link badges must visually distinguish external links from internal links using existing `ProjectLink.type`.
- External links should keep `target="_blank"` and `rel="noopener noreferrer"`; internal links must keep React Router SPA navigation.
- Existing link labels, hrefs, order, and project facts must not change in this task.
- The visible link text must still fit on mobile and desktop quick-link rows; wrapping is allowed, but no horizontal overflow or text overlap.
- Lower "相关链接" and header quick links must use the same link-type affordance.

## Acceptance Criteria

- [x] External project detail links expose an external-link visual affordance and external type class.
- [x] Internal project detail links expose an internal-link visual affordance and internal type class.
- [x] Accessible link names remain based on the original project link labels, so existing role-based navigation remains stable.
- [x] Existing external/internal link semantics remain unchanged.
- [x] `git diff --check`, sensitive-info scan, `npm.cmd run lint`, `npm.cmd run build`, and relevant UI check pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
- Verified with `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, `git diff --check`, strict sensitive-info scan, and a mobile screenshot inspection for `legal-rag`.
