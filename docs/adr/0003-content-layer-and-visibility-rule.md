# ADR 0003: Content layer and visibility rule

Status: Accepted
Date: 2026-11-05

## Context

The site shows personal content: profile, projects and notes. Today the content is typed data in `src/content`. A backend is planned. The site must not show invented work, and example data used for testing must never look like real work.

## Options

| Option | Pros | Cons |
|---|---|---|
| Components read data files directly | Simple | A backend would touch every component |
| One typed accessor layer in `src/lib`; data behind it | A backend replaces only the layer; components stay unchanged | One more indirection |
| Fetch from a backend now | Final shape | No backend exists; adds work and risk before the design is settled |

## Decision

Components receive content only as typed props. Pages read content through accessors in `src/lib` (for example `getProjects(locale)`). The data lives in `src/content`. When the backend arrives, it replaces only the data behind the accessors.

The visibility rule: a record is public when it is **published AND approved AND (not a fixture OR the app runs in development)**.

Rules:

1. Only records that are published and approved appear in lists, detail pages, the sitemap and the home page.
2. Fixtures live in `src/content/fixtures`, carry `fixture: true`, and show a visible "development example" label. They never carry the name or portrait of Sinem CAN.
3. The project does not invent projects, notes, awards or levels. Where no approved record exists, the page shows a designed empty state.
4. Text that states a personal opinion needs the `approved` flag.
5. Each record has a translation group. The slug and text are per language; a missing language is `null`.
6. Optional parts (3D model, gallery, documents) never block a page.

## Consequences

- Positive: the backend is a swap of one layer; a unit test can check the rule on its own.
- Negative: the visibility rule must be tested for every accessor that lists records ([ADR 0004](0004-testing-strategy.md)).
- Open item: private files need server-side authorization when the backend exists (planned). A flag in the front end is not a security boundary.

## Sources

- https://nextjs.org/docs/app/getting-started/server-and-client-components
