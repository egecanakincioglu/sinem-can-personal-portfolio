import { dict } from '@/content/dictionary';
import { projectRecords } from '@/content/projects/published';
import type { Discipline, ImageMedia, ProjectKind, ProjectRecord, PublicProject } from '@/content/projects/types';
import { locales, type Locale } from '@/content/types';
import { projectPath } from './routes';

/* ------------------------------------------------------------------------------------------------
   The one access layer for project data: swap this file's source for a database later.
   Server-side only. Nothing here is imported by a client component.
   ------------------------------------------------------------------------------------------------ */

const DEV = process.env.NODE_ENV === 'development';

// Fixtures are required only in development. The condition is a build-time constant, so production
// bundles drop the branch (and the fixture module) entirely.
type FixtureModule = typeof import('@/content/fixtures/projects');
const fixtureModule = (): FixtureModule | null =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would put the sample data into production bundles
  process.env.NODE_ENV === 'development' ? (require('../content/fixtures/projects') as FixtureModule) : null;

/** Published AND approved — drafts and unapproved records are never public. Fixtures only exist in development. */
const isPublic = (p: ProjectRecord) => p.visibility === 'published' && p.approved === true && (!p.fixture || DEV);

/**
 * Strips what must never reach a component, the RSC payload or the browser:
 * private CAD metadata, and a 3D preview that has not been approved.
 */
export function toPublicProject(p: ProjectRecord): PublicProject {
  const { privateOriginals: _private, ...rest } = p;
  void _private;
  return rest.preview3d && !rest.preview3d.approved ? { ...rest, preview3d: undefined } : rest;
}

function universe(includeFixtures: boolean): ProjectRecord[] {
  const fx = includeFixtures && DEV ? (fixtureModule()?.fixtureProjects ?? []) : [];
  return [...projectRecords, ...fx].filter(isPublic);
}

const startYear = (p: PublicProject) => (p.period ? Number(p.period.start.slice(0, 4)) : 0);
const byRecency = (a: PublicProject, b: PublicProject) => startYear(b) - startYear(a);

/** Public archive. `includeFixtures` is honoured only in development (the dev preview route). */
export function getPublicProjects(opts: { includeFixtures?: boolean; many?: boolean } = {}): PublicProject[] {
  const list =
    opts.many && DEV ? (fixtureModule()?.manyFixtures ?? []).filter(isPublic) : universe(!!opts.includeFixtures);
  return list.map(toPublicProject).sort(byRecency);
}

/** Slug lookup. Detail routes may resolve fixtures in development; in production they cannot exist. */
export function findPublicProject(slug: string, locale: Locale): PublicProject | undefined {
  const rec = universe(true).find((p) => p.slug[locale] === slug);
  return rec ? toPublicProject(rec) : undefined;
}

/** Static params for the detail route: every public record in every locale (fixtures in development only). */
export function projectStaticParams() {
  return universe(true).flatMap((p) => locales.map((locale) => ({ locale, project: p.slug[locale] })));
}

/** Equivalent URL of a record in each language, for the language switch and canonical/alternates. */
export const projectPaths = (p: PublicProject) => ({
  tr: projectPath(p.slug.tr, 'tr'),
  en: projectPath(p.slug.en, 'en'),
});

/** Up to two: explicit relations first, then the same type or a shared tool. */
export function relatedProjects(p: PublicProject): PublicProject[] {
  const pool = universe(!!p.fixture)
    .filter((r) => r.id !== p.id)
    .map(toPublicProject);
  const explicit = (p.relatedIds ?? []).flatMap((id) => pool.filter((r) => r.id === id));
  const similar = pool.filter(
    (r) => !explicit.includes(r) && (r.kind === p.kind || r.tools?.some((t) => p.tools?.includes(t))),
  );
  return [...explicit, ...similar].slice(0, 2);
}

/** The next record in the archive order (wrapping), for the "Next project" link. */
export function nextProject(p: PublicProject): PublicProject | undefined {
  const list = universe(!!p.fixture).map(toPublicProject).sort(byRecency);
  if (list.length < 2) return undefined;
  const i = list.findIndex((r) => r.id === p.id);
  return list[(i + 1) % list.length];
}

/* ---------- view models: resolved to one locale, serialisable, safe for client components ---------- */

export type CardImage = { src: string; alt: string; width: number; height: number; focalX: number; focalY: number };

export type ProjectCard = {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  kind: ProjectKind;
  kindLabel: string;
  disciplines: Discipline[];
  disciplineLabels: string[];
  statusLabel: string;
  year?: string;
  tools: string[];
  cover?: CardImage;
  fixture: boolean;
};

export function toCardImage(m: ImageMedia, locale: Locale): CardImage {
  return {
    src: m.src,
    alt: m.alt[locale],
    width: m.width,
    height: m.height,
    focalX: m.focalX ?? 50,
    focalY: m.focalY ?? 50,
  };
}

export function toCard(p: PublicProject, locale: Locale): ProjectCard {
  const d = dict.projects;
  return {
    id: p.id,
    href: projectPath(p.slug[locale], locale),
    title: p.title[locale],
    subtitle: p.subtitle?.[locale],
    kind: p.kind,
    kindLabel: d.kinds[p.kind][locale],
    disciplines: p.disciplines,
    disciplineLabels: p.disciplines.map((x) => d.disciplines[x][locale]),
    statusLabel: d.statuses[p.status][locale],
    year: p.period?.start.slice(0, 4),
    tools: p.tools ?? [],
    cover: p.cover ? toCardImage(p.cover, locale) : undefined,
    fixture: !!p.fixture,
  };
}

/**
 * Homepage Work input: public records (as returned by `getPublicProjects`) as locale-resolved cards,
 * featured first, in archive order after that. Same featured rule as the archive (`splitFeatured`).
 * The visibility filter is NOT applied here; callers pass records that already went through it.
 */
export function homeProjectCards(list: PublicProject[], locale: Locale): ProjectCard[] {
  if (list.length === 0) return [];
  const { featured, rest } = splitFeatured(
    list,
    list.map((p) => toCard(p, locale)),
  );
  return [featured, ...rest];
}

/** Featured = the record flagged `featured`, else the most recent. */
export function splitFeatured<T extends { id: string }>(list: PublicProject[], cards: T[]) {
  const fi = Math.max(
    0,
    list.findIndex((p) => p.featured),
  );
  return { featured: cards[fi], rest: cards.filter((_, i) => i !== fi) };
}
