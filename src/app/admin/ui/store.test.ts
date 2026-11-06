import { describe, expect, it } from 'vitest';
import { fixtureNotes } from '@/content/fixtures/notes';
import { fixtureProjects } from '@/content/fixtures/projects';
import { initialState, reducer, type AdminState } from './store';

const ready: AdminState = { ...initialState, ready: true };
const edit = (s: AdminState, id: string, value: string) => reducer(s, { type: 'value', id, value });
const publish = (s: AdminState, at = '2026-11-06T10:00') => reducer(s, { type: 'publish', at });

describe('publish', () => {
  it('advances the revision, records the change list and the state, and clears the draft flag', () => {
    const s = publish(edit(ready, 'hero.lead.tr', 'Yeni cümle'));
    expect(s.rev).toBe(1);
    expect(s.published).toEqual({ rev: 1, at: '2026-11-06T10:00' });
    expect(s.dirty).toBe(false);
    expect(s.saveCount).toBe(1);
    expect(s.revisions).toHaveLength(1);
    expect(s.revisions[0].changes.map((c) => c.path)).toEqual(['draft.heroLead']);
    expect(s.revisions[0].state.values).toEqual({ 'hero.lead.tr': 'Yeni cümle' });
  });

  it('keeps the samples out of the change list of a revision', () => {
    const withSamples = reducer(ready, { type: 'seedSamples', records: fixtureProjects, notes: fixtureNotes });
    const s = publish(edit(withSamples, 'hero.lead.tr', 'Yeni cümle'));
    expect(s.revisions[0].changes.map((c) => c.path)).toEqual(['draft.heroLead']);
    expect(s.revisions[0].state.projects).toHaveLength(fixtureProjects.length);
  });

  it('lists only what changed since the previous publish', () => {
    const first = publish(edit(ready, 'hero.lead.tr', 'Yeni cümle'));
    const second = publish(edit(first, 'hero.lead.en', 'New sentence'), '2026-11-07T10:00');
    expect(second.rev).toBe(2);
    expect(second.revisions.map((r) => r.rev)).toEqual([2, 1]);
    expect(second.revisions[0].changes).toHaveLength(1);
    expect(second.revisions[0].changes[0].en?.after).toBe('New sentence');
  });

  it('keeps at most ten revisions, newest first', () => {
    let s = ready;
    for (let i = 0; i < 12; i++) s = publish(edit(s, 'hero.lead.tr', `Metin ${i}`));
    expect(s.revisions).toHaveLength(10);
    expect(s.revisions[0].rev).toBe(12);
    expect(s.revisions[9].rev).toBe(3);
  });
});

describe('restore', () => {
  it('returns the working state to a revision without publishing', () => {
    const a = publish(edit(ready, 'hero.lead.tr', 'Birinci'));
    const b = publish(edit(a, 'hero.lead.tr', 'İkinci'));
    const s = reducer(edit(b, 'hero.lead.tr', 'Üçüncü'), { type: 'restore', rev: 1 });
    expect(s.values).toEqual({ 'hero.lead.tr': 'Birinci' });
    expect(s.savedValues).toEqual(s.values);
    expect(s.dirty).toBe(false);
    expect(s.saveCount).toBe(b.saveCount + 1);
    expect(s.rev).toBe(2);
    expect(s.published).toEqual(b.published);
    expect(s.revisions).toEqual(b.revisions);
  });

  it('restores the project records too', () => {
    const withSamples = reducer(ready, { type: 'seedSamples', records: fixtureProjects, notes: [] });
    const a = publish(withSamples);
    const cleared = reducer(a, { type: 'clearSamples' });
    const s = reducer(cleared, { type: 'restore', rev: 1 });
    expect(s.projects).toHaveLength(fixtureProjects.length);
    expect(s.seeded).toBe(true);
  });

  it('brings an edited note back, and lists the note change under its title', () => {
    const sampled = reducer(ready, { type: 'seedSamples', records: [], notes: fixtureNotes });
    const seeded = { ...sampled, notes: sampled.notes.map((n) => ({ ...n, fixture: false })) };
    const id = seeded.notes[0].id;
    const original = seeded.notes[0].title.tr;
    const a = publish(seeded);
    const edited = reducer(a, { type: 'patchNote', id, patch: { title: { tr: 'Değişti', en: 'Changed' } } });
    const b = publish(edited);
    expect(b.revisions[0].changes.map((c) => c.label)).toContain(`Not “Değişti” · Başlık`);
    const s = reducer(edited, { type: 'restore', rev: 1 });
    expect(s.notes.find((n) => n.id === id)?.title.tr).toBe(original);
    expect(s.notes).toHaveLength(fixtureNotes.length);
  });

  it('restores a stored revision that has no notes, with an empty notes list', () => {
    const a = publish(edit(ready, 'hero.lead.tr', 'Birinci'));
    const stored = JSON.parse(JSON.stringify(a));
    for (const r of stored.revisions) delete r.state.notes;
    const hydrated = reducer(initialState, { type: 'hydrate', state: stored });
    const s = reducer(hydrated, { type: 'restore', rev: 1 });
    expect(s.notes).toEqual([]);
    expect(s.values).toEqual({ 'hero.lead.tr': 'Birinci' });
  });

  it('discards an unsaved note edit and keeps a saved one', () => {
    const seeded = reducer(ready, { type: 'seedSamples', records: [], notes: fixtureNotes });
    expect(seeded.dirty).toBe(false);
    const id = seeded.notes[0].id;
    const original = seeded.notes[0].title.tr;
    const edited = reducer(seeded, { type: 'patchNote', id, patch: { title: { tr: 'Değişti', en: 'Changed' } } });
    expect(edited.dirty).toBe(true);
    const discarded = reducer(edited, { type: 'discard' });
    expect(discarded.notes.find((n) => n.id === id)?.title.tr).toBe(original);
    expect(discarded.dirty).toBe(false);
    const saved = reducer(reducer(edited, { type: 'save' }), { type: 'discard' });
    expect(saved.notes.find((n) => n.id === id)?.title.tr).toBe('Değişti');
  });

  it('ignores a revision that does not exist', () => {
    expect(reducer(ready, { type: 'restore', rev: 9 })).toBe(ready);
  });
});

