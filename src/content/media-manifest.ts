import type { NoteRecord } from '@/content/notes/types';
import type { ProjectRecord } from '@/content/projects/types';
import { fixtureMediaAssets, type MediaAsset } from '@/lib/media';
import { portrait } from './portrait';

/* ------------------------------------------------------------------------------------------------
   Every real image file the site ships. The portrait photograph is the only one; sample images exist in
   development only (see `devMediaAssets`) and are dropped from production bundles.
   ------------------------------------------------------------------------------------------------ */

export const PORTRAIT_ASSET_ID = 'portrait-photo';

export const mediaManifest: MediaAsset[] = portrait
  ? [
      {
        id: PORTRAIT_ASSET_ID,
        src: portrait.src,
        kind: 'image',
        width: portrait.width,
        height: portrait.height,
        alt: portrait.alt,
        focal: { x: portrait.focalX, y: portrait.focalY },
        fixture: false,
        illustrative: false,
        credit: 'Fotoğraf Sinem CAN tarafından sağlandı.',
        // The frame shows a company logo from the internship; the company's permission is still open.
        clearance: 'open',
        clearanceNote: 'Fotoğraftaki firma logosu için izin alınmadı ya da logo kırpılmadı.',
      },
    ]
  : [];

type FixtureModule = typeof import('@/content/fixtures/projects');
const fixtureModule = (): FixtureModule | null =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would put the sample data into production bundles
  process.env.NODE_ENV === 'development' ? (require('./fixtures/projects') as FixtureModule) : null;

/** Development-only sample projects, for usage lookups. Empty in production. */
export const devFixtureProjects = (): ProjectRecord[] => fixtureModule()?.fixtureProjects ?? [];

/** Development-only sample notes, for the admin note list. Empty in production. */
export const devFixtureNotes = (): NoteRecord[] =>
  process.env.NODE_ENV === 'development'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would put the sample data into production bundles
      (require('./fixtures/notes') as typeof import('@/content/fixtures/notes')).fixtureNotes
    : [];

/** Development-only sample images: the sample projects' media and the sample note plot. Empty in production. */
export function devMediaAssets(): MediaAsset[] {
  if (!fixtureModule()) return [];
  return [
    ...fixtureMediaAssets(devFixtureProjects()),
    {
      id: 'fixture-note-plot',
      src: '/images/fixtures/note-sample-plot.svg',
      kind: 'diagram',
      width: 800,
      height: 480,
      alt: {
        tr: 'Orta noktadaki sehim ile yük arasında doğrusal ilişki: 100 N yükte 6,25 mm.',
        en: 'Straight line of midspan deflection against load: 6.25 millimetres at 100 newtons.',
      },
      fixture: true,
      illustrative: true,
      clearance: 'none',
    },
  ];
}
