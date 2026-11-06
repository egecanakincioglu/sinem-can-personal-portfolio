'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { ProjectRecord } from '@/content/projects/types';
import type { SiteContent } from '@/content/site-content';
import { sharedFieldIds } from '@/lib/preview-bridge';
import { selectPublicSnapshot, type PublicSnapshot } from '@/lib/public-snapshot';
import type { DeviceId } from '../screens';

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
  | { type: 'seedSamples'; records: ProjectRecord[] }
  | { type: 'clearSamples' }
  | { type: 'patchProject'; id: string; patch: ProjectPatch }
  | { type: 'probe'; id: string | null }
  | { type: 'toast'; id: number; text: string }
  | { type: 'dismiss'; id: number };

const withLog = (s: AdminState, text: string) => ({ ...s, log: [text, ...s.log].slice(0, 10) });

function reducer(s: AdminState, a: Action): AdminState {
  switch (a.type) {
    case 'hydrate':
      return {
        ...s,
        ...a.state,
        projects: Array.isArray(a.state.projects) ? a.state.projects : [],
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
      return { ...s, projects: [...s.projects.filter((p) => !p.fixture), ...a.records], seeded: true };
    case 'clearSamples':
      return { ...s, projects: s.projects.filter((p) => !p.fixture), seeded: false };
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
  seedSamples: (records: ProjectRecord[]) => void;
  clearSamples: () => void;
  patchProject: (id: string, patch: ProjectPatch) => void;
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
      seedSamples: (records) => {
        dispatch({ type: 'seedSamples', records });
        toast('Örnek veriler yüklendi (simülasyon). Geliştirme örneği olarak işaretlidir.');
      },
      clearSamples: () => {
        dispatch({ type: 'clearSamples' });
        toast('Örnekler kaldırıldı (simülasyon).');
      },
      patchProject: (id, patch) => dispatch({ type: 'patchProject', id, patch }),
      probeProject: (id) => dispatch({ type: 'probe', id }),
      toast,
      dismiss: (id) => dispatch({ type: 'dismiss', id }),
    }),
    [state, snapshot, toast],
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
