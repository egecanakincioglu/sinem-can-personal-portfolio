import type { ProjectRecord } from '@/content/projects/types';
import type { MediaAsset } from './media';

/* ------------------------------------------------------------------------------------------------
   3D preview helpers for the Admin: size gauge, model library, checklist and the global overview rows.
   Pure functions; no file is read, created or stored. 1 MB = 1,000,000 bytes.
   ------------------------------------------------------------------------------------------------ */

export const MB = 1_000_000;
export const TARGET_BYTES = 5 * MB;
export const LIMIT_BYTES = 15 * MB;

export type GaugeState = 'ok' | 'warning' | 'error';

/** At most 5 MB is on target, up to 15 MB is a warning, anything above is over the hard limit. */
export const gaugeState = (bytes: number): GaugeState =>
  bytes <= TARGET_BYTES ? 'ok' : bytes <= LIMIT_BYTES ? 'warning' : 'error';

/** Only browser-ready exports are selectable; native CAD files never are. */
export const isModelFile = (name: string): boolean => /\.(glb|gltf)$/i.test(name);

export type GlbEntry = {
  id: string;
  name: string;
  fileName: string;
  sizeBytes: number;
  /** A declared size only: there is no file behind it. */
  declared: boolean;
};

const sizeSample = (id: string, mb: string, sizeBytes: number): GlbEntry => ({
  id,
  name: `Boyut örneği — dosya yok (${mb} MB)`,
  fileName: `${id}.glb`,
  sizeBytes,
  declared: true,
});

/** The development model library. `flangeBytes` is measured by the server page, never typed by hand. */
export const glbLibrary = (flangeBytes: number): GlbEntry[] => [
  {
    id: 'dev-flange',
    name: 'Geliştirme örneği — gerçek model değil',
    fileName: 'flange.glb',
    sizeBytes: flangeBytes,
    declared: false,
  },
  sizeSample('size-3-2', '3,2', 3_200_000),
  sizeSample('size-8-4', '8,4', 8_400_000),
  sizeSample('size-18', '18', 18_000_000),
];

const GLB_IDS = ['dev-flange', 'size-3-2', 'size-8-4', 'size-18'];
export const isGlbId = (v: unknown): v is string => typeof v === 'string' && GLB_IDS.includes(v);

/** The public preview address of a library entry. Declared-size samples have no file, so theirs answers 404. */
export const glbModelUrl = (id: string): string => `/dev-model/${id === 'dev-flange' ? 'flange' : id}.glb`;

/** Reverse lookup of a record's `modelSrc`; null for anything that is not a library address. */
export const glbIdOf = (modelSrc: string | undefined): string | null =>
  GLB_IDS.find((id) => glbModelUrl(id) === modelSrc) ?? null;

/** Library pictures that may be a project poster: every asset except the portrait. */
export const posterCandidates = (assets: readonly MediaAsset[], portraitId: string): MediaAsset[] =>
  assets.filter((a) => a.id !== portraitId);

const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** "3,2 MB · 3.200.000 bayt": the megabyte figure with the exact byte count beside it. */
export const formatSize = (bytes: number): string =>
  `${(bytes / MB).toFixed(1).replace('.', ',')} MB · ${grouped(bytes)} bayt`;

export type ChecklistItem = { id: 'poster' | 'size' | 'approved' | 'alt'; label: string; ok: boolean };

/** What a visitor needs for the 3D preview to appear: poster, size within the limit, approval, alt text in both languages. */
export function preview3dChecklist(project: ProjectRecord, assets: readonly MediaAsset[]): ChecklistItem[] {
  const p = project.preview3d;
  const poster = p?.poster;
  return [
    { id: 'poster', label: 'Poster seçili', ok: !!poster?.src && assets.some((a) => a.src === poster.src) },
    {
      id: 'size',
      label: 'Boyut 15 MB veya altında',
      ok: p?.sizeBytes !== undefined && p.sizeBytes <= LIMIT_BYTES,
    },
    { id: 'approved', label: 'Yayında göster açık', ok: p?.approved === true },
    { id: 'alt', label: 'Posterin alternatif metni TR ve EN', ok: !!poster?.alt.tr.trim() && !!poster?.alt.en.trim() },
  ];
}

type CadState = 'Yok' | 'Taslak' | 'Onaylı';

export type CadRow = {
  id: string;
  title: string;
  state: CadState;
  sizeBytes?: number;
  gauge?: GaugeState;
  originals: number;
  issues: string[];
};

/** One row per project that has a 3D preview or private originals. */
export function cadRows(records: readonly ProjectRecord[]): CadRow[] {
  return records
    .filter((r) => r.preview3d || (r.privateOriginals?.length ?? 0) > 0)
    .map((r) => {
      const p = r.preview3d;
      const gauge = p?.sizeBytes === undefined ? undefined : gaugeState(p.sizeBytes);
      const issues = [...(p && !p.poster?.src ? ['Poster yok'] : []), ...(gauge === 'error' ? ['15 MB üstü'] : [])];
      return {
        id: r.id,
        title: r.title.tr || r.title.en,
        state: !p ? 'Yok' : p.approved ? 'Onaylı' : 'Taslak',
        ...(p?.sizeBytes !== undefined ? { sizeBytes: p.sizeBytes } : {}),
        ...(gauge ? { gauge } : {}),
        originals: r.privateOriginals?.length ?? 0,
        issues,
      };
    });
}

/** An opaque key such as `asset-7f3a9c`; a future server-side layer resolves it. */
export function newAssetId(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(3));
  return `asset-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
