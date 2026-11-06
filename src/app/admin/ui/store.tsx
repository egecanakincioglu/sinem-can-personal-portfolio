'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectKind, ProjectRecord } from '@/content/projects/types';
import type { SiteContent } from '@/content/site-content';
import { collectIssues, type Issue } from '@/lib/admin-issues';
import { fold } from '@/lib/fold';
import type { PairedBlock } from '@/lib/note-blocks';
import { pairNote, type MockNote } from '@/lib/note-record';
import { sharedFieldIds } from '@/lib/preview-bridge';
import { applyFeatured, foldSlug, newRecordId } from '@/lib/project-edit';
import { selectPublicSnapshot, type PublicSnapshot } from '@/lib/public-snapshot';
import { changesBetween, pushRevision, stamp, type Change, type Revision, type WorkSnapshot } from '@/lib/publish';
import { blankBlock, type BlockType } from '../(workspace)/notlar/palette';
import { registry } from '../registry';
import type { DeviceId } from '../screens';

export { revLetter } from '@/lib/publish';

/** Mock admin state. Lives in React + sessionStorage only: nothing in localStorage, cookies or network. */
type Lang = 'tr' | 'en';
type Toast = { id: number; text: string };
type PreviewSource = 'draft' | 'published';
export type AdminState = {
  schema: 1; // a stored state with another schema is dropped on load
  editLang: Lang;
  previewLang: Lang;
  device: DeviceId;
  values: Record<string, string>; // edited field values, keyed by field id
  savedValues: Record<string, string>; // snapshot of the last mock Save: what "Discard" returns to
  projects: ProjectRecord[]; // mock project records: development samples and projects created here
  savedProjects: ProjectRecord[]; // snapshot of the last mock Save, like savedValues
  notes: MockNote[]; // mock note records, both languages side by side
  savedNotes: MockNote[]; // snapshot of the last mock Save, like savedValues
  seeded: boolean; // development samples loaded
  probe: string | null; // project id whose 3D preview is being tried in the live preview; never stored
  dirty: boolean;
  saveCount: number;
  rev: number; // 0 = A, 1 = B …
  published: { rev: number; at: string } | null; // simulated publish; `at` is local "YYYY-MM-DDTHH:MM"
  revisions: Revision[]; // newest first, at most 10
  previewSource: PreviewSource;
  recent: string[]; // last command palette commands, newest first, at most RECENT_MAX
  toasts: Toast[];
  log: string[]; // "Son eylemler"
  ready: boolean; // sessionStorage has been read; persistence is allowed only after this (never stored)
};

export const initialState: AdminState = {
  schema: 1,
  editLang: 'tr',
  previewLang: 'tr',
  device: 390,
  values: {},
  savedValues: {},
  projects: [],
  savedProjects: [],
  notes: [],
  savedNotes: [],
  seeded: false,
  probe: null,
  dirty: false,
  saveCount: 0,
  rev: 0,
  published: null,
  revisions: [],
  previewSource: 'draft',
  recent: [],
  toasts: [],
  log: [],
  ready: false,
};
const initial = initialState;
const KEY = 'antet-admin';
const PRISTINE = JSON.stringify({ ...initial, ready: undefined, toasts: undefined });

/** Any field of a project record except its id; `undefined` removes an optional field. `approved` exists only while published. */
export type ProjectPatch = Partial<Omit<Extract<ProjectRecord, { visibility: 'published' }>, 'id' | 'visibility'>> & {
  visibility?: ProjectRecord['visibility'];
};

/** A new draft: only what the creator chose is set; the Turkish address is suggested from the title. */
function draftProject(id: string, title: string, kind: ProjectKind): ProjectRecord {
  return {
    id,
    slug: { tr: foldSlug(title), en: '' },
    title: { tr: title, en: '' },
    kind,
    disciplines: [],
    status: 'in-progress',
    visibility: 'draft',
  };
}

function applyPatch(p: ProjectRecord, patch: ProjectPatch): ProjectRecord {
  const merged: Record<string, unknown> = { ...p, ...patch };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  if (merged.visibility === 'draft') delete merged.approved;
  return merged as ProjectRecord;
}

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
  | { type: 'publish'; at: string }
  | { type: 'restore'; rev: number }
  | { type: 'previewSource'; source: PreviewSource }
  | { type: 'recent'; id: string }
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
  | { type: 'createProject'; record: ProjectRecord }
  | { type: 'removeProject'; id: string }
  | { type: 'setFeatured'; id: string | null }
  | { type: 'probe'; id: string | null }
  | { type: 'toast'; id: number; text: string; quiet?: boolean }
  | { type: 'dismiss'; id: number };

const RECENT_MAX = 5;

const withLog = (s: AdminState, text: string) => ({ ...s, log: [text, ...s.log].slice(0, 10) });

const editNote = (s: AdminState, id: string, change: (n: MockNote) => MockNote): AdminState => ({
  ...s,
  notes: s.notes.map((n) => (n.id === id ? change(n) : n)),
  dirty: true,
});

