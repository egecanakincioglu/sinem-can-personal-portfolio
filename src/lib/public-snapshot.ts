import { dict } from '@/content/dictionary';
import type { ProjectRecord, PublicProject } from '@/content/projects/types';
import { mergeSiteContent, type SiteContent } from '@/content/site-content';
import type { Locale } from '@/content/types';
import { buildOverride } from './preview-bridge';
import { toPublicProject } from './projects';
import { isPublicProject } from './visibility';

/* ------------------------------------------------------------------------------------------------
   The admin mock state turned into exactly what the public site would take: one pure function with the
   same visibility rule and the same private-field stripping as production. Every readout and preview
   in the admin is computed from it, so a count can never disagree with what the preview shows.
   ------------------------------------------------------------------------------------------------ */

export type PublicSnapshot = {
  content: SiteContent;
  publicProjects: PublicProject[];
  publicIds: string[];
};

export function selectPublicSnapshot(
  state: { values: Record<string, string>; projects: ProjectRecord[] },
  dev: boolean,
): PublicSnapshot {
  const publicProjects = state.projects.filter((p) => isPublicProject(p, dev)).map(toPublicProject);
  return {
    content: mergeSiteContent(buildOverride(state.values)),
    publicProjects,
    publicIds: publicProjects.map((p) => p.id),
  };
}

/** The preview side: the pool records the Admin asked for by id, in pool order. Unknown ids are dropped. */
export const resolveProjects = (pool: readonly PublicProject[], ids: readonly string[]): PublicProject[] =>
  pool.filter((p) => ids.includes(p.id));

/** What the Homepage Work section shows for these counts. Rows are capped at two, notes at three. */
export function workLayout(nProjects: number, nNotes: number): string {
  if (nProjects === 0 && nNotes === 0) return 'tek boş çerçeve';
  const projects =
    nProjects === 0
      ? 'boş durum'
      : nProjects === 1
        ? 'öne çıkan'
        : `öne çıkan + ${Math.min(nProjects - 1, 2)} satır + Tüm projeler`;
  const notes = nNotes === 0 ? 'not yok' : `${Math.min(nNotes, 3)} not`;
  return `${projects} · ${notes}`;
}

/** Header counts of the project list: "3 kayıt · 1 yayında · 2 taslak". */
export function projectCounts(records: readonly ProjectRecord[]): string {
  const published = records.filter((p) => p.visibility === 'published').length;
  return `${records.length} kayıt · ${published} yayında · ${records.length - published} taslak`;
}

type RowChip = 'draft' | 'live' | 'approved' | 'sample';

export type ListRow = {
  id: string;
  title: string;
  kind: string;
  tools: string[];
  year?: string;
  chips: RowChip[];
  missing: Locale[];
};

/** A language is missing when the title or the address part of that language is empty. */
export function listRow(p: ProjectRecord): ListRow {
  const chips: RowChip[] = [p.visibility === 'published' ? 'live' : 'draft'];
  if (p.visibility === 'published' && p.approved === true) chips.push('approved');
  if (p.fixture) chips.push('sample');
  const missing = (['tr', 'en'] as const).filter((l) => !p.title[l].trim() || !p.slug[l].trim());
  return {
    id: p.id,
    title: p.title.tr || p.title.en,
    kind: dict.projects.kinds[p.kind].tr,
    tools: p.tools ?? [],
    year: p.period?.start.slice(0, 4),
    chips,
    missing,
  };
}
