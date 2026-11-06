import { describe, expect, it } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import { PORTRAIT_ASSET_ID, devFixtureProjects, devMediaAssets, mediaManifest } from '@/content/media-manifest';
import { checkPortraitAsset, fixtureMediaAssets, mediaTasks, mediaUsage, type MediaAsset } from './media';

const photo = mediaManifest.find((a) => a.id === PORTRAIT_ASSET_ID)!;
const sample = fixtureMediaAssets(fixtureProjects);
const base: MediaAsset = { ...photo, clearance: 'none' };

describe('checkPortraitAsset', () => {
  it('allows a large real photograph', () => {
    expect(checkPortraitAsset(photo)).toEqual({ ok: true, reasons: [] });
  });
  it('denies a development sample', () => {
    expect(sample.length).toBeGreaterThan(0);
    for (const a of sample) expect(checkPortraitAsset(a).ok).toBe(false);
    expect(checkPortraitAsset({ ...photo, fixture: true }).reasons).toContain('Geliştirme örneği portre olamaz.');
  });
  it('denies a drawing and a small image', () => {
    expect(checkPortraitAsset({ ...photo, kind: 'drawing' }).ok).toBe(false);
    expect(checkPortraitAsset({ ...photo, width: 999 }).reasons).toHaveLength(1);
  });
});

describe('manifest', () => {
  it('lists only the real photograph, with clearance still open', () => {
    expect(mediaManifest.map((a) => a.id)).toEqual([PORTRAIT_ASSET_ID]);
    expect(photo.clearance).toBe('open');
    expect(mediaManifest.every((a) => !a.fixture)).toBe(true);
  });
});

describe('development samples', () => {
  it('are absent outside development', () => {
    expect(devMediaAssets()).toEqual([]);
    expect(devFixtureProjects()).toEqual([]);
  });
});

describe('fixtureMediaAssets', () => {
  it('marks every derived asset as a sample with a project-scoped id', () => {
    expect(sample.every((a) => a.fixture && a.illustrative && a.id.includes('/'))).toBe(true);
    expect(new Set(sample.map((a) => a.id)).size).toBe(sample.length);
  });
  it('keeps the focal point when the source has both coordinates', () => {
    const p = {
      ...fixtureProjects[0],
      cover: { ...fixtureProjects[0].cover!, id: 'c', focalX: 10, focalY: 20 },
      figures: [],
      preview3d: undefined,
    };
    expect(fixtureMediaAssets([p])[0].focal).toEqual({ x: 10, y: 20 });
  });
});

describe('mediaUsage', () => {
  it('names the portrait and the projects that use a sample', () => {
    const all = [photo, ...sample];
    const usage = mediaUsage(all, photo.src, fixtureProjects);
    expect(usage[photo.id]).toEqual(['Portre']);
    expect(usage[sample[0].id][0]).toMatch(/^Proje: /);
  });
  it('reports no use when nothing refers to the asset', () => {
    expect(mediaUsage([photo], null, [])[photo.id]).toEqual([]);
  });
});

describe('mediaTasks', () => {
  it('lists open clearance and missing alt text of real assets', () => {
    expect(mediaTasks([photo])).toEqual([`${photo.id}: üçüncü taraf izni bekliyor.`]);
    expect(mediaTasks([{ ...base, alt: { tr: '', en: 'x' } }])).toEqual([`${photo.id}: alternatif metin eksik.`]);
  });
  it('is silent for cleared assets and for samples', () => {
    expect(mediaTasks([base])).toEqual([]);
    expect(mediaTasks(sample)).toEqual([]);
  });
});
