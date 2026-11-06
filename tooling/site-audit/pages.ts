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

// Development-only routes. A production server must answer every one with 404 and no prototype text.
export const DEV_ONLY_PATHS: readonly string[] = [
  '/admin',
  '/admin/giris',
  '/admin/ana-sayfa',
  '/admin/projeler/x',
  '/admin/onizleme/ana-sayfa',
  '/tr/dev-preview',
  '/tr/dev-preview/home',
  '/tr/dev-preview/notes',
  '/tr/dev-preview/live',
  '/en/dev-preview/live-profile',
  '/tr/dev-preview/live-project',
  '/dev-model/flange.glb',
];

/** Text that only the development prototype shows; it must never reach a production response. */
export const PROTOTYPE_MARKERS: readonly string[] = ['Prototip', 'simülasyon', '(sim.)'];
