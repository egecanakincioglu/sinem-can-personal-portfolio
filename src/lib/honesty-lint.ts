import { fold } from './fold';

/** One warning from the honesty scan: what matched and which rule it broke. The scan never edits text. */
export type Hit = { match: string; rule: string };

const BANNED = [
  'uzman',
  'deneyimli',
  'tutkulu',
  'lider',
  'expert',
  'experienced',
  'passionate',
  'driven',
  'innovative',
  'results-oriented',
];
const SKILL = /(beceri|yetkinlik|seviye|skill|proficien|fluen|akici|level)/;
const OBSERVED = /(dokum|sac sekillendirme|dovme|kaynak|casting|sheet forming|forging|welding)/;
const APPLIED = /(tornalama|frezeleme|delme|hassas olcum|turning|milling|drilling|precision measurement)/;
const WINDOW = 24;

const starts = (re: RegExp, folded: string): number[] => [...folded.matchAll(re)].map((m) => m.index ?? 0);

/** Case-insensitive, Turkish-folded scan for claims the site must not make. Folding keeps character positions. */
export function lintText(text: string): Hit[] {
  const f = fold(text);
  const hits: Hit[] = [];
  const add = (index: number, length: number, rule: string) =>
    hits.push({ match: text.slice(index, index + length), rule });
  const around = (index: number, length: number, near: RegExp) =>
    near.test(f.slice(Math.max(0, index - WINDOW), index + length + WINDOW));

  for (const m of f.matchAll(new RegExp(`(?<![a-z0-9])(${BANNED.join('|')})[a-z]*`, 'g')))
    add(m.index ?? 0, m[0].length, 'Öz değerlendirme sözcüğü');
  for (const m of f.matchAll(/(?<![a-z0-9])[abc][12](?![a-z0-9])/g)) add(m.index ?? 0, 2, 'Dil düzeyi (CEFR)');
  for (const m of f.matchAll(/%\s?\d+|\d+\s?%/g)) {
    const i = m.index ?? 0;
    if (around(i, m[0].length, SKILL)) add(i, m[0].length, 'Beceri için yüzde');
  }
  for (const i of starts(/yaptim/g, f)) if (around(i, 6, OBSERVED)) add(i, 6, 'Yaptım, gözlemlenen süreçle yan yana');
  for (const i of starts(/gozlemledim/g, f))
    if (around(i, 11, APPLIED)) add(i, 11, 'Gözlemledim, uygulanan süreçle yan yana');
  for (const i of starts(/hareket var/g, f))
    if (around(i, 11, /bileske/)) add(i, 11, 'Hareket var, bileşkeyle yan yana');
  return hits;
}