describe('previewSource', () => {
  it('switches between the draft and the published snapshot', () => {
    expect(reducer(ready, { type: 'previewSource', source: 'published' }).previewSource).toBe('published');
  });
});

describe('reset', () => {
  it('returns to the initial state and clears revisions, projects and the log', () => {
    let s = reducer(ready, { type: 'seedSamples', records: fixtureProjects, notes: [] });
    s = publish(edit(s, 'hero.lead.tr', 'Yeni cümle'));
    s = reducer(s, { type: 'toast', id: 1, text: 'Bir eylem' });
    expect(s.log).toHaveLength(1);
    const r = reducer(s, { type: 'reset' });
    expect(r).toEqual({ ...initialState, ready: true, toasts: s.toasts });
    expect(r.revisions).toEqual([]);
    expect(r.projects).toEqual([]);
    expect(r.log).toEqual([]);
  });

  it('can show a toast without logging it', () => {
    const s = reducer(ready, { type: 'toast', id: 1, text: 'Sıfırlandı', quiet: true });
    expect(s.toasts).toHaveLength(1);
    expect(s.log).toEqual([]);
  });
});

describe('hydrate', () => {
  it('opens the state for persistence even when nothing is stored', () => {
    expect(reducer(initialState, { type: 'hydrate', state: {} }).ready).toBe(true);
  });

  it('keeps a stored state with the current schema', () => {
    const stored = publish(edit(ready, 'hero.lead.tr', 'Yeni cümle'));
    const s = reducer(initialState, { type: 'hydrate', state: JSON.parse(JSON.stringify(stored)) });
    expect(s.values).toEqual(stored.values);
    expect(s.revisions).toHaveLength(1);
    expect(s.published).toEqual(stored.published);
  });

  it('drops a stored state with another schema', () => {
    const s = reducer(initialState, {
      type: 'hydrate',
      state: { values: { 'hero.lead.tr': 'Eski' }, schema: 2 as unknown as 1 },
    });
    expect(s).toEqual({ ...initialState, ready: true });
  });

  it('drops a stored state without a schema', () => {
    const s = reducer(initialState, { type: 'hydrate', state: { values: { 'hero.lead.tr': 'Eski' } } });
    expect(s.values).toEqual({});
  });

  it('keeps the recent commands, newest first, once each and at most five', () => {
    const s = ['a', 'b', 'c', 'a', 'd', 'e', 'f'].reduce<AdminState>(
      (acc, id) => reducer(acc, { type: 'recent', id }),
      ready,
    );
    expect(s.recent).toEqual(['f', 'e', 'd', 'a', 'c']);
  });

  it('repairs a malformed recent list', () => {
    expect(reducer(initialState, { type: 'hydrate', state: { schema: 1, recent: 'x' as never } }).recent).toEqual([]);
    const s = reducer(initialState, {
      type: 'hydrate',
      state: { schema: 1, recent: ['a', 1, 'b', 'c', 'd', 'e', 'f'] as never },
    });
    expect(s.recent).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('repairs malformed list and publish fields', () => {
    const s = reducer(initialState, {
      type: 'hydrate',
      state: { schema: 1, revisions: 'x' as never, published: { rev: 'a' } as never, previewSource: 'x' as never },
    });
    expect(s.revisions).toEqual([]);
    expect(s.published).toBeNull();
    expect(s.previewSource).toBe('draft');
  });
});
