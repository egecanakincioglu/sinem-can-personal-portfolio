import { describe, expect, it } from 'vitest';
import { dict, resolveDict } from './dictionary';

type Leaf = { path: string; value: Record<string, unknown> };

/** Every object that looks like a localised string (has tr or en) plus malformed ones. */
function collect(v: unknown, path: string, out: Leaf[]) {
  if (Array.isArray(v)) v.forEach((x, i) => collect(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('tr' in o || 'en' in o) out.push({ path, value: o });
    else for (const [k, x] of Object.entries(o)) collect(x, `${path}.${k}`, out);
  }
}

describe('dictionary', () => {
  const leaves: Leaf[] = [];
  collect(dict, 'dict', leaves);

  it('has localised strings', () => {
    expect(leaves.length).toBeGreaterThan(100);
  });

  it('gives every key both a tr and an en string', () => {
    const broken = leaves.filter(
      ({ value }) => typeof value.tr !== 'string' || typeof value.en !== 'string' || !value.tr || !value.en,
    );
    expect(broken.map((b) => b.path)).toEqual([]);
  });

  it('leaves no static token unresolved', () => {
    const tokens = ['{name}', '{program}', '{university}', '{grad}', '{year}', '{count}'];
    const text = JSON.stringify(dict);
    for (const t of tokens) expect(text).not.toContain(t);
  });

  it('resolves tokens in both languages through resolveDict', () => {
    const out = resolveDict({ tr: { name: 'TR-NAME' }, en: { name: 'EN-NAME' } });
    expect(out).toHaveProperty('nav');
  });

  it('has labels for every note language status in both languages', () => {
    for (const k of ['langBoth', 'langOnlyTr', 'langOnlyEn'] as const) {
      expect(dict.notes[k].tr).toBeTruthy();
      expect(dict.notes[k].en).toBeTruthy();
    }
  });
});
