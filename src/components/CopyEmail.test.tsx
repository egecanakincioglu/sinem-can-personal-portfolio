import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyEmail } from './CopyEmail.tsx';

const props = {
  email: 'name@example.test',
  label: 'Copy address',
  copied: 'Copied',
  failed: 'Could not copy',
  ariaLabel: 'Copy the email address',
};

function stubClipboard(writeText: (t: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CopyEmail', () => {
  it('copies the address and announces it in a polite status region, then clears the message', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<CopyEmail {...props} />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: props.ariaLabel }));
    });
    expect(writeText).toHaveBeenCalledWith(props.email);
    expect(status.textContent).toBe('Copied');

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(status.textContent).toBe('');
  });

  it('announces a failure when the clipboard refuses', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    render(<CopyEmail {...props} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByRole('status').textContent).toBe('Could not copy');
  });

  it('keeps a 44px wide hit area around a short label', () => {
    render(<CopyEmail {...props} />);
    const className = screen.getByRole('button', { name: props.ariaLabel }).className;
    expect(className).toContain('min-h-11');
    expect(className).toContain('min-w-11');
    expect(className).toContain('justify-center');
  });
});
