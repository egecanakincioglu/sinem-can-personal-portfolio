# ADR 0009: SVG boundary, figures from a registry of components

Status: Accepted
Date: 2026-11-06

## Context

Notes rendered authored SVG as raw markup through `dangerouslySetInnerHTML`. This worked under a temporary Semgrep exception. The project rule allows SVG only through a registered figure id. The raw path let any content author put markup on the page.

## Options

| Option | Pros | Cons |
|---|---|---|
| SVG strings in a registry | Small change; figures stay as text | Keeps `dangerouslySetInnerHTML` and the Semgrep exception |
| SVG files shown through `img` | No inline markup | Loses the line classes and theming of the site |
| JSX components in a registry | No markup string reaches the page; classes and theming work | A new figure needs a code change |

## Decision

Figures are JSX components in a repository-owned registry (`src/content/figures/registry.tsx`), keyed by `figureId`. A note block carries only `figureId` and optional `alt` and `caption` overrides per language.

Rules:

1. An unknown id renders nothing and is not numbered.
2. Footnote and cross-reference scanning reads only the caption written in the note.
3. Registry default captions contain no reference markup. A test checks this.
4. The only `dangerouslySetInnerHTML` left in the article path is the escaped MathML from `texToMathML`.

## Consequences

- Positive: no SVG markup or HTML string from content can reach the page.
- Positive: a future content editor picks figures from the registry instead of pasting SVG.
- Negative: adding a figure needs a code change and a review.
- The temporary Semgrep exception for notes is no longer needed.
