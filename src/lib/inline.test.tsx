import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { NoteContent } from '@/content/notes/types';
import { Inline, blockStrings, buildCtx, citeTokens, plain, type Ctx } from './inline';

const baseCtx = (over: Partial<Ctx> = {}): Ctx => ({
  locale: 'en',
  fn: new Map(),
  ref: new Map(),
  labels: new Map(),
  ...over,
});

const html = (text: string, ctx = baseCtx()) => render(<Inline text={text} ctx={ctx} />).container;

describe('Inline', () => {
  it('renders plain text unchanged', () => {
    expect(html('just words').textContent).toBe('just words');
  });

  it('renders bold, italic and code', () => {
    const c = html('a **bold** *italic* `code`');
    expect(c.querySelector('strong')?.textContent).toBe('bold');
    expect(c.querySelector('em')?.textContent).toBe('italic');
    expect(c.querySelector('code.icode')?.textContent).toBe('code');
  });

  it('does not pass raw HTML through', () => {
    const c = html('<script>alert(1)</script> <img src=x onerror=alert(1)> <b>x</b>');
    expect(c.querySelector('script')).toBeNull();
    expect(c.querySelector('img')).toBeNull();
    expect(c.querySelector('b')).toBeNull();
    expect(c.textContent).toContain('<script>alert(1)</script>');
  });

  it('keeps markup inside code as literal text', () => {
    const c = html('`<b>x</b>`');
    expect(c.querySelector('b')).toBeNull();
    expect(c.querySelector('code')?.textContent).toBe('<b>x</b>');
  });

  it('renders inline TeX as escaped MathML', () => {
    const c = html('so $R_A$ and $0.5$', baseCtx({ locale: 'tr' }));
    expect(c.querySelectorAll('span.imath math')).toHaveLength(2);
    expect(c.querySelector('msub')).not.toBeNull();
    expect(c.querySelector('mn')?.textContent).toBe('0,5');
    const evil = html('$<script>x</script>$');
    expect(evil.querySelector('script')).toBeNull();
  });

  it('renders footnote and reference citations with numbers', () => {
    const ctx = baseCtx({ fn: new Map([['n1', 2]]), ref: new Map([['r1', 3]]) });
    const c = html('x[^n1] y[@r1]', ctx);
    const fn = c.querySelector('a.fnmark[href="#fn-n1"]')!;
    expect(fn.textContent).toBe('2');
    expect(fn.getAttribute('aria-label')).toBe('Footnote 2');
    expect(c.querySelector('sup#fnref-n1')).not.toBeNull();
    const ref = c.querySelector('a.refmark[href="#ref-r1"]')!;
    expect(ref.textContent).toBe('[3]');
    expect(ref.getAttribute('aria-label')).toBe('Reference 3');
  });

  it('localises citation labels in Turkish', () => {
    const c = html('x[^n1]', baseCtx({ locale: 'tr', fn: new Map([['n1', 1]]) }));
    expect(c.querySelector('a')?.getAttribute('aria-label')).toBe('Dipnot 1');
  });

  it('resolves cross references and leaves unknown ones as text', () => {
    const ctx = baseCtx({
      labels: new Map([
        ['f1', { kind: 'fig' as const, n: 2 }],
        ['e1', { kind: 'eq' as const, n: 4 }],
      ]),
    });
    const c = html('see [[f1]], [[e1]] and [[nope]]', ctx);
    expect(c.querySelector('a[href="#fig-f1"]')?.textContent).toBe('Fig. 2');
    expect(c.querySelector('a[href="#eq-e1"]')?.textContent).toBe('(4)');
    expect(c.textContent).toContain('[[nope]]');
  });

  it('marks external links to open safely in a new tab', () => {
    const c = html('[site](https://example.com/a)');
    const a = c.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://example.com/a');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.querySelector('.sr-only')?.textContent).toContain('opens in a new tab');
  });

  it('keeps internal links in the same tab and formats link labels', () => {
    const c = html('[**go**](/notes)');
    const a = c.querySelector('a')!;
    expect(a.getAttribute('target')).toBeNull();
    expect(a.querySelector('strong')?.textContent).toBe('go');
    expect(a.querySelector('.sr-only')).toBeNull();
  });
});

describe('plain', () => {
  it('strips markup and citations', () => {
    expect(plain('a **b** *c* `d` [e](/x) $f$ g[^n1][@r1][[f1]]')).toBe('a b c d e f g');
  });
});

describe('blockStrings and buildCtx', () => {
  it('lists text of each block type', () => {
    expect(blockStrings({ type: 'p', text: 'a' })).toEqual(['a']);
    expect(blockStrings({ type: 'ul', items: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(blockStrings({ type: 'quote', text: 'q' })).toEqual(['q', '']);
    expect(blockStrings({ type: 'callout', kind: 'note', paragraphs: ['p'] } as never)).toEqual(['', 'p']);
    expect(blockStrings({ type: 'table', caption: 'c', head: ['h'], rows: [['r']] })).toEqual(['c', 'h', 'r', '']);
    expect(blockStrings({ type: 'math', tex: 'x' })).toEqual([]);
  });

  it('numbers figures, tables, equations and citations in order of first use', () => {
    const content = {
      slug: 's',
      title: 't',
      summary: 's',
      blocks: [
        { type: 'p', text: 'one[^b] two[^a] again[^b] src[@z]' },
        { type: 'math', tex: 'x', id: 'e1' },
        { type: 'math', tex: 'y' },
        { type: 'math', tex: 'z', id: 'e3' },
        { type: 'table', id: 't1', caption: 'c[@y]', head: [], rows: [] },
        { type: 'figure', id: 'f1', figureId: 'beam' },
      ],
    } as unknown as NoteContent;
    const ctx = buildCtx(content, 'en');
    expect([...ctx.fn]).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
    expect([...ctx.ref]).toEqual([
      ['z', 1],
      ['y', 2],
    ]);
    expect(ctx.labels.get('e1')).toEqual({ kind: 'eq', n: 1 });
    expect(ctx.labels.get('e3')).toEqual({ kind: 'eq', n: 3 });
    expect(ctx.labels.get('t1')).toEqual({ kind: 'tab', n: 1 });
    expect(ctx.labels.get('f1')).toEqual({ kind: 'fig', n: 1 });
  });

  it('does not number a figure whose id is not in the registry', () => {
    const content = {
      slug: 's',
      title: 't',
      summary: 's',
      blocks: [
        { type: 'figure', id: 'ghost', figureId: 'no-such-figure' },
        { type: 'figure', id: 'f1', figureId: 'beam' },
        { type: 'p', text: 'see [[f1]]' },
      ],
    } as unknown as NoteContent;
    const ctx = buildCtx(content, 'en');
    expect(ctx.labels.has('ghost')).toBe(false);
    expect(ctx.labels.get('f1')).toEqual({ kind: 'fig', n: 1 });
    const { container } = render(<Inline text="see [[f1]]" ctx={ctx} />);
    expect(container.textContent).toContain('1');
  });
});

describe('citeTokens', () => {
  it('returns ids and link targets, nested markup included', () => {
    expect(citeTokens('a[^f] **b[@r]** *[[eq]]* [see](https://x.test) [^g] `[^no]` $[^no]$')).toEqual([
      { kind: 'fn', value: 'f' },
      { kind: 'ref', value: 'r' },
      { kind: 'xref', value: 'eq' },
      { kind: 'link', value: 'https://x.test' },
      { kind: 'fn', value: 'g' },
    ]);
  });
});