/** Sample records that can be shown in the editor; one that does not pair is skipped. */
const pairSamples = (records: readonly NoteRecord[]): MockNote[] =>
  records.flatMap((record) => {
    const paired = pairNote(record);
    return paired.ok ? [paired.note] : [];
  });

/** What the last simulated publish contained, or the empty initial state before any. */
const baseline = (s: Pick<AdminState, 'published' | 'revisions'>): WorkSnapshot =>
  s.revisions.find((r) => r.rev === s.published?.rev)?.state ?? { values: {}, projects: [], notes: [] };

export function reducer(s: AdminState, a: Action): AdminState {
  switch (a.type) {
    case 'hydrate': {
      if (Object.keys(a.state).length > 0 && a.state.schema !== initial.schema)
        return { ...s, ready: true, toasts: [] };
      const st = a.state;
      const projects = Array.isArray(st.projects) ? st.projects : [];
      const notes = Array.isArray(st.notes) ? st.notes : [];
      return {
        ...s,
        ...st,
        projects,
        savedProjects: Array.isArray(st.savedProjects) ? st.savedProjects : projects,
        notes,
        savedNotes: Array.isArray(st.savedNotes) ? st.savedNotes : notes,
        seeded: st.seeded === true,
        // A revision stored before notes were part of the snapshot has none.
        revisions: Array.isArray(st.revisions)
          ? st.revisions.map((r) => ({ ...r, state: { ...r.state, notes: r.state.notes ?? [] } }))
          : [],
        published: st.published && typeof st.published.rev === 'number' ? st.published : null,
        previewSource: st.previewSource === 'published' ? 'published' : 'draft',
        recent: Array.isArray(st.recent)
          ? st.recent.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX)
          : [],
        probe: null,
        ready: true,
        toasts: [],
      };
    }
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
      return {
        ...s,
        savedValues: s.values,
        savedProjects: s.projects,
        savedNotes: s.notes,
        dirty: false,
        saveCount: s.saveCount + 1,
      };
    case 'discard':
      return { ...s, values: s.savedValues, projects: s.savedProjects, notes: s.savedNotes, dirty: false };
    case 'publish': {
      const rev = s.rev + 1;
      const state = { values: s.values, projects: s.projects, notes: s.notes };
      const revision: Revision = { rev, at: a.at, changes: changesBetween(baseline(s), state), state };
      return {
        ...s,
        savedValues: s.values,
        savedProjects: s.projects,
        savedNotes: s.notes,
        dirty: false,
        saveCount: s.saveCount + 1,
        rev,
        published: { rev, at: a.at },
        revisions: pushRevision(s.revisions, revision),
      };
    }
    case 'restore': {
      const r = s.revisions.find((x) => x.rev === a.rev);
      if (!r) return s;
      // Back into the working state as a save: the revision letter and the publish record stay as they are.
      return {
        ...s,
        values: r.state.values,
        savedValues: r.state.values,
        projects: r.state.projects,
        savedProjects: r.state.projects,
        notes: r.state.notes,
        savedNotes: r.state.notes,
        seeded: r.state.projects.some((p) => p.fixture) || r.state.notes.some((n) => n.fixture),
        dirty: false,
        saveCount: s.saveCount + 1,
      };
    }
    case 'previewSource':
      return { ...s, previewSource: a.source };
    case 'recent':
      return { ...s, recent: [a.id, ...s.recent.filter((x) => x !== a.id)].slice(0, RECENT_MAX) };
    case 'reset':
      return { ...initial, ready: true, toasts: s.toasts };
    case 'seedSamples':
      return {
        ...s,
        projects: [...s.projects.filter((p) => !p.fixture), ...a.records],
        savedProjects: [...s.savedProjects.filter((p) => !p.fixture), ...a.records],
        notes: [...s.notes.filter((n) => !n.fixture), ...pairSamples(a.notes)],
        savedNotes: [...s.savedNotes.filter((n) => !n.fixture), ...pairSamples(a.notes)],
        seeded: true,
      };
    case 'clearSamples':
      return {
        ...s,
        projects: s.projects.filter((p) => !p.fixture),
        savedProjects: s.savedProjects.filter((p) => !p.fixture),
        notes: s.notes.filter((n) => !n.fixture),
        savedNotes: s.savedNotes.filter((n) => !n.fixture),
        seeded: false,
      };
    case 'createNote':
      return { ...s, notes: [...s.notes, a.note], dirty: true };
    case 'patchNote':
      return editNote(s, a.id, (n) => ({ ...n, ...a.patch }));
    case 'removeNote':
      return { ...s, notes: s.notes.filter((n) => n.id !== a.id), dirty: true };
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
        projects: s.projects.map((p) => (p.id === a.id ? applyPatch(p, a.patch) : p)),
        dirty: true,
      };
    case 'createProject':
      return { ...s, projects: [...s.projects, a.record], dirty: true };
    case 'removeProject':
      return {
        ...s,
        projects: s.projects
          .filter((p) => p.id !== a.id)
          .map((p) => {
            if (!p.relatedIds?.includes(a.id)) return p;
            const rest = p.relatedIds.filter((x) => x !== a.id);
            return applyPatch(p, { relatedIds: rest.length ? rest : undefined });
          }),
        dirty: true,
      };
    case 'setFeatured':
      return { ...s, projects: applyFeatured(s.projects, a.id), dirty: true };
    case 'probe':
      return { ...s, probe: a.id };
    case 'toast':
      return (a.quiet ? (x: AdminState) => x : (x: AdminState) => withLog(x, a.text))({
        ...s,
        toasts: [...s.toasts, { id: a.id, text: a.text }],
      });
    case 'dismiss':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
  }
}

