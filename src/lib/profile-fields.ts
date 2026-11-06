import type {
  Activity,
  Copy,
  EducationEntry,
  ExperienceEntry,
  Language,
  Membership,
  Period,
  SkillGroup,
  SkillItem,
} from '@/content/types';

/* ------------------------------------------------------------------------------------------------
   Profile record editing (Admin mock). DEVELOPMENT ONLY, shared by the editor (messages) and the
   preview bridge (sanitiser), exactly like lib/preview-bridge.ts: one validator, two callers.

   The editor works on flat "rec" shapes (strings only, easy to bind to inputs). `to*` converts a valid rec
   into the canonical typed record of content/types.ts; `*Rec` converts the other way. The typed records
   are the SAME records Homepage derives from (content/site.ts `Records`), so nothing is stored twice.
   An invalid list never reaches the preview: the previous (authoritative or last valid) list stays.
   ------------------------------------------------------------------------------------------------ */

export type Pair = { tr: string; en: string };
export type Errs = Record<string, string>;

export const profileIds = {
  education: 'profil.education',
  experience: 'profil.experience',
  memberships: 'profil.memberships',
  skills: 'profil.skills',
  languages: 'profil.languages',
  activities: 'profil.activities',
} as const;

export const profileLimits = {
  education: { count: 4, institution: 70, program: 50, stage: 30 },
  experience: { count: 1, organization: 60, role: 60, duration: 24, place: 40 },
  memberships: { count: 4, organization: 70, abbr: 12, team: 40, role: 60, text: 160 },
  skills: { groups: 8, items: 10, group: 40, name: 40, context: 24, summaryName: 40 },
  languages: { count: 6, name: 24, level: 40, short: 40 },
  activities: { count: 8, name: 60 },
} as const;

/** Ids other facts are derived from (F1, F3, F4, F6, summary rows, hero glance): they cannot be removed. */
const coreIds = {
  education: ['dogus', 'imkb'],
  experience: ['ferre-femas'],
  memberships: ['ieee-ras'],
} as const;
export const isCore = (k: 'education' | 'experience' | 'memberships', id: string) =>
  (coreIds[k] as readonly string[]).includes(id);

const miss = (l: 'tr' | 'en') => `[${l.toUpperCase()} eksik]`;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;
const ID = /^[a-z0-9-]{1,16}$/;

/* ---- shapes ---- */
export type EduRec = {
  id: string;
  institution: Pair;
  program: Pair;
  stage: Pair;
  precision: 'month' | 'year';
  start: string;
  end: string;
  expected: boolean;
  score: string;
};
export type ExpRec = { id: string; organization: string; role: Pair; month: string; duration: Pair; place: Pair };
export type MemRec = {
  id: string;
  organization: string;
  abbr: string;
  team: Pair;
  role: Pair;
  start: string;
  end: string;
  text: Pair;
};
export type SkillItemRec = { name: Pair; context: Pair; summary: '' | 'tool' | 'competency'; summaryName: Pair };
export type SkillGroupRec = { id: string; name: Pair; items: SkillItemRec[] };
export type LangRec = { id: string; name: Pair; level: Pair; short: Pair };
export type ActRec = { id: string; name: Pair; start: string; end: string };

/* ---- coercion helpers ---- */
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const str = (v: unknown, max = 400): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max) : '';
const pair = (v: unknown, max = 400): Pair => ({ tr: str(obj(v).tr, max), en: str(obj(v).en, max) });
const emptyPair = (): Pair => ({ tr: '', en: '' });
const cp = (c: Copy | null | undefined): Pair => ({ tr: c?.tr ?? '', en: c?.en ?? '' });

/** Required copy: an emptied language becomes the visible "[EN eksik]" mark. Optional copy: both empty = absent. */
const copy = (p: Pair): Copy => ({ tr: p.tr.trim() || miss('tr'), en: p.en.trim() || miss('en') });
const optCopy = (p: Pair): Copy | undefined => (p.tr.trim() || p.en.trim() ? copy(p) : undefined);

