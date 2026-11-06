import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { isVisible, useModalFocus } from './feedback';

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('style').forEach((s) => s.remove());
});

function Trap() {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocus(ref, true, () => undefined);
  return (
    <div ref={ref}>
      <button type="button">first</button>
      <button type="button" className="gone">
        gone
      </button>
      <button type="button" hidden>
        hidden
      </button>
      <button type="button">last</button>
    </div>
  );
}

describe('isVisible', () => {
  it('rejects display:none (own or inherited), visibility:hidden, [hidden] and [inert] ancestors', () => {
    const style = document.createElement('style');
    style.textContent = '.none{display:none}.inv{visibility:hidden}';
    document.head.append(style);
    document.body.innerHTML =
      '<div id="root"><span class="none"><i id="a"></i></span><b id="b" class="inv"></b><div inert><u id="c"></u></div><s id="d"></s></div>';
    const root = document.getElementById('root')!;
    const at = (id: string) => document.getElementById(id)!;
    expect(isVisible(at('a'), root)).toBe(false);
    expect(isVisible(at('b'), root)).toBe(false);
    expect(isVisible(at('c'), root)).toBe(false);
    expect(isVisible(at('d'), root)).toBe(true);
  });
});

describe('useModalFocus', () => {
  it('wraps Tab over visible controls only (a display:none Close button does not count)', () => {
    const style = document.createElement('style');
    style.textContent = '.gone{display:none}';
    document.head.append(style);
    render(<Trap />);
    const first = screen.getByText('first');
    const last = screen.getByText('last');
    expect(document.activeElement).toBe(first);
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('skips links taken out of the tab order (roving lists) when it finds the last stop', () => {
    function Roving() {
      const ref = useRef<HTMLDivElement>(null);
      useModalFocus(ref, true, () => undefined);
      return (
        <div ref={ref}>
          <button type="button">start</button>
          <a href="#a" tabIndex={0}>
            stop
          </a>
          <a href="#b" tabIndex={-1}>
            skipped
          </a>
        </div>
      );
    }
    render(<Roving />);
    const stop = screen.getByText('stop');
    stop.focus();
    fireEvent.keyDown(stop, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByText('start'));
  });

  it('wraps from the last visible control even when the final control in the DOM is hidden', () => {
    const style = document.createElement('style');
    style.textContent = '.gone{display:none}';
    document.head.append(style);
    function Tail() {
      const ref = useRef<HTMLDivElement>(null);
      useModalFocus(ref, true, () => undefined);
      return (
        <div ref={ref}>
          <button type="button">a</button>
          <button type="button">b</button>
          <button type="button" className="gone">
            close
          </button>
        </div>
      );
    }
    render(<Tail />);
    const b = screen.getByText('b');
    b.focus();
    fireEvent.keyDown(b, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByText('a'));
  });
});
