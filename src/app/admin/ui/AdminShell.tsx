'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { screens } from '../screens';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { CommandPalette } from './CommandPalette';
import { PreviewPanel } from './PreviewPanel';
import { Toolbar } from './Toolbar';
import { ConfirmDialog, Dialog, EmptyState, Toasts } from './feedback';
import { AdminProvider, revLetter, useAdmin } from './store';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <Frame>{children}</Frame>
    </AdminProvider>
  );
}

/** Three-panel workspace: index · editor · preview. */
function Frame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const slug = path.split('/').filter(Boolean)[1] ?? '';
  const screen = screens.find((s) => s.slug === slug) ?? screens[0];
  const { state, publish, reset, dismiss } = useAdmin();
  const [navOpen, setNavOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false); // overlay/drawer below 1024
  const [previewHidden, setPreviewHidden] = useState(false); // collapsed on wide screens
  const [palette, setPalette] = useState(false);
  const [tasks, setTasks] = useState(false);
  const [pub, setPub] = useState(false);
  const [rst, setRst] = useState(false);

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
      />

      <Dialog open={tasks} onClose={() => setTasks(false)} label="Görev kuyruğu" variant="sheet">
        <div className="a-dialog-bar">
          <h2 className="a-dialog-title">Görev kuyruğu</h2>
          <button type="button" className="a-link" onClick={() => setTasks(false)}>
            Kapat
          </button>
        </div>
        <EmptyState title="Bekleyen görev yok." mark="0 görev">
          <p>
            Eksik çeviriler, onay bekleyen metinler ve hatalar burada kayıt alanlarından türetilerek listelenecek. Bu
            liste elle yazılmaz.
          </p>
          <p className="a-help">Prototip: görev kuyruğu sonraki aşamada dolar.</p>
        </EmptyState>
      </Dialog>

      <ConfirmDialog
        open={pub}
        onClose={() => setPub(false)}
        title="Yayınla (simülasyon)"
        confirmLabel="Yayını simüle et"
        onConfirm={publish}
      >
        <p>
          Rev. {revLetter(state.rev)} → Rev. {revLetter(state.rev + 1)} olarak simüle edilecek.
        </p>
        <p className="a-help">Gerçek site bu işlemden etkilenmez. Hiçbir şey sunucuya gönderilmez.</p>
      </ConfirmDialog>

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
