'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectRecord } from '@/content/projects/types';
import type { SiteContent } from '@/content/site-content';
import type { PairedBlock } from '@/lib/note-blocks';
import { pairNote, type MockNote } from '@/lib/note-record';
import { sharedFieldIds } from '@/lib/preview-bridge';
import { selectPublicSnapshot, type PublicSnapshot } from '@/lib/public-snapshot';
import { blankBlock, type BlockType } from '../(workspace)/notlar/palette';
import { fold, type DeviceId } from '../screens';

/** Mock admin state. Lives in React + sessionStorage only: nothing in localStorage, cookies or network. */
type Lang = 'tr' | 'en';
type Toast = { id: number; text: string };
type AdminState = {
  editLang: Lang;
  previewLang: Lang;
  device: DeviceId;
  values: Record<string, string>; // edited field values, keyed by field id
  savedValues: Record<string, string>; // snapshot of the last mock Save: what "Discard" returns to
  projects: ProjectRecord[]; // mock project records; only development samples can be added for now
  notes: MockNote[]; // mock note records, both languages side by side
  seeded: boolean; // development samples loaded
  probe: string | null; // project id whose 3D preview is being tried in the live preview; never stored
  dirty: boolean;
  saveCount: number;
  rev: number; // 0 = A, 1 = B …
  toasts: Toast[];
  log: string[]; // "Son eylemler"
  ready: boolean; // sessionStorage has been read; persistence is allowed only after this (never stored)
};

const initial: AdminState = {
  editLang: 'tr',
  previewLang: 'tr',
  device: 390,
  values: {},
  savedValues: {},
  projects: [],
  notes: [],
  seeded: false,
  probe: null,
  dirty: false,
  saveCount: 0,
  rev: 0,
  toasts: [],
  log: [],
  ready: false,
};
const KEY = 'antet-admin';

/** The only record fields a screen may change through the store for now: the 3D preview and the private originals. */
type ProjectPatch = Partial<Pick<ProjectRecord, 'preview3d' | 'privateOriginals'>>;

/** Everything of a note a screen may change except its id and body blocks (those have their own actions). */
type NotePatch = Partial<Omit<MockNote, 'id' | 'blocks'>>;

/** The simulated "today" a new note is dated with. */
const SIM_TODAY = '2026-11-01';

