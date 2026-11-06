'use client';

import { usePathname } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectRecord } from '@/content/projects/types';
import { screens } from '../screens';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { CommandPalette } from './CommandPalette';
import { PreviewPanel } from './PreviewPanel';
import { PublishDialog } from './PublishDialog';
import { Toolbar } from './Toolbar';
import { TaskQueue } from './TaskQueue';
import { ConfirmDialog, Toasts } from './feedback';
import { AdminProvider, useAdmin, type RecordLibrary } from './store';
import { useFieldFocus } from './useFieldFocus';

function FieldFocus() {
  useFieldFocus();
  return null;
}

/** `samples` are the development sample projects and notes the palette can load; the server passes them in. */
export function AdminShell({
  children,
  samples = [],
  noteSamples = [],
  library,
}: {
  children: ReactNode;
  samples?: ProjectRecord[];
  noteSamples?: NoteRecord[];
  library?: RecordLibrary;
}) {
  return (
    <AdminProvider library={library}>
      <Frame samples={samples} noteSamples={noteSamples}>
        {children}
      </Frame>
    </AdminProvider>
  );
}

/** Three-panel workspace: index · editor · preview. */
function Frame({
  children,
  samples,
  noteSamples,
}: {
  children: ReactNode;
  samples: ProjectRecord[];
  noteSamples: NoteRecord[];
}) {
  const path = usePathname();
  const slug = path.split('/').filter(Boolean)[1] ?? '';
  const screen = screens.find((s) => s.slug === slug) ?? screens[0];
  const { state, reset, dismiss } = useAdmin();
  const [navOpen, setNavOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false); // overlay/drawer below 1024
  const [previewHidden, setPreviewHidden] = useState(false); // collapsed on wide screens
  const [palette, setPalette] = useState(false);
  const [tasks, setTasks] = useState(false);
  const [pub, setPub] = useState(false);
  const [rst, setRst] = useState(false);

  // Trying a 3D preview brings the live preview into view, on narrow and wide screens alike.
  const [seenProbe, setSeenProbe] = useState(state.probe);
  if (seenProbe !== state.probe) {
    setSeenProbe(state.probe);
    if (state.probe) {
      setPreviewOpen(true);
      setPreviewHidden(false);
    }
  }

  const [seenPath, setSeenPath] = useState(path);
  if (seenPath !== path) {
    setSeenPath(path);
    setNavOpen(false);
    setPreviewOpen(false);
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('.a-bar-actions .a-btn')?.click();
      } else if (mod && e.key === 'Enter') {
        e.preventDefault();
        setPub(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const openPalette = useCallback(() => setPalette(true), []);
  const openTasks = useCallback(() => setTasks(true), []);
  const openPublish = useCallback(() => setPub(true), []);
  const openReset = useCallback(() => setRst(true), []);
  const hasPreview = !!screen.preview;

  return (
    <div
      className="a-frame"
      data-preview={hasPreview ? (previewHidden ? 'hidden' : 'on') : 'none'}
      data-preview-open={previewOpen || undefined}
    >
      <a href="#a-main" className="a-skip">
        Düzenleyiciye geç
      </a>
      {hasPreview && (
        <a href="#a-preview" className="a-skip">
          Önizlemeye geç
        </a>
      )}
      <AdminHeader onTasks={openTasks} onPalette={openPalette} />
      <div className="a-body">
        <aside id="a-side" className="a-side" data-open={navOpen || undefined} aria-label="Çalışma alanı gezinmesi">
          <AdminSidebar onNavigate={() => setNavOpen(false)} />
        </aside>
        <main id="a-main" className="a-main" tabIndex={-1}>
          <Toolbar
            hasPreview={hasPreview}
            previewOpen={previewOpen}
            onPreview={() => setPreviewOpen((v) => !v)}
            onPublish={openPublish}
            onNav={() => setNavOpen((v) => !v)}
            navOpen={navOpen}
          />
          <div className="a-main-in">
            <button
              type="button"
              className="a-btn a-navtoggle"
              aria-expanded={navOpen}
              aria-controls="a-side"
              onClick={() => setNavOpen((v) => !v)}
            >
              <span>Bölümler ve ekranlar</span>
              <span aria-hidden="true">+</span>
            </button>
            {children}
            <div className="a-main-end">
              <button type="button" className="a-link" onClick={openReset}>
                Demoyu sıfırla
              </button>
              {hasPreview && (
                <button type="button" className="a-link a-wide-only" onClick={() => setPreviewHidden((v) => !v)}>
                  {previewHidden ? 'Önizlemeyi göster' : 'Önizlemeyi gizle'}
                </button>
              )}
            </div>
          </div>
        </main>
        {hasPreview && (
          <aside
            id="a-preview"
            className="a-preview"
            aria-label="Canlı önizleme"
            data-open={previewOpen || undefined}
            tabIndex={-1}
          >
            <PreviewPanel route={screen.preview!} title={screen.title} onClose={() => setPreviewOpen(false)} />
          </aside>
        )}
      </div>

      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        onTasks={openTasks}
        onPublish={openPublish}
        onReset={openReset}
        samples={samples}
        noteSamples={noteSamples}
      />

      <TaskQueue open={tasks} onClose={() => setTasks(false)} />
      <Suspense fallback={null}>
        <FieldFocus />
      </Suspense>

      <PublishDialog open={pub} onClose={() => setPub(false)} />

      <ConfirmDialog
        open={rst}
        onClose={() => setRst(false)}
        title="Demoyu sıfırla (simülasyon)"
        confirmLabel="Sıfırla"
        onConfirm={reset}
      >
        <p>Bu oturumdaki tüm mock düzenlemeler silinir.</p>
        <p className="a-help">Gerçek site bu işlemden etkilenmez.</p>
      </ConfirmDialog>

      <Toasts toasts={state.toasts} onDismiss={dismiss} />
    </div>
  );
}
