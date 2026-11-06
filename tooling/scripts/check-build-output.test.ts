// Tests for check-build-output.ts against temporary .next/static trees.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fixtureMarkers, main, PANEL_MARKERS, SAMPLE_LABEL } from './check-build-output.ts';

const root = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'build-output-'));
let counter = 0;
after(() => rmSync(root, { recursive: true, force: true }));

function run(files: Record<string, string> | null, markers?: string[]): number {
  const dir = path.join(root, String(counter++));
  mkdirSync(dir);
  if (files) {
    for (const [name, body] of Object.entries(files)) {
      const target = path.join(dir, '.next', 'static', name);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, body);
    }
  }
  const err = process.stderr.write;
  const out = process.stdout.write;
  process.stderr.write = () => true;
  process.stdout.write = () => true;
  try {
    return main(dir, markers);
  } finally {
    process.stderr.write = err;
    process.stdout.write = out;
  }
}

describe('check-build-output', () => {
  test('the marker list holds the sample label and fixture titles and ids', () => {
    const markers = fixtureMarkers();
    assert.ok(markers.includes(SAMPLE_LABEL));
    assert.ok(markers.includes('fixture-a'));
    assert.ok(markers.includes('fx-beam'));
    assert.ok(markers.includes('Sample record A'));
  });
  test('the marker list holds the panel markers', () => {
    for (const m of PANEL_MARKERS) assert.ok(fixtureMarkers().includes(m));
  });
  test('a panel marker in a static chunk fails', () => assert.equal(run({ 'a.js': 'x="antet-admin"' }), 1));
  test('a panel marker in the server output fails', () => {
    const dir = path.join(root, String(counter++));
    mkdirSync(path.join(dir, '.next', 'static'), { recursive: true });
    mkdirSync(path.join(dir, '.next', 'server', 'app'), { recursive: true });
    writeFileSync(path.join(dir, '.next', 'server', 'app', 'p.js'), 'x="admin-root"');
    const err = process.stderr.write;
    process.stderr.write = () => true;
    try {
      assert.equal(main(dir), 1);
    } finally {
      process.stderr.write = err;
    }
  });
  test('a clean tree passes', () => assert.equal(run({ 'chunks/a.js': 'console.log("hello")' }), 0));
  test('the sample label in a nested chunk fails', () =>
    assert.equal(run({ 'chunks/deep/a.js': `x="${SAMPLE_LABEL}"` }), 1));
  test('a fixture title fails', () => assert.equal(run({ 'a.js': 'x="Sample record A"' }), 1));
  test('a marker in a non-script file is ignored', () => assert.equal(run({ 'a.css': SAMPLE_LABEL }), 0));
  test('a custom marker list is honoured', () => {
    assert.equal(run({ 'a.js': 'secret' }, ['secret']), 1);
    assert.equal(run({ 'a.js': 'secret' }, ['other']), 0);
  });
  test('a missing build output fails', () => assert.equal(run(null), 2));
});
