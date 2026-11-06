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

The resultant angle is shown with one decimal. The hero and the force figure use one shared helper in `src/lib/format.ts`. The hero keeps the month and year of the graduation date on one line.

## 3D viewer

Project pages can show a 3D model with three.js. The viewer is optional and loads only after the visitor clicks. No page depends on a model.

## Notes

Note pages render formulas as MathML, code blocks and figures. Figures come from a registry of components chosen by `figureId` ([ADR 0009](adr/0009-svg-boundary.md)). A table of contents is built from the headings.

`src/lib/note-blocks.ts` pairs the Turkish and English block lists of a note into one list for editing and splits it back. Language-neutral fields must match in both languages: ids, TeX, code and its language, figure id, image file and size, table alignment and callout kind. The file name of a code block is translated. List items, paragraphs and table rows must have the same count in both languages. An empty string marks an absent optional field, and a note may have one language only. A validation step reports missing heading ids, bad or duplicate ids, unknown figure ids, missing image alt text, table limits (8 columns, 30 rows) and ragged rows. It warns on pull quotes.

`src/lib/note-record.ts` turns a note into an editable record with both languages side by side, and back, without loss for every sample note. A language that is switched off keeps its text in the editor but is not stored. Language status is complete, missing (with a count) or absent. The checks cover required heading ids, dates, summary and category length, cover alt text, reference links (https only), footnote and reference ids, cross-references, unknown TeX commands and link targets (https, a site path or an anchor). An undefined cross-reference id is an error and an unused one is a warning. Labels resolve only against numbered blocks.

## Admin interface

The admin interface lives under `src/app/admin`. It works on mock data and has a live preview of the public pages.

- Route files under `src/app/admin`, `src/app/[locale]/dev-preview` and `src/app/dev-model` use the `.dev.tsx` or `.dev.ts` extension. `next.config.ts` lists these extensions only for the development server. Production builds contain no panel code, and these paths return 404.
- A test fails when a new route file in those folders lacks the extension. The build output scan also fails on panel markers.
- A server-side guard (`src/app/admin/guard.ts`) stays as a second layer. It answers 404 for every request when the app is not in development. The root admin layout and every admin page call it.
- There is no real sign-in yet. The admin stays closed in production until real authorization exists (planned).

One field registry (`src/app/admin/registry.ts`) lists every editable field of the public site. Each entry names the public page and section, the admin screen and editor that edit the field, its status (`ready` or `planned`), its language behaviour and its type. Pure helpers in `src/lib/field-registry.ts` match registry entries to public fields. A coverage test fails when a public field has no entry, or when an entry points to a field that does not exist. This keeps the site and the panel in step. The Kapsam screen (`/admin/kapsam`, development only) shows the registry as a matrix with the ready and planned counts per screen.

The `Uyguladım` and `Gözlemledim` headings and the beam figure label are locked. The home editor shows them read-only, and the preview bridge no longer accepts them. Each panel screen's sheet number equals its sidebar number. Numbers come from the screen order in `src/app/admin/screens.ts`, and a test fails when a literal sheet number is typed by hand. The title block names a project or note by its title, never by its id.

The Medya screen (`/admin/medya`) lists the real image files from `src/content/media-manifest.ts` and edits the portrait slot. The slot has a show switch, a choice limited to eligible photos (a real photo whose shorter side is at least 1000 px), a focal point, a zoom from 1 to 2.5, alt text in both languages and a 4:5 preview. A consent checkbox is stored as a value and does not change the preview. While a third-party clearance is open, the status reads "Onay bekliyor". Sample images exist only in development, in a separate group, and cannot be the portrait. Upload is disabled until the backend exists. The Profil screen shows a thumbnail with a link to Medya, and the portrait field ids are unchanged. Pure checks live in `src/lib/media.ts`.

The sidebar section index follows the page shown: list pages show their own sections, and record pages show the editor sections. The index marks sections that have errors. The narrow rail shows initials. The arrow keys move through the screen list and the section list. The mobile disclosure has the same label when open and closed. The prototype banner is a landmark.

The Projeler screen (`/admin/projeler`) lists project records with counts, the work-section layout, status chips and marks for missing languages. In development, sample records can be loaded and removed. The "Yeni proje" button stays disabled until the editor exists.

The note list (`/admin/notlar`) shows dates in long form, language marks and status. The note editor has sections for the header, body blocks, footnotes, references, revisions and publishing. Blocks can be added from a palette, moved and removed. Text shows a live preview through the real inline renderer, and equations render live. A block with a link or TeX error is held back until it is fixed. A language can be switched off without losing its text, but the last language cannot be switched off. Sample notes load together with the sample projects in development. Notes are part of the publish snapshot and of restore, and discard also covers notes. A preview of unsaved drafts is not part of this step.

The interface strings screen (`/admin/metinler`) lists every dictionary string by group. Search covers both languages and the key path, and a filter shows missing translations. Each string is editable, derived from records, locked with a reason, or owned by another screen (then it links there). A string shared by several places is one value: editing it on any screen changes every place. An edit that drops a required placeholder is rejected.

