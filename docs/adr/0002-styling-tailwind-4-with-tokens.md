# ADR 0002: Styling with Tailwind CSS 4 and design tokens

Status: Accepted
Date: 2026-11-05

## Context

The site has a consistent visual system: colors, type scale and spacing. It must look correct at widths from 360 to 1920 pixels. Styles should stay close to the components and have no unused code.

## Options

| Option | Pros | Cons |
|---|---|---|
| Tailwind CSS 4 with tokens in CSS | Utility classes; tokens as CSS variables; unused styles are not shipped; works with the App Router | Long class lists in markup |
| CSS modules | Scoped styles; no dependency | Tokens and responsive rules are repeated by hand |
| A component library | Fast start | A look that is hard to bend to the site's own design; extra weight |

## Decision

The project uses Tailwind CSS 4. Design tokens (colors, type, spacing, motion) are CSS variables defined in `src/app/globals.css`, and components use them through utility classes. Admin styles are kept in `src/app/admin/admin.css`.

Rules:

1. A color, size or duration that repeats is a token. Components do not hard-code it.
2. Text is never forced to uppercase with CSS. The surname "CAN" is written in capitals in the content.
3. Motion respects the reduced motion setting.
4. Layout is checked at 360, 390, 768, 1024, 1440 and 1920 pixels.

## Consequences

- Positive: one place to change the look; small CSS output.
- Negative: contributors must know the token names.
- Overflow, contrast and touch target size are checked by the `site-audit` jobs ([ADR 0006](0006-quality-targets-and-thresholds.md)).

## Sources

- https://tailwindcss.com/docs