type Ctx = {
  state: AdminState;
  /** The public content as the current mock values would render it: one derivation shared by every editor readout. */
  derived: SiteContent;
  /** Everything the public site would take from the current mock state; the preview and every count come from it. */
  snapshot: PublicSnapshot;
  hydrated: boolean;
  /** Changes since the last simulated publish (or since the initial state before any). */
  pending: Change[];
  /** Validation errors and warnings for the working values. */
  issues: Issue[];
  /** The state of the last simulated publish, or null before any. */
  publishedState: WorkSnapshot | null;
  /** What the preview renders: the working values, or the last published ones when that source is chosen. */
  previewValues: Record<string, string>;
  previewSnapshot: PublicSnapshot;
  setEditLang: (l: Lang) => void;
  setPreviewLang: (l: Lang) => void;
  setDevice: (d: DeviceId) => void;
  setValue: (id: string, v: string) => void;
  save: () => void;
  discard: () => void;
  publish: () => void;
  restore: (rev: number) => void;
  setPreviewSource: (s: PreviewSource) => void;
  reset: () => void;
  pushRecent: (id: string) => void;
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
  /** Adds a draft with only the title (Turkish) and kind set; returns its new id. */
  createProject: (input: { title: string; kind: ProjectKind }) => string;
  removeProject: (id: string) => void;
  /** At most one featured project: `null` clears it. */
  setFeatured: (id: string | null) => void;
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
      const json = JSON.stringify(rest);
      if (json === PRISTINE) sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, json);
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

  const toast = useCallback((text: string, quiet = false) => {
    const id = ++seq.current;
    dispatch({ type: 'toast', id, text, quiet });
    window.setTimeout(() => dispatch({ type: 'dismiss', id }), 4500);
  }, []);

  const snapshot = useMemo(
    () =>
      selectPublicSnapshot({ values: state.values, projects: state.projects }, process.env.NODE_ENV === 'development'),
    [state.values, state.projects],
  );

  const { published, revisions } = state;
  const publishedState = useMemo(() => (published ? baseline({ published, revisions }) : null), [published, revisions]);
  const pending = useMemo(
    () =>
      changesBetween(publishedState ?? { values: {}, projects: [], notes: [] }, {
        values: state.values,
        projects: state.projects,
        notes: state.notes,
      }),
    [publishedState, state.values, state.projects, state.notes],
  );
  const issues = useMemo(() => collectIssues(state.values, snapshot, registry), [state.values, snapshot]);
  const showPublished = state.previewSource === 'published' && publishedState !== null;
  const previewSnapshot = useMemo(
    () => (showPublished ? selectPublicSnapshot(publishedState, process.env.NODE_ENV === 'development') : snapshot),
    [showPublished, publishedState, snapshot],
  );
  const previewValues = showPublished ? publishedState.values : state.values;
  // The footer date comes from the simulated publish, never from a typed value.
  const derived = useMemo(
    () => (state.published ? { ...snapshot.content, lastRevision: state.published.at.slice(0, 10) } : snapshot.content),
    [snapshot, state.published],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      derived,
      snapshot,
      hydrated: state.ready,
      pending,
      issues,
      publishedState,
      previewValues,
      previewSnapshot,
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
        dispatch({ type: 'publish', at: stamp() });
        toast('Yayınlandı (simülasyon). Gerçek siteye gönderilmedi.');
      },
      restore: (rev) => {
        dispatch({ type: 'restore', rev });
        toast('Revizyona dönüldü (simülasyon). Çalışma durumu o revizyonun içeriğine döndü.');
      },
      setPreviewSource: (source) => dispatch({ type: 'previewSource', source }),
      pushRecent: (id) => dispatch({ type: 'recent', id }),
      reset: () => {
        dispatch({ type: 'reset' });
        toast('Demo sıfırlandı (simülasyon).', true);
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
      createProject: ({ title, kind }) => {
        const id = newRecordId(
          'proje',
          state.projects.map((p) => p.id),
          Math.random,
        );
        dispatch({ type: 'createProject', record: draftProject(id, title.trim(), kind) });
        return id;
      },
      removeProject: (id) => dispatch({ type: 'removeProject', id }),
      setFeatured: (id) => dispatch({ type: 'setFeatured', id }),
      probeProject: (id) => dispatch({ type: 'probe', id }),
      toast,
      dismiss: (id) => dispatch({ type: 'dismiss', id }),
    }),
    [state, snapshot, derived, pending, issues, publishedState, previewValues, previewSnapshot, toast],
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