The 3D and CAD screen (`/admin/cad-glb`) lists projects with a model or private originals. The size gauge counts 1 MB as 1,000,000 bytes and shows the byte count. Up to 5 MB is fine, up to 15 MB is a warning, and above that is an error, shown without the brand red. Only `.glb` and `.gltf` models can be selected, and the portrait cannot be a poster. In development, the model library holds a generated sample model and three labelled size samples without files. The test button opens the project preview at the 3D section. The bridge carries only the project id, a library model id and the approval flag. Private originals are metadata only, with no link or file field, and never reach the public site.

`src/lib/project-edit.ts` holds the checks the project editor will use. Slugs fold Turkish letters, use lowercase letters, digits and dashes, are unique per language and avoid reserved words. A measurement or result is accepted only when it is marked verified. Decimals accept a comma or a point. The issue list covers required fields in both languages, image alt text and library references. `src/lib/project-view.ts` builds the title block cells that the public detail page shares.

The project editor (`/admin/projeler/[id]`) has sections for identity, title block, images, body, figures, 3D and CAD, relations, revisions and publishing. Slugs are suggested from the title and checked inline. Measurements and results need the verified mark. Only one project is featured. Approval is a manual toggle. Removing a project asks for confirmation. Save and discard include project records. A preview of unsaved drafts is not part of this step.

Publishing in the panel is a simulation. The publish dialog lists the changes, blocks on errors and asks for one acknowledgement per warning group. The boxes are unticked each time the dialog opens. Each publish stores a revision, at most ten, with its change list and a snapshot. A revision can be restored behind a confirmation. The demo reset clears the session. The preview can show the draft or the last simulated publish. The footer date comes from the publish date. A text check flags self-praise, language levels, percentages next to skills and mixed-up applied and observed wording. Change and issue lists always show field labels, never content paths. Change lists name records by title and never include sample records. Empty required fields and errors in published projects and notes block publishing and appear in the task queue. On open, the dialog moves focus to its heading or to the error summary. The summary links each error to its field. The change list scrolls inside the dialog, so the actions stay in view on small screens.

The shared form controls in `src/app/admin/ui` follow the panel line style. Checkboxes and radios are square, and fieldsets have no default border. Every segmented control has a visible label, and text areas grow with their content. Fixed-format fields have no character counter, and counters are not announced to screen readers. One remove control is used everywhere. Alt text is called `Alternatif metin` in the panel.

Records, assets and interface strings are named by their title or label on every screen. Ids appear only as small secondary lines. The new project and new note dialogs require a title, mark empty fields, move focus to the first error and return focus to the opener when they close. A new project's slug follows its title until it is edited. Messages about missing translations name the fields. The coverage tables are labelled scroll regions.

The task queue groups field issues in a fixed order and hides empty groups. The header count, the sidebar index and the queue read the same list. Each row opens its field through a `?alan=` link and focuses it. The command palette searches actions, screens, fields, projects, notes and records with Turkish-aware matching. On an empty query it lists new records and the last five commands. The task queue also lists recent actions. The overview (`/admin`) reads task counts, site health, recent revisions and derived values from the panel state.

On small screens the toolbar is one row with save, preview and publish. Discard sits in the top strip, and toasts appear above the bar. Read-only screens show no save or discard. Below 1024 px the preview is a modal dialog: it traps focus, closes with Escape and returns focus to the control that opened it. Screens without a live preview hide the preview controls. The preview repeats its ready signal at most four times, and the panel skips repeats right after it sends the state.

The preview bridge carries project ids only: at most 50, made of letters, digits, dash and underscore, up to 80 characters each. The preview page resolves the ids against its own server-side list, so no record, file or URL crosses the bridge. Without a message, the preview shows only published records. `src/lib/public-snapshot.ts` applies the same visibility rule as the public site. A development-only route, `/[locale]/dev-preview/live-project`, renders the project archive.

### Guards

- Every admin page, the admin layout and the route checks that the app runs in development. A test (`src/app/admin/gating.test.ts`) reads these sources and fails when one lacks the check.
- Lint stops public code from importing the panel, the development preview and the panel-only libraries. The list is in `eslint.config.ts`. A new panel-only library is added there.
- A style test (`src/app/admin/style-rules.test.ts`) checks the panel styles. It fails on the brand red, shadows, rounded corners, gradients, backdrop filters and file inputs.
- The `build` job scans the production build output for sample data: the sample label, fixture ids and titles. It runs `node tooling/scripts/check-build-output.ts` and fails on a hit.
- The site audit (switched off in CI for now) also checks that development-only paths return 404 without prototype text, and that the sitemap lists no panel path.

## Backend (planned)

No database, API route or authentication exists yet. When the backend arrives, it replaces the data behind the content accessors. Components and pages do not change. Private files must be authorized on the server; a flag in the front end is not a security boundary.

## Quality and delivery

- Tests, coverage and thresholds: [ADR 0004](adr/0004-testing-strategy.md) and [ADR 0006](adr/0006-quality-targets-and-thresholds.md).
- CI and branch protection: [ADR 0005](adr/0005-ci-and-protection-layers.md).
- Releases and deploys: [ADR 0007](adr/0007-versioning-and-releases.md) and the [release runbook](runbooks/release-and-rollback.md).
