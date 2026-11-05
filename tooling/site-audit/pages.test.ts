import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCALES, PAGES } from './pages.ts';

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