function pairErr(e: Errs, k: string, p: Pair, max: number, required: boolean) {
  if (p.tr.length > max) e[`${k}.tr`] = `En fazla ${max} karakter.`;
  if (p.en.length > max) e[`${k}.en`] = `En fazla ${max} karakter.`;
  if (required && !p.tr.trim() && !p.en.trim()) e[`${k}.tr`] = 'En az bir dilde yazılmalı.';
}
function textErr(e: Errs, k: string, v: string, max: number, required: boolean) {
  if (v.length > max) e[k] = `En fazla ${max} karakter.`;
  else if (required && !v.trim()) e[k] = 'Bu alan boş bırakılamaz.';
}
function periodErr(e: Errs, precision: 'month' | 'year', start: string, end: string, endRequired: boolean) {
  const ok = (s: string) => (precision === 'month' ? MONTH : YEAR).test(s);
  const hint = precision === 'month' ? 'YYYY-AA (örn. 2027-07)' : 'YYYY (örn. 2023)';
  if (!ok(start.trim())) e.start = `Geçerli bir başlangıç yazın: ${hint}.`;
  if (end.trim() ? !ok(end.trim()) : endRequired)
    e.end = end.trim() ? `Geçerli bir bitiş yazın: ${hint}.` : `Bitiş zorunlu: ${hint}.`;
  if (!e.start && !e.end && end.trim() && end.trim() < start.trim()) e.end = 'Bitiş, başlangıçtan önce olamaz.';
}
const period = (precision: 'month' | 'year', start: string, end: string, expected?: boolean): Period => ({
  start: start.trim(),
  ...(end.trim() ? { end: end.trim() } : {}),
  precision,
  ...(expected ? { expected: true } : {}),
});
const dupIds = (ids: string[]) => ids.find((id, i) => ids.indexOf(id) !== i);

/* ================================ Education ================================ */
const eduRec = (e: EducationEntry): EduRec => ({
  id: e.id,
  institution: cp(e.institution),
  program: cp(e.program),
  stage: cp(e.stage),
  precision: e.period.precision,
  start: e.period.start,
  end: e.period.end ?? '',
  expected: !!e.period.expected,
  score: e.score === undefined ? '' : String(e.score).replace('.', ','),
});
const readEdu = (v: unknown): EduRec => {
  const o = obj(v);
  return {
    id: str(o.id, 16),
    institution: pair(o.institution),
    program: pair(o.program),
    stage: pair(o.stage),
    precision: o.precision === 'year' ? 'year' : 'month',
    start: str(o.start, 7),
    end: str(o.end, 7),
    expected: o.expected === true,
    score: str(o.score, 8),
  };
};
const parseScore = (s: string): number | undefined =>
  /^\d{1,3}([.,]\d{1,2})?$/.test(s.trim()) && Number(s.trim().replace(',', '.')) <= 100
    ? Number(s.trim().replace(',', '.'))
    : undefined;
export function checkEdu(r: EduRec): Errs {
  const L = profileLimits.education,
    e: Errs = {};
  if (!ID.test(r.id)) e.id = 'Geçersiz kimlik.';
  pairErr(e, 'institution', r.institution, L.institution, true);
  pairErr(e, 'program', r.program, L.program, r.id === 'dogus');
  pairErr(e, 'stage', r.stage, L.stage, r.id === 'dogus');
  const precision = r.id === 'dogus' ? 'month' : r.id === 'imkb' ? 'year' : r.precision;
  periodErr(e, precision, r.start, r.end, r.id === 'dogus');
  if (r.score.trim() ? parseScore(r.score) === undefined : r.id === 'imkb')
    e.score = r.score.trim()
      ? '0 ile 100 arasında, en fazla iki ondalıklı bir sayı yazın (örn. 92,77).'
      : 'Bu kayıt Kuvvetler F1 ve özet satırında kullanılır; boş bırakılamaz.';
  return e;
}
const toEdu = (r: EduRec): EducationEntry => {
  const precision = r.id === 'dogus' ? 'month' : r.id === 'imkb' ? 'year' : r.precision;
  const program = optCopy(r.program),
    stage = optCopy(r.stage);
  return {
    id: r.id,
    institution: copy(r.institution),
    ...(program ? { program } : {}),
    ...(stage ? { stage } : {}),
    period: period(precision, r.start, r.end, r.expected),
    ...(parseScore(r.score) !== undefined ? { score: parseScore(r.score) } : {}),
  };
};
export function listErr(k: 'education' | 'memberships' | 'experience', ids: string[]): string | undefined {
  const d = dupIds(ids);
  if (d) return `Kimlik tekrarı: ${d}.`;
  const lack = (coreIds[k] as readonly string[]).find((c) => !ids.includes(c));
  if (lack) return `Korunan kayıt silinemez: ${lack}.`;
  return undefined;
}

/* ================================ Experience ================================ */
const expRec = (x: ExperienceEntry): ExpRec => ({
  id: x.id,
  organization: x.organization,
  role: cp(x.role),
  month: x.month.slice(0, 7),
  duration: cp(x.duration),
  place: cp(x.place),
});
const readExp = (v: unknown): ExpRec => {
  const o = obj(v);
  return {
    id: str(o.id, 16),
    organization: str(o.organization),
    role: pair(o.role),
    month: str(o.month, 7),
    duration: pair(o.duration),
    place: pair(o.place),
  };
};
export function checkExp(r: ExpRec): Errs {
  const L = profileLimits.experience,
    e: Errs = {};
  if (!ID.test(r.id)) e.id = 'Geçersiz kimlik.';
  textErr(e, 'organization', r.organization, L.organization, true);
  pairErr(e, 'role', r.role, L.role, true);
  pairErr(e, 'duration', r.duration, L.duration, true);
  pairErr(e, 'place', r.place, L.place, true);
  if (!MONTH.test(r.month.trim())) e.month = 'Geçerli bir ay yazın: YYYY-AA (örn. 2026-08).';
  return e;
}
const toExp = (r: ExpRec): ExperienceEntry => ({
  id: r.id,
  organization: r.organization.trim(),
  role: copy(r.role),
  month: `${r.month.trim()}-01`,
  duration: copy(r.duration),
  place: copy(r.place),
  applied: [],
  observed: [],
});

