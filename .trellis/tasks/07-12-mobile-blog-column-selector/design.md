# Design: Mobile Blog Column Selector

`BlogColumnFilter` remains the sole taxonomy component. It renders the existing button group plus a mobile-only labeled native `select`, both controlled by the same `selectedColumn` and `onSelect` props. The change therefore cannot split filtering state or pagination-reset behavior.

The select options are derived from `columns`, `blogColumnMeta`, and the existing count formatter. The event handler accepts `all` directly and otherwise resolves the submitted string by finding it in the provided typed column list, avoiding an unchecked cast.

CSS switches the surfaces at 720px: desktop keeps wrapped buttons; mobile hides them and presents a full-width, 48px selector with an icon, visible label, native control, and chevron. Playwright verifies visibility, option completeness, filtering, empty states, and viewport bounds at 320/390/430px.
