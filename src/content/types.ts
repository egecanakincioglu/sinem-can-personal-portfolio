export type Locale = 'tr' | 'en';
export const locales: Locale[] = ['tr', 'en'];

/** Localised string. `approved: false` marks personal-voice draft copy awaiting Sinem's approval. */
export type Copy = { tr: string; en: string; approved?: boolean };

export type ForceRecord = {
  id: string;
  magnitude: number; // representative, not measured
  angleDeg: number;
  short: Copy;
  period: Copy;
  title: Copy;
  text: Copy;
};

export type Process = { name: Copy; note: Copy };

export type SummaryRow = { label: Copy; value: Copy };

/** `precision: "year"` is for records where only years are known (no invented months). */
export type Period = { start: string; end?: string; precision: 'month' | 'year'; expected?: boolean };

export type EducationEntry = {
  id: string;
  institution: Copy;
  program?: Copy;
  stage?: Copy;
  period: Period;
  /** Graduation score out of 100; formatted per locale. */
  score?: number;
};

export type ExperienceEntry = {
  id: string;
  organization: string;
  role: Copy;
  month: string;
  duration: Copy;
  place: Copy;
  applied: Process[];
  observed: Process[];
};

/** `abbr` and `team` feed the recruiter summary row, so it never retypes them. */
export type Membership = {
  id: string;
  organization: string;
  abbr?: string;
  team?: Copy;
  role: Copy;
  period: Period;
  text: Copy;
};

/** `summary` places an item in the recruiter summary ("tool" / "competency"); `summaryName` is its short summary wording. */
export type SkillItem = { name: Copy; context?: Copy; summary?: 'tool' | 'competency'; summaryName?: Copy };
export type SkillGroup = { id: string; name: Copy; items: SkillItem[] };

/** `level: null` = no proficiency label until Sinem confirms. `short` is the summary-row wording. */
export type Language = { id: string; name: Copy; level: Copy | null; short?: Copy };

type PlatformId = 'linkedin' | 'instagram' | 'threads';
/** One social destination. `show` decides where it appears; LinkedIn is the primary CTA and always shown. */
export type Platform = {
  id: PlatformId;
  name: string;
  url: string;
  handle?: string;
  show: { contact: boolean; footer: boolean };
};

export type Activity = { id: string; name: Copy; period?: Period };

export const pick = (c: Copy, locale: Locale) => c[locale];
