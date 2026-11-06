import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dict } from '@/content/dictionary.ts';
import type { ForceRecord } from '@/content/types.ts';
import { ForcesInteractive } from './ForceFigure.tsx';

const rec = (id: string, magnitude: number, angleDeg: number): ForceRecord => ({
  id,
  magnitude,
  angleDeg,
  short: { tr: id, en: id },
  period: { tr: `Dönem ${id}`, en: `Period ${id}` },
  title: { tr: `Başlık ${id}`, en: `Title ${id}` },
  text: { tr: `Metin ${id}`, en: `Text ${id}` },
});
const records = [rec('f1', 8, 20), rec('f2', 5, 100), rec('f3', 9, -40)];

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const F = dict.forces;
describe('ForcesInteractive disclaimer', () => {
  it('states that the vectors are conceptual once, in the caption only', () => {
    const { container } = render(<ForcesInteractive records={records} locale="en" />);
    expect(container.textContent?.match(/conceptual/g)).toHaveLength(1);
  });
});

const resultLine = () => screen.getByText(F.result.en).parentElement as HTMLElement;
const angle = () => parseFloat(/θ.*?=\s*(-?[\d.]+)/.exec(resultLine().textContent ?? '')?.[1] ?? 'NaN');

describe('ForcesInteractive', () => {
  it('lists every influence in chronological order and shows the resultant R', () => {
    render(<ForcesInteractive records={records} locale="en" />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.querySelector('h3')?.textContent)).toEqual(['Title f1', 'Title f2', 'Title f3']);
    expect(resultLine().textContent).toContain(F.resultText.en);
    expect(Number.isFinite(angle())).toBe(true);
  });

  it('reverse order changes the diagram but leaves R unchanged', () => {
    render(<ForcesInteractive records={records} locale="en" />);
    const before = angle();
    const toggle = screen.getByRole('button', { name: `${F.reverse.en}. ${F.reverseLabel.en}` });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(resultLine().textContent).toContain(F.reversedNote.en);
    expect(angle()).toBe(before);
    // the list stays chronological whatever order the diagram uses
    expect(screen.getAllByRole('listitem').map((i) => i.querySelector('h3')?.textContent)).toEqual([
      'Title f1',
      'Title f2',
      'Title f3',
    ]);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(angle()).toBe(before);
  });
});
