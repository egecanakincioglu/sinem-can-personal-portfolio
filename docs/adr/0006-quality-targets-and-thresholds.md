# ADR 0006: Quality targets and thresholds

Status: Accepted
Date: 2026-11-05

## Context

A portfolio is judged on first impression. The site must be fast, accessible, easy to find, and correct at every screen size. Visitors also arrive through search engines and tools that read the page as text and structure. Targets without measurement drift, so each one needs a check.

## Options

| Option | Pros | Cons |
|---|---|---|
| Manual review only | No tooling | Not repeatable; regressions go unseen |
| Automated audit with thresholds in CI | Every pull request is measured | Scores vary a little between runs |
| Perfect score as a gate | Highest bar | Flaky gate; blocks work on noise |

## Decision

The `site-audit` jobs build the site and audit its pages in CI. The Lighthouse gate is 90 in all four categories (performance, accessibility, best practices, SEO), on mobile and on desktop. The expected score is 95 or more. Thresholds are in `tooling/site-audit/thresholds.json` and only go up.

Rules:

1. **Responsive:** no horizontal overflow and no undersized touch targets at 360, 390, 768, 1024, 1440 and 1920 pixels.
2. **Accessibility:** no axe violations; visible focus; reduced motion respected; text has enough contrast.
3. **SEO:** each page has a title, a description, a canonical link, language alternates for `tr` and `en`, and structured data. The sitemap lists public pages only. Fixtures are not listed.
4. **Search and text readers:** pages work without scripts for reading. Content is real text with headings and landmarks, so tools that read the page as text can understand it. Figures have text alternatives.
5. **Console:** no errors or warnings on audited pages.
6. **Performance:** the 3D viewer and its library load only after a click.

## Consequences

- Positive: regressions show up in the pull request that causes them.
- Negative: Lighthouse scores vary between runs. The gate is 90, below the 95+ expected, to leave room for noise.
- The audit runs three jobs (pages, mobile, desktop) and adds CI time.

## Sources

- https://developer.chrome.com/docs/lighthouse/overview
- https://github.com/dequelabs/axe-core
- https://www.w3.org/WAI/standards-guidelines/wcag/