/* ================================ Memberships ================================ */
const memRec = (m: Membership): MemRec => ({
  id: m.id,
  organization: m.organization,
  abbr: m.abbr ?? '',
  team: cp(m.team),
  role: cp(m.role),
  start: m.period.start,
  end: m.period.end ?? '',
  text: cp(m.text),
});
const readMem = (v: unknown): MemRec => {
  const o = obj(v);
  return {
    id: str(o.id, 16),
    organization: str(o.organization),
    abbr: str(o.abbr, 12),
    team: pair(o.team),
    role: pair(o.role),
    start: str(o.start, 7),
    end: str(o.end, 7),
    text: pair(o.text),
  };
};
export function checkMem(r: MemRec): Errs {
  const L = profileLimits.memberships,
    e: Errs = {};
  if (!ID.test(r.id)) e.id = 'Geçersiz kimlik.';
  textErr(e, 'organization', r.organization, L.organization, true);
  textErr(e, 'abbr', r.abbr, L.abbr, r.id === 'ieee-ras');
  pairErr(e, 'team', r.team, L.team, r.id === 'ieee-ras');
  pairErr(e, 'role', r.role, L.role, true);
  pairErr(e, 'text', r.text, L.text, true);
  periodErr(e, 'year', r.start, r.end, false);
  return e;
}
const toMem = (r: MemRec): Membership => {
  const team = optCopy(r.team);
  return {
    id: r.id,
    organization: r.organization.trim(),
    ...(r.abbr.trim() ? { abbr: r.abbr.trim() } : {}),
    ...(team ? { team } : {}),
    role: copy(r.role),
    period: period('year', r.start, r.end),
    text: copy(r.text),
  };
};

/* ================================ Skills ================================ */
const groupRec = (g: SkillGroup): SkillGroupRec => ({
  id: g.id,
  name: cp(g.name),
  items: g.items.map((i) => ({
    name: cp(i.name),
    context: cp(i.context),
    summary: i.summary ?? '',
    summaryName: cp(i.summaryName),
  })),
});
const readGroup = (v: unknown): SkillGroupRec => {
  const o = obj(v);
  return {
    id: str(o.id, 16),
    name: pair(o.name),
    items: (Array.isArray(o.items) ? o.items : []).slice(0, profileLimits.skills.items).map((it) => {
      const i = obj(it);
      return {
        name: pair(i.name),
        context: pair(i.context),
        summary: i.summary === 'tool' || i.summary === 'competency' ? i.summary : '',
        summaryName: pair(i.summaryName),
      };
    }),
  };
};
export function checkGroup(r: SkillGroupRec): Errs {
  const L = profileLimits.skills,
    e: Errs = {};
  if (!ID.test(r.id)) e.id = 'Geçersiz kimlik.';
  pairErr(e, 'name', r.name, L.group, true);
  if (!r.items.length) e.items = 'Her grupta en az bir yetkinlik olmalı.';
  r.items.forEach((i, n) => {
    pairErr(e, `items.${n}.name`, i.name, L.name, true);
    pairErr(e, `items.${n}.context`, i.context, L.context, false);
    pairErr(e, `items.${n}.summaryName`, i.summaryName, L.summaryName, false);
  });
  return e;
}
const toGroup = (r: SkillGroupRec): SkillGroup => ({
  id: r.id,
  name: copy(r.name),
  items: r.items.map((i) => {
    const context = optCopy(i.context),
      summaryName = optCopy(i.summaryName);
    const item: SkillItem = { name: copy(i.name) };
    if (context) item.context = context;
    if (i.summary) item.summary = i.summary;
    if (summaryName && i.summary) item.summaryName = summaryName;
    return item;
  }),
});

