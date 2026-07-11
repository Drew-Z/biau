# Design: Mobile Reading And Navigation Refactor

## Scroll Ownership

The document remains the only owner of full-page vertical scrolling. Replace the shared app shell's `overflow-x: hidden` with `overflow-x: clip` and explicitly keep `overflow-y: visible`. Fixed decorative fields still clip horizontally without promoting the app into an implicit vertical scroll container.

## Mobile Port Manifest

At `max-width: 768px`:

- `.carousel-viewport` becomes an unmasked, overflow-visible container.
- `.carousel-track` becomes a normal full-width vertical column with no transform or snap behavior.
- Loop copies remain hidden, leaving six semantic rows.
- Each row uses number, title/one-line summary, and a compact trailing external action.
- The whole row still opens project detail. The trailing action retains its independent accessible label and propagation behavior.

Desktop keeps the existing looping vertical carousel, perspective, drag, wheel, and hover response.

## Detail Reading Flow

At phone widths:

- The outer detail header remains a framed orientation surface.
- `.detail-body` becomes an unframed reading band.
- Textual `.detail-block` / `.blog-post-section` surfaces lose redundant nested card shadows and use separators plus vertical rhythm.
- Visual evidence components keep their own borders/backgrounds so screenshots and diagrams remain inspectable.
- Body text, lists, headings, captions, preformatted blocks, and tables receive explicit width/wrapping rules.

## Regression Contract

Playwright checks 320/390/430 widths and verifies layout direction, overflow, duplicate count, action visibility, document scroll-to-bottom, readable font size, flattened body surface, bounded rich media, and unobscured footer/related content.
