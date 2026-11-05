// Tests for check-doc-commands.ts: temporary trees and the real repository.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, 'check-doc-commands.ts');
const tmp = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'doc-commands-'));
let counter = 0;
after(() => rmSync(tmp, { recursive: true, force: true }));

const PKG = JSON.stringify({ scripts: { test: 'x', lint: 'y', 'release:prepare': 'z' } });
const FENCE = '```';

function tree(files: Record<string, string>): string {
  const dir = path.join(tmp, `d${counter++}`);
  for (const [rel, text] of Object.entries({ 'package.json': PKG, ...files })) {
    const file = path.join(dir, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  return dir;
}

function run(args: string[], cwd?: string) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

describe('check-doc-commands', () => {
  test('known scripts, builtins and existing tooling paths pass', () => {
    const dir = tree({
      'tooling/scripts/a.ts': 'x\n',
      'tooling/hooks/b.sh': 'x\n',
      'README.md': `Run \`pnpm test\` and \`pnpm run lint\`, \`pnpm install\`, \`pnpm release:prepare\`.\n${FENCE}bash\ncorepack pnpm exec vitest\npnpm dlx foo\nnode tooling/scripts/a.ts --root x\nbash tooling/hooks/b.sh\n${FENCE}\n`,
    });
    const r = run(['--root', dir], os.tmpdir());
    assert.equal(r.code, 0, r.err);
    assert.equal(r.out, 'checked 1 files, 0 bad commands\n');
  });

  test('an unknown script is reported with file and line', () => {
    const dir = tree({ 'docs/a.md': `ok\n${FENCE}\npnpm nope\n${FENCE}\nand \`pnpm run gone\` here\n` });
    const r = run(['--root', dir], os.tmpdir());
    assert.equal(r.code, 1);
    assert.match(r.err, /^bad command: docs\/a\.md:3: pnpm nope is not a script or builtin$/m);
    assert.match(r.err, /^bad command: docs\/a\.md:5: pnpm run gone is not a script or builtin$/m);
  });

  test('a missing tooling path is reported; placeholders are skipped', () => {
    const dir = tree({
      'CONTRIBUTING.md':
        'Use `node tooling/scripts/missing.ts` or `node tooling/scripts/...` or `bash tooling/<x>.sh`.\n',
    });
    const r = run(['--root', dir], os.tmpdir());
    assert.equal(r.code, 1);
    assert.match(r.err, /CONTRIBUTING\.md:1: tooling\/scripts\/missing\.ts does not exist/);
    assert.equal((r.err.match(/bad command/g) ?? []).length, 1);
  });

  test('prose outside code is ignored', () => {
    const dir = tree({ 'docs/a.md': 'We use pnpm nope and node tooling/x.ts in prose.\n' });
    assert.equal(run(['--root', dir], os.tmpdir()).code, 0);
  });

  test('the real repository docs are scanned without crashing', () => {
    const r = run([], HERE);
    assert.ok(r.code === 0 || r.code === 1, r.err);
    assert.match(r.out, /^checked \d+ files, \d+ bad commands$/m);
  });
});
