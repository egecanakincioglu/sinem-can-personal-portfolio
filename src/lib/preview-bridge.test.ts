import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSiteContent, mergeSiteContent } from '../content/site-content';
import {
  FORCE_IDS,
  PREVIEW_PROTOCOL,
  forwardEscapeToParent,
  isCloseMessage,
  SUMMARY_COUNT,
  beamLoadField,
  buildOverride,
  checkBeamLoad,
  checkCopy,
  checkEmail,
  checkForceNumber,
  checkHandle,
  checkPlatformUrl,
  checkPortraitNumber,
  contactFields,
  copyDefault,
  copyFields,
  forceEditable,
  forceFieldId,
  identityFields,
  interestsField,
  missingMark,
  parseBeamLoad,
  parseForceNumber,
  parseStateMessage,
  sanitizeProbe,
  sanitizeProjectIds,
  platformFieldId,
  portraitFields,
  portraitSlotFields,
  sanitizeOverride,
  sharedFieldIds,
  workViewFields,
  workshopField,
  type CopyField,
} from './preview-bridge';

const site = getSiteContent();

describe('buildOverride caching', () => {
  it('derives the override once per values object and again for a new one', () => {
    const values = { 'hero.briefly.tr': 'Bir' };
    expect(buildOverride(values)).toBe(buildOverride(values));
    const next = { ...values, 'hero.briefly.tr': 'İki' };
    expect(buildOverride(next)).not.toBe(buildOverride(values));
    expect(JSON.stringify(buildOverride(next))).toContain('İki');
    expect(JSON.stringify(buildOverride(values))).not.toContain('İki');
  });
});

describe('checkEmail', () => {
  it.each(['a@b.co', 'first.last+tag@sub.example.com', ' padded@example.org '])('accepts %s', (v) => {
    expect(checkEmail(v)).toBeUndefined();
  });
  it.each([undefined, '', '   ', 'no-at-sign', 'a@b', 'a@@b.com', 'a b@c.com', `${'x'.repeat(75)}@e.com`])(
    'rejects %s',
    (v) => {
      expect(checkEmail(v)).toBeDefined();
    },
  );
});

describe('checkPlatformUrl', () => {
  it('accepts the three platform hosts, with or without www', () => {
    expect(checkPlatformUrl('linkedin', 'https://www.linkedin.com/in/someone')).toBeUndefined();
    expect(checkPlatformUrl('instagram', 'https://instagram.com/someone')).toBeUndefined();
    expect(checkPlatformUrl('threads', 'https://www.threads.com/@someone')).toBeUndefined();
    expect(checkPlatformUrl('threads', 'https://threads.net/@someone')).toBeUndefined();
  });
  it('rejects a foreign host, another platform host and a look-alike host', () => {
    expect(checkPlatformUrl('linkedin', 'https://example.com/in/x')).toMatch(/linkedin\.com/);
    expect(checkPlatformUrl('instagram', 'https://linkedin.com/in/x')).toBeDefined();
    expect(checkPlatformUrl('linkedin', 'https://linkedin.com.evil.example/x')).toBeDefined();
  });
  it('rejects javascript:, plain http, credentials, junk, empty and over-long input', () => {
    expect(checkPlatformUrl('linkedin', 'javascript:alert(1)')).toBeDefined();
    expect(checkPlatformUrl('linkedin', 'http://linkedin.com/in/x')).toMatch(/https/);
    expect(checkPlatformUrl('linkedin', 'https://user:pw@linkedin.com/in/x')).toBeDefined();
    expect(checkPlatformUrl('linkedin', 'not a url')).toBeDefined();
    expect(checkPlatformUrl('linkedin', '')).toBeDefined();
    expect(checkPlatformUrl('linkedin', undefined)).toBeDefined();
    expect(checkPlatformUrl('linkedin', `https://linkedin.com/${'a'.repeat(200)}`)).toBe('En fazla 200 karakter.');
  });
});

