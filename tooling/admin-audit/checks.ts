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

/** Every panel address: the overview is `/admin`, a screen is `/admin/<slug>`; the sign-in page is added. */
export function screenRoutes(slugs: readonly string[]): string[] {
  return ['/admin/giris', ...slugs.map((s) => (s === '' ? '/admin' : `/admin/${s}`))];
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
