import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  VIEWPORTS,
  h1Problem,
  inputFontProblems,
  paletteProblems,
  renderReport,
  screenRoutes,
  seriousAxeProblems,
  touchTargetProblems,
} from './checks.ts';

test('screenRoutes maps the overview to /admin and adds the sign-in page', () => {
  assert.deepEqual(screenRoutes(['', 'profil']), ['/admin/giris', '/admin', '/admin/profil']);
});

test('the sweep covers the six widths and both tablet orientations', () => {
  const sizes = VIEWPORTS.map((v) => `${v.width}x${v.height}`);
  for (const w of [360, 390, 768, 1024, 1440, 1920])
    assert.ok(
      sizes.some((s) => s.startsWith(`${w}x`)),
      String(w),
    );
  assert.ok(sizes.includes('768x1024'));
  assert.ok(sizes.includes('1024x768'));
});

test('h1Problem accepts exactly one heading', () => {
  assert.equal(h1Problem(1), null);
  assert.match(h1Problem(0)!, /0 h1/);
  assert.match(h1Problem(2)!, /2 h1/);
});

test('touch targets are checked only below 768 px', () => {
  const boxes = [
    { label: 'save', height: 44 },
    { label: 'reset', height: 30 },
  ];
  assert.deepEqual(touchTargetProblems(390, boxes), ['reset is 30 px tall']);
  assert.deepEqual(touchTargetProblems(768, boxes), []);
});

test('input font size must be at least 16 px', () => {
  assert.deepEqual(inputFontProblems([{ label: 'a', fontSize: 16 }]), []);
  assert.deepEqual(inputFontProblems([{ label: 'b', fontSize: 14 }]), ['b has font size 14 px']);
});

test('only serious and critical axe violations count', () => {
  const nodes = [{ target: ['#a', '.b'] }];
  const found = seriousAxeProblems([
    { id: 'minor-one', impact: 'minor', nodes },
    { id: 'moderate-one', impact: 'moderate', nodes },
    { id: 'serious-one', impact: 'serious', nodes },
    { id: 'critical-one', impact: 'critical', nodes },
    { id: 'no-impact', impact: null, nodes },
  ]);
  assert.deepEqual(found, ['serious-one (serious): #a .b', 'critical-one (critical): #a .b']);
});

test('paletteProblems reports each failed step', () => {
  assert.deepEqual(paletteProblems({ openAfterShortcut: true, openAfterEscape: false, focusReturned: true }), []);
  assert.equal(paletteProblems({ openAfterShortcut: false, openAfterEscape: false, focusReturned: false }).length, 1);
  assert.equal(paletteProblems({ openAfterShortcut: true, openAfterEscape: true, focusReturned: false }).length, 2);
});

test('renderReport lists findings as a table and escapes pipes', () => {
  assert.match(renderReport([], 2, 8), /No findings/);
  const out = renderReport([{ route: '/admin', viewport: '360x800', check: 'overflow', detail: 'a|b' }], 2, 8);
  assert.match(out, /\| \/admin \| 360x800 \| overflow \| a\\\|b \|/);
});