describe('checkHandle', () => {
  it('accepts an @ handle and rejects the rest', () => {
    expect(checkHandle('@some.one_1')).toBeUndefined();
    expect(checkHandle('someone')).toBeDefined();
    expect(checkHandle('@')).toBeDefined();
    expect(checkHandle('@bad handle')).toBeDefined();
    expect(checkHandle('')).toBeDefined();
  });
});

describe('beam default load', () => {
  it.each(['0', '1', '0.35', '0,5', '1.00', ' 0.01 '])('accepts %s', (v) => {
    expect(checkBeamLoad(v)).toBeUndefined();
    expect(parseBeamLoad(v)).toBeDefined();
  });
  it('parses to the numeric value', () => {
    expect(parseBeamLoad('0,35')).toBe(0.35);
    expect(parseBeamLoad('1')).toBe(1);
    expect(parseBeamLoad('0')).toBe(0);
  });
  it.each(['1.01', '2', '-0.1', '−0.1', '0.123', '0,355', 'abc', 'NaN', 'Infinity', '1e0', ''])('rejects %s', (v) => {
    expect(checkBeamLoad(v)).toBeDefined();
    expect(parseBeamLoad(v)).toBeUndefined();
  });
  it('has the documented range and precision', () => {
    expect(beamLoadField).toMatchObject({ min: 0, max: 1, decimals: 2 });
    expect(parseBeamLoad(undefined)).toBeUndefined();
  });
  it('carries only a plain ISO date as the last revision', () => {
    expect(sanitizeOverride({ lastRevision: '2026-11-06' }).lastRevision).toBe('2026-11-06');
    expect(sanitizeOverride({ lastRevision: '6 Kasım' }).lastRevision).toBeUndefined();
    expect(sanitizeOverride({ lastRevision: 20261106 }).lastRevision).toBeUndefined();
  });

  it('only lets a value with at most two decimals into the sanitised override', () => {
    expect(sanitizeOverride({ beam: { defaultLoad: 0.35 } }).beam).toEqual({ defaultLoad: 0.35 });
    expect(sanitizeOverride({ beam: { defaultLoad: 0 } }).beam).toEqual({ defaultLoad: 0 });
    expect(sanitizeOverride({ beam: { defaultLoad: 1 } }).beam).toEqual({ defaultLoad: 1 });
    for (const bad of [1.01, -0.01, 0.123, NaN, Infinity, '0.5'])
      expect(sanitizeOverride({ beam: { defaultLoad: bad } }).beam).toBeUndefined();
  });
});

describe('force numbers', () => {
  it('parses strict decimals and rejects exponents, NaN and Infinity', () => {
    expect(parseForceNumber('0,45')).toBe(0.45);
    expect(parseForceNumber('-90')).toBe(-90);
    expect(parseForceNumber('1e3')).toBeUndefined();
    expect(parseForceNumber('NaN')).toBeUndefined();
    expect(parseForceNumber(undefined)).toBeUndefined();
  });
  it('checks the range per kind', () => {
    expect(checkForceNumber('magnitude', '1')).toBeUndefined();
    expect(checkForceNumber('magnitude', '0,05')).toMatch(/arasında/);
    expect(checkForceNumber('angle', '91')).toBeDefined();
    expect(checkForceNumber('angle', '-90')).toBeUndefined();
    expect(checkForceNumber('angle', '')).toBeDefined();
    expect(checkForceNumber('angle', 'abc')).toBeDefined();
  });
});

