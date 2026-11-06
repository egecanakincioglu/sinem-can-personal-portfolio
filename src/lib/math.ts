import type { Locale } from '@/content/types';

/* A deliberately small TeX-subset → MathML converter.
   Supports: letters, numbers (locale decimal mark), + − = < > ( ) [ ] , ; : / | !, ^ _ with {groups},
   \frac \sqrt \text \mathrm \left \right \, \; \quad, and the symbols in SYMBOLS. Variables are italic by
   default; units, operators and descriptive subscripts go upright through \mathrm{…}. */

const SYMBOLS: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  phi: 'φ',
  omega: 'ω',
  Delta: 'Δ',
  Sigma: 'Σ',
  Omega: 'Ω',
  cdot: '·',
  times: '×',
  pm: '±',
  le: '≤',
  ge: '≥',
  ne: '≠',
  approx: '≈',
  infty: '∞',
  partial: '∂',
  to: '→',
  rightarrow: '→',
  sum: '∑',
  int: '∫',
  degree: '°',
  prime: '′',
  ll: '≪',
  gg: '≫',
};
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ESC[c]);

type Ctx = { src: string; i: number; locale: Locale };

const OP = /[+\-=<>()[\],;:/|!.*]/;

function atom(c: Ctx): string {
  const { src } = c;
  const ch = src[c.i];

  if (ch === '{') {
    c.i++;
    const inner = seq(c, '}');
    c.i++; // closing brace
    return `<mrow>${inner}</mrow>`;
  }
  if (ch === '\\') {
    c.i++;
    // single-character escapes: thin space etc.
    if (/[,;: ]/.test(src[c.i] ?? '')) {
      const w = src[c.i++];
      return `<mspace width="${w === ',' ? '0.17em' : w === ';' ? '0.28em' : '0.5em'}"></mspace>`;
    }
    let name = '';
    while (/[A-Za-z]/.test(src[c.i] ?? '')) name += src[c.i++];
    switch (name) {
      case 'frac': {
        const a = atom(c);
        const b = atom(c);
        return `<mfrac>${a}${b}</mfrac>`;
      }
      case 'sqrt':
        return `<msqrt>${atom(c)}</msqrt>`;
      case 'quad':
        return `<mspace width="1em"></mspace>`;
      case 'left':
      case 'right':
        return atom(c); // delimiter follows; MathML stretches fences on its own
      case 'text': {
        const body = group(c);
        return `<mtext>${esc(body)}</mtext>`;
      }
      case 'mathrm': {
        const body = group(c);
        // letters-only → one upright identifier (units, descriptive subscripts); otherwise upright text
        return /^[A-Za-z]+$/.test(body) ? `<mi mathvariant="normal">${esc(body)}</mi>` : `<mtext>${esc(body)}</mtext>`;
      }
      default: {
        const s = SYMBOLS[name];
        if (!s) return `<mtext>${esc(name)}</mtext>`;
        if (/^[α-ωΑ-Ω]$/.test(s)) return `<mi>${s}</mi>`;
        if (s === '°') return `<mo>°</mo>`;
        return `<mo>${s}</mo>`;
      }
    }
  }
  if (/\d/.test(ch)) {
    let n = '';
    while (
      /[\d]/.test(src[c.i] ?? '') ||
      (src[c.i] === '.' && /\d/.test(src[c.i + 1] ?? '') && /\d/.test(src[c.i - 1] ?? ''))
    )
      n += src[c.i++];
    return `<mn>${c.locale === 'tr' ? n.replace('.', ',') : n}</mn>`;
  }
  c.i++;
  if (ch === '-') return '<mo>−</mo>';
  if (ch === '*') return '<mo>·</mo>';
  if (OP.test(ch)) return `<mo>${esc(ch)}</mo>`;
  return `<mi>${esc(ch)}</mi>`;
}

/** Raw text of a {group} or single token, for \text and \mathrm. */
function group(c: Ctx): string {
  while (c.src[c.i] === ' ') c.i++;
  if (c.src[c.i] !== '{') return c.src[c.i++] ?? '';
  c.i++;
  const start = c.i;
  let depth = 1;
  while (c.i < c.src.length && depth) {
    if (c.src[c.i] === '{') depth++;
    else if (c.src[c.i] === '}') depth--;
    c.i++;
  }
  return c.src.slice(start, c.i - 1);
}

/** An atom followed by any number of ^ / _ scripts. */
function term(c: Ctx): string {
  let base = atom(c);
  let sub = '';
  let sup = '';
  while (c.src[c.i] === '_' || c.src[c.i] === '^') {
    const kind = c.src[c.i++];
    while (c.src[c.i] === ' ') c.i++;
    const arg = atom(c);
    if (kind === '_') sub = arg;
    else sup = arg;
  }
  if (sub && sup) base = `<msubsup>${base}${sub}${sup}</msubsup>`;
  else if (sub) base = `<msub>${base}${sub}</msub>`;
  else if (sup) base = `<msup>${base}${sup}</msup>`;
  return base;
}

function seq(c: Ctx, stop?: string): string {
  let out = '';
  while (c.i < c.src.length && c.src[c.i] !== stop) {
    if (c.src[c.i] === ' ') {
      c.i++;
      continue;
    }
    out += term(c);
  }
  return out;
}

/** `<math>` markup for a TeX-subset string. `display` selects display style (full-size fractions, limits);
 *  the element itself stays inline so CSS can left-align it in its equation row. */
export function texToMathML(tex: string, locale: Locale, display = false): string {
  const c: Ctx = { src: tex, i: 0, locale };
  return `<math${display ? ' class="display" style="math-style:normal"' : ''}>${seq(c)}</math>`;
}

const COMMANDS = ['frac', 'sqrt', 'quad', 'left', 'right', 'text', 'mathrm'];

/** Problems the converter would silently render as plain text: unknown commands and unbalanced braces. */
export function texIssues(tex: string): { kind: 'command' | 'brace'; value: string }[] {
  const issues: { kind: 'command' | 'brace'; value: string }[] = [];
  for (const m of tex.matchAll(/\\([A-Za-z]+|[^A-Za-z,;: ]|$)/g)) {
    if (!COMMANDS.includes(m[1]) && !Object.hasOwn(SYMBOLS, m[1])) issues.push({ kind: 'command', value: `\\${m[1]}` });
  }
  let depth = 0;
  for (const ch of tex) {
    if (ch === '{') depth++;
    else if (ch === '}' && depth-- === 0) {
      issues.push({ kind: 'brace', value: '}' });
      depth = 0;
    }
  }
  if (depth > 0) issues.push({ kind: 'brace', value: '{' });
  return issues;
}
