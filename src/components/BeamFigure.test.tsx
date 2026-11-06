import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dict } from '@/content/dictionary.ts';
import { BeamFigure } from './BeamFigure.tsx';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const A = dict.approach;
const sliders = () => screen.getAllByRole('slider', { name: A.controls.en }) as HTMLInputElement[];
const readouts = () => Array.from(document.querySelectorAll('dl dd')).map((d) => parseFloat(d.textContent ?? ''));

describe('BeamFigure', () => {
  it('exposes the load as a focusable range input with bounds and a spoken value', () => {
    render(<BeamFigure locale="en" />);
    for (const s of sliders()) {
      expect(s.min).toBe('0');
      expect(s.max).toBe('1');
      expect(s.step).toBe('0.01');
      expect(s.tabIndex).toBeGreaterThanOrEqual(0);
      expect(s.getAttribute('aria-valuetext')).toContain('0.35 L');
    }
  });

  it('updates the reactions when the slider moves, and they always sum to P', () => {
    render(<BeamFigure locale="en" defaultLoad={0.5} />);
    expect(readouts().slice(0, 3)).toEqual([0.5, 0.5, 0.5]);

    for (const a of [0.2, 0.35, 0.8, 1, 0]) {
      fireEvent.change(sliders()[0], { target: { value: String(a) } });
      const [load, ra, rb] = readouts();
      expect(load).toBeCloseTo(a, 2);
      expect(ra).toBeCloseTo(1 - a, 2);
      expect(rb).toBeCloseTo(a, 2);
      expect(ra + rb).toBeCloseTo(1, 2);
    }
  });

  it('describes the new position in the slider value text', () => {
    render(<BeamFigure locale="en" />);
    fireEvent.change(sliders()[0], { target: { value: '0.25' } });
    const text = sliders()[0].getAttribute('aria-valuetext') ?? '';
    expect(text).toContain('0.25 L');
    expect(text).toContain('0.75 P');
  });

  it('clamps an out-of-range value into 0..1', () => {
    render(<BeamFigure locale="en" />);
    fireEvent.change(sliders()[0], { target: { value: '7' } });
    expect(readouts()[0]).toBe(1);
  });

  it('resets to the default load, and the reset is disabled while already there', () => {
    render(<BeamFigure locale="en" defaultLoad={0.4} />);
    const reset = screen.getByRole('button', {
      name: `${A.reset.en}. ${A.resetLabel.en.replace('{a0}', '0.40')}`,
    }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    fireEvent.change(sliders()[0], { target: { value: '0.9' } });
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    expect(readouts()[0]).toBeCloseTo(0.4, 2);
    expect(reset.disabled).toBe(true);
  });

  it('states its assumptions next to the figure', () => {
    render(<BeamFigure locale="en" />);
    expect(screen.getByText(`${A.assumptionsTitle.en}.`)).toBeTruthy();
    expect(document.querySelector('figcaption')?.textContent).toContain(A.assumptions.en);
  });

  it('shows "max" in English and never "maks"', () => {
    const { container } = render(<BeamFigure locale="en" />);
    expect(container.textContent).toContain('max');
    expect(container.textContent).not.toContain('maks');
  });

  it('shows "maks" in Turkish', () => {
    const { container } = render(<BeamFigure locale="tr" />);
    expect(container.textContent).toContain('maks');
  });
  it('keeps only dt/dd groups directly inside the definition list', () => {
    const { container } = render(<BeamFigure locale="en" />);
    for (const dl of container.querySelectorAll('dl')) {
      for (const child of Array.from(dl.children)) {
        expect(child.tagName).toBe('DIV');
        expect(Array.from(child.children).map((c) => c.tagName)).toEqual(['DT', 'DD']);
      }
    }
  });
});