describe('influence records', () => {
  it('has exactly six fixed ids in order', () => {
    expect(FORCE_IDS).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
    expect(Object.keys(forceEditable)).toEqual([...FORCE_IDS]);
  });

  it('keeps ids and order fixed whatever the input order, ignoring unknown and repeated ids', () => {
    const fr = sanitizeOverride({
      forceRecords: [
        { id: 'F6', magnitude: 1 },
        { id: 'F7', magnitude: 1 },
        { id: 'F2', magnitude: 0.5 },
        { id: 'F2', magnitude: 1.5 },
        { id: 'F1', angleDeg: 10 },
      ],
    }).forceRecords;
    expect(fr?.map((r) => r.id)).toEqual(['F1', 'F2', 'F6']);
    expect(fr?.find((r) => r.id === 'F2')?.magnitude).toBe(0.5);
  });

  it('never yields more than six records and drops out-of-range numbers', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `F${i + 10}`, magnitude: 1 }));
    expect(sanitizeOverride({ forceRecords: many }).forceRecords).toBeUndefined();
    const all = FORCE_IDS.map((id) => ({ id, magnitude: 1 }));
    expect(sanitizeOverride({ forceRecords: [...all, ...all] }).forceRecords).toHaveLength(6);
    expect(
      sanitizeOverride({ forceRecords: [{ id: 'F1', magnitude: 99, angleDeg: -91 }] }).forceRecords,
    ).toBeUndefined();
  });

  it('accepts text only for editable records', () => {
    const fr = sanitizeOverride({
      forceRecords: [
        { id: 'F1', text: { tr: 'a', en: 'b' } },
        { id: 'F2', text: { tr: 'a', en: 'b' } },
      ],
    }).forceRecords;
    expect(fr?.map((r) => r.id)).toEqual(['F2']);
  });
});

describe('checkCopy', () => {
  const f: CopyField = { id: 'x', dest: 'draft', key: 'k', max: 10, words: 2, tokens: ['{a}'], optional: ['{b}'] };
  it('accepts empty and valid text', () => {
    expect(checkCopy(f, '   ')).toBeUndefined();
    expect(checkCopy(f, 'hi {a}')).toBeUndefined();
    expect(checkCopy(f, '{a} {b}')).toBeUndefined();
  });
  it('rejects length, word count, stray braces, unknown and missing tokens', () => {
    expect(checkCopy(f, 'x'.repeat(11))).toMatch(/En fazla 10/);
    expect(checkCopy(f, 'a b {a}')).toMatch(/sözcük/);
    expect(checkCopy(f, '{a} }')).toBeDefined();
    expect(checkCopy(f, '{a} {c}')).toMatch(/belirteci kullanılabilir/);
    expect(checkCopy(f, 'plain')).toMatch(/gerekli/);
    expect(checkCopy({ ...f, tokens: undefined, optional: undefined }, '{a}')).toMatch(/kullanılamaz/);
  });
});

