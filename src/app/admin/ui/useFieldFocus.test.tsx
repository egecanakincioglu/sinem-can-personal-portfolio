import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFieldFocus } from './useFieldFocus';

let alan: string | null = null;
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(alan ? { alan } : {}) }));

function Probe() {
  useFieldFocus();
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  alan = null;
});

const run = (ms = 0) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('useFieldFocus', () => {
  it('focuses the control named by ?alan=', () => {
    alan = 'hero.lead.tr';
    render(
      <>
        <input data-field="other" />
        <textarea data-field="hero.lead.tr" />
        <Probe />
      </>,
    );
    run();
    expect(document.activeElement?.getAttribute('data-field')).toBe('hero.lead.tr');
  });

  it('lands on the Turkish side for a bilingual id without a language', () => {
    alan = 'hero.lead';
    render(
      <>
        <input data-field="hero.lead.tr" />
        <input data-field="hero.lead.en" />
        <Probe />
      </>,
    );
    run();
    expect(document.activeElement?.getAttribute('data-field')).toBe('hero.lead.tr');
  });

  it('waits for a control that mounts late', () => {
    alan = 'late';
    const { rerender } = render(<Probe />);
    run(300);
    rerender(
      <>
        <input data-field="late" />
        <Probe />
      </>,
    );
    run(200);
    expect(document.activeElement?.getAttribute('data-field')).toBe('late');
  });

  it('opens the language tab that holds the control', () => {
    alan = 'x.en';
    const opened = vi.fn();
    render(
      <>
        <button id="tab-en" type="button" onClick={opened}>
          EN
        </button>
        <div role="tabpanel" aria-labelledby="tab-en" className="a-pane">
          <input data-field="x.en" />
        </div>
        <Probe />
      </>,
    );
    run(100);
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it('puts the caret after the existing text', () => {
    alan = 'a';
    render(
      <>
        <input data-field="a" defaultValue="mevcut metin" />
        <Probe />
      </>,
    );
    run();
    const input = document.activeElement as HTMLInputElement;
    expect([input.selectionStart, input.selectionEnd]).toEqual([12, 12]);
  });

  it('copes with a control that has no caret', () => {
    alan = 'n';
    render(
      <>
        <input data-field="n" type="number" defaultValue="5" />
        <Probe />
      </>,
    );
    run();
    expect(document.activeElement?.getAttribute('data-field')).toBe('n');
  });

  it('scrolls the editor column only, never its clipped frame', () => {
    alan = 'deep';
    Element.prototype.getBoundingClientRect = function () {
      return { top: this.id === 'col' ? 0 : 900, height: 0, bottom: 0, left: 0, right: 0, width: 0 } as DOMRect;
    };
    render(
      <div className="a-body">
        <main id="col" className="a-main" style={{ overflowY: 'auto' }}>
          <div className="a-bar" />
          <input data-field="deep" />
        </main>
        <Probe />
      </div>,
    );
    const col = document.getElementById('col')!;
    Object.defineProperty(col, 'scrollHeight', { value: 3000 });
    Object.defineProperty(col, 'clientHeight', { value: 600 });
    const body = document.querySelector<HTMLElement>('.a-body')!;
    run();
    expect(col.scrollTop).toBeGreaterThan(0);
    expect(body.scrollTop).toBe(0);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('lets the page scroll where the column does not', () => {
    alan = 'p';
    render(
      <>
        <main className="a-main">
          <input data-field="p" />
        </main>
        <Probe />
      </>,
    );
    run();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does nothing without the parameter', () => {
    render(
      <>
        <input data-field="a" />
        <Probe />
      </>,
    );
    run(300);
    expect(document.activeElement).toBe(document.body);
  });
});
