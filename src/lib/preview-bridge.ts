import {
  getSiteContent,
  type ForceRecordEdit,
  type SiteContent,
  type SiteContentOverride,
} from '@/content/site-content';
import {
  parseActivities,
  parseEducation,
  parseExperience,
  parseLanguages,
  parseMemberships,
  parseSkills,
  profileIds,
  recsOf,
} from './profile-fields';
import type { Copy, Locale, Platform, Process } from '@/content/types';
import { num } from '@/lib/format';
import { beamMaxMidspanOffset } from '@/lib/physics';

/* ------------------------------------------------------------------------------------------------
   DEVELOPMENT ONLY. The single contract between the Admin editor (parent window) and the real Homepage
   rendered in the preview iframe (/[locale]/dev-preview/live). Used on BOTH sides:

     parent:  buildOverride(editorValues)   -> SiteContentOverride   (only registered fields are read)
     iframe:  parseStateMessage(event.data) -> re-sanitises the same shape; anything else is dropped

   There is no second content schema: the payload is a `SiteContentOverride` (content/site-content.ts),
   which `mergeSiteContent` applies over the authoritative defaults. Every value that crosses the bridge
   is a length-limited plain string rendered as React text: no HTML, no URLs, no files, no credentials.
   ------------------------------------------------------------------------------------------------ */

export const PREVIEW_PROTOCOL = 1;

/** iframe -> parent. The handshake: "my listener is attached, send the state". */
export type ReadyMessage = { type: 'ready'; v: typeof PREVIEW_PROTOCOL };
/**
 * parent -> iframe. `override` is already sanitised; the iframe sanitises it again. `projects` carries record ids
 * only: the iframe resolves them against its own server-side pool, so no record or URL ever crosses the bridge.
 */
export type StateMessage = {
  type: 'state';
  v: typeof PREVIEW_PROTOCOL;
  lang: Locale;
  override: SiteContentOverride;
  projects?: string[];
};

type DictGroup =
  | 'meta'
  | 'profile'
  | 'notes'
  | 'hero'
  | 'forces'
  | 'approach'
  | 'intro'
  | 'workshop'
  | 'work'
  | 'projects'
  | 'direction'
  | 'contact'
  | 'footer'
  | 'nav'
  | 'sections';

/** A bilingual plain-text field of the Homepage slice: editor field id (`<id>.tr` / `<id>.en`) -> public source. */
export type CopyField = {
  id: string;
  dest: `dict.${DictGroup}` | 'draft'; // dict.<group>.<key> | draft.<key> in SiteContent
  key: string;
  max: number; // characters
  words?: number; // optional word limit
  tokens?: readonly string[]; // runtime {tokens} the text MUST contain; other fields allow none
  optional?: readonly string[]; // runtime {tokens} the text MAY contain (filled by the component)
  fixed?: readonly string[]; // static {tokens} the text MAY contain; replaced by their canonical value when the override is sanitised
};

/** Editor field registry: every editable bilingual Homepage text. One table, read by the editor,
 *  the parent-side builder and the iframe-side sanitiser, so the three can never disagree. */