describe('sanitising text', () => {
  const lead = copyFields.lead;
  const pick = (o: ReturnType<typeof sanitizeOverride>, key: string) =>
    (o.draft as Record<string, { tr?: string; en?: string }> | undefined)?.[key];

  it('keeps markup as inert plain text and strips control characters', () => {
    const o = sanitizeOverride({ draft: { [lead.key]: { tr: '<b>x</b>\u0000ok', en: 'fine' } } });
    expect(pick(o, lead.key)?.tr).toBe('<b>x</b> ok');
    expect(JSON.stringify(o)).not.toMatch(/[\u0000-\u0008]/);
  });

  it('shows the missing mark for an emptied language and drops an invalid one', () => {
    const o = sanitizeOverride({ draft: { [lead.key]: { tr: '', en: 'x'.repeat(lead.max + 1) } } });
    expect(pick(o, lead.key)?.tr).toBe(missingMark('tr'));
    expect(pick(o, lead.key)?.en).toBeUndefined();
  });

  it('ignores unknown keys, wrong types and non-objects', () => {
    expect(Object.keys(sanitizeOverride(null))).toEqual(['workView']);
    expect(Object.keys(sanitizeOverride('x'))).toEqual(['workView']);
    const o = sanitizeOverride({ evil: { a: 1 }, draft: { nope: { tr: 'x' } }, dict: 5 });
    expect(Object.keys(o)).toEqual(['workView']);
  });

  it('does not accept the locked workshop and figure labels', () => {
    const ids = Object.values(copyFields).map((f) => f.id);
    expect(ids).not.toContain('atolye.applied');
    expect(ids).not.toContain('atolye.observed');
    expect(ids).not.toContain('yaklasim.figure');
    const o = sanitizeOverride({
      dict: { workshop: { applied: { tr: 'X', en: 'X' } }, approach: { figure: { tr: 'Y', en: 'Y' } } },
    });
    expect(Object.keys(o)).toEqual(['workView']);
  });

  it('fills the fixed offset token with its canonical value', () => {
    const f = copyFields.beamTeaching;
    const o = sanitizeOverride({ draft: { [f.key]: { tr: 'Sapma {offset} kadar', en: 'Offset {offset}' } } });
    expect(pick(o, f.key)?.tr).not.toContain('{offset}');
    expect(pick(o, f.key)?.tr).toMatch(/\d/);
  });

  it('limits identity, interests and topics', () => {
    const o = sanitizeOverride({
      identity: { firstName: 'A'.repeat(100), lastName: 5 },
      interests: Array.from({ length: 12 }, (_, i) => ({ tr: `t${i}`, en: `e${i}` })).concat([{ tr: '', en: '' }]),
      academicInterests: [{ tr: 'only tr', en: '' }, 'junk'],
    });
    expect(o.identity).toEqual({ firstName: 'A'.repeat(identityFields.firstName.max) });
    expect(o.interests).toHaveLength(interestsField.count);
    expect(o.academicInterests).toEqual([{ tr: 'only tr', en: missingMark('en') }]);
  });

  it('validates workshop technique records', () => {
    const o = sanitizeOverride({
      workshopRecords: [
        { id: 'a1', kind: 'applied', name: { tr: 'Tornalama', en: '' }, note: { tr: 'n', en: 'n' } },
        { id: 'a1', kind: 'observed', name: { tr: 'dup', en: 'dup' }, note: {} },
        { id: 'BAD ID', kind: 'applied', name: { tr: 'x', en: 'x' } },
        { id: 'b2', kind: 'observed', name: { tr: 'Kaynak', en: 'Welding' }, note: {} },
        { id: 'c3', kind: 'other', name: { tr: 'x', en: 'x' } },
        { id: 'd4', kind: 'applied', name: { tr: '', en: '' } },
      ],
    });
    expect(o.applied).toHaveLength(1);
    expect(o.applied?.[0].name.en).toBe(missingMark('en'));
    expect(o.observed).toHaveLength(1);
    expect(o.observed?.[0].note.tr).toBe(missingMark('tr'));
  });

  it('re-validates the sanitised applied and observed lists on the other side', () => {
    const first = sanitizeOverride({
      workshopRecords: [{ id: 'a1', kind: 'applied', name: { tr: 'T', en: 'T' }, note: { tr: 'n', en: 'n' } }],
    });
    const second = sanitizeOverride({ applied: first.applied, observed: first.observed });
    expect(second.applied).toEqual(first.applied);
    expect(sanitizeOverride({ applied: [], observed: [] }).applied).toBeUndefined();
    expect(sanitizeOverride({ workshopRecords: 'x' }).applied).toBeUndefined();
  });

  it('limits work view to booleans and a safe featured id', () => {
    const base = site.workView;
    expect(sanitizeOverride({ workView: { showProjects: false, featuredId: 'a-b_1' } }).workView).toEqual({
      showProjects: false,
      showNotes: base.showNotes,
      featuredId: 'a-b_1',
    });
    expect(sanitizeOverride({ workView: { showProjects: 'no', featuredId: '../x' } }).workView).toEqual({
      showProjects: base.showProjects,
      showNotes: base.showNotes,
      featuredId: null,
    });
  });
});

describe('contact override', () => {
  it('applies a valid email and platform edits and keeps defaults for invalid ones', () => {
    const o = sanitizeOverride({
      contact: { email: 'new@example.com' },
      platforms: [
        { id: 'instagram', url: 'https://instagram.com/new', handle: '@new', showContact: false },
        { id: 'threads', url: 'javascript:alert(1)', handle: 'bad' },
        { id: 'linkedin', url: 'https://example.com/x', showContact: false },
      ],
    });
    expect(o.contact).toEqual({ email: 'new@example.com' });
    const byId = Object.fromEntries((o.platforms ?? []).map((p) => [p.id, p]));
    const base = Object.fromEntries(site.platforms.map((p) => [p.id, p]));
    expect(byId.instagram.url).toBe('https://instagram.com/new');
    expect(byId.instagram.show.contact).toBe(false);
    expect(byId.threads.url).toBe(base.threads.url);
    expect(byId.linkedin.url).toBe(base.linkedin.url);
    expect(byId.linkedin.show).toEqual(base.linkedin.show);
  });

  it('drops an invalid email and reports no change when nothing differs', () => {
    const o = sanitizeOverride({ contact: { email: 'nope' } });
    expect(o.contact).toBeUndefined();
    expect(o.platforms).toBeUndefined();
  });

  it('accepts the sanitised show shape on the way back', () => {
    const first = sanitizeOverride({ platforms: [{ id: 'instagram', showFooter: false }] });
    const second = sanitizeOverride({ platforms: first.platforms });
    expect(second.platforms).toEqual(first.platforms);
  });
});

