import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { figureIds, getFigure } from './registry';

describe('figure registry', () => {
  it('returns an entry by id and undefined for an unknown id', () => {
    expect(getFigure('beam')?.id).toBe('beam');
    expect(getFigure('nope')).toBeUndefined();
  });

  it('has unique ids', () => {
    expect(new Set(figureIds).size).toBe(figureIds.length);
  });

  it('renders each component as SVG elements using the site line classes', () => {
    for (const id of figureIds) {
      const f = getFigure(id)!;
      const { container } = render(
        <svg viewBox={f.viewBox}>
          <f.Component />
        </svg>,
      );
      expect(container.querySelector('.svg-heavy')).not.toBeNull();
      expect(container.querySelector('script')).toBeNull();
    }
  });

  it('has alt and caption in both locales', () => {
    for (const id of figureIds) {
      const f = getFigure(id)!;
      for (const l of ['en', 'tr'] as const) {
        expect(f.alt[l].length).toBeGreaterThan(0);
        expect(f.caption[l].length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps footnote and cross-reference markup out of default captions', () => {
    for (const id of figureIds) {
      const f = getFigure(id)!;
      for (const l of ['en', 'tr'] as const) {
        expect(f.caption[l]).not.toMatch(/\[\^|\[@|\[\[/);
      }
    }
  });

  it('keeps every label of a phone composition at 12px or more on a 360px screen', () => {
    // narrowest figure box: 360 - 2 x 20 page padding - 2 x 16 figure padding
    const box = 288;
    for (const id of figureIds) {
      const f = getFigure(id)!;
      if (!f.compact) continue;
      const width = Number(f.compact.viewBox.split(' ')[2]);
      const { container } = render(
        <svg viewBox={f.compact.viewBox}>
          <f.compact.Component />
        </svg>,
      );
      const sizes = Array.from(container.querySelectorAll('text, tspan'))
        .map((t) => Number(t.getAttribute('font-size')))
        .filter(Boolean);
      expect(sizes.length).toBeGreaterThan(0);
      for (const s of sizes) expect((s * box) / width, id).toBeGreaterThanOrEqual(12);
      expect(container.querySelector('.svg-heavy')).not.toBeNull();
    }
  });
});
