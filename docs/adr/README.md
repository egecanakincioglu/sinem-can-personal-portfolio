# Architecture decisions (ADR)

This folder holds the architecture decisions of the project. Each one is numbered, dated and has a status. When a decision changes, the old ADR is not deleted or rewritten. A new ADR is opened, and the status line of the old one becomes "Superseded: ADR NNNN".
| No | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-architecture-and-locale-routing.md) | Architecture: Next.js 16 App Router and own `[locale]` routing, no i18n library | Accepted | 2026-11-05 |
| [0002](0002-styling-tailwind-4-with-tokens.md) | Styling: Tailwind CSS 4 with design tokens | Accepted | 2026-11-05 |
| [0003](0003-content-layer-and-visibility-rule.md) | Content layer: typed accessors and the visibility rule | Accepted | 2026-11-05 |
| [0004](0004-testing-strategy.md) | Testing strategy: Vitest, Testing Library, coverage gate | Accepted | 2026-11-05 |
| [0005](0005-ci-and-protection-layers.md) | CI and protection layers: 12 required checks and branch protection | Accepted | 2026-11-05 |
| [0006](0006-quality-targets-and-thresholds.md) | Quality targets and thresholds: Lighthouse gate 90, `site-audit` | Accepted | 2026-11-05 |
| [0007](0007-versioning-and-releases.md) | Versioning and releases: SemVer, deploy by signed tag | Accepted | 2026-11-05 |
| [0008](0008-license-noncommercial.md) | License: noncommercial code, reserved personal content | Accepted | 2026-11-05 |

## Statuses

- Proposed: the decision is written and waits for approval.
- Accepted: the decision is made and is being applied.
- Rejected: the option was considered and is not applied.
- Superseded: ADR NNNN: a new decision replaced this one.

## New ADR

1. Copy [template.md](template.md) to `NNNN-kebab-case.md` with the next number (ASCII only).
2. Fill in the sections: Context, Options (comparison table), Decision, Consequences, Sources.
3. Add a row to the table above. Pull requests that implement the ADR link to it.