describe('portrait', () => {
  it('checks numbers against their ranges', () => {
    expect(checkPortraitNumber('focalX', '50')).toBeUndefined();
    expect(checkPortraitNumber('zoom', '1,4')).toBeUndefined();
    expect(checkPortraitNumber('zoom', '3')).toMatch(/arasında/);
    expect(checkPortraitNumber('focalY', 'x')).toBeDefined();
    expect(checkPortraitNumber('focalY', '')).toBeDefined();
  });
  it('only reports a portrait when something changed, within range', () => {
    const base = site.portrait;
    expect(base).toBeDefined();
    if (!base) return;
    expect(sanitizeOverride({ portrait: { focalX: base.focalX } }).portrait).toBeUndefined();
    const o = sanitizeOverride({ portrait: { focalX: 10, focalY: 500, zoom: 2, alt: { tr: 'yeni', en: 'new' } } });
    expect(o.portrait?.focalX).toBe(10);
    expect(o.portrait?.focalY).toBe(base.focalY);
    expect(o.portrait?.zoom).toBe(2);
    expect(o.portrait?.alt).toEqual({ tr: 'yeni', en: 'new' });
  });
  it('turns the portrait off only with the show switch, never with the consent box', () => {
    expect(buildOverride({ [portraitSlotFields.show]: '0' }).portrait).toBeNull();
    expect(mergeSiteContent(buildOverride({ [portraitSlotFields.show]: '0' })).portrait).toBeNull();
    expect(buildOverride({ [portraitSlotFields.show]: '1' }).portrait).toBeUndefined();
    expect(buildOverride({ [portraitSlotFields.consent]: '0' }).portrait).toBeUndefined();
    expect(buildOverride({}).portrait).toBeUndefined();
    expect(sanitizeOverride({ portrait: null }).portrait).toBeNull();
    expect(sanitizeOverride({ portrait: 'x' }).portrait).toBeUndefined();
  });
});

describe('copyDefault', () => {
  it('returns the published text of a registered field', () => {
    const d = copyDefault(copyFields.isolation);
    expect(d.tr).toBeTruthy();
    expect(d.en).toBeTruthy();
    expect(copyDefault(copyFields.lead).tr).toBe(site.draft.heroLead.tr);
  });
});

describe('profile records through the override', () => {
  it('accepts the editor shape and drops a list with an invalid entry', () => {
    const good = [
      { id: 'tr1', name: { tr: 'Türkçe', en: 'Turkish' }, level: { tr: '', en: '' }, short: { tr: '', en: '' } },
    ];
    const o = sanitizeOverride({ profileRecords: { languages: good } });
    expect(o.languages?.map((l) => l.id)).toEqual(['tr1']);
    const bad = sanitizeOverride({ profileRecords: { languages: [{ id: 'BAD ID', name: { tr: 'x', en: 'x' } }] } });
    expect(bad.languages).toBeUndefined();
  });
  it('accepts the typed arrays on the iframe side', () => {
    const o = sanitizeOverride({ languages: site.languages });
    expect(o.languages?.map((l) => l.id)).toEqual(site.languages.map((l) => l.id));
  });
});

