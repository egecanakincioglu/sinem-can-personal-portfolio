# Architecture

This document describes how the application is built today. It grows with the site. The reasons for each choice are in the [decision records](adr/README.md).

## Overview

The project is one Next.js 16 application (App Router) with React 19 and TypeScript in strict mode. It serves a public portfolio site in Turkish and English. The admin panel and the backend come later. All source code is under `src/`.

```text
src/app/          layout, global styles, routes under [locale], the 404 page
src/components/   presentational components (header, footer, hero, figures, sections)
src/content/      typed content, the dictionary and development fixtures
src/lib/          pure functions: routes, physics, formatting, content accessors
tooling/          repository tools, site audit and Semgrep rules
```

## Routing and languages

The project has its own `[locale]` routing. It uses no i18n library ([ADR 0001](adr/0001-architecture-and-locale-routing.md)).

| Page | Turkish | English |
|---|---|---|
| Home | `/tr` | `/en` |

- The page slugs live in one table in `src/lib/routes.ts`. Path helpers build every link, so no component writes a path by hand.
- Interface text comes from a typed dictionary in `src/content/dictionary.ts`.
- The root path redirects to `/tr` (set in `next.config.ts`).
- There is no separate contact page. Every page ends with a contact block, and the navigation link scrolls to it.
- Unknown paths show a designed 404 page.
- The other sections add their routes in later changes.

## Styling

Tailwind CSS 4 with design tokens defined in `src/app/globals.css` ([ADR 0002](adr/0002-styling-tailwind-4-with-tokens.md)).

## Content layer

Components receive content only as typed props. Pages read content through accessors in `src/lib`. Data lives in `src/content` ([ADR 0003](adr/0003-content-layer-and-visibility-rule.md)).

A record is public when it is published, approved, and either not a fixture or the app runs in development. Fixtures are example data for testing components. They are marked `fixture: true`, never carry the name or portrait of Sinem CAN, and never reach a production build.

## Home figures

- **Free-body hero:** a body with force vectors. The resultant is computed from the vectors.
- **Beam:** the visitor places a load. The page computes the support reactions and draws the bending moment diagram.
- **Force polygon:** force vectors are added head to tail to show the resultant.

The calculations are pure functions in `src/lib/physics.ts` and `src/lib/math.ts`, so they are unit tested without a browser. Animation respects the reduced motion setting.

## Planned

The profile, projects and notes pages, the 3D viewer, the admin panel and the backend come in later changes.

## Quality and delivery

- Tests, coverage and thresholds: [ADR 0004](adr/0004-testing-strategy.md) and [ADR 0006](adr/0006-quality-targets-and-thresholds.md).
- CI and branch protection: [ADR 0005](adr/0005-ci-and-protection-layers.md).
- Releases and deploys: [ADR 0007](adr/0007-versioning-and-releases.md) and the [release runbook](runbooks/release-and-rollback.md).