export const copyFields = {
  isolation: { id: 'hero.isolation', dest: 'dict.hero', key: 'isolation', max: 24 }, // H-04 label on the dashed boundary
  lead: { id: 'hero.lead', dest: 'draft', key: 'heroLead', max: 120 }, // H-05
  note: { id: 'hero.note', dest: 'draft', key: 'isolationNote', max: 320, words: 45 }, // H-06 sidenote body
  whatIs: { id: 'hero.whatIs', dest: 'dict.hero', key: 'whatIs', max: 40 }, // H-07 sidenote trigger
  briefly: { id: 'hero.briefly', dest: 'dict.hero', key: 'briefly', max: 24 }, // H-08
  program: { id: 'hero.program', dest: 'dict.hero', key: 'program', max: 24 }, // H-09
  university: { id: 'hero.university', dest: 'dict.hero', key: 'university', max: 24 },
  graduation: { id: 'hero.graduation', dest: 'dict.hero', key: 'graduation', max: 32 },
  internship: { id: 'hero.internship', dest: 'dict.hero', key: 'internship', max: 24 },
  direction: { id: 'hero.direction', dest: 'dict.hero', key: 'direction', max: 24 }, // H-12
  resultantAlt: { id: 'hero.resultantAlt', dest: 'dict.hero', key: 'resultantAlt', max: 140, tokens: ['{deg}'] }, // H-14 (screen-reader text)
  statement: { id: 'kisaca.lead', dest: 'draft', key: 'statement', max: 200 }, // I-02 Kısaca statement
  forcesHeading: { id: 'kuvvetler.heading', dest: 'dict.forces', key: 'heading', max: 60 }, // F-01
  forcesText: { id: 'kuvvetler.text', dest: 'draft', key: 'forcesText', max: 420 }, // F-02
  forcesList: { id: 'kuvvetler.list', dest: 'dict.forces', key: 'list', max: 32 }, // F-03
  forcesResult: { id: 'kuvvetler.result', dest: 'dict.forces', key: 'result', max: 24 }, // F-07 "Bileşke R"
  forcesPartial: { id: 'kuvvetler.partial', dest: 'dict.forces', key: 'partial', max: 24 }, // F-09
  forcesReverse: { id: 'kuvvetler.reverse', dest: 'dict.forces', key: 'reverse', max: 32 }, // F-08
  // Yaklaşım / Beam. Equations, assumptions and the exaggeration note are protected and are not listed.
  beamHeading: { id: 'yaklasim.heading', dest: 'dict.approach', key: 'heading', max: 60 },
  beamInterests: { id: 'yaklasim.interests', dest: 'dict.approach', key: 'interests', max: 40 },
  beamHint: { id: 'yaklasim.hint', dest: 'dict.approach', key: 'hint', max: 60 },
  beamCaption: { id: 'yaklasim.caption', dest: 'dict.approach', key: 'caption', max: 240 },
  beamTeaching: { id: 'yaklasim.teaching', dest: 'draft', key: 'beamTeaching', max: 280, fixed: ['{offset}'] },
  beamControls: { id: 'yaklasim.controls', dest: 'dict.approach', key: 'controls', max: 32 }, // slider + group accessible name
  beamMoment: { id: 'yaklasim.moment', dest: 'dict.approach', key: 'momentLabel', max: 32 },
  beamEquations: { id: 'yaklasim.equations', dest: 'dict.approach', key: 'equations', max: 24 }, // label above the protected equations
  beamReadoutsAt: { id: 'yaklasim.readoutsAt', dest: 'dict.approach', key: 'readoutsAt', max: 48, tokens: ['{a}'] },
  beamReset: { id: 'yaklasim.reset', dest: 'dict.approach', key: 'reset', max: 20 },
  beamResetLabel: { id: 'yaklasim.resetLabel', dest: 'dict.approach', key: 'resetLabel', max: 100, optional: ['{a0}'] },
  beamValueText: {
    id: 'yaklasim.valueText',
    dest: 'dict.approach',
    key: 'valueText',
    max: 140,
    tokens: ['{a}'],
    optional: ['{ra}', '{rb}'],
  },
  beamFigAlt: { id: 'yaklasim.figAlt', dest: 'dict.approach', key: 'figAlt', max: 260 },
  introHeading: { id: 'kisaca.heading', dest: 'dict.intro', key: 'heading', max: 24 },
  introSummary: { id: 'kisaca.summary', dest: 'dict.intro', key: 'summary', max: 24 },
  introFullProfile: { id: 'kisaca.fullProfile', dest: 'dict.intro', key: 'fullProfile', max: 32 },
  introBody: { id: 'kisaca.body', dest: 'draft', key: 'introBody', max: 420 },
  introNote: { id: 'kisaca.note', dest: 'draft', key: 'introNote', max: 220 },
  workshopHeading: { id: 'atolye.heading', dest: 'dict.workshop', key: 'heading', max: 80 },
  workshopInternship: { id: 'atolye.internship', dest: 'dict.workshop', key: 'internship', max: 24 },
  workshopAppliedHint: { id: 'atolye.appliedHint', dest: 'dict.workshop', key: 'appliedHint', max: 60 },
  workshopObservedHint: { id: 'atolye.observedHint', dest: 'dict.workshop', key: 'observedHint', max: 60 },
  workHeading: { id: 'calismalar.heading', dest: 'dict.work', key: 'heading', max: 24 },
  workProjects: { id: 'calismalar.projects', dest: 'dict.work', key: 'projects', max: 24 },
  workNotes: { id: 'calismalar.notes', dest: 'dict.work', key: 'notes', max: 24 },
  workEmptyProjects: { id: 'calismalar.emptyProjects', dest: 'dict.work', key: 'emptyProjects', max: 40 },
  workEmptyProjectsText: { id: 'calismalar.emptyProjectsText', dest: 'dict.work', key: 'emptyProjectsText', max: 120 },
  workEmptyNotes: { id: 'calismalar.emptyNotes', dest: 'dict.work', key: 'emptyNotes', max: 80 },
  workAllNotes: { id: 'calismalar.allNotes', dest: 'dict.work', key: 'allNotes', max: 32 },
  workToProfile: { id: 'calismalar.toProfile', dest: 'dict.work', key: 'toProfile', max: 24 },
  workAllProjects: { id: 'calismalar.allProjects', dest: 'dict.projects', key: 'back', max: 40 },
  workDrawnBy: { id: 'calismalar.drawnBy', dest: 'dict.work', key: 'drawnBy', max: 24 },
  workStatus: { id: 'calismalar.status', dest: 'dict.work', key: 'status', max: 24 },
  workStatusValue: { id: 'calismalar.statusValue', dest: 'dict.work', key: 'statusValue', max: 32 },
  workRev: { id: 'calismalar.rev', dest: 'dict.work', key: 'rev', max: 12 },
  directionHeading: { id: 'yonelim.heading', dest: 'dict.direction', key: 'heading', max: 80 },
  directionOpenness: { id: 'yonelim.openness', dest: 'draft', key: 'openness', max: 120 },
  contactHeading: { id: 'iletisim.heading', dest: 'dict.contact', key: 'heading', max: 24 },
  contactLead: { id: 'iletisim.lead', dest: 'dict.contact', key: 'lead', max: 100 },
  contactLinkedin: { id: 'iletisim.linkedin', dest: 'dict.contact', key: 'linkedin', max: 40 },
  contactAlso: { id: 'iletisim.also', dest: 'dict.contact', key: 'also', max: 20 },
  contactCopy: { id: 'iletisim.copy', dest: 'dict.contact', key: 'copy', max: 20 },
  contactCopied: { id: 'iletisim.copied', dest: 'dict.contact', key: 'copied', max: 20 },
  contactCopyFailed: { id: 'iletisim.copyFailed', dest: 'dict.contact', key: 'copyFailed', max: 28 },
  contactCopyLabel: { id: 'iletisim.copyLabel', dest: 'dict.contact', key: 'copyLabel', max: 60 },
  contactExternal: { id: 'iletisim.external', dest: 'dict.contact', key: 'external', max: 40 },
  navLabel: { id: 'ustbilgi.navLabel', dest: 'dict.nav', key: 'label', max: 40 },
  navProfile: { id: 'ustbilgi.profile', dest: 'dict.nav', key: 'profile', max: 24 },
  navProjects: { id: 'ustbilgi.projects', dest: 'dict.nav', key: 'projects', max: 24 },
  navNotes: { id: 'ustbilgi.notes', dest: 'dict.nav', key: 'notes', max: 24 },
  navContact: { id: 'ustbilgi.contact', dest: 'dict.nav', key: 'contact', max: 24 },
  navMenu: { id: 'ustbilgi.menu', dest: 'dict.nav', key: 'menu', max: 16 },
  navClose: { id: 'ustbilgi.close', dest: 'dict.nav', key: 'close', max: 16 },
  navLanguage: { id: 'ustbilgi.language', dest: 'dict.nav', key: 'language', max: 16 },
  secTop: { id: 'ustbilgi.sec.top', dest: 'dict.sections', key: 'top', max: 24 },
  secProfile: { id: 'ustbilgi.sec.profile', dest: 'dict.sections', key: 'profile', max: 24 },
  secForces: { id: 'ustbilgi.sec.forces', dest: 'dict.sections', key: 'forces', max: 24 },
  secWorkshop: { id: 'ustbilgi.sec.workshop', dest: 'dict.sections', key: 'workshop', max: 24 },
  secApproach: { id: 'ustbilgi.sec.approach', dest: 'dict.sections', key: 'approach', max: 24 },
  secWork: { id: 'ustbilgi.sec.work', dest: 'dict.sections', key: 'work', max: 24 },
  secDirection: { id: 'ustbilgi.sec.direction', dest: 'dict.sections', key: 'direction', max: 24 },
  secContact: { id: 'ustbilgi.sec.contact', dest: 'dict.sections', key: 'contact', max: 24 },
  footerSentence: { id: 'altbilgi.sentence', dest: 'dict.footer', key: 'sentence', max: 120 },
  footerDrawnBy: { id: 'altbilgi.drawnBy', dest: 'dict.footer', key: 'drawnBy', max: 24 },
  footerSheet: { id: 'altbilgi.sheet', dest: 'dict.footer', key: 'sheet', max: 24 },
  footerLanguage: { id: 'altbilgi.language', dest: 'dict.footer', key: 'language', max: 24 },
  footerContact: { id: 'altbilgi.contact', dest: 'dict.footer', key: 'contact', max: 24 },
  footerLinks: { id: 'altbilgi.links', dest: 'dict.footer', key: 'links', max: 24 },
  footerRevision: { id: 'altbilgi.revision', dest: 'dict.footer', key: 'revision', max: 24 },
  // Profil sayfası (Admin › Profil). Facts inside these texts come from the records; edited text is literal.
  profileH1: { id: 'profil.h1', dest: 'dict.profile', key: 'h1', max: 24 },
  profileLead: { id: 'profil.lead', dest: 'draft', key: 'profileLead', max: 160 },
  profileBody: { id: 'profil.body', dest: 'draft', key: 'profileBody', max: 520 },
  profileNow: { id: 'profil.now', dest: 'dict.profile', key: 'now', max: 24 },
  profileNowValue: { id: 'profil.nowValue', dest: 'dict.profile', key: 'nowValue', max: 140 },
  profileIndex: { id: 'profil.index', dest: 'dict.profile', key: 'index', max: 24 },
  profileOnThisPage: { id: 'profil.onThisPage', dest: 'dict.profile', key: 'onThisPage', max: 24 },
  profileExpected: { id: 'profil.expected', dest: 'dict.profile', key: 'expected', max: 32 },
  profileScore: { id: 'profil.score', dest: 'dict.profile', key: 'score', max: 32 },
  profileAcademic: { id: 'profil.academic', dest: 'dict.profile', key: 'academic', max: 40 },
  profileInterestsCaption: { id: 'profil.interestsCaption', dest: 'dict.profile', key: 'interestsCaption', max: 80 },
  academicIntro: { id: 'profil.academicIntro', dest: 'draft', key: 'academicIntro', max: 200 },
  academicNote: { id: 'profil.academicNote', dest: 'draft', key: 'academicNote', max: 240 },
  experienceIntro: { id: 'profil.experienceIntro', dest: 'draft', key: 'experienceIntro', max: 200 },
  rastageNote: { id: 'profil.rastageNote', dest: 'draft', key: 'rastageNote', max: 200 },
  offField: { id: 'profil.offField', dest: 'draft', key: 'offField', max: 200 },
  teamSportNote: { id: 'profil.teamSportNote', dest: 'draft', key: 'teamSportNote', max: 160 },
  secEducation: { id: 'profil.sec.education', dest: 'dict.sections', key: 'education', max: 24 },
  secExperience: { id: 'profil.sec.experience', dest: 'dict.sections', key: 'experience', max: 24 },
  secCommunity: { id: 'profil.sec.community', dest: 'dict.sections', key: 'community', max: 24 },
  secSkills: { id: 'profil.sec.skills', dest: 'dict.sections', key: 'skills', max: 24 },
  secLanguages: { id: 'profil.sec.languages', dest: 'dict.sections', key: 'languages', max: 24 },
  secInterests: { id: 'profil.sec.interests', dest: 'dict.sections', key: 'interests', max: 24 },
  secOffField: { id: 'profil.sec.offField', dest: 'dict.sections', key: 'off-field', max: 24 },
  // Sayfa meta (Admin › Site ayarları). Stored as mock values only: the preview iframe has no <head> and nothing is published.
  metaTitle: { id: 'ayarlar.seo.home.title', dest: 'dict.meta', key: 'title', max: 70 },
  metaDescription: { id: 'ayarlar.seo.home.description', dest: 'dict.meta', key: 'description', max: 170 },
  profMetaTitle: { id: 'ayarlar.seo.profile.title', dest: 'dict.profile', key: 'metaTitle', max: 70 },
  profMetaDescription: {
    id: 'ayarlar.seo.profile.description',
    dest: 'dict.profile',
    key: 'metaDescription',
    max: 170,
  },
  projMetaTitle: { id: 'ayarlar.seo.projects.title', dest: 'dict.projects', key: 'metaTitle', max: 70 },
  projMetaDescription: {
    id: 'ayarlar.seo.projects.description',
    dest: 'dict.projects',
    key: 'metaDescription',
    max: 170,
  },
  notesMetaTitle: { id: 'ayarlar.seo.notes.title', dest: 'dict.notes', key: 'metaTitle', max: 70 },
  notesMetaDescription: { id: 'ayarlar.seo.notes.description', dest: 'dict.notes', key: 'metaDescription', max: 170 },
} as const satisfies Record<string, CopyField>;
export type CopyKey = keyof typeof copyFields;

