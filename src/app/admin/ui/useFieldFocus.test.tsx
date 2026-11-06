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
