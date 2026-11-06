import { describe, expect, it } from 'vitest';
import { texIssues, texToMathML } from './math';

const ALLOWED = new Set([
  'math',
  'mrow',
  'mi',
  'mn',
  'mo',
  'mtext',
  'mspace',
  'mfrac',
  'msqrt',
  'msub',
  'msup',
  'msubsup',
]);

function tagNames(html: string) {
  return [...html.matchAll(/<\/?([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

describe('texToMathML', () => {
  it('wraps output in a math element, with display styling on request', () => {
    expect(texToMathML('x', 'en')).toBe('<math><mi>x</mi></math>');
    expect(texToMathML('x', 'en', true)).toContain('class="display"');
  });

  it('renders numbers with the locale decimal mark', () => {
    expect(texToMathML('0.35', 'tr')).toBe('<math><mn>0,35</mn></math>');
    expect(texToMathML('0.35', 'en')).toBe('<math><mn>0.35</mn></math>');
  });

  it('handles scripts, fractions, roots and symbols', () => {
    expect(texToMathML('R_A', 'en')).toBe('<math><msub><mi>R</mi><mi>A</mi></msub></math>');
    expect(texToMathML('x^2', 'en')).toContain('<msup><mi>x</mi><mn>2</mn></msup>');
    expect(texToMathML('x_i^2', 'en')).toContain('<msubsup>');
    expect(texToMathML('\\frac{a}{b}', 'en')).toBe(
      '<math><mfrac><mrow><mi>a</mi></mrow><mrow><mi>b</mi></mrow></mfrac></math>',
    );
    expect(texToMathML('\\sqrt{3}', 'en')).toContain('<msqrt><mrow><mn>3</mn></mrow></msqrt>');
    expect(texToMathML('\\delta \\cdot \\pi', 'en')).toBe('<math><mi>δ</mi><mo>·</mo><mi>π</mi></math>');
    expect(texToMathML('a - b * c', 'en')).toContain('<mo>−</mo>');
    expect(texToMathML('a - b * c', 'en')).toContain('<mo>·</mo>');
  });

  it('handles spacing, fences and upright text', () => {
    expect(texToMathML('a\\,b', 'en')).toContain('<mspace width="0.17em"></mspace>');
    expect(texToMathML('a\\quad b', 'en')).toContain('<mspace width="1em"></mspace>');
    expect(texToMathML('\\left( x \\right)', 'en')).toBe('<math><mo>(</mo><mi>x</mi><mo>)</mo></math>');
    expect(texToMathML('\\mathrm{kN}', 'en')).toContain('<mi mathvariant="normal">kN</mi>');
    expect(texToMathML('\\mathrm{a b}', 'en')).toContain('<mtext>a b</mtext>');
    expect(texToMathML('\\text{if }x', 'en')).toContain('<mtext>if </mtext>');
    expect(texToMathML('\\degree', 'en')).toContain('<mo>°</mo>');
  });

  it('keeps unknown commands as escaped text', () => {
    expect(texToMathML('\\foo', 'en')).toBe('<math><mtext>foo</mtext></math>');
  });

  it('escapes ampersand, less-than and greater-than', () => {
    const html = texToMathML('a & b < c > d', 'en');
    expect(html).toContain('<mi>&amp;</mi>');
    expect(html).toContain('<mo>&lt;</mo>');
    expect(html).toContain('<mo>&gt;</mo>');
  });

  it('never emits a script element for hostile input', () => {
    const html = texToMathML('<script>alert(1)</script>', 'en');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;');
    expect(tagNames(html).every((t) => ALLOWED.has(t))).toBe(true);
  });

  it('escapes hostile input inside \\text and \\mathrm', () => {
    for (const cmd of ['text', 'mathrm']) {
      const html = texToMathML(`\\${cmd}{<script>alert(1)</script>}`, 'en');
      expect(html).not.toContain('<script');
      expect(html).toContain('&lt;script&gt;');
      expect(tagNames(html).every((t) => ALLOWED.has(t))).toBe(true);
    }
  });

  it('cannot break out of an attribute with a quote payload', () => {
    const html = texToMathML('"onload=alert(1) x', 'en');
    expect(tagNames(html).every((t) => ALLOWED.has(t))).toBe(true);
    expect(html).not.toMatch(/<[^>]*\sonload=/);
    const html2 = texToMathML('\\text{"onload=alert(1)}', 'en');
    expect(html2).toBe('<math><mtext>"onload=alert(1)</mtext></math>');
  });

  it('emits only known MathML tags for a broad input', () => {
    const html = texToMathML('\\frac{R_A}{P}=\\sqrt{x^2+y_i^2}\\;\\text{ok}\\mathrm{kN}\\alpha\\,<>&', 'tr', true);
    expect(tagNames(html).every((t) => ALLOWED.has(t))).toBe(true);
  });
});

describe('texIssues', () => {
  it('accepts the supported subset', () => {
    expect(texIssues('F = m\\,a, \\frac{\\alpha}{\\sqrt{x_\\mathrm{A}}} \\left( y \\right) \\text{ok}')).toEqual([]);
  });
  it('finds unknown commands and prototype names', () => {
    expect(texIssues('\\foo + \\constructor + \\%')).toEqual([
      { kind: 'command', value: '\\foo' },
      { kind: 'command', value: '\\constructor' },
      { kind: 'command', value: '\\%' },
    ]);
  });
  it('finds unbalanced braces', () => {
    expect(texIssues('{a')).toEqual([{ kind: 'brace', value: '{' }]);
    expect(texIssues('a}')).toEqual([{ kind: 'brace', value: '}' }]);
    expect(texIssues('x\\')).toEqual([{ kind: 'command', value: '\\' }]);
  });
});