/** Identity (G-01, G-02): the canonical `identity` source; stable ids so the later Ayarlar editor reuses them. */
export const identityFields = {
  firstName: { id: 'ayarlar.identity.firstName', max: 40 },
  lastName: { id: 'ayarlar.identity.lastName', max: 40 },
} as const;

/** Interests list (H-13, D-02): one list for Hero and Yönelim. */
export const interestsField = { id: 'yonelim.list', max: 32, count: 6 } as const;

/** The authoritative text of a registered field (what the public site shows with no edit). */
export function copyDefault(f: CopyField, content: SiteContent = getSiteContent()): Copy {
  const c = content;
  const src = (
    f.dest === 'draft' ? c.draft : (c.dict as unknown as Record<string, Record<string, unknown>>)[f.dest.slice(5)]
  ) as Record<string, Copy>;
  return { tr: src[f.key].tr, en: src[f.key].en };
}

/** What the preview prints for a language that was explicitly emptied: visible, never another language's text. */
export const missingMark = (l: Locale) => `[${l.toUpperCase()} eksik]`;

const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const TOKEN = /\{[^{}]*\}/g;

/** Validation shared by the editor (messages) and the sanitiser (drop invalid). `undefined` = valid or empty. */
export function checkCopy(f: CopyField, text: string): string | undefined {
  const t = text.trim();
  if (!t) return undefined;
  if (t.length > f.max) return `En fazla ${f.max} karakter.`;
  if (f.words && wordCount(t) > f.words) return `En fazla ${f.words} sözcük (şu an ${wordCount(t)}).`;
  const required: readonly string[] = f.tokens ?? [];
  const allowed: readonly string[] = [...required, ...(f.optional ?? []), ...(f.fixed ?? [])];
  const found = t.match(TOKEN) ?? [];
  const stray = /[{}]/.test(t.replace(TOKEN, ''));
  if (stray || found.some((x) => !allowed.includes(x))) {
    return allowed.length
      ? `Yalnızca ${allowed.join(', ')} belirteci kullanılabilir.`
      : 'Bu alanda süslü parantezli belirteç kullanılamaz.';
  }
  const absent = required.find((x) => !t.includes(x));
  if (absent) return `${absent} belirteci gerekli.`;
  return undefined;
}

