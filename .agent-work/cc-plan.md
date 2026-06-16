# CC Plan

## Findings

- `/projects` list state currently does not read query parameters, so a selected preview cannot survive refresh or be shared.
- `/projects/:id` already means independent technical detail page and should not be reused for list selection state.
- `ProjectsView` owns a local `activeGroup`; if browser history restores a project from another group, that group also needs to sync with the selected project.
- Browser back/forward currently cannot restore card selections because thumbnail clicks only update React state.

## Recommended Slice

- Use a query parameter for list selection: `/projects?project=<id>`.
- Keep `/projects/:id` as the independent technical detail route.
- Validate project ids from the query before using them, falling back to the first project when invalid.
- Push URL history entries when thumbnail cards or group tabs change the selected project.
- Update popstate handling so browser back/forward restores the selected preview.

## Files To Touch

- `src/App.tsx`
- `.agent-work/*`

## Verification

- Opening `/projects?project=pet-workspace` selects Pet Workspace.
- Clicking thumbnail cards updates both preview and URL query.
- Switching groups updates query to the first project in that group.
- Browser back/forward restores list selection.
- `/projects/pet-workspace` still opens the independent project detail page.
- Run `npm run lint` and `npm run build`.
