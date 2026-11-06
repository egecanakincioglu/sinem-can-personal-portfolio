import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync } from 'node:fs';
import { DEV_ONLY_PATHS, LOCALES, PAGES } from './pages.ts';

const appDirs = (rel: string) =>
  readdirSync(new URL(`../../src/app/${rel}`, import.meta.url), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

test('every development-only route folder has a sample path', () => {
  assert.ok(DEV_ONLY_PATHS.some((p) => p.startsWith('/dev-model/')));
  assert.ok(DEV_ONLY_PATHS.some((p) => /^\/[a-z]{2}\/dev-preview$/.test(p)));
  const previews = appDirs('[locale]/dev-preview');
  assert.ok(previews.length > 0);
  for (const name of previews)
    assert.ok(
      DEV_ONLY_PATHS.some((p) => p.endsWith(`/dev-preview/${name}`)),
      `dev-preview/${name}`,
    );
  assert.ok(DEV_ONLY_PATHS.includes('/admin'));
  // Folders without a route of their own (route groups, shared UI) are not addresses.
  for (const dir of appDirs('admin').filter((d) => !d.startsWith('(') && d !== 'ui'))
    assert.ok(
      DEV_ONLY_PATHS.some((p) => p.startsWith(`/admin/${dir}`)),
      `admin/${dir}`,
    );
});

test('the dev-only list has no duplicates', () => {
  assert.equal(new Set(DEV_ONLY_PATHS).size, DEV_ONLY_PATHS.length);
});

const inLocale = (locale: string) => PAGES.filter((p) => p === `/${locale}` || p.startsWith(`/${locale}/`));

test('the audit list holds only locale-prefixed addresses without duplicates', () => {
  assert.equal(new Set(PAGES).size, PAGES.length);
  for (const p of PAGES)
    assert.ok(
      LOCALES.some((l) => inLocale(l).includes(p)),
      p,
    );
});

test('every locale lists the same number of pages', () => {
  const [first, ...rest] = LOCALES.map((l) => inLocale(l).length);
  for (const n of rest) assert.equal(n, first);
});
