import { clampLoad } from '@/lib/physics';
import { dict, resolveDict } from './dictionary';
import { portrait, type PortraitSource } from './portrait';
import * as site from './site';
import type {
  Activity,
  Copy,
  EducationEntry,
  ExperienceEntry,
  ForceRecord,
  Language,
  Membership,
  Platform,
  Process,
  SkillGroup,
  SummaryRow,
} from './types';

/* ------------------------------------------------------------------------------------------------
   SiteContent: the Homepage's editorial inputs, gathered from the content layer — NOT a second
   schema. Every field is an existing export of content/site.ts, content/dictionary.ts or content/portrait.ts,
   with the same type. Public routes call `getSiteContent()` and get exactly today's content.

   Admin preview builds a `SiteContentOverride`, runs it through `mergeSiteContent`
   and hands the result to the same components through their optional `content` prop. The merge:
     - never mutates the defaults (it returns a new object; the authoritative modules stay untouched),
     - keeps the six influence records fixed (ids, order and count), allowing only labels, descriptions
       and the vector inputs (magnitude, angle) to change. R and its angle are still computed in lib/physics.ts,
     - ignores keys that do not exist in the defaults and leaves non-string leaves alone (copy is only ever
       rendered as React text; there is no HTML or SVG injection path),
     - passes the beam default a0 through `clampLoad` (valid range 0..1, fallback 0.35).
   ------------------------------------------------------------------------------------------------ */

/** Homepage Work presentation: which blocks show, and which public project leads. Never lists unpublished records:
 *  the featured id only reorders cards the page was already given (published + approved). */
type WorkView = { showProjects: boolean; showNotes: boolean; featuredId: string | null };

export type SiteContent = {
  identity: typeof site.identity;
  ownerName: string;
  contact: typeof site.contact;
  platforms: Platform[];
  lastRevision: string;
  interests: Copy[];
  academicInterests: Copy[];
  applied: Process[];
  observed: Process[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  memberships: Membership[];
  skillGroups: SkillGroup[];
  languages: Language[];
  cvPdf: typeof site.cvPdf;
  activities: Activity[];
  forceRecords: ForceRecord[];
  summaryRows: SummaryRow[];
  draft: typeof site.draft;
  dict: typeof dict;
  beam: { defaultLoad: number };
  portrait: PortraitSource | null;
  workView: WorkView;
};

const defaults: SiteContent = {
  identity: site.identity,
  ownerName: site.ownerName,
  contact: site.contact,
  platforms: site.platforms,
  lastRevision: site.lastRevision,
  interests: site.interests,
  academicInterests: site.academicInterests,
  applied: site.applied,
  observed: site.observed,
  experience: site.experience,
  education: site.education,
  memberships: site.memberships,
  skillGroups: site.skillGroups,
  languages: site.languages,
  cvPdf: site.cvPdf,
  activities: site.activities,
  forceRecords: site.forceRecords,
  summaryRows: site.summaryRows,
  draft: site.draft,
  dict,
  beam: { defaultLoad: site.beam.defaultLoad },
  portrait,
  workView: { showProjects: true, showNotes: true, featuredId: null },
};

/** The authoritative public content. Same object every call; callers must not mutate it. */
export const getSiteContent = (): SiteContent => defaults;

type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/** Editable parts of a force record. `id` selects the record; unknown ids are ignored. */
export type ForceRecordEdit = { id: string } & Partial<
  Pick<ForceRecord, 'magnitude' | 'angleDeg' | 'short' | 'period' | 'title' | 'text'>
>;

export type SiteContentOverride = Partial<
  Omit<SiteContent, 'forceRecords' | 'beam' | 'dict' | 'draft' | 'ownerName' | 'identity' | 'contact'>
> & {
  identity?: Partial<SiteContent['identity']>;
  contact?: Partial<SiteContent['contact']>;
  forceRecords?: ForceRecordEdit[];
  draft?: DeepPartial<SiteContent['draft']>;
  dict?: DeepPartial<SiteContent['dict']>;
  beam?: { defaultLoad?: number };
};

/** Structural merge: only keys present in `base` are taken, only when the value has the same primitive type. */
function mergeShape<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(over) || over.length !== base.length) return base;
    return base.map((b, i) => mergeShape(b, over[i])) as T;
  }
  if (base && typeof base === 'object') {
    if (typeof over !== 'object' || Array.isArray(over)) return base;
    const o = over as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(base as Record<string, unknown>)) out[k] = k in o ? mergeShape(v, o[k]) : v;
    return out as T;
  }
  return typeof over === typeof base ? (over as T) : base;
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Fixed six records: defaults in default order, each optionally edited by id. */
function mergeForceRecords(base: ForceRecord[], edits: ForceRecordEdit[] | undefined): ForceRecord[] {
  if (!edits) return base;
  return base.map((r) => {
    const e = edits.find((x) => x.id === r.id);
    if (!e) return r;
    return {
      id: r.id,
      magnitude: finite(e.magnitude) && e.magnitude > 0 ? e.magnitude : r.magnitude,
      angleDeg: finite(e.angleDeg) ? e.angleDeg : r.angleDeg,
      short: mergeShape(r.short, e.short),
      period: mergeShape(r.period, e.period),
      title: mergeShape(r.title, e.title),
      text: mergeShape(r.text, e.text),
    };
  });
}

