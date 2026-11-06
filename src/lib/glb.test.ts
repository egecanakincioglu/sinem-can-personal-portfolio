import { describe, expect, it } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import type { ProjectRecord } from '@/content/projects/types';
import {
  cadRows,
  formatSize,
  gaugeState,
  glbIdOf,
  glbLibrary,
  glbModelUrl,
  isGlbId,
  isModelFile,
  newAssetId,
  posterCandidates,
  preview3dChecklist,
} from './glb';
import { fixtureMediaAssets } from './media';

const withPreview = (patch: Record<string, unknown>): ProjectRecord => {
  const base = fixtureProjects.find((p) => p.id === 'fixture-a')!;
  return { ...base, preview3d: { ...base.preview3d!, ...patch } } as ProjectRecord;
};
const assets = fixtureMediaAssets(fixtureProjects);

describe('gaugeState', () => {
  it.each([
    [3_200_000, 'ok'],
    [5_000_000, 'ok'],
    [5_000_001, 'warning'],
    [8_400_000, 'warning'],
    [15_000_000, 'warning'],
    [15_000_001, 'error'],
    [18_000_000, 'error'],
  ])('%i bytes is %s', (bytes, state) => {
    expect(gaugeState(bytes)).toBe(state);
  });
});

describe('isModelFile', () => {
  it.each(['flange.glb', 'part.GLTF', 'a.b.glb'])('accepts %s', (n) => expect(isModelFile(n)).toBe(true));
  it.each(['part.sldprt', 'asm.step', 'model.glb.zip', 'glb', 'x.nx'])('rejects %s', (n) =>
    expect(isModelFile(n)).toBe(false),
  );
});

describe('model library', () => {
  const lib = glbLibrary(48_000);
  it('has the measured flange and three labelled declared-size samples', () => {
    expect(lib.map((e) => [e.id, e.sizeBytes, e.declared])).toEqual([
      ['dev-flange', 48_000, false],
      ['size-3-2', 3_200_000, true],
      ['size-8-4', 8_400_000, true],
      ['size-18', 18_000_000, true],
    ]);
    expect(lib.filter((e) => e.declared).every((e) => e.name.startsWith('Boyut örneği — dosya yok'))).toBe(true);
    expect(lib.every((e) => isModelFile(e.fileName))).toBe(true);
  });
  it('maps ids to addresses and back, and rejects unknown ids', () => {
    expect(glbModelUrl('dev-flange')).toBe('/dev-model/flange.glb');
    expect(glbIdOf('/dev-model/flange.glb')).toBe('dev-flange');
    expect(glbIdOf(glbModelUrl('size-18'))).toBe('size-18');
    expect(glbIdOf('/dev-model/other.glb')).toBeNull();
    expect(glbIdOf(undefined)).toBeNull();
    expect(isGlbId('size-8-4')).toBe(true);
    expect(isGlbId('../x')).toBe(false);
    expect(isGlbId(3)).toBe(false);
  });
});

describe('posterCandidates', () => {
  it('leaves out the portrait only', () => {
    const list = [{ ...assets[0], id: 'portrait-photo' }, assets[1]];
    expect(posterCandidates(list, 'portrait-photo').map((a) => a.id)).toEqual([assets[1].id]);
  });
});

describe('formatSize', () => {
  it('shows megabytes with a decimal comma and the byte count beside it', () => {
    expect(formatSize(3_200_000)).toBe('3,2 MB · 3.200.000 bayt');
    expect(formatSize(18_000_000)).toBe('18,0 MB · 18.000.000 bayt');
    expect(formatSize(950)).toBe('0,0 MB · 950 bayt');
  });
});

describe('preview3dChecklist', () => {
  const ok = (p: ProjectRecord) => preview3dChecklist(p, assets).map((i) => i.ok);
  it('passes when poster, size, approval and both alt texts are there', () => {
    expect(ok(withPreview({ sizeBytes: 3_200_000 }))).toEqual([true, true, true, true]);
  });
  it('fails each item on its own', () => {
    const p = withPreview({ sizeBytes: 3_200_000 });
    expect(ok(withPreview({ sizeBytes: 15_000_001 }))[1]).toBe(false);
    expect(ok(withPreview({}))[1]).toBe(false);
    expect(ok(withPreview({ sizeBytes: 1, approved: false }))[2]).toBe(false);
    const noAlt = withPreview({ sizeBytes: 1, poster: { ...p.preview3d!.poster, alt: { tr: 'x', en: ' ' } } });
    expect(ok(noAlt)[3]).toBe(false);
    expect(preview3dChecklist(p, [])[0].ok).toBe(false);
  });
  it('fails everything for a project without a preview', () => {
    const none = { ...fixtureProjects.find((x) => x.id === 'fixture-b')! } as ProjectRecord;
    expect(preview3dChecklist(none, assets).every((i) => !i.ok)).toBe(true);
  });
});

describe('cadRows', () => {
  const a = withPreview({ sizeBytes: 3_200_000 });
  const draft = { ...withPreview({ sizeBytes: 18_000_000, approved: false }), id: 'd' } as ProjectRecord;
  const onlyOriginals = {
    ...fixtureProjects.find((x) => x.id === 'fixture-b')!,
    id: 'o',
    privateOriginals: [{ assetId: 'asset-000001', format: 'step', label: { tr: 'a', en: 'a' }, access: 'private' }],
  } as ProjectRecord;
  const nothing = { ...fixtureProjects.find((x) => x.id === 'fixture-b')!, id: 'n' } as ProjectRecord;

  it('lists only projects with a model or originals, with state, gauge and counts', () => {
    const rows = cadRows([a, draft, onlyOriginals, nothing]);
    expect(rows.map((r) => [r.id, r.state, r.gauge, r.originals])).toEqual([
      ['fixture-a', 'Onaylı', 'ok', a.privateOriginals?.length ?? 0],
      ['d', 'Taslak', 'error', draft.privateOriginals?.length ?? 0],
      ['o', 'Yok', undefined, 1],
    ]);
  });
  it('reports the issues', () => {
    expect(cadRows([draft])[0].issues).toEqual(['15 MB üstü']);
    const noPoster = withPreview({ poster: { ...a.preview3d!.poster, src: '' } });
    expect(cadRows([noPoster])[0].issues).toEqual(['Poster yok']);
    expect(cadRows([a])[0].issues).toEqual([]);
  });
});

describe('newAssetId', () => {
  it('is an opaque, well-formed key and differs between calls', () => {
    const ids = new Set(Array.from({ length: 20 }, newAssetId));
    expect(ids.size).toBeGreaterThan(15);
    for (const id of ids) expect(id).toMatch(/^asset-[0-9a-f]{6}$/);
  });
});
