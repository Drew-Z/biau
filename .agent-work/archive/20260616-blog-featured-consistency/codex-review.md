# Codex Review

## Decision

Proceed with a direct fix instead of a CC planning pass. The issue is visible and deterministic: `/blogs` shows a featured title that does not match the article opened by its button.

## Approved Change

Render featured metadata, title, summary, and section index from `featuredPost`.

## Boundaries

Do not alter blog post content, routing, layout, or styling.
