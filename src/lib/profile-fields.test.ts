import { describe, expect, it } from 'vitest';
import { getSiteContent } from '../content/site-content';
import {
  blank,
  blankItem,
  checkAct,
  checkEdu,
  checkExp,
  checkGroup,
  checkLang,
  checkMem,
  isCore,
  listErr,
  newId,
  parseActivities,
  parseEducation,
  parseExperience,
  parseLanguages,
  parseMemberships,
  parseSkills,
  profileLimits,
  recsOf,
} from './profile-fields';

const site = getSiteContent();

describe('profile record round trips', () => {
  it.each([
    ['education', parseEducation, () => recsOf.education(site.education)],
    ['experience', parseExperience, () => recsOf.experience(site.experience)],
    ['memberships', parseMemberships, () => recsOf.memberships(site.memberships)],
    ['skills', parseSkills, () => recsOf.skills(site.skillGroups)],
    ['languages', parseLanguages, () => recsOf.languages(site.languages)],
    ['activities', parseActivities, () => recsOf.activities(site.activities)],
  ] as const)('%s: the published records survive records -> parse unchanged', (_n, parse, recs) => {
    const parsed = parse(recs());
    expect(parsed?.ok).toBe(true);
    // the record shape carries only the editable fields; the technique lists are merged elsewhere
    const published = {
      education: site.education,
      experience: site.experience,
      memberships: site.memberships,
      skills: site.skillGroups,
      languages: site.languages,
      activities: site.activities,
    }[_n] as unknown[];
    const out = (parsed?.out ?? []) as Record<string, unknown>[];
    expect(published).toMatchObject(
      _n === 'experience' ? out.map(({ applied, observed, ...rest }) => (void applied, void observed, rest)) : out,
    );
  });

  it('rejects anything that is not an array', () => {
    expect(parseLanguages('x')).toBeUndefined();
    expect(parseLanguages(null)).toBeUndefined();
  });

  it('requires at least one record and rejects duplicate ids', () => {
    expect(parseLanguages([])?.ok).toBe(false);
    const one = recsOf.languages(site.languages)[0];
    expect(parseLanguages([one, one])?.list).toBe('Kimlik tekrarı.');
  });

  it('caps a list at its limit', () => {
    const l = recsOf.languages(site.languages)[0];
    const many = Array.from({ length: profileLimits.languages.count + 3 }, (_, i) => ({ ...l, id: `l${i}` }));
    expect(parseLanguages(many)?.recs).toHaveLength(profileLimits.languages.count);
  });

  it('fills a visible missing mark for an emptied language and never keeps control characters', () => {
    const l = recsOf.languages(site.languages)[0];
    const parsed = parseLanguages([{ ...l, name: { tr: 'Türkçe\u0007', en: '' } }]);
    expect(parsed?.ok).toBe(true);
    expect(parsed?.out[0].name).toEqual({ tr: 'Türkçe', en: '[EN eksik]' });
  });

  it('treats text as plain text: markup is kept as characters, not interpreted', () => {
    const l = recsOf.languages(site.languages)[0];
    const parsed = parseLanguages([{ ...l, name: { tr: '<img src=x onerror=1>', en: 'b' } }]);
    expect(parsed?.out[0].name.tr).toBe('<img src=x onerror=1>');
  });
});

describe('profile validation', () => {
  it('flags an invalid id, over-long text and a reversed period', () => {
    const [edu] = recsOf.education(site.education);
    expect(checkEdu({ ...edu, id: 'BAD ID' }).id).toBeDefined();
    expect(checkEdu({ ...edu, institution: { tr: 'x'.repeat(200), en: 'y' } })['institution.tr']).toMatch(/En fazla/);
    expect(checkEdu({ ...edu, id: 'abc', precision: 'year', start: '2024', end: '2020' }).end).toMatch(/önce/);
    expect(checkEdu({ ...edu, id: 'abc', precision: 'year', start: 'abcd', end: '' }).start).toBeDefined();
  });

  it('requires an expected-looking score range', () => {
    const [edu] = recsOf.education(site.education);
    expect(checkEdu({ ...edu, score: '150' }).score).toBeDefined();
    expect(checkEdu({ ...edu, score: '3,5' }).score).toBeUndefined();
  });

  it('checks experience, memberships, groups, languages and activities', () => {
    const [exp] = recsOf.experience(site.experience);
    expect(checkExp({ ...exp, month: '2024-13' }).month).toBeDefined();
    const [mem] = recsOf.memberships(site.memberships);
    expect(checkMem({ ...mem, id: '' }).id).toBeDefined();
    const [grp] = recsOf.skills(site.skillGroups);
    expect(checkGroup({ ...grp, items: [] })).not.toEqual({});
    expect(checkLang({ ...blank.language(), id: 'ok' })['name.tr']).toBeDefined();
    expect(checkAct({ ...blank.activity(), id: 'ok' })['name.tr']).toBeDefined();
    expect(
      checkAct({ ...blank.activity(), id: 'ok', name: { tr: 'a', en: 'b' }, start: '2020', end: '2019' }).end,
    ).toBeDefined();
  });

  it('keeps core records undeletable and the list rule consistent', () => {
    expect(isCore('education', 'dogus')).toBe(true);
    expect(isCore('education', 'other')).toBe(false);
    expect(listErr('education', ['dogus', 'other'])).toBeDefined();
    expect(listErr('education', ['dogus', 'imkb'])).toBeUndefined();
  });
});

describe('blank records', () => {
  it('create empty records with a fresh id', () => {
    expect(newId()).toMatch(/^n[0-9a-z]+$/);
    expect(blank.education().institution).toEqual({ tr: '', en: '' });
    expect(blank.membership().abbr).toBe('');
    expect(blank.group().items).toHaveLength(1);
    expect(blank.language().short).toEqual({ tr: '', en: '' });
    expect(blank.activity().start).toBe('');
    expect(blankItem().summary).toBe('');
  });
});