/* ================================ Languages ================================ */
const langRec = (l: Language): LangRec => ({
  id: l.id,
  name: cp(l.name),
  level: cp(l.level),
  short: cp(l.short),
});
const readLang = (v: unknown): LangRec => {
  const o = obj(v);
  return { id: str(o.id, 16), name: pair(o.name), level: pair(o.level), short: pair(o.short) };
};
export function checkLang(r: LangRec): Errs {
  const L = profileLimits.languages,
    e: Errs = {};
  if (!ID.test(r.id)) e.id = 'Geçersiz kimlik.';
  pairErr(e, 'name', r.name, L.name, true);
  pairErr(e, 'level', r.level, L.level, false);
  pairErr(e, 'short', r.short, L.short, false);
  return e;
}
const toLang = (r: LangRec): Language => {
  const short = optCopy(r.short);
  return { id: r.id, name: copy(r.name), level: optCopy(r.level) ?? null, ...(short ? { short } : {}) };
};

/* ================================ Activities ================================ */
const actRec = (a: Activity): ActRec => ({
  id: a.id,
  name: cp(a.name),
  start: a.period?.start ?? '',
  end: a.period?.end ?? '',
});
const readAct = (v: unknown): ActRec => {
  const o = obj(v);
  return { id: str(o.id, 16), name: pair(o.name), start: str(o.start, 4), end: str(o.end, 4) };
};
export function checkAct(r: ActRec): Errs {
  const e: Errs = {};
  if (!ID.test(r.id)) e.id = 'Geçersiz kimlik.';
  pairErr(e, 'name', r.name, profileLimits.activities.name, true);
  if (r.start.trim() || r.end.trim()) periodErr(e, 'year', r.start, r.end, false);
  return e;
}
const toAct = (r: ActRec): Activity => ({
  id: r.id,
  name: copy(r.name),
  ...(r.start.trim() ? { period: period('year', r.start, r.end) } : {}),
});

/* ================================ Whole-profile parse ================================ */
type Parsed<R, T> = { recs: R[]; errs: Errs[]; list?: string; ok: boolean; out: T[] };
function parse<R extends { id: string }, T>(
  raw: unknown,
  max: number,
  read: (v: unknown) => R,
  check: (r: R) => Errs,
  to: (r: R) => T,
  listCheck?: (ids: string[]) => string | undefined,
): Parsed<R, T> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const recs = raw.slice(0, max).map(read);
  const errs = recs.map(check);
  const list = recs.length
    ? (listCheck?.(recs.map((r) => r.id)) ?? (dupIds(recs.map((r) => r.id)) ? 'Kimlik tekrarı.' : undefined))
    : 'En az bir kayıt gerekli.';
  const ok = !list && errs.every((x) => !Object.keys(x).length);
  return { recs, errs, list, ok, out: ok ? recs.map(to) : [] };
}

export const parseEducation = (raw: unknown) =>
  parse(raw, profileLimits.education.count, readEdu, checkEdu, toEdu, (ids) => listErr('education', ids));
export const parseExperience = (raw: unknown) =>
  parse(raw, profileLimits.experience.count, readExp, checkExp, toExp, (ids) => listErr('experience', ids));
export const parseMemberships = (raw: unknown) =>
  parse(raw, profileLimits.memberships.count, readMem, checkMem, toMem, (ids) => listErr('memberships', ids));
export const parseSkills = (raw: unknown) => parse(raw, profileLimits.skills.groups, readGroup, checkGroup, toGroup);
export const parseLanguages = (raw: unknown) => parse(raw, profileLimits.languages.count, readLang, checkLang, toLang);
export const parseActivities = (raw: unknown) => parse(raw, profileLimits.activities.count, readAct, checkAct, toAct);

/** Typed canonical records of an override (iframe side) back to editor recs, so one validator serves both sides. */
export const recsOf = {
  education: (l: EducationEntry[]) => l.map(eduRec),
  experience: (l: ExperienceEntry[]) => l.map(expRec),
  memberships: (l: Membership[]) => l.map(memRec),
  skills: (l: SkillGroup[]) => l.map(groupRec),
  languages: (l: Language[]) => l.map(langRec),
  activities: (l: Activity[]) => l.map(actRec),
};

export const newId = () => `n${Date.now().toString(36)}`;
export const blank = {
  education: (): EduRec => ({
    id: newId(),
    institution: emptyPair(),
    program: emptyPair(),
    stage: emptyPair(),
    precision: 'year',
    start: '',
    end: '',
    expected: false,
    score: '',
  }),
  membership: (): MemRec => ({
    id: newId(),
    organization: '',
    abbr: '',
    team: emptyPair(),
    role: emptyPair(),
    start: '',
    end: '',
    text: emptyPair(),
  }),
  group: (): SkillGroupRec => ({ id: newId(), name: emptyPair(), items: [blankItem()] }),
  language: (): LangRec => ({ id: newId(), name: emptyPair(), level: emptyPair(), short: emptyPair() }),
  activity: (): ActRec => ({ id: newId(), name: emptyPair(), start: '', end: '' }),
};
export function blankItem(): SkillItemRec {
  return { name: emptyPair(), context: emptyPair(), summary: '', summaryName: emptyPair() };
}
