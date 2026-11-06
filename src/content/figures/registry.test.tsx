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
});
