# Verification

Date: 2026-06-16
Task: Projects page URL-restorable selection state

## Change Summary

- Added safe project-id parsing for `/projects?project=<id>` list-page state.
- Kept `/projects/:id` as the independent technical detail route.
- Updated project list selection, project navigation, and group tab selection to write URL query state.
- Derived the active project group from the selected project so browser history restores both selection and tab state.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | pass | ESLint completed successfully after replacing derived group state with a derived value. |
| `npm run build` | pass | Build completed successfully. Existing `lottie-web` direct eval warning remains from dependency code. |

## Local Browser QA

WSL system Google Chrome was driven through Chrome DevTools Protocol with local proxy disabled for `127.0.0.1`.

| Route / Flow | Viewport | Result |
| --- | --- | --- |
| `/projects?project=pet-workspace` | 1440x900 | pass: Pet Workspace is selected and URL remains `/projects?project=pet-workspace`. |
| `/projects?project=pet-workspace` | 390x844 | pass: same as desktop. |
| `/projects?project=invalid-id` | 1440x900 | pass: falls back to the first project, Legal RAG, without errors. |
| `/projects?project=invalid-id` | 390x844 | pass: same as desktop. |
| Thumbnail selection | 1440x900 | pass: clicking Pet Workspace updates preview and URL to `/projects?project=pet-workspace`. |
| Thumbnail selection | 390x844 | pass: same as desktop. |
| Group switching | 1440x900 | pass: clicking `全栈开发` selects Ozon ERP and URL becomes `/projects?project=ozon-erp`. |
| Group switching | 390x844 | pass: same as desktop. |
| Browser history | 1440x900 | pass: back restores Pet Workspace, back again restores Legal RAG, forward restores Pet Workspace. |
| Browser history | 390x844 | pass: same as desktop. |
| `/projects/pet-workspace` | 1440x900 | pass: still opens the independent technical detail page. |
| `/projects/pet-workspace` | 390x844 | pass: same as desktop. |