const clean = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
  return s || undefined;
};

const LANGS: Locale[] = ['tr', 'en'];

/**
 * A partial {tr,en} edit. Per language: untouched (not a string) keeps the default; emptied becomes the visible
 * "[EN eksik]" mark; an invalid text is dropped (the editor shows the error); a valid text is used.
 */
/** Static tokens carry their canonical value (never typed): {offset} is the geometric constant from lib/physics.ts. */
const fixedValue = (token: string, l: Locale): string | undefined =>
  token === '{offset}' ? num(beamMaxMidspanOffset(), l, 3) : undefined;
const fillFixed = (f: CopyField, t: string, l: Locale) =>
  (f.fixed ?? []).reduce((acc, k) => acc.split(k).join(fixedValue(k, l) ?? k), t);

function copyEdit(f: CopyField, o: unknown): Partial<Copy> | undefined {
  if (!o || typeof o !== 'object') return undefined;
  const r = o as Record<string, unknown>;
  const out: Partial<Copy> = {};
  for (const l of LANGS) {
    const v = r[l];
    if (typeof v !== 'string') continue;
    const t = clean(v, 1000);
    if (!t) out[l] = missingMark(l);
    else if (t === missingMark(l)) out[l] = t;
    else if (!checkCopy(f, t)) out[l] = fillFixed(f, t, l);
  }
  return out.tr || out.en ? out : undefined;
}

function interestList(raw: unknown, f: { max: number; count: number } = interestsField): Copy[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Copy[] = [];
  for (const it of raw.slice(0, f.count)) {
    if (!it || typeof it !== 'object') continue;
    const r = it as Record<string, unknown>;
    const tr = clean(r.tr, f.max);
    const en = clean(r.en, f.max);
    if (!tr && !en) continue; // an empty row is not rendered
    out.push({ tr: tr ?? missingMark('tr'), en: en ?? missingMark('en') });
  }
  return out.length ? out : undefined;
}

/** Kısaca summary rows: the nine labels are editable; the values are derived from the Profile records (read-only). */
export const SUMMARY_COUNT = 9;
export const summaryLabelField = (i: number): CopyField => ({
  id: `kisaca.row.${i}.label`,
  dest: 'draft',
  key: `row${i}`,
  max: 24,
});

/** Yaklaşım topics list: stable by position, 1..10 entries. */
export const topicsField = { id: 'yaklasim.topics', max: 40, count: 10 } as const;

/** Atölye technique records: stable ids, a classification and bilingual name/note. */
export const workshopField = { id: 'atolye.records', nameMax: 40, noteMax: 90, count: 12 } as const;
export type TechniqueKind = 'applied' | 'observed';
export type TechniqueRecord = {
  id: string;
  kind: TechniqueKind;
  name: { tr: string; en: string };
  note: { tr: string; en: string };
};

/** Çalışmalar presentation fields. */
export const workViewFields = {
  showProjects: 'calismalar.showProjects',
  showNotes: 'calismalar.showNotes',
  featured: 'calismalar.featured',
} as const;

/** Contact and platforms (G-12…G-16): one source (`platforms[]` + `contact.email`). */
export const contactFields = { email: 'ayarlar.contact.email' } as const;
export const platformFieldId = (id: Platform['id'], part: 'url' | 'handle' | 'showContact' | 'showFooter') =>
  `ayarlar.contact.${id}.${part}`;
const PLATFORM_HOSTS: Record<Platform['id'], readonly string[]> = {
  linkedin: ['linkedin.com'],
  instagram: ['instagram.com'],
  threads: ['threads.com', 'threads.net'],
};

