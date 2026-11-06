import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PREVIEW_PROTOCOL } from '@/lib/preview-bridge';
import { PreviewPanel } from './PreviewPanel';
import { AdminProvider } from './store';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mount = (route: string) => {
  render(
    <AdminProvider>
      <PreviewPanel route={route} title="Ana sayfa" onClose={() => undefined} />
    </AdminProvider>,
  );
  const frame = screen.getByTitle(/Canlı önizleme/) as HTMLIFrameElement;
  const post = vi.spyOn(frame.contentWindow!, 'postMessage').mockImplementation(() => undefined);
  const ready = () =>
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'ready', v: PREVIEW_PROTOCOL },
          origin: window.location.origin,
          source: frame.contentWindow,
        }),
      );
    });
  const wait = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  return { post, ready, wait };
};

describe('PreviewPanel bridge', () => {
  it('sends the state once when the frame says ready', () => {
    const { post, ready, wait } = mount('ana-sayfa');
    ready();
    wait(300);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toMatchObject({ type: 'state', v: PREVIEW_PROTOCOL });
  });

  it('does not answer the frame’s repeated ready messages with the full state again', () => {
    const { post, ready, wait } = mount('ana-sayfa');
    ready();
    wait(300);
    // A repeat right after the send is not answered; a ready after the quiet window (a reloaded frame) is.
    wait(300);
    ready();
    wait(300);
    expect(post).toHaveBeenCalledTimes(1);
    wait(1500);
    ready();
    wait(300);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('never loops: no message to the frame follows without a ready or an edit', () => {
    const { post, ready, wait } = mount('ana-sayfa');
    ready();
    wait(300);
    wait(60_000);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('ignores a ready from another origin', () => {
    const { post, wait } = mount('ana-sayfa');
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'ready', v: PREVIEW_PROTOCOL },
          origin: 'https://evil.example',
          source: (screen.getByTitle(/Canlı önizleme/) as HTMLIFrameElement).contentWindow,
        }),
      );
    });
    wait(500);
    expect(post).not.toHaveBeenCalled();
  });
});

describe('PreviewPanel controls', () => {
  it('shows the device, source and language controls for a connected preview', () => {
    mount('ana-sayfa');
    expect(screen.getByRole('radiogroup', { name: 'Önizleme genişliği' })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Önizleme kaynağı' })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Önizleme dili' })).toBeTruthy();
  });

  it('hides them, and the caption, when the screen has no connected preview', () => {
    mount('notlar');
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByText(/ · \d+ px/)).toBeNull();
  });
});
