import type { Locale, Period } from '@/content/types';

const tags: Record<Locale, string> = { tr: 'tr-TR', en: 'en-US' };

/** TR decimal comma, EN decimal point. */
export function num(n: number, locale: Locale, digits = 2) {
  return new Intl.NumberFormat(tags[locale], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    n,
  );
}

// ISO dates are UTC midnight; format in UTC so the month never slips in a western time zone.
export function monthYear(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(tags[locale], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}

export function fullDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(tags[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** "October 2022 – July 2027" or "2017 – 2021" (en-dash ranges, never numeric dates). */
export function periodText(p: Period, locale: Locale) {
  const f = (s: string) => (p.precision === 'year' ? s : monthYear(s, locale));
  return p.end ? `${f(p.start)} – ${f(p.end)}` : `${f(p.start)} –`;
}

/** Locale-aware lower-casing ("MAKİNE" → "makine" in Turkish). */
export const lower = (s: string, locale: Locale) => s.toLocaleLowerCase(tags[locale]);

/** Locale-aware upper-casing of the first letter ("altı" → "Altı"). */
export const capFirst = (s: string, locale: Locale) =>
  s ? s.charAt(0).toLocaleUpperCase(tags[locale]) + s.slice(1) : s;

const WORDS: Record<Locale, string[]> = {
  tr: ['bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki'],
  en: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
};

/** 1–12 as words, numerals above ("six" / "altı"). */
export function numberWord(n: number, locale: Locale) {
  return Number.isInteger(n) && n >= 1 && n <= 12 ? WORDS[locale][n - 1] : String(n);
}

/**
 * The only template interpolation point: replaces {token} with vars[token].
 * Unknown tokens are left untouched, so a template can be filled in stages
 * (static facts at definition time, runtime values such as {a} or {deg} at render time).
 */
export function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? vars[key] : m));
}

/*
 * Cached variants of the formatters above. Creating an Intl formatter costs far more than using one, and the admin
 * editors re-derive the public content on every edit, so these reuse one instance per locale and shape.
 * The output is identical to the originals.
 */
const numberFormats = new Map<string, Intl.NumberFormat>();
const monthFormats = new Map<Locale, Intl.DateTimeFormat>();
const dateFormats = new Map<Locale, Intl.DateTimeFormat>();

export function cachedNum(n: number, locale: Locale, digits = 2) {
  const key = `${locale}:${digits}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(tags[locale], { minimumFractionDigits: digits, maximumFractionDigits: digits });
    numberFormats.set(key, f);
  }
  return f.format(n);
}

export function cachedMonthYear(iso: string, locale: Locale) {
  let f = monthFormats.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(tags[locale], { month: 'long', year: 'numeric', timeZone: 'UTC' });
    monthFormats.set(locale, f);
  }
  return f.format(new Date(iso));
}

export function cachedFullDate(iso: string, locale: Locale) {
  let f = dateFormats.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(tags[locale], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    dateFormats.set(locale, f);
  }
  return f.format(new Date(iso));
}

export function cachedPeriodText(p: Period, locale: Locale) {
  const f = (s: string) => (p.precision === 'year' ? s : cachedMonthYear(s, locale));
  return p.end ? `${f(p.start)} – ${f(p.end)}` : `${f(p.start)} –`;
}
