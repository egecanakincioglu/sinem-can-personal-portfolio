import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminProvider, useAdmin, useAdminContent } from './store';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

type Full = ReturnType<typeof useAdmin>;
type Content = ReturnType<typeof useAdminContent>;

function mount() {
  const full: { current: Full | null } = { current: null };
  const content: { current: Content | null } = { current: null };
  const renders = { editor: 0 };
  function Chrome() {
    full.current = useAdmin();
    return null;
  }
  function Editor() {
    content.current = useAdminContent();
    renders.editor++;
    return null;
  }
  render(
    <AdminProvider>
      <Chrome />
      <Editor />
    </AdminProvider>,
  );
  return { full: () => full.current!, content: () => content.current!, renders };
}

describe('editor view of the store', () => {
  it('does not re-render an editor when only a preview control changes', () => {
    const s = mount();
    const before = s.renders.editor;
    act(() => s.full().setDevice(1440));
    act(() => s.full().setPreviewLang('en'));
    act(() => s.full().setPreviewSource('published'));
    act(() => s.full().setEditLang('en'));
    expect(s.full().state.device).toBe(1440);
    expect(s.full().state.editLang).toBe('en');
    expect(s.renders.editor).toBe(before);
  });

  it('does not re-render an editor for a toast or a recent command', () => {
    const s = mount();
    const before = s.renders.editor;
    act(() => s.full().toast('merhaba'));
    act(() => s.full().pushRecent('open-publish'));
    expect(s.full().state.toasts).toHaveLength(1);
    expect(s.renders.editor).toBe(before);
  });

  it('re-renders an editor with the new value when a field is edited', () => {
    const s = mount();
    const before = s.renders.editor;
    act(() => s.content().setValue('hero.briefly.tr', 'Kısaca'));
    expect(s.content().state.values['hero.briefly.tr']).toBe('Kısaca');
    expect(s.content().state.dirty).toBe(true);
    expect(s.renders.editor).toBeGreaterThan(before);
  });

  it('keeps every action identical across edits and preview changes', () => {
    const s = mount();
    const first = s.content();
    act(() => s.content().setValue('hero.briefly.tr', 'A'));
    act(() => s.full().setDevice(768));
    const later = s.content();
    for (const k of ['setValue', 'save', 'patchProject', 'createNote', 'toast'] as const) {
      expect(later[k]).toBe(first[k]);
    }
  });

  it('exposes the same derived data to both views', () => {
    const s = mount();
    act(() => s.content().setValue('hero.briefly.tr', 'Ortak'));
    expect(s.content().derived).toBe(s.full().derived);
    expect(s.content().issues).toBe(s.full().issues);
    expect(s.content().state.values).toBe(s.full().state.values);
  });
});
