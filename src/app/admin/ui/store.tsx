'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { ProjectKind, ProjectRecord } from '@/content/projects/types';
import type { SiteContent } from '@/content/site-content';
import { sharedFieldIds } from '@/lib/preview-bridge';
import { applyFeatured, newRecordId } from '@/lib/project-edit';
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
  projects: ProjectRecord[]; // mock project records: development samples and projects created here
  savedProjects: ProjectRecord[]; // snapshot of the last mock Save, like savedValues
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
  savedProjects: [],
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

/** Any field of a project record except its id; `undefined` removes an optional field. `approved` exists only while published. */
export type ProjectPatch = Partial<Omit<Extract<ProjectRecord, { visibility: 'published' }>, 'id' | 'visibility'>> & {
  visibility?: ProjectRecord['visibility'];
};

/** A new draft: only what the creator chose is set; the rest stays empty. */
function draftProject(id: string, title: string, kind: ProjectKind): ProjectRecord {
  return {
    id,
    slug: { tr: '', en: '' },
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
  | { type: 'createProject'; record: ProjectRecord }
  | { type: 'removeProject'; id: string }
  | { type: 'setFeatured'; id: string | null }
  | { type: 'probe'; id: string | null }
  | { type: 'toast'; id: number; text: string }
  | { type: 'dismiss'; id: number };

const withLog = (s: AdminState, text: string) => ({ ...s, log: [text, ...s.log].slice(0, 10) });

function reducer(s: AdminState, a: Action): AdminState {
  switch (a.type) {
    case 'hydrate': {
      const projects = Array.isArray(a.state.projects) ? a.state.projects : [];
      return {
        ...s,
        ...a.state,
        projects,
        savedProjects: Array.isArray(a.state.savedProjects) ? a.state.savedProjects : projects,
        seeded: a.state.seeded === true,
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
      return { ...s, savedValues: s.values, savedProjects: s.projects, dirty: false, saveCount: s.saveCount + 1 };
    case 'discard':
      return { ...s, values: s.savedValues, projects: s.savedProjects, dirty: false };
    case 'publish':
      return {
        ...s,
        savedValues: s.values,
        savedProjects: s.projects,
        dirty: false,
        saveCount: s.saveCount + 1,
        rev: s.rev + 1,
      };
    case 'reset':
      return { ...initial, ready: true, toasts: s.toasts, log: s.log };
    case 'seedSamples':
      return {
        ...s,
        projects: [...s.projects.filter((p) => !p.fixture), ...a.records],
        savedProjects: [...s.savedProjects.filter((p) => !p.fixture), ...a.records],
        seeded: true,
      };
    case 'clearSamples':
      return {
        ...s,
        projects: s.projects.filter((p) => !p.fixture),
        savedProjects: s.savedProjects.filter((p) => !p.fixture),
        seeded: false,
      };
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
    [state, snapshot, toast],
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