export function checkEmail(raw: string | undefined): string | undefined {
  const t = (raw ?? '').trim();
  if (!t) return 'Bu alan boş bırakılamaz; önizleme varsayılan adresi gösterir.';
  if (t.length > 80 || !/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(t))
    return 'Geçerli bir e-posta adresi yazın (ad@alanadi.com).';
  return undefined;
}
export function checkPlatformUrl(id: Platform['id'], raw: string | undefined): string | undefined {
  const t = (raw ?? '').trim();
  if (!t) return 'Bu alan boş bırakılamaz; önizleme varsayılan bağlantıyı gösterir.';
  if (t.length > 200) return 'En fazla 200 karakter.';
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return 'Tam bir bağlantı yazın (https://…).';
  }
  if (u.protocol !== 'https:' || u.username || u.password) return 'Yalnızca https:// bağlantısı kabul edilir.';
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!PLATFORM_HOSTS[id].includes(host)) return `Bağlantı ${PLATFORM_HOSTS[id].join(' ya da ')} adresine ait olmalı.`;
  return undefined;
}
export function checkHandle(raw: string | undefined): string | undefined {
  const t = (raw ?? '').trim();
  if (!t) return 'Bu alan boş bırakılamaz; önizleme varsayılan kullanıcı adını gösterir.';
  if (!/^@[A-Za-z0-9._]{1,30}$/.test(t)) return '@ ile başlayan kullanıcı adı yazın (örn. @kullanici).';
  return undefined;
}

/** Contact override, validated field by field: an invalid entry leaves the authoritative default in place. */
function contactOverride(raw: unknown): { email?: string; platforms?: Platform[] } {
  const r = obj(raw);
  const out: { email?: string; platforms?: Platform[] } = {};
  const email = typeof r.email === 'string' ? r.email.trim() : undefined;
  if (email && !checkEmail(email)) out.email = email;
  const list = Array.isArray(r.platforms) ? r.platforms : [];
  let touched = false;
  const platforms = getSiteContent().platforms.map((b) => {
    const e = obj(list.find((x) => obj(x).id === b.id));
    const url = typeof e.url === 'string' && !checkPlatformUrl(b.id, e.url) ? e.url.trim() : b.url;
    const handle =
      b.handle !== undefined && typeof e.handle === 'string' && !checkHandle(e.handle) ? e.handle.trim() : b.handle;
    const sh = obj(e.show); // accepts both the editor shape (showContact/showFooter) and the sanitised shape (show.contact/footer)
    const sc = typeof e.showContact === 'boolean' ? e.showContact : sh.contact;
    const sf = typeof e.showFooter === 'boolean' ? e.showFooter : sh.footer;
    const show =
      b.id === 'linkedin'
        ? b.show
        : {
            contact: typeof sc === 'boolean' ? sc : b.show.contact,
            footer: typeof sf === 'boolean' ? sf : b.show.footer,
          };
    if (url !== b.url || handle !== b.handle || show.contact !== b.show.contact || show.footer !== b.show.footer)
      touched = true;
    return { ...b, url, ...(handle !== undefined ? { handle } : {}), show };
  });
  if (touched) out.platforms = platforms;
  return out;
}

/** Iframe side: re-validates the already sanitised `applied` / `observed` lists (same limits, same dropping rules). */
function processLists(a: unknown, o: unknown): { applied: Process[]; observed: Process[] } | undefined {
  const one = (raw: unknown): Process[] => {
    if (!Array.isArray(raw)) return [];
    const out: Process[] = [];
    for (const it of raw.slice(0, workshopField.count)) {
      const r = obj(it),
        nm = obj(r.name),
        nt = obj(r.note);
      const tr = clean(nm.tr, workshopField.nameMax),
        en = clean(nm.en, workshopField.nameMax);
      if (!tr && !en) continue;
      out.push({
        name: { tr: tr ?? missingMark('tr'), en: en ?? missingMark('en') },
        note: {
          tr: clean(nt.tr, workshopField.noteMax) ?? missingMark('tr'),
          en: clean(nt.en, workshopField.noteMax) ?? missingMark('en'),
        },
      });
    }
    return out;
  };
  if (!Array.isArray(a) && !Array.isArray(o)) return undefined;
  const applied = one(a),
    observed = one(o);
  return applied.length + observed.length ? { applied, observed } : undefined;
}

