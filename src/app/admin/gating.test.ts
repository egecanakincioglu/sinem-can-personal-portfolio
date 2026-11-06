import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../../next.config.ts';

// Route files in a development-only folder carry the .dev extension, which only the development server
// compiles. As a second layer, each one also refuses other environments on the server.
const appDir = path.resolve(import.meta.dirname, '..');
const SPECIAL = /^(page|layout|route|default|not-found|loading|error|template)\.(dev\.)?(tsx|ts)$/;
const DEV_ONLY_SEGMENT = /^(admin|dev-.+)$/;
const GATE = /assertDevOnly\(\)|NODE_ENV\s*!==\s*['"]development['"]/;

function entries(dir: string, devOnly: boolean): string[] {
  const found: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) found.push(...entries(full, devOnly || DEV_ONLY_SEGMENT.test(e.name)));
    else if (devOnly && SPECIAL.test(e.name)) found.push(full);
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

  it.each(files.map(rel))('%s has the .dev extension', (name) => {
    expect(name).toMatch(/\.dev\.(tsx|ts)$/);
  });

  it.each(files.map(rel))('%s refuses outside development', (name) => {
    expect(readFileSync(path.join(appDir, name), 'utf8')).toMatch(GATE);
  });
});

describe('page extensions', () => {
  it('drop the dev extensions outside the development server', () => {
    for (const phase of ['phase-production-build', 'phase-production-server']) {
      const ext = nextConfig(phase).pageExtensions ?? [];
      expect(ext).toEqual(['tsx', 'ts']);
      expect(ext.some((e) => e.startsWith('dev.'))).toBe(false);
    }
  });

  it('include the dev extensions in the development server', () => {
    const ext = nextConfig('phase-development-server').pageExtensions ?? [];
    expect(ext).toContain('dev.tsx');
    expect(ext).toContain('dev.ts');
  });
});
