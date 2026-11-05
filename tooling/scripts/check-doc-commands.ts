#!/usr/bin/env node
// Fails if a command quoted in the docs does not exist: `pnpm <name>` must be a package.json script or a pnpm
// builtin, and `node <path>` / `bash <path>` under tooling/ must point to a file. Only code spans and fenced
// code are read; `...` and `<placeholder>` paths are skipped.
//   node tooling/scripts/check-doc-commands.ts [--root <dir>]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withoutGitIgnored } from './lib/git-ignored.ts';

const ROOT_FILES = ['README.md', 'CONTRIBUTING.md'];
const BUILTINS = new Set(['install', 'i', 'exec', 'dlx', 'add', 'audit', 'licenses']);
const FENCE = /^[ \t]*(`{3,}|~{3,})/;
const PNPM = /(?:^|[\s(])pnpm\s+([^\s`]+)(?:\s+([^\s`]+))?/g;
const TOOL = /(?:^|[\s(])(?:node|bash)\s+(?:--[\w-]+\s+)*(tooling\/[^\s`'"]+)/g;

function listMarkdown(dir: string, base: string, out: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listMarkdown(full, base, out);
    else if (entry.isFile() && entry.name.endsWith('.md'))
      out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function scriptNames(root: string): Set<string> {
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { scripts?: object };
    return new Set(Object.keys(pkg.scripts ?? {}));
  } catch {
    return new Set();
  }
}

/** Code text with its 1-based line number: every fenced line and every inline code span. */
function codeParts(text: string): { line: number; code: string }[] {
  const out: { line: number; code: string }[] = [];
  let fence: string | null = null;
  text.split(/\r?\n/).forEach((raw, i) => {
    const f = FENCE.exec(raw);
    if (f) {
      const mark = f[1]![0]!;
      if (fence === null) fence = mark;
      else if (fence === mark) fence = null;
      return;
    }
    if (fence !== null) out.push({ line: i + 1, code: raw });
    else for (const m of raw.matchAll(/`([^`\n]+)`/g)) out.push({ line: i + 1, code: m[1]! });
  });
  return out;
}

const skipped = (w: string | undefined): boolean => !w || /^[-<]/.test(w) || w.includes('...');

export function checkCommands(root: string): { files: string[]; problems: string[] } {
  const docs = path.join(root, 'docs');
  const files = withoutGitIgnored(root, [
    ...ROOT_FILES.filter((f) => existsSync(path.join(root, f))),
    ...(existsSync(docs) ? listMarkdown(docs, root, []).sort() : []),
  ]);
  const scripts = scriptNames(root);
  const problems: string[] = [];
  for (const file of files) {
    for (const { line, code } of codeParts(readFileSync(path.join(root, file), 'utf8'))) {
      for (const m of code.matchAll(PNPM)) {
        const first = m[1]!;
        if (skipped(first)) continue;
        const viaRun = first === 'run';
        const name = viaRun ? m[2] : first;
        if (skipped(name)) continue;
        const known = scripts.has(name!) || (!viaRun && BUILTINS.has(name!));
        if (!known) problems.push(`${file}:${line}: pnpm ${viaRun ? 'run ' : ''}${name} is not a script or builtin`);
      }
      for (const m of code.matchAll(TOOL)) {
        if (m[1]!.includes('...') || /[<*$]/.test(m[1]!)) continue;
        const target = m[1]!.replace(/[.,;:)]+$/, '');
        if (!existsSync(path.join(root, target))) problems.push(`${file}:${line}: ${target} does not exist`);
      }
    }
  }
  return { files, problems };
}

function resolveRoot(argv: string[]): string {
  const i = argv.indexOf('--root');
  if (i !== -1 && argv[i + 1]) return path.resolve(argv[i + 1]!);
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (r.status !== 0) {
    process.stderr.write('not inside a git repository (use --root <dir>)\n');
    process.exit(2);
  }
  return r.stdout.trim();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { files, problems } = checkCommands(resolveRoot(process.argv.slice(2)));
  for (const p of problems) process.stderr.write(`bad command: ${p}\n`);
  process.stdout.write(`checked ${files.length} files, ${problems.length} bad commands\n`);
  process.exit(problems.length ? 1 : 0);
}