function techniqueLists(raw: unknown): { applied: Process[]; observed: Process[] } | undefined {
  if (!Array.isArray(raw)) return undefined;
  const applied: Process[] = [];
  const observed: Process[] = [];
  const seen = new Set<string>();
  let n = 0;
  for (const it of raw) {
    if (n >= workshopField.count) break;
    const r = obj(it);
    if (typeof r.id !== 'string' || !/^[a-z0-9-]{1,16}$/.test(r.id) || seen.has(r.id)) continue;
    if (r.kind !== 'applied' && r.kind !== 'observed') continue;
    const nm = obj(r.name),
      nt = obj(r.note);
    const nameTr = clean(nm.tr, workshopField.nameMax),
      nameEn = clean(nm.en, workshopField.nameMax);
    if (!nameTr && !nameEn) continue; // a record without any name is not rendered
    seen.add(r.id);
    n++;
    const rec: Process = {
      name: { tr: nameTr ?? missingMark('tr'), en: nameEn ?? missingMark('en') },
      note: {
        tr: clean(nt.tr, workshopField.noteMax) ?? missingMark('tr'),
        en: clean(nt.en, workshopField.noteMax) ?? missingMark('en'),
      },
    };
    (r.kind === 'applied' ? applied : observed).push(rec);
  }
  return n ? { applied, observed } : undefined;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/* ---- Influence records F1–F6. Exactly six; ids and order are fixed. ---- */
export const FORCE_IDS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'] as const;
export type ForceId = (typeof FORCE_IDS)[number];
/** Conceptual inputs, not measurements. Units are the existing ones: magnitude in drawing units, angle in degrees
 *  counter-clockwise from the horizontal axis (lib/physics.ts `components`). */
export const forceLimits = {
  magnitude: { min: 0.1, max: 2, step: 0.05, label: 'Büyüklük' },
  angle: { min: -90, max: 90, step: 1, label: 'Yön' },
} as const;
export type ForceNum = keyof typeof forceLimits;
/** Which text parts are hand-written in content/site.ts (editable). The others are composed from Education,
 *  Experience or Membership records and stay read-only here until those editors exist. */
export const forceEditable: Record<ForceId, { period: boolean; title: boolean; text: boolean }> = {
  F1: { period: false, title: false, text: false },
  F2: { period: true, title: true, text: true },
  F3: { period: false, title: false, text: false },
  F4: { period: false, title: false, text: true },
  F5: { period: true, title: true, text: true },
  F6: { period: false, title: false, text: false },
};
export type ForceTextPart = 'period' | 'title' | 'text';
const forceTextMax: Record<ForceTextPart, number> = { period: 24, title: 60, text: 140 };
export const forceFieldId = (id: string, part: ForceNum | ForceTextPart) => `kuvvetler.${id}.${part}`;
export const forceCopyField = (id: string, part: ForceTextPart): CopyField => ({
  id: forceFieldId(id, part),
  dest: 'draft',
  key: part,
  max: forceTextMax[part],
});

/** Strict numeric parser: optional minus, digits, optional decimal part with `.` or `,`. No exponent, no Infinity/NaN. */
export function parseForceNumber(raw: string | undefined): number | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!/^-?\d{1,6}([.,]\d{1,6})?$/.test(t)) return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Message for an invalid numeric entry; `undefined` = valid. */
export function checkForceNumber(kind: ForceNum, raw: string | undefined): string | undefined {
  const l = forceLimits[kind];
  const t = (raw ?? '').trim();
  if (!t) return 'Bu alan boş bırakılamaz; önizleme varsayılan değeri gösterir.';
  const n = parseForceNumber(t);
  if (n === undefined) return 'Geçerli bir sayı yazın (örn. 0,45). Sonsuz, NaN ve üslü yazım kabul edilmez.';
  if (n < l.min || n > l.max)
    return `${String(l.min).replace('.', ',')} ile ${String(l.max).replace('.', ',')} arasında olmalı.`;
  return undefined;
}

/* ---- Beam default load a0. One number in units of L, 0 <= a0 <= 1, at most two decimals
   (the slider step is 0.01, so a finer value could not be reached again by the slider or by Reset). ---- */
export const beamLoadField = { id: 'yaklasim.a0', min: 0, max: 1, decimals: 2 } as const;
const LOAD_SHAPE = /^\d{1,3}([.,]\d{1,2})?$/;

/** Strict a0 parser: digits with an optional `.` or `,` fraction. No sign, exponent, Infinity or NaN; range 0..1. */
export function parseBeamLoad(raw: string | undefined): number | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!LOAD_SHAPE.test(t)) return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n >= beamLoadField.min && n <= beamLoadField.max ? n : undefined;
}

/** Message for an invalid a0 entry; `undefined` = valid. */
export function checkBeamLoad(raw: string | undefined): string | undefined {
  const t = (raw ?? '').trim();
  if (!t) return 'Bu alan boş bırakılamaz; önizleme varsayılan 0,35 L değerini gösterir.';
  if (/^[-−]/.test(t)) return 'Yük konumu negatif olamaz; 0 ile 1 arasında bir değer yazın.';
  if (/^\d+[.,]\d{3,}$/.test(t)) return 'En fazla 2 ondalık basamak (örn. 0,35). Kaydırıcı 0,01 adımlıdır.';
  if (!LOAD_SHAPE.test(t)) return 'Geçerli bir sayı yazın (örn. 0,35). Metin, Sonsuz, NaN ve üslü yazım kabul edilmez.';
  const n = Number(t.replace(',', '.'));
  if (n < beamLoadField.min || n > beamLoadField.max)
    return '0 ile 1 arasında olmalı (L cinsinden; 0 sol mesnet, 1 sağ mesnet).';
  return undefined;
}

const loadIn = (v: unknown): number | undefined =>
  typeof v === 'number' &&
  Number.isFinite(v) &&
  v >= beamLoadField.min &&
  v <= beamLoadField.max &&
  Math.abs(v * 100 - Math.round(v * 100)) < 1e-9
    ? v
    : undefined;

const numIn = (v: unknown, kind: ForceNum): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= forceLimits[kind].min && v <= forceLimits[kind].max
    ? v
    : undefined;

function forceEdits(raw: unknown): ForceRecordEdit[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ForceRecordEdit[] = [];
  for (const id of FORCE_IDS) {
    const r = obj(raw.find((x) => x && typeof x === 'object' && (x as Record<string, unknown>).id === id));
    const e: ForceRecordEdit = { id };
    const magnitude = numIn(r.magnitude, 'magnitude');
    const angleDeg = numIn(r.angleDeg, 'angle');
    if (magnitude !== undefined) e.magnitude = magnitude;
    if (angleDeg !== undefined) e.angleDeg = angleDeg;
    for (const part of ['period', 'title', 'text'] as const) {
      if (!forceEditable[id][part]) continue;
      const c = copyEdit(forceCopyField(id, part), r[part]);
      if (c) e[part] = c as ForceRecordEdit[typeof part];
    }
    if (Object.keys(e).length > 1) out.push(e);
  }
  return out.length ? out : undefined;
}

/**
 * The only validator. Whitelists exactly the editable Homepage slice; unknown keys, wrong types and
 * invalid strings never survive. The result is a `SiteContentOverride` ready for `mergeSiteContent`.
 */
