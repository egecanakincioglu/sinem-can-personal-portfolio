import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { screens, sheetLabel, sheetNumber } from './screens';

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });

describe('sheet numbers', () => {
  it('number the screens 1..n in side panel order, work screens before the others', () => {
    expect(screens.map((s) => sheetNumber(s.slug))).toEqual(screens.map((_, i) => i + 1));
    const groups = screens.map((s) => s.group);
    expect(groups.lastIndexOf('work')).toBeLessThan(groups.indexOf('meta'));
    expect(sheetLabel('')).toBe('Pafta 01');
    expect(sheetLabel('kapsam')).toBe(`Pafta ${screens.length}`);
  });

  it('are never written by hand in a screen', () => {
    const offenders = sources(__dirname).filter((f) => /Pafta \d\d|kicker="Pafta/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
