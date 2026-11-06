// After a production build, the output must hold no sample data (the sample drawing label, the titles and ids of
// the development fixtures) and no admin panel code. The fixture markers are read from the fixture modules, so they
// can not drift; the panel markers are strings that only panel code contains.
//
//   node tooling/scripts/check-build-output.ts
//
// Exit codes: 0 clean, 1 a marker was found, 2 .next/static is missing. Reads .next/static and .next/server in the
// working directory.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureNotes, manyFixtureNotes } from '../../src/content/fixtures/notes.ts';
import { fixtureProjects, manyFixtures } from '../../src/content/fixtures/projects.ts';

export const SAMPLE_LABEL = 'SAMPLE — NOT A REAL DRAWING';

export const PANEL_MARKERS: readonly string[] = ['antet-admin', 'Demoyu sıfırla', 'Kaydet (sim.)', 'admin-root'];

export function fixtureMarkers(): string[] {
  const markers = new Set<string>([SAMPLE_LABEL]);
  for (const p of [...fixtureProjects, ...manyFixtures]) {
    markers.add(p.id);
    markers.add(p.title.tr);
    markers.add(p.title.en);
  }
  for (const n of [...fixtureNotes, ...manyFixtureNotes]) {
    markers.add(n.id);
    if (n.en) markers.add(n.en.title);
    if (n.tr) markers.add(n.tr.title);
  }
  return [...markers, ...PANEL_MARKERS].filter((m) => m.length > 0);
}

export function scan(staticDir: string, markers: string[]): { file: string; marker: string }[] {
  const hits: { file: string; marker: string }[] = [];
  for (const entry of readdirSync(staticDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(js|html|rsc)$/.test(entry.name)) continue;
    const file = path.join(entry.parentPath, entry.name);
    const text = readFileSync(file, 'utf8');
    for (const marker of markers) if (text.includes(marker)) hits.push({ file, marker });
  }
  return hits;
}

export function main(cwd: string = process.cwd(), markers: string[] = fixtureMarkers()): number {
  const dir = path.join(cwd, '.next', 'static');
  if (!existsSync(dir)) {
    process.stderr.write('check-build-output: .next/static is missing; run the production build first\n');
    return 2;
  }
  const serverDir = path.join(cwd, '.next', 'server');
  const hits = [...scan(dir, markers), ...(existsSync(serverDir) ? scan(serverDir, markers) : [])];
  for (const h of hits) process.stderr.write(`${h.file}: contains forbidden marker ${JSON.stringify(h.marker)}\n`);
  if (hits.length > 0) return 1;
  process.stdout.write('build output: no sample data or panel markers in .next\n');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
