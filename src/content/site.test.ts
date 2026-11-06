import { describe, expect, it } from 'vitest';
import * as site from './site';

describe('force records', () => {
  it('has exactly six records with ids F1 to F6, in order', () => {
    expect(site.forceRecords).toHaveLength(6);
    expect(site.forceRecords.map((r) => r.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
    expect(site.getForceRecords()).toBe(site.forceRecords);
  });

  it('gives each record localised copy and a positive magnitude', () => {
    for (const r of site.forceRecords) {
      expect(r.magnitude).toBeGreaterThan(0);
      for (const c of [r.short, r.period, r.title, r.text]) {
        expect(c.tr).toBeTruthy();
        expect(c.en).toBeTruthy();
      }
    }
  });

  it('rebuilds the same six records from the base records', () => {
    const rebuilt = site.buildForceRecords(site.baseRecords);
    expect(rebuilt.map((r) => r.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
    expect(rebuilt).toEqual(site.forceRecords);
  });
});

describe('applied and observed processes', () => {
  it('keeps the two lists separate with no shared entry', () => {
    const applied = site.applied.map((p) => p.name.en);
    const observed = site.observed.map((p) => p.name.en);
    expect(applied.length).toBeGreaterThan(0);
    expect(observed.length).toBeGreaterThan(0);
    expect(applied.filter((n) => observed.includes(n))).toEqual([]);
  });

  it('attaches both lists to the internship entry without merging them', () => {
    const e = site.getExperience()[0];
    expect(e.applied).toBe(site.applied);
    expect(e.observed).toBe(site.observed);
  });
});

describe('languages', () => {
  it('has no CEFR level in any language entry', () => {
    const cefr = /\b(A1|A2|B1|B2|C1|C2)\b/;
    for (const l of site.getLanguages()) {
      for (const c of [l.name, l.level, l.short]) {
        if (!c) continue;
        expect(c.tr).not.toMatch(cefr);
        expect(c.en).not.toMatch(cefr);
      }
    }
  });

  it('has no CEFR level anywhere in the summary rows', () => {
    expect(JSON.stringify(site.summaryRows)).not.toMatch(/\b(A1|A2|B1|B2|C1|C2)\b/);
  });

  it('leaves the level empty when it is not confirmed', () => {
    expect(site.languages.find((l) => l.id === 'tr')?.level).toBeNull();
  });
});

describe('accessors and derived values', () => {
  it('returns the same record sets the module exports', () => {
    expect(site.getEducation()).toBe(site.education);
    expect(site.getMemberships()).toBe(site.memberships);
    expect(site.getSkillGroups()).toBe(site.skillGroups);
    expect(site.getActivities()).toBe(site.activities);
  });

  it('derives the owner name and copyright year', () => {
    expect(site.ownerName).toBe(`${site.identity.firstName} ${site.identity.lastName}`);
    expect(site.copyrightYear).toBe(site.lastRevision.slice(0, 4));
  });

  it('builds tokens per language and fills static tokens in copy', () => {
    const tk = site.tokens('en');
    expect(tk.name).toBeTruthy();
    const filled = site.fillCopy({ tr: '{name}', en: '{name}' });
    expect(filled.en).not.toContain('{name}');
    expect(filled.tr).not.toContain('{name}');
  });

  it('shows a CV download only when a file exists', () => {
    expect(site.cvPdf).toBeNull();
  });

  it('fills the draft templates with record facts', () => {
    expect(Object.keys(site.fillDraft(site.baseRecords)).length).toBeGreaterThan(0);
  });

  it('has localised summary rows', () => {
    expect(site.summaryRows.length).toBeGreaterThan(0);
    for (const r of site.summaryRows) {
      expect(r.label.tr && r.label.en).toBeTruthy();
      expect(r.value.tr && r.value.en).toBeTruthy();
    }
  });
});
