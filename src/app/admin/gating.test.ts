import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Every page, layout and route handler in a development-only folder must refuse other environments
// on the server. A new file that forgets the gate fails here.
const appDir = path.resolve(import.meta.dirname, '..');
const ENTRY = /^(page\.tsx|layout\.tsx|route\.ts)$/;
const DEV_ONLY_SEGMENT = /^(admin|dev-.+)$/;
const GATE = /assertDevOnly\(\)|NODE_ENV\s*!==\s*['"]development['"]/;

function entries(dir: string, devOnly: boolean): string[] {
  const found: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) found.push(...entries(full, devOnly || DEV_ONLY_SEGMENT.test(e.name)));
    else if (devOnly && ENTRY.test(e.name)) found.push(full);
  }
  return found;
}

const files = entries(appDir, false);
const rel = (f: string) => path.relative(appDir, f).split(path.sep).join('/');

describe('development-only entry points', () => {
  it('finds the admin, dev-preview and dev-model folders', () => {
    const names = files.map(rel);
    expect(names.some((n) => n.startsWith('admin/'))).toBe(true);
    expect(names.some((n) => n.includes('dev-preview/'))).toBe(true);
    expect(names.some((n) => n.startsWith('dev-model/'))).toBe(true);
  });

  it.each(files.map(rel))('%s refuses outside development', (name) => {
    expect(readFileSync(path.join(appDir, name), 'utf8')).toMatch(GATE);
  });
});