describe('buildOverride', () => {
  it('produces a minimal override from untouched editor values', () => {
    const o = buildOverride({});
    expect(o.beam).toBeUndefined();
    expect(o.contact).toBeUndefined();
  });

  it('carries valid values and skips invalid ones', () => {
    const o = buildOverride({
      [beamLoadField.id]: '0,6',
      [contactFields.email]: 'me@example.com',
      [platformFieldId('instagram', 'url')]: 'https://instagram.com/me',
      [platformFieldId('instagram', 'showFooter')]: '0',
      [forceFieldId('F2', 'magnitude')]: '1,5',
      [forceFieldId('F2', 'angle')]: '500',
      [`${copyFields.lead.id}.tr`]: 'Merhaba',
      [`${copyFields.lead.id}.en`]: 'Hello',
      [identityFields.firstName.id]: 'Ada',
      [interestsField.id]: JSON.stringify([{ tr: 'a', en: 'b' }]),
      [workViewFields.showNotes]: '0',
      [workViewFields.featured]: 'some-id',
      [workshopField.id]: JSON.stringify([{ id: 'w1', kind: 'applied', name: { tr: 'a', en: 'b' }, note: {} }]),
      [portraitFields.focalX.id]: '12,5',
      [portraitFields.focalY.id]: '',
      [portraitFields.zoom.id]: '9',
      'kisaca.row.0.label.tr': 'Etiket',
    });
    expect(o.beam).toEqual({ defaultLoad: 0.6 });
    expect(o.contact).toEqual({ email: 'me@example.com' });
    expect(o.platforms?.find((p) => p.id === 'instagram')?.show.footer).toBe(false);
    const f2 = o.forceRecords?.find((r) => r.id === 'F2');
    expect(f2?.magnitude).toBe(1.5);
    expect(f2?.angleDeg).toBeUndefined();
    expect((o.draft as Record<string, unknown>).heroLead).toEqual({ tr: 'Merhaba', en: 'Hello' });
    expect(o.identity).toEqual({ firstName: 'Ada' });
    expect(o.interests).toEqual([{ tr: 'a', en: 'b' }]);
    expect(o.workView).toMatchObject({ showNotes: false, featuredId: 'some-id' });
    expect(o.applied).toHaveLength(1);
    expect(o.portrait?.focalX).toBe(12.5);
    expect(o.portrait?.zoom).toBe(site.portrait?.zoom);
    expect(o.summaryRows).toHaveLength(SUMMARY_COUNT);
  });

  it('ignores malformed JSON in list fields', () => {
    const o = buildOverride({ [interestsField.id]: '{not json', [workshopField.id]: '[' });
    expect(o.interests).toBeUndefined();
    expect(o.applied).toBeUndefined();
  });
});

describe('parseStateMessage', () => {
  it('accepts a well-formed message and re-sanitises the override', () => {
    const m = parseStateMessage({
      type: 'state',
      v: PREVIEW_PROTOCOL,
      lang: 'en',
      override: { beam: { defaultLoad: 0.5 }, junk: true },
    });
    expect(m?.lang).toBe('en');
    expect(m?.override.beam).toEqual({ defaultLoad: 0.5 });
    expect(m?.override).not.toHaveProperty('junk');
  });
  it.each([
    null,
    'x',
    42,
    {},
    { type: 'ready', v: 1, lang: 'tr' },
    { type: 'state', v: 2, lang: 'tr' },
    { type: 'state', v: 1, lang: 'de' },
  ])('rejects %j', (d) => {
    expect(parseStateMessage(d)).toBeNull();
  });
});