export function sanitizeOverride(raw: unknown): SiteContentOverride {
  const r = obj(raw);
  const groups: Record<string, Record<string, Partial<Copy>>> = {};
  const draft: Record<string, Partial<Copy>> = {};
  for (const f of Object.values(copyFields) as CopyField[]) {
    const g = f.dest === 'draft' ? undefined : f.dest.slice(5);
    const e = copyEdit(f, obj(g ? obj(obj(r.dict)[g]) : obj(r.draft))[f.key]);
    if (!e) continue;
    if (g) (groups[g] ??= {})[f.key] = e;
    else draft[f.key] = e;
  }
  // Kısaca summary labels: the nine rows stay in place; only their labels can be edited (values are derived).
  // (the editor sends `summaryLabels`; the iframe re-validates the sanitised `summaryRows`, whose rows carry `label`)
  const labelsRaw = Array.isArray(r.summaryLabels)
    ? r.summaryLabels
    : Array.isArray(r.summaryRows)
      ? r.summaryRows.map((x) => obj(x).label)
      : [];
  let labelsTouched = false;
  const summaryRows = getSiteContent().summaryRows.map((row, i) => {
    const e = copyEdit(summaryLabelField(i), labelsRaw[i]);
    if (!e) return row;
    labelsTouched = true;
    return { ...row, label: { ...row.label, ...e } };
  });
  const idIn = obj(r.identity);
  const identity: Record<string, string> = {};
  for (const k of ['firstName', 'lastName'] as const) {
    const t = clean(idIn[k], identityFields[k].max);
    if (t) identity[k] = t;
  }
  const interests = interestList(r.interests);
  const topics = interestList(r.academicInterests, topicsField);
  const tech = techniqueLists(r.workshopRecords) ?? processLists(r.applied, r.observed);
  const ct = contactOverride({ email: obj(r.contact).email, platforms: r.platforms ?? obj(r.contact).platforms });
  const wv = obj(r.workView);
  const base = getSiteContent().workView;

  const out: SiteContentOverride = {};
  if (Object.keys(groups).length) out.dict = groups as SiteContentOverride['dict'];
  if (labelsTouched) out.summaryRows = summaryRows;
  if (topics) out.academicInterests = topics;
  if (tech) {
    out.applied = tech.applied;
    out.observed = tech.observed;
  }
  if (ct.email) out.contact = { email: ct.email };
  if (ct.platforms) out.platforms = ct.platforms;
  out.workView = {
    showProjects: typeof wv.showProjects === 'boolean' ? wv.showProjects : base.showProjects,
    showNotes: typeof wv.showNotes === 'boolean' ? wv.showNotes : base.showNotes,
    featuredId: typeof wv.featuredId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(wv.featuredId) ? wv.featuredId : null,
  };
  const a0 = loadIn(obj(r.beam).defaultLoad);
  if (a0 !== undefined) out.beam = { defaultLoad: a0 };
  if (Object.keys(draft).length) out.draft = draft as SiteContentOverride['draft'];
  if (Object.keys(identity).length) out.identity = identity;
  if (interests) out.interests = interests;
  const fr = forceEdits(r.forceRecords);
  if (fr) out.forceRecords = fr;
  Object.assign(out, profileLists(r));
  // null = the show switch is off: the public pages fall back to the typographic frame
  const po = r.portrait === null && getSiteContent().portrait ? null : portraitOverride(r.portrait);
  if (po !== undefined) out.portrait = po;
  return out;
}

