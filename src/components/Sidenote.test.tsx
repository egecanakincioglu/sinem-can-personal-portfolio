import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Sidenote } from './Sidenote.tsx';

afterEach(cleanup);

describe('Sidenote', () => {
  it('discloses the note when its mark is pressed and hides it again', () => {
    const { container } = render(<Sidenote n="1">The note text</Sidenote>);
    const mark = screen.getByRole('button');
    const body = container.querySelector('.sn-body') as HTMLElement;

    expect(mark.getAttribute('aria-expanded')).toBe('false');
    expect(body.getAttribute('data-open')).toBe('false');
    expect(mark.getAttribute('aria-controls')).toBe(body.id);

    fireEvent.click(mark);
    expect(mark.getAttribute('aria-expanded')).toBe('true');
    expect(body.getAttribute('data-open')).toBe('true');
    expect(body.textContent).toContain('The note text');

    fireEvent.click(mark);
    expect(mark.getAttribute('aria-expanded')).toBe('false');
    expect(body.getAttribute('data-open')).toBe('false');
  });

  it('joins the mark to the word before it so it never wraps onto its own line', () => {
    const { container } = render(<Sidenote n="1">Body</Sidenote>);
    expect(container.querySelector('.sn')?.textContent?.startsWith(String.fromCodePoint(0x2060))).toBe(true);
  });

  it('shows the optional label inside the mark', () => {
    render(
      <Sidenote n="2" label="what is this">
        Body
      </Sidenote>,
    );
    expect(screen.getByRole('button').textContent).toContain('what is this');
  });
});
