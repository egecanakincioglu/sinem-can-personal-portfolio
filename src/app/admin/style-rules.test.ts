import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The panel follows the same surface rules as the site: flat, square, no brand red, no file uploads.
const adminDir = import.meta.dirname;

function sources(dir: string): string[] {
  const found: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) found.push(...sources(full));
    else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) found.push(full);
    else if (e.name === 'admin.css') found.push(full);
  }
  return found;
}

const files = sources(adminDir);

const RULES: [string, RegExp][] = [
  ['brand red', /#c42b1f/i],
  ['box-shadow', /box-shadow/i],
  ['non-zero border-radius', /border-radius\s*:(?!\s*(0(px|rem|em|%)?\s*[;}]|var\(|inherit|unset|initial))[^;}]+/i],
  ['non-zero rounded utility', /\brounded(-[a-z0-9]+)*\b(?!-none)/],
  ['gradient', /gradient\s*\(/i],
  ['backdrop-filter', /backdrop-filter/i],
  ['file input', /type\s*=\s*["']file["']/i],
];

describe('admin surface rules', () => {
  it('scans the stylesheet and the markup', () => {
    expect(files.some((f) => f.endsWith('admin.css'))).toBe(true);
    expect(files.filter((f) => f.endsWith('.tsx')).length).toBeGreaterThan(10);
  });

  it.each(RULES)('no %s', (_name, pattern) => {
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (pattern.test(line)) hits.push(`${path.relative(adminDir, f)}:${i + 1}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
