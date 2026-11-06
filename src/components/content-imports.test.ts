import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Components receive content through props from the page. These files still read the bundled content
// directly; the list only shrinks as they move to props.
const allowed = new Set([
  'BeamFigure.tsx',
  'ForceFigure.tsx',
  'Header.tsx',
  'notes/NoteList.tsx',
  'projects/ArchiveList.tsx',
  'projects/ProjectRow.tsx',
  'notes/NoteArticle.tsx',
  'notes/ArticleBody.tsx',
]);

const root = join(process.cwd(), 'src', 'components');

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx')
        ? [join(dir, e.name)]
        : [],
  );
}

/** True when the file imports a value (not only types) from `@/content/`, other than the structure and types modules. */
function importsContentValues(source: string): boolean {
  const re = /import\s+(type\s+)?([^;]*?)\s+from\s+'@\/content\/([^']+)'/g;
  for (const m of source.matchAll(re)) {
    if (m[1]) continue;
    if (m[3] === 'structure' || m[3] === 'types') continue;
    const clause = m[2] ?? '';
    const named = /\{([^}]*)\}/.exec(clause)?.[1];
    // `import { type A, type B }` carries no value.
    if (
      named !== undefined &&
      !clause
        .replace(/\{[^}]*\}/, '')
        .trim()
        .replace(/,$/, '')
    ) {
      if (named.split(',').every((s) => !s.trim() || s.trim().startsWith('type '))) continue;
    }
    return true;
  }
  return false;
}

const all = files(root).map((f) => ({
  name: relative(root, f).split('\\').join('/'),
  value: importsContentValues(readFileSync(f, 'utf8')),
}));

describe('component content imports', () => {
  it('no component outside the allowlist imports content values', () => {
    expect(all.filter((f) => f.value && !allowed.has(f.name)).map((f) => f.name)).toEqual([]);
  });

  it('every allowlisted file still imports content values (the list only shrinks)', () => {
    const names = new Set(all.map((f) => f.name));
    const stale = [...allowed].filter((n) => !names.has(n) || !all.find((f) => f.name === n)?.value);
    expect(stale).toEqual([]);
  });
});
