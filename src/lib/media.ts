import type { ProjectRecord } from '@/content/projects/types';
import type { Copy } from '@/content/types';

/** One image the site can show. `fixture` assets are development samples and are never offered as the portrait. */
export type MediaAsset = {
  id: string;
  src: string;
  kind: 'image' | 'drawing' | 'diagram';
  width: number;
  height: number;
  alt: Copy;
  caption?: Copy;
  focal?: { x: number; y: number };
  fixture: boolean;
  /** A sample or stylised picture, not a record of real work. */
  illustrative: boolean;
  credit?: string;
  /** Third-party permission (for example a company logo in the frame). `open` means it is still missing. */
  clearance: 'none' | 'open';
  clearanceNote?: string;
};

export type PortraitCheck = { ok: boolean; reasons: string[] };

const MIN_SHORT_SIDE = 1000;

/** Whether an asset may be the portrait: a real photograph of sufficient size. */
export function checkPortraitAsset(a: MediaAsset): PortraitCheck {
  const reasons: string[] = [];
  if (a.fixture) reasons.push('Geliştirme örneği portre olamaz.');
  if (a.kind !== 'image') reasons.push('Portre bir fotoğraf olmalı.');
  if (Math.min(a.width, a.height) < MIN_SHORT_SIDE) reasons.push(`Kısa kenar en az ${MIN_SHORT_SIDE} piksel olmalı.`);
  return { ok: reasons.length === 0, reasons };
}

const mediaOf = (p: ProjectRecord) =>
  [p.cover, ...(p.figures ?? []), p.preview3d?.poster].flatMap((m) => (m && m.kind !== 'video' ? [m] : []));

/** Development-only assets derived from the sample projects' covers, figures and 3D posters. */
export function fixtureMediaAssets(projects: readonly ProjectRecord[]): MediaAsset[] {
  return projects.flatMap((p) =>
    mediaOf(p).map((m) => ({
      id: `${p.id}/${m.id}`,
      src: m.src,
      kind: m.kind,
      width: m.width,
      height: m.height,
      alt: m.alt,
      ...(m.caption ? { caption: m.caption } : {}),
      ...(m.focalX !== undefined && m.focalY !== undefined ? { focal: { x: m.focalX, y: m.focalY } } : {}),
      fixture: true,
      illustrative: true,
      clearance: 'none' as const,
    })),
  );
}

/** Where each asset is used, by asset id: the portrait source and the projects' own media. */
export function mediaUsage(
  assets: readonly MediaAsset[],
  portraitSrc: string | null,
  projects: readonly ProjectRecord[],
): Record<string, string[]> {
  return Object.fromEntries(
    assets.map((a) => [
      a.id,
      [
        ...(portraitSrc && a.src === portraitSrc ? ['Portre'] : []),
        ...projects
          .filter((p) => mediaOf(p).some((m) => `${p.id}/${m.id}` === a.id))
          .map((p) => `Proje: ${p.title.tr}`),
      ],
    ]),
  );
}

/** Open work on the library, in Turkish, for the screen. Samples never create tasks. */
export function mediaTasks(assets: readonly MediaAsset[]): string[] {
  return assets
    .filter((asset) => !asset.fixture)
    .flatMap((asset) => [
      ...(asset.clearance === 'open' ? [`${asset.id}: üçüncü taraf izni bekliyor.`] : []),
      ...(!asset.alt.tr.trim() || !asset.alt.en.trim() ? [`${asset.id}: alternatif metin eksik.`] : []),
    ]);
}
