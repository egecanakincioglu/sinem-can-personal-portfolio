import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

// Tooling runs on bare Node type stripping, which cannot resolve the app's "@/" alias or extensionless imports.
// A tooling file may import src/ only when it is listed here on purpose.
const ALLOWED = new Set(['tooling/scripts/check-build-output.ts']);
const root = join(import.meta.dirname, '..', '..');

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}

function srcImports(source: string): string[] {
  const specifiers = [...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return specifiers.filter((s) => s.startsWith('@/') || /^(\.\.\/)+src\//.test(s));
}

test('srcImports flags the alias and relative paths into src', () => {
  assert.deepEqual(srcImports("import a from '../../src/x.ts';\nimport b from '@/lib/y';\nimport c from './z.ts';"), [
    '../../src/x.ts',
    '@/lib/y',
  ]);
});

test('tooling files do not import from src unless allowlisted', () => {
  const offenders = files(join(root, 'tooling'))
    .map((f) => relative(root, f).replaceAll('\\', '/'))
    .filter((f) => f !== 'tooling/scripts/no-src-imports.test.ts' && !ALLOWED.has(f))
    .filter((f) => srcImports(readFileSync(join(root, f), 'utf8')).length > 0);
  assert.deepEqual(offenders, []);
});
