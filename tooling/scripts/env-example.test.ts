import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

// Set by the host or the runtime, never by the person who configures the app.
const SET_BY_HOST = new Set(['NODE_ENV', 'VERCEL', 'VERCEL_PROJECT_PRODUCTION_URL']);

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

// Applies once the app has a validated environment module; until then there is nothing to compare.
const applies = existsSync(new URL('../../src/server/env.ts', import.meta.url));

test('.env.example lists every variable the app reads', { skip: !applies }, () => {
  const code = read('src/server/env.ts');
  const used = new Set<string>();
  for (const match of code.matchAll(/^\s+([A-Z][A-Z0-9_]*):/gm)) used.add(match[1]!);
  for (const match of code.matchAll(/\bsource\.([A-Z][A-Z0-9_]*)\b/g)) used.add(match[1]!);
  for (const name of SET_BY_HOST) used.delete(name);

  assert.ok(used.size >= 15, `only ${used.size} variable names found in env.ts; the extraction may be broken`);

  const example = new Set<string>();
  for (const match of read('.env.example').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)) example.add(match[1]!);

  const missing = [...used].filter((name) => !example.has(name)).sort();
  assert.deepEqual(missing, [], `missing from .env.example: ${missing.join(', ')}`);
});
