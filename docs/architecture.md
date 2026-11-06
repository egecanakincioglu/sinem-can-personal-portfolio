# Architecture

This document describes how the application is built. Items marked "planned" do not exist yet. The reasons for each choice are in the [decision records](adr/README.md).

## Overview

The project is one Next.js 16 application (App Router) with React 19 and TypeScript in strict mode. It serves a public portfolio site in Turkish and English and a private admin interface. All source code is under `src/`.

```text
src/app/          routes: public pages under [locale], admin pages under admin
src/components/   presentational components (figures, sections, projects, notes)
src/content/      typed content, the dictionary and development fixtures
src/lib/          pure functions: routes, physics, formatting, content accessors
tooling/          repository tools, site audit and Semgrep rules
```

## Routing and languages

The project has its own `[locale]` routing. It uses no i18n library ([ADR 0001](adr/0001-architecture-and-locale-routing.md)).

| Page | Turkish | English |
|---|---|---|
| Home | `/tr` | `/en` |
| Profile | `/tr/profil` | `/en/profile` |
| Projects | `/tr/projeler` | `/en/projects` |
| Project detail | `/tr/projeler/[slug]` | `/en/projects/[slug]` |
| Notes | `/tr/notlar` | `/en/notes` |
| Note detail | `/tr/notlar/[slug]` | `/en/notes/[slug]` |

- The page slugs live in one table in `src/lib/routes.ts`. Path helpers build every link, so no component writes a path by hand.
- Interface text comes from a typed dictionary in `src/content/dictionary.ts`.
- The language switch goes to the same record in the other language when the record exists in both.
- The root path redirects to `/tr`.
- There is no separate contact page. Every page ends with a contact block, and the navigation link scrolls to it.
- Unknown paths show a designed 404 page.

## Styling

Tailwind CSS 4 with design tokens defined in `src/app/globals.css` ([ADR 0002](adr/0002-styling-tailwind-4-with-tokens.md)). Admin styles are kept in `src/app/admin/admin.css`.

## Content layer

Components receive content only as typed props. Pages read content through accessors in `src/lib` (for example `projects.ts` and `notes.ts`). Data lives in `src/content` ([ADR 0003](adr/0003-content-layer-and-visibility-rule.md)).

Pages read site content once with `getSiteContent()` and pass it to server components as props (Hero, Sections, Footer, ProfileSections, Portrait and HomePage). The note article and its body receive the interface dictionary, the owner name and the contact email from the page (`src/lib/detail-route.tsx`). The project and note archives, the featured list and the project detail also receive their copy from the page. The import check allows the figure registry, because it holds drawing components, not copy. Interactive client components (Header, BeamFigure, ForceFigure, NoteList and ArchiveList) keep the bundled interface dictionary as their default. They take edited copy only through optional props. This keeps the prerendered HTML small, because props to client components are serialised into the page.

HomePage, Forces and Approach take a `preview` flag. Only in preview are edited values forwarded to client components. A test (`src/components/content-imports.test.ts`) blocks new content imports in components. Its allowlist only shrinks.

A record is public when it is published, approved, and either not a fixture or the app runs in development. Fixtures are example data for testing components. They are marked `fixture: true`, never carry the name or portrait of Sinem CAN, and never reach a production build.

When a project or note list is empty, the pages show a designed empty state.

## Interactions

- **Free-body hero:** a body with force vectors. The resultant is computed from the vectors.
- **Beam:** the visitor places a load. The page computes the support reactions and draws the bending moment diagram.
- **Force polygon:** force vectors are added head to tail to show the resultant.

The calculations are pure functions in `src/lib/physics.ts` and `src/lib/math.ts`, so they are unit tested without a browser. Animation respects the reduced motion setting.

## 3D viewer

Project pages can show a 3D model with three.js. The viewer is optional and loads only after the visitor clicks. No page depends on a model.

## Notes

Note pages render formulas as MathML, code blocks and figures. Figures come from a registry of components chosen by `figureId` ([ADR 0009](adr/0009-svg-boundary.md)). A table of contents is built from the headings.

`src/lib/note-blocks.ts` pairs the Turkish and English block lists of a note into one list for editing and splits it back. Language-neutral fields must match in both languages: ids, TeX, code and its language, figure id, image file and size, table alignment and callout kind. The file name of a code block is translated. List items, paragraphs and table rows must have the same count in both languages. An empty string marks an absent optional field, and a note may have one language only. A validation step reports missing heading ids, bad or duplicate ids, unknown figure ids, missing image alt text, table limits (8 columns, 30 rows) and ragged rows. It warns on pull quotes.

## Admin interface

The admin interface lives under `src/app/admin`. It works on mock data and has a live preview of the public pages.

- A server-side guard (`src/app/admin/guard.ts`) answers 404 for every request when the app is not in development. The root admin layout and every admin page call it.
- There is no real sign-in yet. The admin stays closed in production until real authorization exists (planned).

One field registry (`src/app/admin/registry.ts`) lists every editable field of the public site. Each entry names the public page and section, the admin screen and editor that edit the field, its status (`ready` or `planned`), its language behaviour and its type. Pure helpers in `src/lib/field-registry.ts` match registry entries to public fields. A coverage test fails when a public field has no entry, or when an entry points to a field that does not exist. This keeps the site and the panel in step. The Kapsam screen (`/admin/kapsam`, development only) shows the registry as a matrix with the ready and planned counts per screen.

The "Uyguladım" and "Gözlemledim" headings and the beam figure label are locked. The home editor shows them read-only, and the preview bridge no longer accepts them. Each panel screen's sheet number is its sidebar number minus one.

The Medya screen (`/admin/medya`) lists the real image files from `src/content/media-manifest.ts` and edits the portrait slot. The slot has a show switch, a choice limited to eligible photos (a real photo whose shorter side is at least 1000 px), a focal point, a zoom from 1 to 2.5, alt text in both languages and a 4:5 preview. A consent checkbox is stored as a value and does not change the preview. While a third-party clearance is open, the status reads "Onay bekliyor". Sample images exist only in development, in a separate group, and cannot be the portrait. Upload is disabled until the backend exists. The Profil screen shows a thumbnail with a link to Medya, and the portrait field ids are unchanged. Pure checks live in `src/lib/media.ts`.

## Backend (planned)

No database, API route or authentication exists yet. When the backend arrives, it replaces the data behind the content accessors. Components and pages do not change. Private files must be authorized on the server; a flag in the front end is not a security boundary.

## Quality and delivery

- Tests, coverage and thresholds: [ADR 0004](adr/0004-testing-strategy.md) and [ADR 0006](adr/0006-quality-targets-and-thresholds.md).
- CI and branch protection: [ADR 0005](adr/0005-ci-and-protection-layers.md).
- Releases and deploys: [ADR 0007](adr/0007-versioning-and-releases.md) and the [release runbook](runbooks/release-and-rollback.md).
