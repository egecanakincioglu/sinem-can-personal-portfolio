#!/usr/bin/env node
// Local panel sweep (not part of CI). Starts `next dev` on a free port, or uses ADMIN_AUDIT_URL when set, visits every
// panel screen at the sweep viewports in a real Chrome and writes a Markdown report to ADMIN_AUDIT_OUT (or prints it).
//
//   corepack pnpm admin-audit
//
// Exit codes: 0 no findings, 1 findings, 2 setup problem.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import type AxeCore from 'axe-core';
import puppeteer, { type Page } from 'puppeteer-core';
import { consoleProblems, hasHorizontalOverflow, type ConsoleEntry } from '../site-audit/checks.ts';
import { findChrome } from '../site-audit/chrome.ts';
import {
  BOTTOM_BAR_BELOW,
  VIEWPORTS,
  h1Problem,
  inputFontProblems,
  navRoutes,
  paletteProblems,
  renderReport,
  screenRoutes,
  seriousAxeProblems,
  touchTargetProblems,
  viewportLabel,
  type Finding,
} from './checks.ts';

const require = createRequire(import.meta.url);
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const findings: Finding[] = [];

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

function stopServer(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
  else process.kill(-child.pid, 'SIGTERM');
}

async function startServer(): Promise<{ base: string; child?: ChildProcess }> {
  if (process.env.ADMIN_AUDIT_URL) return { base: process.env.ADMIN_AUDIT_URL.replace(/\/$/, '') };
  const port = await freePort();
  const base = `http://localhost:${port}`;
  const next = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [next, 'dev', '-p', String(port)], {
    stdio: ['ignore', 'ignore', 'inherit'],
    detached: process.platform !== 'win32',
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next dev exited with ${child.exitCode}`);
    if (
      await fetch(`${base}/admin/giris`, { redirect: 'manual' }).then(
        () => true,
        () => false,
      )
    )
      return { base, child };
    await new Promise((r) => setTimeout(r, 500));
  }
  stopServer(child);
  throw new Error('dev server did not become ready in 120 s');
}

async function visit(page: Page, base: string, route: string, axeSource: string): Promise<void> {
  const entries: ConsoleEntry[] = [];
  const onConsole = (m: { type(): string; text(): string }) => entries.push({ type: m.type(), text: m.text() });
  const onPageError = (e: unknown) => entries.push({ type: 'pageerror', text: String(e) });
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  const add = (v: { width: number; height: number }, check: string, detail: string) =>
    findings.push({ route, viewport: viewportLabel(v), check, detail });

  let first = true;
  for (const v of VIEWPORTS) {
    await page.setViewport({ ...v, deviceScaleFactor: 1 });
    // The first load of a route compiles it in the dev server; later viewports reload the warm route.
    const response = await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 120_000 });
    if (first && response && response.status() !== 200) add(v, 'status', `status ${response.status()}, expected 200`);
    first = false;

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (hasHorizontalOverflow(scrollWidth, v.width)) add(v, 'overflow', `scrollWidth ${scrollWidth}`);

    const h1s = await page.evaluate(() => document.querySelectorAll('h1').length);
    const h1 = h1Problem(h1s);
    if (h1) add(v, 'h1', h1);

    const facts = await page.evaluate(() => {
      const visible = (el: Element) => el.getClientRects().length > 0;
      const name = (el: Element) =>
        (el.textContent?.trim() || el.getAttribute('aria-label') || el.tagName).slice(0, 40);
      const buttons = [...document.querySelectorAll('.a-bar button, .a-bar a')].filter(visible).map((el) => ({
        label: name(el),
        height: Math.round(el.getBoundingClientRect().height),
      }));
      const inputs = [...document.querySelectorAll('input, textarea, select')]
        .filter(
          (el) =>
            visible(el) && !/^(checkbox|radio|range|file|hidden|button|submit)$/.test((el as HTMLInputElement).type),
        )
        .map((el) => ({
          label: el.id ? `#${el.id}` : name(el),
          fontSize: parseFloat(getComputedStyle(el).fontSize),
        }));
      return { buttons, inputs };
    });
    if (v.width < BOTTOM_BAR_BELOW)
      for (const p of touchTargetProblems(v.width, facts.buttons)) add(v, 'bottom-bar', p);
    for (const p of inputFontProblems(facts.inputs)) add(v, 'input-font', p);

    await page.evaluate(axeSource);
    const violations = await page.evaluate(async (tags) => {
      const axe = (window as unknown as { axe: typeof AxeCore }).axe;
      const r = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
      return r.violations.map((x) => ({
        id: x.id,
        impact: x.impact ?? null,
        nodes: x.nodes.map((n) => ({ target: [...n.target] })),
      }));
    }, AXE_TAGS);
    for (const p of seriousAxeProblems(violations)) add(v, 'axe', p);

    // The sign-in page has no workspace shell and no palette.
    if (route !== '/admin/giris') {
      await page.evaluate(() => document.querySelector<HTMLElement>('#a-main')?.focus());
      await page.keyboard.down('Control');
      await page.keyboard.press('k');
      await page.keyboard.up('Control');
      const isOpen = () => page.evaluate(() => document.querySelector('[aria-label="Komut paleti"]') !== null);
      const openAfterShortcut = await page
        .waitForFunction(() => document.querySelector('[aria-label="Komut paleti"]') !== null, { timeout: 2000 })
        .then(
          () => true,
          () => false,
        );
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 300));
      const openAfterEscape = await isOpen();
      const focusReturned = await page.evaluate(() => document.activeElement?.id === 'a-main');
      for (const p of paletteProblems({ openAfterShortcut, openAfterEscape, focusReturned })) add(v, 'palette', p);
    }
  }

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  for (const p of consoleProblems(entries)) add({ width: 0, height: 0 }, 'console', p);
}

async function main(): Promise<number> {
  const executablePath = findChrome(process.env, process.platform, existsSync);
  if (!executablePath) {
    console.error('admin-audit: Chrome not found; set CHROME_PATH');
    return 2;
  }
  const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  let routes: string[] = [];
  let server: { base: string; child?: ChildProcess } | undefined;
  try {
    server = await startServer();
    const overview = await (await fetch(`${server.base}/admin`)).text();
    const found = navRoutes(overview);
    if (found.length === 0) {
      console.error('admin-audit: no sidebar links found on /admin');
      return 2;
    }
    routes = screenRoutes(found);
    const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      for (const route of routes) {
        console.error(`admin-audit: ${route}`);
        await visit(page, server.base, route, axeSource);
      }
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error(`admin-audit: ${(err as Error).stack ?? String(err)}`);
    return 2;
  } finally {
    if (server?.child) stopServer(server.child);
  }
  const report = renderReport(findings, routes.length, VIEWPORTS.length);
  if (process.env.ADMIN_AUDIT_OUT) writeFileSync(process.env.ADMIN_AUDIT_OUT, report);
  else console.log(report);
  return findings.length === 0 ? 0 : 1;
}

process.exitCode = await main();
