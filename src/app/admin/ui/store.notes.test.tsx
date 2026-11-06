import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fixtureNotes } from '@/content/fixtures/notes';
import { AdminProvider, useAdmin } from './store';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function setup(stored?: object) {
  if (stored) sessionStorage.setItem('antet-admin', JSON.stringify(stored));
  let api!: ReturnType<typeof useAdmin>;
  function Probe() {
    api = useAdmin();
    return null;
  }
  render(
    <AdminProvider>
      <Probe />
    </AdminProvider>,
  );
  return { get: () => api };
}

describe('note actions', () => {
  it('creates a draft dated on the simulated day with a free ASCII id', () => {
    const s = setup();
    let first = '';
    let second = '';
    act(() => {
      first = s.get().createNote('Kiriş Eğilmesi');
    });
    act(() => {
      second = s.get().createNote('Kiriş Eğilmesi');
    });
    expect([first, second]).toEqual(['kiris-egilmesi', 'kiris-egilmesi-2']);
    const n = s.get().state.notes[0];
    expect(n).toMatchObject({
      status: 'draft',
      approved: false,
      published: '2026-11-01',
      langs: { tr: 'on', en: 'off' },
      title: { tr: 'Kiriş Eğilmesi', en: '' },
    });
  });

  it('patches, features, switches languages and removes', () => {
    const s = setup();
    act(() => {
      s.get().createNote('A');
    });
    act(() => s.get().patchNote('a', { approved: true }));
    act(() => s.get().setNoteFeatured('a', true));
    act(() => s.get().setLang('a', 'en', 'on'));
    expect(s.get().state.notes[0]).toMatchObject({ approved: true, featured: true, langs: { tr: 'on', en: 'on' } });
    act(() => s.get().setLang('missing', 'en', 'off'));
    act(() => s.get().removeNote('a'));
    expect(s.get().state.notes).toEqual([]);
  });

  it('adds, moves, patches and removes blocks', () => {
    const s = setup();
    act(() => {
      s.get().createNote('A');
    });
    act(() => s.get().addBlock('a', 'p', 0));
    act(() => s.get().addBlock('a', 'table', 1));
    act(() => s.get().addBlock('a', 'h2', 0));
    const types = () => s.get().state.notes[0].blocks.map((b) => b.type);
    expect(types()).toEqual(['h2', 'p', 'table']);
    act(() => s.get().moveBlock('a', 0, 1));
    expect(types()).toEqual(['p', 'h2', 'table']);
    act(() => s.get().moveBlock('a', 0, -1));
    act(() => s.get().moveBlock('a', 2, 1));
    expect(types()).toEqual(['p', 'h2', 'table']);
    act(() => s.get().patchBlock('a', 0, { type: 'p', text: { tr: 'Merhaba', en: '' } }));
    expect(s.get().state.notes[0].blocks[0]).toEqual({ type: 'p', text: { tr: 'Merhaba', en: '' } });
    act(() => s.get().removeBlock('a', 1));
    expect(types()).toEqual(['p', 'table']);
  });

  it('loads the sample notes through pairing and removes only them', () => {
    const s = setup();
    act(() => {
      s.get().createNote('Kendi notum');
    });
    act(() => s.get().seedSamples([], fixtureNotes));
    const { notes } = s.get().state;
    expect(notes).toHaveLength(fixtureNotes.length + 1);
    expect(notes.filter((n) => n.fixture)).toHaveLength(fixtureNotes.length);
    act(() => s.get().seedSamples([], fixtureNotes));
    expect(s.get().state.notes).toHaveLength(fixtureNotes.length + 1);
    act(() => s.get().clearSamples());
    expect(s.get().state.notes.map((n) => n.id)).toEqual(['kendi-notum']);
  });

  it('resets notes with the demo reset and hydrates a stored state without them', () => {
    const s = setup({ schema: 1, seeded: false });
    expect(s.get().state.notes).toEqual([]);
    act(() => {
      s.get().createNote('A');
    });
    act(() => s.get().reset());
    expect(s.get().state.notes).toEqual([]);
  });
});
