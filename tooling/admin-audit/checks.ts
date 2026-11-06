// Pure decision functions of the panel sweep; run.ts only collects the facts in a browser.
export interface Viewport {
  width: number;
  height: number;
}

export const VIEWPORTS: readonly Viewport[] = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
];

const MIN_TOUCH_HEIGHT = 44;
const MIN_INPUT_FONT = 16;
/** Below this width the action bar sits at the bottom of the screen and is used by touch. */
export const BOTTOM_BAR_BELOW = 768;

/** Panel addresses in the sidebar navigation of a rendered page (`/admin`, `/admin/<slug>`), without hashes or queries. */
export function navRoutes(html: string): string[] {
  const nav = /<nav\b[^>]*aria-label="Ekranlar"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';
  const routes = new Set<string>();
  for (const m of nav.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) {
    const path = m[1].split(/[?#]/)[0].replace(/\/$/, '');
    if (path === '/admin' || path.startsWith('/admin/')) routes.add(path);
  }
  return [...routes];
}

/** Every address the sweep visits: the sign-in page, the overview and the navigation links, once each. */
export function screenRoutes(found: readonly string[]): string[] {
  return [...new Set(['/admin/giris', '/admin', ...found])];
}

export interface Finding {
  route: string;
  viewport: string;
  check: string;
  detail: string;
}

export const viewportLabel = (v: Viewport) => `${v.width}x${v.height}`;

export function h1Problem(count: number): string | null {
  return count === 1 ? null : `${count} h1 elements, expected 1`;
}

export interface Box {
  label: string;
  height: number;
}

export function touchTargetProblems(width: number, boxes: readonly Box[]): string[] {
  if (width >= BOTTOM_BAR_BELOW) return [];
  return boxes.filter((b) => b.height < MIN_TOUCH_HEIGHT).map((b) => `${b.label} is ${b.height} px tall`);
}

export interface FontBox {
  label: string;
  fontSize: number;
}

export function inputFontProblems(inputs: readonly FontBox[]): string[] {
  return inputs.filter((i) => i.fontSize < MIN_INPUT_FONT).map((i) => `${i.label} has font size ${i.fontSize} px`);
}

export interface ImpactViolation {
  id: string;
  impact: string | null | undefined;
  nodes: { target: unknown[] }[];
}

export function seriousAxeProblems(violations: readonly ImpactViolation[]): string[] {
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

export interface PaletteFacts {
  openAfterShortcut: boolean;
  openAfterEscape: boolean;
  focusReturned: boolean;
}

export function paletteProblems(f: PaletteFacts): string[] {
  const out: string[] = [];
  if (!f.openAfterShortcut) out.push('Ctrl+K did not open the command palette');
  else {
    if (f.openAfterEscape) out.push('Esc did not close the command palette');
    if (!f.focusReturned) out.push('focus did not return after the palette closed');
  }
  return out;
}

const cell = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');

export function renderReport(findings: readonly Finding[], routes: number, viewports: number): string {
  const lines = ['# Panel sweep', '', `${routes} routes at ${viewports} viewports: ${findings.length} finding(s).`, ''];
  if (findings.length === 0) return lines.join('\n') + '\nNo findings.\n';
  lines.push('| Route | Viewport | Check | Detail |', '| --- | --- | --- | --- |');
  for (const f of findings) lines.push(`| ${cell(f.route)} | ${f.viewport} | ${f.check} | ${cell(f.detail)} |`);
  return lines.join('\n') + '\n';
}