/** `contact.linkedin/instagram/threads/handle` are aliases of `platforms[]`; re-derived here so there is one source. */
function mergeContact(c: SiteContent['contact'], platforms: Platform[]): SiteContent['contact'] {
  const url = (id: Platform['id']) => platforms.find((p) => p.id === id)?.url;
  return {
    ...c,
    platforms,
    linkedin: url('linkedin') ?? c.linkedin,
    instagram: url('instagram') ?? c.instagram,
    threads: url('threads') ?? c.threads,
    handle: platforms.find((p) => p.id === 'instagram')?.handle ?? c.handle,
  };
}

/** Explicit development/preview content. Returns a new object; `base` is never modified. */
export function mergeSiteContent(over: SiteContentOverride | undefined, base: SiteContent = defaults): SiteContent {
  if (!over) return base;
  const identity = mergeShape(base.identity, over.identity);
  const applied = over.applied ?? base.applied;
  const observed = over.observed ?? base.observed;
  const interests = over.interests ?? base.interests;
  // The canonical records, as edited. Everything below that mentions a record fact is re-derived from this one set.
  const recordsEdited = !!(
    over.identity ||
    over.education ||
    over.experience ||
    over.memberships ||
    over.skillGroups ||
    over.languages ||
    over.interests
  );
  const records: site.Records = {
    identity,
    education: over.education ?? base.education,
    experience: (over.experience ?? base.experience).map((x, i) => (i === 0 ? { ...x, applied, observed } : x)),
    memberships: over.memberships ?? base.memberships,
    skillGroups: over.skillGroups ?? base.skillGroups,
    languages: over.languages ?? base.languages,
    interests,
  };
  const tk = { tr: site.tokensFor(records, 'tr'), en: site.tokensFor(records, 'en') };
  const derivedDict = recordsEdited ? resolveDict(tk) : base.dict;
  const derivedDraft = recordsEdited ? { ...base.draft, ...site.fillDraft(records) } : base.draft;
  const derivedForces = recordsEdited
    ? site.buildForceRecords(records).map((r) => {
        const b = base.forceRecords.find((x) => x.id === r.id);
        return b ? { ...r, magnitude: b.magnitude, angleDeg: b.angleDeg } : r; // physics inputs are never re-derived
      })
    : base.forceRecords;
  const derivedRows = recordsEdited ? site.buildSummaryRows(records) : base.summaryRows;
  // Summary: labels are editable, values always come from the records (the sanitiser only carries labels).
  const summaryRows =
    over.summaryRows && over.summaryRows.length === derivedRows.length
      ? derivedRows.map((r, i) => ({ ...r, label: over.summaryRows![i].label }))
      : derivedRows;
  return {
    ...base,
    identity,
    ownerName: `${identity.firstName} ${identity.lastName}`,
    contact: mergeContact(mergeShape(base.contact, over.contact), over.platforms ?? base.platforms),
    platforms: over.platforms ?? base.platforms,
    lastRevision: typeof over.lastRevision === 'string' ? over.lastRevision : base.lastRevision,
    interests,
    academicInterests: over.academicInterests ?? base.academicInterests,
    applied,
    observed,
    experience: records.experience,
    education: records.education,
    memberships: records.memberships,
    skillGroups: records.skillGroups,
    languages: records.languages,
    activities: over.activities ?? base.activities,
    forceRecords: mergeForceRecords(derivedForces, over.forceRecords),
    summaryRows,
    draft: mergeShape(derivedDraft, over.draft),
    dict: mergeShape(derivedDict, over.dict),
    beam: {
      defaultLoad: over.beam?.defaultLoad === undefined ? base.beam.defaultLoad : clampLoad(over.beam.defaultLoad),
    },
    portrait: over.portrait === undefined ? base.portrait : over.portrait,
    workView: over.workView ?? base.workView,
  };
}