/** Portrait presentation (Medya): focal point, zoom and alt text. The file itself (`src`, size) is never editable here. */
export const portraitFields = {
  focalX: { id: 'profil.portrait.focalX', min: 0, max: 100, label: 'Odak noktası, yatay (%)' },
  focalY: { id: 'profil.portrait.focalY', min: 0, max: 100, label: 'Odak noktası, dikey (%)' },
  zoom: { id: 'profil.portrait.zoom', min: 1, max: 2.5, label: 'Yakınlaştırma (×)' },
  alt: { id: 'profil.portrait.alt', max: 200 },
} as const;
/** Medya portrait slot values. '1'/'0' flags; consent is a recorded value only and never hides the portrait. */
export const portraitSlotFields = {
  show: 'medya.portrait.show',
  consent: 'medya.portrait.consent',
  assetId: 'medya.portrait.assetId',
  prevAssetId: 'medya.portrait.prevAssetId',
} as const;
const NUM_SHAPE = /^\d{1,3}([.,]\d{1,2})?$/;
/** Message for an invalid portrait number; `undefined` = valid. */
export function checkPortraitNumber(k: 'focalX' | 'focalY' | 'zoom', raw: string | undefined): string | undefined {
  const f = portraitFields[k];
  const t = (raw ?? '').trim();
  if (!t) return 'Bu alan boş bırakılamaz; önizleme varsayılan değeri gösterir.';
  if (!NUM_SHAPE.test(t)) return 'Geçerli bir sayı yazın (örn. 55 ya da 1,4).';
  const n = Number(t.replace(',', '.'));
  return n < f.min || n > f.max
    ? `${String(f.min).replace('.', ',')} ile ${String(f.max).replace('.', ',')} arasında olmalı.`
    : undefined;
}
function portraitOverride(raw: unknown): SiteContentOverride['portrait'] | undefined {
  const b = getSiteContent().portrait;
  if (!b) return undefined;
  const o = obj(raw);
  const num = (v: unknown, k: 'focalX' | 'focalY' | 'zoom', fb: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= portraitFields[k].min && v <= portraitFields[k].max ? v : fb;
  const alt = {
    ...b.alt,
    ...(copyEdit({ id: 'p', dest: 'draft', key: 'alt', max: portraitFields.alt.max }, o.alt) ?? {}),
  };
  const next = {
    ...b,
    focalX: num(o.focalX, 'focalX', b.focalX),
    focalY: num(o.focalY, 'focalY', b.focalY),
    zoom: num(o.zoom, 'zoom', b.zoom),
    alt,
  };
  return next.focalX === b.focalX &&
    next.focalY === b.focalY &&
    next.zoom === b.zoom &&
    alt.tr === b.alt.tr &&
    alt.en === b.alt.en
    ? undefined
    : next;
}

/** Profile records. Accepts the editor shape (`profileRecords`) or the sanitised typed arrays (iframe re-validation);
 *  a list with any invalid entry is dropped as a whole, so the authoritative records stay in place. */
function profileLists(r: Record<string, unknown>): SiteContentOverride {
  const pr = obj(r.profileRecords);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const src = (k: keyof typeof profileIds, typed: string, conv: (l: any) => unknown): unknown => {
    if (pr[k] !== undefined) return pr[k];
    try {
      return Array.isArray(r[typed]) ? conv(r[typed]) : undefined;
    } catch {
      return undefined;
    }
  };
  const out: SiteContentOverride = {};
  const edu = parseEducation(src('education', 'education', recsOf.education));
  if (edu?.ok) out.education = edu.out;
  const exp = parseExperience(src('experience', 'experience', recsOf.experience));
  if (exp?.ok) out.experience = exp.out;
  const mem = parseMemberships(src('memberships', 'memberships', recsOf.memberships));
  if (mem?.ok) out.memberships = mem.out;
  const sk = parseSkills(src('skills', 'skillGroups', recsOf.skills));
  if (sk?.ok) out.skillGroups = sk.out;
  const lang = parseLanguages(src('languages', 'languages', recsOf.languages));
  if (lang?.ok) out.languages = lang.out;
  const act = parseActivities(src('activities', 'activities', recsOf.activities));
  if (act?.ok) out.activities = act.out;
  return out;
}

/** Parent side: editor values (field id -> string) -> sanitised override. */
export function buildOverride(values: Record<string, string>): SiteContentOverride {
  let list: unknown;
  try {
    const raw = values[interestsField.id];
    list = raw ? JSON.parse(raw) : undefined;
  } catch {
    list = undefined;
  }
  const pair = (f: CopyField) => ({ tr: values[`${f.id}.tr`], en: values[`${f.id}.en`] });
  const dict: Record<string, Record<string, unknown>> = {};
  const draft: Record<string, unknown> = {};
  for (const f of Object.values(copyFields) as CopyField[]) {
    if (f.dest === 'draft') draft[f.key] = pair(f);
    else (dict[f.dest.slice(5)] ??= {})[f.key] = pair(f);
  }
  const json = (id: string): unknown => {
    try {
      const raw = values[id];
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  };
  const flag = (id: string): boolean | undefined =>
    values[id] === '1' ? true : values[id] === '0' ? false : undefined;
  const platforms = getSiteContent().platforms.map((b) => ({
    id: b.id,
    url: values[platformFieldId(b.id, 'url')],
    handle: values[platformFieldId(b.id, 'handle')],
    showContact: flag(platformFieldId(b.id, 'showContact')),
    showFooter: flag(platformFieldId(b.id, 'showFooter')),
  }));
  // a0 is sent only when it passes the same check the editor shows; otherwise the authoritative default stays.
  const a0raw = values[beamLoadField.id];
  const beam = a0raw !== undefined && !checkBeamLoad(a0raw) ? { defaultLoad: parseBeamLoad(a0raw) } : undefined;
  // Force records: a number is sent only when it passes the same check the editor shows; otherwise the default stays.
  const forceRecords = FORCE_IDS.map((id) => {
    const rec: Record<string, unknown> = { id };
    const m = values[forceFieldId(id, 'magnitude')];
    const a = values[forceFieldId(id, 'angle')];
    if (m !== undefined && !checkForceNumber('magnitude', m)) rec.magnitude = parseForceNumber(m);
    if (a !== undefined && !checkForceNumber('angle', a)) rec.angleDeg = parseForceNumber(a);
    for (const part of ['period', 'title', 'text'] as const)
      if (forceEditable[id][part]) rec[part] = pair(forceCopyField(id, part));
    return rec;
  });
  return sanitizeOverride({
    forceRecords,
    portrait:
      values[portraitSlotFields.show] === '0'
        ? null
        : {
            focalX:
              checkPortraitNumber('focalX', values[portraitFields.focalX.id]) === undefined
                ? Number(values[portraitFields.focalX.id].trim().replace(',', '.'))
                : undefined,
            focalY:
              checkPortraitNumber('focalY', values[portraitFields.focalY.id]) === undefined
                ? Number(values[portraitFields.focalY.id].trim().replace(',', '.'))
                : undefined,
            zoom:
              checkPortraitNumber('zoom', values[portraitFields.zoom.id]) === undefined
                ? Number(values[portraitFields.zoom.id].trim().replace(',', '.'))
                : undefined,
            alt: { tr: values[`${portraitFields.alt.id}.tr`], en: values[`${portraitFields.alt.id}.en`] },
          },
    profileRecords: Object.fromEntries(
      (Object.keys(profileIds) as (keyof typeof profileIds)[]).map((k) => [k, json(profileIds[k])]),
    ),
    dict,
    beam,
    draft,
    summaryLabels: Array.from({ length: SUMMARY_COUNT }, (_, i) => pair(summaryLabelField(i))),
    academicInterests: json(topicsField.id),
    workshopRecords: json(workshopField.id),
    contact: { email: values[contactFields.email], platforms },
    workView: {
      showProjects: flag(workViewFields.showProjects),
      showNotes: flag(workViewFields.showNotes),
      featuredId: values[workViewFields.featured] || null,
    },
    identity: { firstName: values[identityFields.firstName.id], lastName: values[identityFields.lastName.id] },
    interests: list,
  });
}

const isLocale = (v: unknown): v is Locale => v === 'tr' || v === 'en';

const PROJECT_ID = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_PROJECT_IDS = 50;

/** Keeps well-formed, unique record ids (at most 50); anything else is dropped. Not an array: no list at all. */
export function sanitizeProjectIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((x): x is string => typeof x === 'string' && PROJECT_ID.test(x));
  return [...new Set(ids)].slice(0, MAX_PROJECT_IDS);
}

/** Iframe side: validate an incoming message. Returns null for anything that is not a well-formed state message. */
export function parseStateMessage(data: unknown): StateMessage | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.type !== 'state' || d.v !== PREVIEW_PROTOCOL || !isLocale(d.lang)) return null;
  const projects = sanitizeProjectIds(d.projects);
  return {
    type: 'state',
    v: PREVIEW_PROTOCOL,
    lang: d.lang,
    override: sanitizeOverride(d.override),
    ...(projects ? { projects } : {}),
  };
}
