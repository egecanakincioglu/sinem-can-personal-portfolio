'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { ProjectRecord } from '@/content/projects/types';
import type { SiteContent } from '@/content/site-content';
import { collectIssues, type Issue } from '@/lib/admin-issues';
import { selectPublicSnapshot, type PublicSnapshot } from '@/lib/public-snapshot';
import { changesBetween, pushRevision, stamp, type Change, type Revision, type WorkSnapshot } from '@/lib/publish';
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
  projects: ProjectRecord[]; // mock project records; only development samples can be added for now
  seeded: boolean; // development samples loaded
  dirty: boolean;
  saveCount: number;
  rev: number; // 0 = A, 1 = B …
  published: { rev: number; at: string } | null; // simulated publish; `at` is local "YYYY-MM-DDTHH:MM"
  revisions: Revision[]; // newest first, at most 10
  previewSource: PreviewSource;
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
  seeded: false,
  dirty: false,
  saveCount: 0,
  rev: 0,
  published: null,
  revisions: [],
  previewSource: 'draft',
  toasts: [],
  log: [],
  ready: false,
};
const initial = initialState;
const KEY = 'antet-admin';
const PRISTINE = JSON.stringify({ ...initial, ready: undefined, toasts: undefined });

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
  | { type: 'reset' }
  | { type: 'seedSamples'; records: ProjectRecord[] }
  | { type: 'clearSamples' }
  | { type: 'toast'; id: number; text: string; quiet?: boolean }
  | { type: 'dismiss'; id: number };

const withLog = (s: AdminState, text: string) => ({ ...s, log: [text, ...s.log].slice(0, 10) });

/** What the last simulated publish contained, or the empty initial state before any. */
const baseline = (s: Pick<AdminState, 'published' | 'revisions'>): WorkSnapshot =>
  s.revisions.find((r) => r.rev === s.published?.rev)?.state ?? { values: {}, projects: [] };

export function reducer(s: AdminState, a: Action): AdminState {
  switch (a.type) {
    case 'hydrate': {
      if (Object.keys(a.state).length > 0 && a.state.schema !== initial.schema)
        return { ...s, ready: true, toasts: [] };
      const st = a.state;
      return {
        ...s,
        ...st,
        projects: Array.isArray(st.projects) ? st.projects : [],
        seeded: st.seeded === true,
        revisions: Array.isArray(st.revisions) ? st.revisions : [],
        published: st.published && typeof st.published.rev === 'number' ? st.published : null,
        previewSource: st.previewSource === 'published' ? 'published' : 'draft',
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
      return { ...s, values: { ...s.values, [a.id]: a.value }, dirty: true };
    case 'save':
      return { ...s, savedValues: s.values, dirty: false, saveCount: s.saveCount + 1 };
    case 'discard':
      return { ...s, values: s.savedValues, dirty: false };
    case 'publish': {
      const rev = s.rev + 1;
      const state = { values: s.values, projects: s.projects };
      const revision: Revision = { rev, at: a.at, changes: changesBetween(baseline(s), state), state };
      return {
        ...s,
        savedValues: s.values,
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
        seeded: r.state.projects.some((p) => p.fixture),
        dirty: false,
        saveCount: s.saveCount + 1,
      };
    }
    case 'previewSource':
      return { ...s, previewSource: a.source };
    case 'reset':
      return { ...initial, ready: true, toasts: s.toasts };
    case 'seedSamples':
      return { ...s, projects: [...s.projects.filter((p) => !p.fixture), ...a.records], seeded: true };
    case 'clearSamples':
      return { ...s, projects: s.projects.filter((p) => !p.fixture), seeded: false };
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
  seedSamples: (records: ProjectRecord[]) => void;
  clearSamples: () => void;
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
      changesBetween(publishedState ?? { values: {}, projects: [] }, {
        values: state.values,
        projects: state.projects,
      }),
    [publishedState, state.values, state.projects],
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
      reset: () => {
        dispatch({ type: 'reset' });
        toast('Demo sıfırlandı (simülasyon).', true);
      },
      seedSamples: (records) => {
        dispatch({ type: 'seedSamples', records });
        toast('Örnek veriler yüklendi (simülasyon). Geliştirme örneği olarak işaretlidir.');
      },
      clearSamples: () => {
        dispatch({ type: 'clearSamples' });
        toast('Örnekler kaldırıldı (simülasyon).');
      },
      toast,
      dismiss: (id) => dispatch({ type: 'dismiss', id }),
    }),
    [state, snapshot, derived, pending, issues, publishedState, previewValues, previewSnapshot, toast],
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
