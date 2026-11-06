import { describe, expect, it } from 'vitest';
import * as site from './site';
import { getSiteContent, mergeSiteContent, type SiteContentOverride } from './site-content';

describe('getSiteContent', () => {
  it('returns the authoritative content, the same object every call', () => {
    const c = getSiteContent();
    expect(c).toBe(getSiteContent());
    expect(c.forceRecords).toBe(site.forceRecords);
    expect(c.ownerName).toBe(site.ownerName);
    expect(c.workView).toEqual({ showProjects: true, showNotes: true, featuredId: null });
  });
});

describe('mergeSiteContent', () => {
  const base = getSiteContent();

  it('returns the base when there is no override', () => {
    expect(mergeSiteContent(undefined)).toBe(base);
  });

  it('never mutates the defaults', () => {
    const before = JSON.stringify(base);
    mergeSiteContent({
      identity: { firstName: 'Changed' },
      forceRecords: [{ id: 'F1', magnitude: 9, title: { tr: 'a', en: 'b' } }],
      beam: { defaultLoad: 0.9 },
    });
    expect(JSON.stringify(base)).toBe(before);
  });

  it('keeps exactly six force records F1 to F6 in order', () => {
    const out = mergeSiteContent({
      forceRecords: [
        { id: 'F3', magnitude: 2 },
        { id: 'F99', magnitude: 5 },
      ],
    });
    expect(out.forceRecords.map((r) => r.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
    expect(out.forceRecords[2].magnitude).toBe(2);
  });

  it('rejects invalid force edits and keeps the default values', () => {
    const out = mergeSiteContent({ forceRecords: [{ id: 'F1', magnitude: -1, angleDeg: Number.NaN }] });
    expect(out.forceRecords[0].magnitude).toBe(base.forceRecords[0].magnitude);
    expect(out.forceRecords[0].angleDeg).toBe(base.forceRecords[0].angleDeg);
  });

  it('edits angle and copy of one force record', () => {
    const out = mergeSiteContent({
      forceRecords: [{ id: 'F2', angleDeg: 12, title: { tr: 'Baslik', en: 'Heading' } }],
    });
    expect(out.forceRecords[1].angleDeg).toBe(12);
    expect(out.forceRecords[1].title).toEqual({ tr: 'Baslik', en: 'Heading' });
    expect(out.forceRecords[1].text).toEqual(base.forceRecords[1].text);
  });

  it('clamps the beam default load into 0..1', () => {
    expect(mergeSiteContent({ beam: { defaultLoad: 5 } }).beam.defaultLoad).toBe(1);
    expect(mergeSiteContent({ beam: { defaultLoad: 0.5 } }).beam.defaultLoad).toBe(0.5);
    expect(mergeSiteContent({ beam: {} }).beam.defaultLoad).toBe(base.beam.defaultLoad);
  });

  it('keeps applied and observed separate when only one is overridden', () => {
    const one = [{ name: { tr: 'a', en: 'a' }, note: { tr: 'b', en: 'b' } }];
    const out = mergeSiteContent({ applied: one });
    expect(out.applied).toBe(one);
    expect(out.observed).toBe(base.observed);
    expect(out.experience[0].applied).toBe(one);
    expect(out.experience[0].observed).toBe(base.observed);
  });

  it('re-derives record facts when the identity changes', () => {
    const out = mergeSiteContent({ identity: { firstName: 'Test' } });
    expect(out.ownerName).toBe(`Test ${base.identity.lastName}`);
    expect(out.forceRecords).toHaveLength(6);
    expect(out.forceRecords.map((r) => r.magnitude)).toEqual(base.forceRecords.map((r) => r.magnitude));
  });

  it('ignores a type-mismatched dictionary override but applies a matching string', () => {
    const bad = { dict: { nav: { profile: { tr: 5 } } } } as unknown as SiteContentOverride;
    expect(mergeSiteContent(bad).dict.nav.profile).toEqual(base.dict.nav.profile);
    const good = mergeSiteContent({ dict: { nav: { profile: { en: 'Edited' } } } });
    expect(good.dict.nav.profile.en).toBe('Edited');
    expect(good.dict.nav.profile.tr).toBe(base.dict.nav.profile.tr);
  });

  it('takes label edits for summary rows but keeps values from the records', () => {
    const rows = base.summaryRows.map((r) => ({ ...r, label: { tr: 'L', en: 'L' }, value: { tr: 'V', en: 'V' } }));
    const out = mergeSiteContent({ summaryRows: rows });
    expect(out.summaryRows.map((r) => r.label.en)).toEqual(rows.map(() => 'L'));
    expect(out.summaryRows.map((r) => r.value)).toEqual(base.summaryRows.map((r) => r.value));
    expect(mergeSiteContent({ summaryRows: rows.slice(1) }).summaryRows).toEqual(base.summaryRows);
  });

  it('re-derives contact aliases from the platforms', () => {
    const platforms = base.platforms.map((p) => (p.id === 'linkedin' ? { ...p, url: 'https://example.com/in' } : p));
    const out = mergeSiteContent({ platforms });
    expect(out.contact.linkedin).toBe('https://example.com/in');
    expect(out.contact.platforms).toBe(platforms);
  });

  it('takes the last revision, portrait and work view overrides', () => {
    const out = mergeSiteContent({
      lastRevision: '2030-01-01',
      portrait: null,
      workView: { showProjects: false, showNotes: true, featuredId: 'x' },
    });
    expect(out.lastRevision).toBe('2030-01-01');
    expect(out.portrait).toBeNull();
    expect(out.workView.featuredId).toBe('x');
  });
});
