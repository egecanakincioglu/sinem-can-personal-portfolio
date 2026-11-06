import { describe, expect, it } from 'vitest';
import { dict } from '@/content/dictionary';
import { describeInterfaceStrings, dictAt, lockedStrings, putAt } from './interface-strings';
import { interfaceStrings } from './preview-bridge';

const plain = describeInterfaceStrings();
const byPath = new Map(plain.map((d) => [d.path, d]));

function paths(v: unknown, p: string, out: string[]) {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.tr === 'string' && typeof o.en === 'string') out.push(p);
    else if (Array.isArray(v)) v.forEach((x, i) => paths(x, `${p}[${i}]`, out));
    else for (const [k, x] of Object.entries(o)) paths(x, p ? `${p}.${k}` : k, out);
  }
  return out;
}

describe('describeInterfaceStrings', () => {
  it('returns exactly one descriptor for every leaf of the dictionary', () => {
    const expected = paths(dict, '', []);
    expect(plain.map((d) => d.path)).toEqual(expected);
    expect(new Set(plain.map((d) => d.id)).size).toBe(plain.length);
    expect(byPath.get('hero.meta1')?.id).toBe('metinler.hero.meta1');
    expect(byPath.get('projects.legend[2]')?.group).toBe('projects');
  });

  it('keeps the runtime tokens a text needs', () => {
    expect(byPath.get('approach.readoutsAt')?.tokens).toEqual(['{a}']);
    expect(byPath.get('hero.resultantAlt')?.tokens).toEqual(['{deg}']);
    expect(byPath.get('approach.valueText')?.tokens).toEqual(['{a}', '{ra}', '{rb}']);
    expect(byPath.get('hero.whatIs')?.tokens).toEqual([]);
  });

  it('sets the limit from the longest default', () => {
    expect(byPath.get('skip')?.max).toBe(24);
    const long = dict.forces.caption;
    expect(byPath.get('forces.caption')?.max).toBe(Math.ceil(1.5 * Math.max(long.tr.length, long.en.length)));
  });

  it('treats a text made only of static tokens as derived', () => {
    for (const p of ['hero.programValue', 'hero.internshipValue', 'workshop.role', 'forces.resultText'])
      expect(byPath.get(p)?.kind, p).toBe('derived');
    expect(byPath.get('projects.of')?.kind).toBe('editable');
    expect(byPath.get('footer.sentence')?.kind).toBe('editable');
  });

  it('locks exactly the listed paths, each with a reason', () => {
    const locked = plain.filter((d) => d.kind === 'locked');
    expect(locked.map((d) => d.path).sort()).toEqual(Object.keys(lockedStrings).sort());
    for (const d of locked) expect(d.reason, d.path).toBeTruthy();
    expect(byPath.get('workshop.applied')?.kind).toBe('locked');
    expect(byPath.get('approach.figure')?.kind).toBe('locked');
  });

  it('finds the strings that several places share', () => {
    const aliases = plain.filter((d) => d.kind === 'alias');
    expect(aliases.length).toBeGreaterThan(0);
    const shared = (first: string) => aliases.filter((d) => d.aliasOf === first).map((d) => d.path);
    expect(shared('work.emptyProjects')).toEqual(['projects.emptyTitle']);
    expect(shared('work.emptyProjectsText')).toEqual(['projects.emptyText']);
    expect(shared('nav.profile')).toContain('notes.toProfile');
    for (const d of aliases) expect(byPath.get(d.aliasOf!)?.kind).toBe('editable');
  });

  it('gives a shared string to the screen that edits any of its places', () => {
    const rows = describeInterfaceStrings((p) => (p === 'hero.briefly' ? 'ana-sayfa' : undefined));
    const briefly = rows.find((d) => d.path === 'hero.briefly')!;
    expect(briefly.owner).toBe('ana-sayfa');
    expect(briefly.kind).toBe('editable');
    const followers = rows.filter((d) => d.aliasOf === 'hero.briefly');
    expect(followers.map((d) => d.path)).toEqual(['sections.profile', 'intro.heading']);
    for (const d of followers) {
      expect(d.owner).toBe('ana-sayfa');
      expect(d.kind).toBe('editable');
    }
  });

  it('never mixes locked or derived places with editable ones in a shared string', () => {
    const kinds = new Map<string, Set<string>>();
    for (const d of interfaceStrings()) {
      const root = d.aliasOf ?? d.path;
      kinds.set(root, (kinds.get(root) ?? new Set()).add(d.kind));
    }
    for (const [root, k] of kinds) expect(k.size, root).toBe(1);
  });

  it('takes the owners from the Homepage editor table', () => {
    const real = new Map(interfaceStrings().map((d) => [d.path, d]));
    expect(real.get('hero.isolation')?.owner).toBe('ana-sayfa');
    expect(real.get('projects.metaTitle')?.owner).toBe('ayarlar');
    expect(real.get('hero.meta1')?.owner).toBeUndefined();
    expect(real.get('projects.emptyTitle')).toMatchObject({ owner: 'ana-sayfa', aliasOf: 'work.emptyProjects' });
    expect(real.get('hero.graduation')?.owner).toBe('ana-sayfa');
    expect(real.get('profile.expected')?.owner).toBe('profil');
  });
});

describe('dictAt and putAt', () => {
  it('reads a deep path and an array element', () => {
    expect((dictAt(dict, 'projects.viewer.hint') as { en: string }).en).toBe(dict.projects.viewer.hint.en);
    expect((dictAt(dict, 'projects.legend[2]') as { tr: string }).tr).toBe(dict.projects.legend[2].tr);
    expect(Array.isArray(dictAt(dict, 'projects.legend'))).toBe(true);
    expect(dictAt(dict, 'nope.x')).toBeUndefined();
  });

  it('writes into containers shaped like the base, keeping array length', () => {
    const out: Record<string, unknown> = {};
    putAt(out, dict, 'projects.legend[1]', { tr: 'x' });
    putAt(out, dict, 'projects.viewer.hint', { en: 'y' });
    const projects = out.projects as { legend: unknown[]; viewer: { hint: unknown } };
    expect(projects.legend).toHaveLength(dict.projects.legend.length);
    expect(projects.legend[1]).toEqual({ tr: 'x' });
    expect(projects.viewer.hint).toEqual({ en: 'y' });
  });
});
