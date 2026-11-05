// Every public page the audit visits, one address per locale. A new page is listed here in both locales.
export const LOCALES = ['tr', 'en'] as const;

export const PAGES: readonly string[] = [
  '/tr',
  '/en',
  '/tr/profil',
  '/en/profile',
  '/tr/projeler',
  '/en/projects',
  '/tr/notlar',
  '/en/notes',
];
