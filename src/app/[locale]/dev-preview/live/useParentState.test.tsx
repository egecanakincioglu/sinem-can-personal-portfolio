import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREVIEW_PROTOCOL } from '@/lib/preview-bridge';
import { useParentState } from './useParentState';

const realParent = window.parent;
afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'parent', { value: realParent, configurable: true });
  vi.restoreAllMocks();
});

function embed() {
  const parent = { postMessage: vi.fn() };
  Object.defineProperty(window, 'parent', { value: parent, configurable: true });
  return parent;
}
const send = (data: unknown, source: unknown, origin = window.location.origin) =>
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as MessageEventSource }));
  });
const state = (lang: string, projects?: unknown) => ({
  type: 'state',
  v: PREVIEW_PROTOCOL,
  lang,
  override: {},
  projects,
});

describe('useParentState', () => {
  it('stays empty and silent when the page is opened directly', () => {
    const { result } = renderHook(() => useParentState('tr'));
    expect(result.current).toBeUndefined();
  });

  it('announces itself to the parent and takes a valid state from it', () => {
    const parent = embed();
    const { result } = renderHook(() => useParentState('tr'));
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'ready', v: PREVIEW_PROTOCOL }, window.location.origin);
    send(state('tr', ['a-1', 'bad id']), parent);
    expect(result.current?.projects).toEqual(['a-1']);
  });

  it('drops messages from another origin, another window, another language or malformed ones', () => {
    const parent = embed();
    const { result } = renderHook(() => useParentState('tr'));
    send(state('tr'), parent, 'https://evil.example');
    send(state('tr'), { postMessage: vi.fn() });
    send(state('en'), parent);
    send({ type: 'state' }, parent);
    expect(result.current).toBeUndefined();
  });
});