describe('interface strings through the override', () => {
  const merged = (values: Record<string, string>) => mergeSiteContent(buildOverride(values)).dict;

  it('keeps a deep key and an array element through the sanitiser', () => {
    const d = mergeSiteContent(
      sanitizeOverride({
        dict: {
          projects: {
            viewer: { hint: { tr: 'Yeni ipucu', en: 'New hint' } },
            legend: [undefined, undefined, { tr: 'Üçüncü', en: 'Third' }, undefined],
          },
        },
      }),
    ).dict;
    expect(d.projects.viewer.hint).toMatchObject({ tr: 'Yeni ipucu', en: 'New hint' });
    expect(d.projects.legend[2].en).toBe('Third');
    expect(d.projects.legend[0].en).toBe(site.dict.projects.legend[0].en);
  });

  it('drops a text that loses a required token and ignores an unknown path', () => {
    const out = sanitizeOverride({
      dict: {
        approach: { readoutsAt: { tr: 'Okuma değerleri', en: 'Readouts, a = {a} L' }, unknown: { tr: 'x', en: 'y' } },
        nothing: { here: { tr: 'x', en: 'y' } },
      },
    });
    const approach = out.dict?.approach as Record<string, unknown> | undefined;
    expect(approach?.readoutsAt).toEqual({ en: 'Readouts, a = {a} L' });
    expect(approach).not.toHaveProperty('unknown');
    expect(out.dict).not.toHaveProperty('nothing');
  });

  it('does not override locked or derived rows', () => {
    const d = merged({
      'metinler.workshop.applied.en': 'I did it all',
      'metinler.hero.programValue.en': 'Free text',
    });
    expect(d.workshop.applied.en).toBe(site.dict.workshop.applied.en);
    expect(d.hero.programValue.en).toBe(site.dict.hero.programValue.en);
  });

  it('builds a deep edit from the editor values', () => {
    const d = merged({ 'metinler.projects.viewer.hint.en': 'Edited hint', 'metinler.projects.legend[1].tr': 'Tür' });
    expect(d.projects.viewer.hint.en).toBe('Edited hint');
    expect(d.projects.legend[1].tr).toBe('Tür');
    expect(d.projects.legend[1].en).toBe(site.dict.projects.legend[1].en);
  });

  it('applies one control to every place of a shared string nobody else edits', () => {
    const d = merged({ 'metinler.notes.minRead.en': '{n} minutes' });
    expect(d.notes.minRead.en).toBe('{n} minutes');
  });

  it('carries an edit made on Ana sayfa to every place of the shared string', () => {
    const d = merged({ 'calismalar.emptyProjects.en': 'Nothing yet.', 'hero.briefly.en': 'Quick facts' });
    expect(d.work.emptyProjects.en).toBe('Nothing yet.');
    expect(d.projects.emptyTitle.en).toBe('Nothing yet.');
    expect(d.projects.emptyTitle.tr).toBe(site.dict.projects.emptyTitle.tr);
    for (const [g, k] of [
      ['hero', 'briefly'],
      ['sections', 'profile'],
      ['intro', 'heading'],
    ] as const)
      expect((d[g] as Record<string, { en: string }>)[k].en, `${g}.${k}`).toBe('Quick facts');
  });

  it('binds the editor fields of a shared string to one value, canonical id first', () => {
    expect(sharedFieldIds('profil.expected.en')).toEqual(['hero.graduation.en', 'profil.expected.en']);
    expect(sharedFieldIds('hero.graduation.tr')).toEqual(['hero.graduation.tr', 'profil.expected.tr']);
    const inBrief = sharedFieldIds('hero.briefly.en');
    expect(inBrief).toHaveLength(3);
    expect(inBrief).toEqual(
      expect.arrayContaining(['hero.briefly.en', 'kisaca.heading.en', 'ustbilgi.sec.profile.en']),
    );
    expect(sharedFieldIds('hero.whatIs.en')).toEqual(['hero.whatIs.en']);
    expect(sharedFieldIds('hero.lead.en')).toEqual(['hero.lead.en']);
    expect(sharedFieldIds('not a field')).toEqual(['not a field']);
  });

  it('leaves a key edited on another screen to that screen', () => {
    const d = merged({ 'metinler.hero.whatIs.en': 'Ignored here', 'hero.whatIs.en': 'Edited there' });
    expect(d.hero.whatIs.en).toBe('Edited there');
  });
});

