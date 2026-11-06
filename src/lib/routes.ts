import type { Locale } from '@/content/types';

/** "project" / "note" are single detail pages; their URL depends on the record, see projectPath() / notePath(). */
export type PageKey = 'home' | 'profile' | 'projects' | 'project' | 'notes' | 'note';
type StaticPage = Exclude<PageKey, 'project' | 'note'>;

/** Localised public routes. Both languages share one page implementation. */
export const slugs: Record<Exclude<StaticPage, 'home'>, Record<Locale, string>> = {
  profile: { tr: 'profil', en: 'profile' },
  projects: { tr: 'projeler', en: 'projects' },
  notes: { tr: 'notlar', en: 'notes' },
};

export function pagePath(page: StaticPage, locale: Locale) {
  return page === 'home' ? `/${locale}` : `/${locale}/${slugs[page][locale]}`;
}

export function projectPath(slug: string, locale: Locale) {
  return `/${locale}/${slugs.projects[locale]}/${slug}`;
}

export function notePath(slug: string, locale: Locale) {
  return `/${locale}/${slugs.notes[locale]}/${slug}`;
}

/** Per-locale equivalents of the current page, so the language switch can land on the same record. */
export type AltPaths = Record<Locale, string>;

/** Where the language switch for `locale` goes: the record's own path on detail pages, else the page's. */
export function switchPath(page: PageKey, locale: Locale, alt?: AltPaths) {
  const list: StaticPage = page === 'project' ? 'projects' : page === 'note' ? 'notes' : page;
  return alt?.[locale] ?? pagePath(list, locale);
}

/** Primary navigation target. */
export function navHref(key: 'profile' | 'projects' | 'notes' | 'contact', _page: PageKey, locale: Locale) {
  if (key === 'contact') return '#contact';
  return pagePath(key, locale);
}