/** A free, ASCII, kebab-case id for a new note, derived from its title. */
function newNoteId(title: string, taken: readonly string[]): string {
  const base =
    fold(title)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'not';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

function newNote(id: string, title: string): MockNote {
  const none = { tr: '', en: '' };
  return {
    id,
    status: 'draft',
    approved: false,
    published: SIM_TODAY,
    langs: { tr: 'on', en: 'off' },
    slug: { tr: id, en: '' },
    title: { tr: title, en: '' },
    subtitle: none,
    summary: none,
    category: none,
    tags: [],
    coverAlt: none,
    blocks: [],
    footnotes: [],
    references: [],
    revisions: [],
  };
}

type Action =
  | { type: 'hydrate'; state: Partial<AdminState> }
  | { type: 'editLang'; lang: Lang }
  | { type: 'previewLang'; lang: Lang }
  | { type: 'device'; device: DeviceId }
  | { type: 'value'; id: string; value: string }
  | { type: 'save' }
  | { type: 'discard' }
  | { type: 'publish' }
  | { type: 'reset' }
  | { type: 'seedSamples'; records: ProjectRecord[]; notes: NoteRecord[] }
  | { type: 'clearSamples' }
  | { type: 'patchProject'; id: string; patch: ProjectPatch }
  | { type: 'createNote'; note: MockNote }
  | { type: 'patchNote'; id: string; patch: NotePatch }
  | { type: 'removeNote'; id: string }
  | { type: 'addBlock'; id: string; block: PairedBlock; at: number }
  | { type: 'moveBlock'; id: string; index: number; by: -1 | 1 }
  | { type: 'removeBlock'; id: string; index: number }
  | { type: 'patchBlock'; id: string; index: number; block: PairedBlock }
  | { type: 'probe'; id: string | null }
  | { type: 'toast'; id: number; text: string }
  | { type: 'dismiss'; id: number };

const withLog = (s: AdminState, text: string) => ({ ...s, log: [text, ...s.log].slice(0, 10) });

const editNote = (s: AdminState, id: string, change: (n: MockNote) => MockNote): AdminState => ({
  ...s,
  notes: s.notes.map((n) => (n.id === id ? change(n) : n)),
});

function reducer(s: AdminState, a: Action): AdminState {
  switch (a.type) {
    case 'hydrate':
      return {
        ...s,
        ...a.state,
        projects: Array.isArray(a.state.projects) ? a.state.projects : [],
        notes: Array.isArray(a.state.notes) ? a.state.notes : [],
        seeded: a.state.seeded === true,
        probe: null,
        ready: true,
        toasts: [],
      };
    case 'editLang':
      return { ...s, editLang: a.lang };
    case 'previewLang':
      return { ...s, previewLang: a.lang };
    case 'device':
      return { ...s, device: a.device };
    case 'value':
      // Editors that show one shared string (hero.briefly, intro.heading ...) hold one value.
      return {
        ...s,
        values: { ...s.values, ...Object.fromEntries(sharedFieldIds(a.id).map((id) => [id, a.value])) },
        dirty: true,
      };
    case 'save':
      return { ...s, savedValues: s.values, dirty: false, saveCount: s.saveCount + 1 };
    case 'discard':
      return { ...s, values: s.savedValues, dirty: false };
    case 'publish':
      return { ...s, savedValues: s.values, dirty: false, saveCount: s.saveCount + 1, rev: s.rev + 1 };
    case 'reset':
      return { ...initial, ready: true, toasts: s.toasts, log: s.log };
    case 'seedSamples':
      return {
        ...s,
        projects: [...s.projects.filter((p) => !p.fixture), ...a.records],
        notes: [
          ...s.notes.filter((n) => !n.fixture),
          ...a.notes.flatMap((record) => {
            const paired = pairNote(record);
            return paired.ok ? [paired.note] : [];
          }),
        ],
        seeded: true,
      };
    case 'clearSamples':
      return {
        ...s,
        projects: s.projects.filter((p) => !p.fixture),
        notes: s.notes.filter((n) => !n.fixture),
        seeded: false,
      };
    case 'createNote':
      return { ...s, notes: [...s.notes, a.note] };
    case 'patchNote':
      return editNote(s, a.id, (n) => ({ ...n, ...a.patch }));
    case 'removeNote':
      return { ...s, notes: s.notes.filter((n) => n.id !== a.id) };
    case 'addBlock':
      return editNote(s, a.id, (n) => ({ ...n, blocks: n.blocks.toSpliced(a.at, 0, a.block) }));
    case 'moveBlock':
      return editNote(s, a.id, (n) => {
        const to = a.index + a.by;
        if (to < 0 || to >= n.blocks.length || a.index < 0 || a.index >= n.blocks.length) return n;
        const blocks = [...n.blocks];
        [blocks[a.index], blocks[to]] = [blocks[to], blocks[a.index]];
        return { ...n, blocks };
      });
    case 'removeBlock':
      return editNote(s, a.id, (n) => ({ ...n, blocks: n.blocks.filter((_, i) => i !== a.index) }));
    case 'patchBlock':
      return editNote(s, a.id, (n) => ({ ...n, blocks: n.blocks.map((b, i) => (i === a.index ? a.block : b)) }));
    case 'patchProject':
      return {
        ...s,
        projects: s.projects.map((p) =>
          p.id === a.id
            ? {
                ...p,
                ...('preview3d' in a.patch ? { preview3d: a.patch.preview3d } : {}),
                ...('privateOriginals' in a.patch ? { privateOriginals: a.patch.privateOriginals } : {}),
              }
            : p,
        ),
      };
    case 'probe':
      return { ...s, probe: a.id };
    case 'toast':
      return withLog({ ...s, toasts: [...s.toasts, { id: a.id, text: a.text }] }, a.text);
    case 'dismiss':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
  }
}

export const revLetter = (n: number): string => {
  let out = '';
  let i = n;
  do {
    out = String.fromCharCode(65 + (i % 26)) + out;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return out;
};

type Ctx = {
  state: AdminState;
  /** The public content as the current mock values would render it: one derivation shared by every editor readout. */
  derived: SiteContent;
  /** Everything the public site would take from the current mock state; the preview and every count come from it. */
  snapshot: PublicSnapshot;
  hydrated: boolean;
  setEditLang: (l: Lang) => void;
  setPreviewLang: (l: Lang) => void;
  setDevice: (d: DeviceId) => void;
  setValue: (id: string, v: string) => void;
  save: () => void;
  discard: () => void;
  publish: () => void;
  reset: () => void;
  seedSamples: (records: ProjectRecord[], notes?: NoteRecord[]) => void;
  clearSamples: () => void;
  patchProject: (id: string, patch: ProjectPatch) => void;
  /** Adds a draft note with this title (Turkish side only) and returns its id. */
  createNote: (title: string) => string;
  patchNote: (id: string, patch: NotePatch) => void;
  removeNote: (id: string) => void;
  addBlock: (id: string, type: BlockType, at: number) => void;
  moveBlock: (id: string, index: number, by: -1 | 1) => void;
  removeBlock: (id: string, index: number) => void;
  patchBlock: (id: string, index: number, block: PairedBlock) => void;
  setLang: (id: string, lang: Lang, to: 'on' | 'off') => void;
  setNoteFeatured: (id: string, featured: boolean) => void;
  probeProject: (id: string | null) => void;
  toast: (text: string) => void;
  dismiss: (id: number) => void;
};
const AdminCtx = createContext<Ctx | null>(null);
export const useAdmin = () => {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin outside AdminProvider');
  return c;
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const seq = useRef(0);

  useEffect(() => {
    let saved: Partial<AdminState> = {};
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw) as Partial<AdminState>;
    } catch {
      /* ignore */
    }
    delete saved.ready;
    dispatch({ type: 'hydrate', state: saved }); // always dispatched: it also flips `ready`
  }, []);

  useEffect(() => {
    // Not before the stored draft has been applied, or the initial state would overwrite it on every load.
    if (!state.ready) return;
    try {
      const { toasts: _t, ready: _r, ...rest } = state;
      void _t;
      void _r;
      sessionStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      /* ignore */
    }
  }, [state]);

  // Unsaved-change guard: the browser asks before a refresh/close would drop an unsaved draft.
  // (The draft itself survives a refresh in sessionStorage; the prompt makes that explicit.)
  useEffect(() => {
    if (!state.dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [state.dirty]);

  const toast = useCallback((text: string) => {
    const id = ++seq.current;
    dispatch({ type: 'toast', id, text });
    window.setTimeout(() => dispatch({ type: 'dismiss', id }), 4500);
  }, []);

  const snapshot = useMemo(
    () =>
      selectPublicSnapshot({ values: state.values, projects: state.projects }, process.env.NODE_ENV === 'development'),
    [state.values, state.projects],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      derived: snapshot.content,
      snapshot,
      hydrated: state.ready,
      setEditLang: (lang) => dispatch({ type: 'editLang', lang }),
      setPreviewLang: (lang) => dispatch({ type: 'previewLang', lang }),
      setDevice: (device) => dispatch({ type: 'device', device }),
      setValue: (id, v) => dispatch({ type: 'value', id, value: v }),
      save: () => {
        dispatch({ type: 'save' });
        toast('Kaydedildi (simülasyon) — yalnızca bu tarayıcı oturumunda.');
      },
      discard: () => {
        dispatch({ type: 'discard' });
        toast('Değişiklikler atıldı (simülasyon). Önizleme son kaydedilen değerlere döndü.');
      },
      publish: () => {
        dispatch({ type: 'publish' });
        toast('Yayınlandı (simülasyon). Gerçek siteye gönderilmedi.');
      },
      reset: () => {
        dispatch({ type: 'reset' });
        toast('Demo sıfırlandı (simülasyon).');
      },
      seedSamples: (records, notes = []) => {
        dispatch({ type: 'seedSamples', records, notes });
        toast('Örnek veriler yüklendi (simülasyon). Geliştirme örneği olarak işaretlidir.');
      },
      clearSamples: () => {
        dispatch({ type: 'clearSamples' });
        toast('Örnekler kaldırıldı (simülasyon).');
      },
      patchProject: (id, patch) => dispatch({ type: 'patchProject', id, patch }),
      createNote: (title) => {
        const id = newNoteId(
          title,
          state.notes.map((n) => n.id),
        );
        dispatch({ type: 'createNote', note: newNote(id, title) });
        return id;
      },
      patchNote: (id, patch) => dispatch({ type: 'patchNote', id, patch }),
      removeNote: (id) => dispatch({ type: 'removeNote', id }),
      addBlock: (id, type, at) => dispatch({ type: 'addBlock', id, block: blankBlock(type), at }),
      moveBlock: (id, index, by) => dispatch({ type: 'moveBlock', id, index, by }),
      removeBlock: (id, index) => dispatch({ type: 'removeBlock', id, index }),
      patchBlock: (id, index, block) => dispatch({ type: 'patchBlock', id, index, block }),
      setLang: (id, lang, to) => {
        const note = state.notes.find((n) => n.id === id);
        if (note) dispatch({ type: 'patchNote', id, patch: { langs: { ...note.langs, [lang]: to } } });
      },
      setNoteFeatured: (id, featured) => dispatch({ type: 'patchNote', id, patch: { featured } }),
      probeProject: (id) => dispatch({ type: 'probe', id }),
      toast,
      dismiss: (id) => dispatch({ type: 'dismiss', id }),
    }),
    [state, snapshot, toast],
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