describe('project ids on the bridge', () => {
  const msg = (projects: unknown) => ({ type: 'state', v: PREVIEW_PROTOCOL, lang: 'tr', override: {}, projects });

  it('keeps well-formed unique ids and drops everything else', () => {
    const ids = ['fixture-a', 'fixture-a', 'a_b-9', '', 'x'.repeat(81), 'has space', '../etc', 7, null, { id: 'z' }];
    expect(sanitizeProjectIds(ids)).toEqual(['fixture-a', 'a_b-9']);
  });
  it('caps the list at 50 ids', () => {
    const many = Array.from({ length: 80 }, (_, i) => `p-${i}`);
    expect(sanitizeProjectIds(many)).toHaveLength(50);
  });
  it('is undefined when the value is not a list', () => {
    expect(sanitizeProjectIds('fixture-a')).toBeUndefined();
    expect(sanitizeProjectIds(undefined)).toBeUndefined();
    expect(sanitizeProjectIds({ 0: 'a' })).toBeUndefined();
  });
  it('is carried by a state message, an empty list included', () => {
    expect(parseStateMessage(msg(['fixture-a']))?.projects).toEqual(['fixture-a']);
    expect(parseStateMessage(msg([]))?.projects).toEqual([]);
  });
  it('is absent from the parsed message when the sender left it out or sent a non-list', () => {
    expect(parseStateMessage({ type: 'state', v: PREVIEW_PROTOCOL, lang: 'tr', override: {} })).not.toHaveProperty(
      'projects',
    );
    expect(parseStateMessage(msg({ id: 'x' }))).not.toHaveProperty('projects');
  });
});

describe('model probe on the bridge', () => {
  const msg = (probe: unknown) => ({ type: 'state', v: PREVIEW_PROTOCOL, lang: 'tr', override: {}, probe });

  it('keeps a record id, a known library id and the approval flag', () => {
    expect(sanitizeProbe({ id: 'fixture-a', glb: 'dev-flange', approved: true })).toEqual({
      id: 'fixture-a',
      glb: 'dev-flange',
      approved: true,
    });
  });
  it('turns an unknown or non-string model id into no model, and anything but true into not approved', () => {
    expect(sanitizeProbe({ id: 'p', glb: '/dev-model/flange.glb', approved: 'yes' })).toEqual({
      id: 'p',
      glb: null,
      approved: false,
    });
    expect(sanitizeProbe({ id: 'p', glb: 5 })?.glb).toBeNull();
  });
  it('drops extra keys, so no address or record can cross', () => {
    const p = sanitizeProbe({ id: 'p', glb: null, approved: true, url: 'https://x.test/a.glb', record: {} });
    expect(Object.keys(p ?? {}).sort()).toEqual(['approved', 'glb', 'id']);
  });
  it.each([undefined, null, 'p', 7, [], { id: '../x' }, { id: '' }, { id: 5 }])('is undefined for %j', (v) => {
    expect(sanitizeProbe(v)).toBeUndefined();
  });
  it('is carried by a state message and absent otherwise', () => {
    expect(parseStateMessage(msg({ id: 'p', glb: 'size-18', approved: true }))?.probe).toEqual({
      id: 'p',
      glb: 'size-18',
      approved: true,
    });
    expect(parseStateMessage(msg('p'))).not.toHaveProperty('probe');
  });
});

describe('close message', () => {
  const realParent = window.parent;
  afterEach(() => {
    Object.defineProperty(window, 'parent', { value: realParent, configurable: true });
    vi.restoreAllMocks();
  });

  it('accepts only the exact shape', () => {
    expect(isCloseMessage({ type: 'close', v: PREVIEW_PROTOCOL })).toBe(true);
    expect(isCloseMessage({ type: 'close', v: 99 })).toBe(false);
    expect(isCloseMessage({ type: 'ready', v: PREVIEW_PROTOCOL })).toBe(false);
    expect(isCloseMessage(null)).toBe(false);
    expect(isCloseMessage('close')).toBe(false);
  });

  it('posts to the parent on Escape only, with the exact origin, and stops after cleanup', () => {
    const parent = { postMessage: vi.fn() };
    Object.defineProperty(window, 'parent', { value: parent, configurable: true });
    const stop = forwardEscapeToParent();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(parent.postMessage).not.toHaveBeenCalled();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'close', v: PREVIEW_PROTOCOL }, window.location.origin);
    stop();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(parent.postMessage).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the page is not embedded', () => {
    const spy = vi.spyOn(window, 'postMessage');
    const stop = forwardEscapeToParent();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    stop();
    expect(spy).not.toHaveBeenCalled();
  });
});
