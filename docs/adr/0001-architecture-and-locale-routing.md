# ADR 0001: Architecture and own locale routing

Status: Accepted
Date: 2026-11-05

## Context

The site is a small bilingual portfolio (Turkish and English) with a few page types. Page slugs differ per language (`/tr/projeler`, `/en/projects`). The site must be fast, easy to crawl and easy to move to a backend later.

## Options

| Option | Pros | Cons |
|---|---|---|
| Next.js App Router with own `[locale]` routing and a typed dictionary | No extra dependency; localized slugs in one table; types check every key; small code | The project maintains about a hundred lines of routing code |
| Next.js App Router with an i18n library | Ready-made formatting and message tools | Another dependency; localized slugs need extra configuration; more concepts for a site with two languages |
| Separate Turkish and English applications | Simple per app | Duplicated code and content |

## Decision

The project uses the Next.js 16 App Router with React 19 and TypeScript in strict mode, and its own `[locale]` routing. It does not use an i18n library. Localized slugs and a typed dictionary already work and cover all current needs.

Rules:

1. Every public page lives under `src/app/[locale]`. The root path redirects to `/tr`.
2. Page slugs are defined once in `src/lib/routes.ts`. Components build links with the path helpers.
3. Interface text is in the typed dictionary (`src/content/dictionary.ts`). A missing key is a type error.
4. A record that has no translation is `null` in that language, not an empty string.
5. All source code is under `src/`.

## Consequences

- Positive: no i18n dependency to update; route and dictionary types catch broken links and missing text at build time.
- Negative: plural rules, date formats and number formats are handled by the project. The project uses the built-in `Intl` API for this.
- Open item: language detection from the browser is not decided. The root path always goes to Turkish.

## Sources

- https://nextjs.org/docs/app
- https://nextjs.org/docs/app/guides/internationalization
