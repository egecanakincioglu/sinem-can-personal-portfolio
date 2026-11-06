'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Line-language glyphs: states are drawn, not coloured. */
export function Glyph({ name }: { name: 'check' | 'bang' | 'lock' | 'plus' | 'up' | 'down' | 'x' | 'arrow' }) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: name === 'check' ? 1.5 : 1.25,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
  };
  const d: Record<string, ReactNode> = {
    check: <path d="M2.5 8.5 6.2 12 13.5 4" />,
    bang: (
      <>
        <path d="M8 3v6" strokeDasharray="2 1.5" />
        <path d="M8 12v1.5" />
      </>
    ),
    lock: (
      <>
        <rect x="3.5" y="7" width="9" height="6.5" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
      </>
    ),
    plus: <path d="M8 3v10M3 8h10" />,
    up: <path d="M8 13V3M4 7l4-4 4 4" />,
    down: <path d="M8 3v10M4 9l4 4 4-4" />,
    x: <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />,
    arrow: <path d="M3 8h10M9 4l4 4-4 4" />,
  };
  return (
    <svg className="a-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...p}>
      {d[name]}
    </svg>
  );
}

/** Persistent, non-dismissible prototype banner. */
export function SimBanner() {
  return (
    <div className="a-sim" role="region" aria-label="Prototip bildirimi">
      <strong>Prototip</strong>
      <span> — Değişiklikler sunucuya gitmez; yalnızca bu tarayıcı oturumunda saklanır.</span>
    </div>
  );
}

export type ChipKind =
  'draft' | 'ready' | 'live' | 'approved' | 'text-draft' | 'missing' | 'derived' | 'locked' | 'sample';
const chipText: Record<ChipKind, string> = {
  draft: 'Taslak',
  ready: 'Yayına hazır (sim.)',
  live: 'Yayında (sim.)',
  approved: 'Onaylı',
  'text-draft': 'Taslak metin',
  missing: 'EN eksik',
  derived: 'Türetilmiş',
  locked: 'Korumalı',
  sample: 'Geliştirme örneği',
};
export function StatusChip({ kind, children }: { kind: ChipKind; children?: ReactNode }) {
  return (
    <span className={`a-chip a-chip-${kind}`}>
      {kind === 'locked' && <Glyph name="lock" />}
      {children ?? chipText[kind]}
    </span>
  );
}

export function Readout({
  label,
  value,
  unit,
  derived,
  locked,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  derived?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="a-readout">
      <dt>
        {label}
        {derived && <span className="a-sfx"> · türetilmiş</span>}
        {locked && <span className="a-sfx"> · korumalı</span>}
      </dt>
      <dd>
        <span className="a-num">{value}</span>
        {unit && <span className="a-unit"> {unit}</span>}
      </dd>
    </div>
  );
}

export function EmptyState({ title, children, mark }: { title: string; children?: ReactNode; mark?: string }) {
  return (
    <div className="a-empty">
      {mark && <p className="a-note-mark">{mark}</p>}
      <p className="a-empty-title">{title}</p>
      {children && <div className="a-empty-body">{children}</div>}
    </div>
  );
}

export function ErrorState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="a-error-state" role="alert">
      <p className="a-empty-title">
        <Glyph name="bang" /> Hata: {title}
      </p>
      {children && <div className="a-empty-body">{children}</div>}
      {action}
    </div>
  );
}

/** Modal base: focus trap, Esc, focus return to the invoker. */
export function Dialog({
  open,
  onClose,
  label,
  children,
  variant = 'dialog',
  initialFocus,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  variant?: 'dialog' | 'sheet' | 'palette';
  initialFocus?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
      );
    const first0 = (initialFocus ? el.querySelector<HTMLElement>(initialFocus) : null) ?? focusables()[0];
    first0?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', key, true);
    document.documentElement.dataset.locked = '1';
    return () => {
      document.removeEventListener('keydown', key, true);
      delete document.documentElement.dataset.locked;
      opener.current?.focus();
    };
  }, [open, onClose, initialFocus]);
  if (!open) return null;
  return (
    <div
      className={`a-scrim a-scrim-${variant}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} className={`a-dialog a-dialog-${variant}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const id = useId();
  return (
    <Dialog open={open} onClose={onClose} label={title} initialFocus="[data-cancel]">
      <h2 className="a-dialog-title" id={id}>
        {title}
      </h2>
      <div className="a-dialog-body">{children}</div>
      <div className="a-dialog-actions">
        <button type="button" className="a-btn" data-cancel onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="a-btn a-btn-primary"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: { id: number; text: string }[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="a-toasts" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div className="a-toast" key={t.id}>
          <span>{t.text}</span>
          <button type="button" className="a-link" onClick={() => onDismiss(t.id)} aria-label="Bildirimi kapat">
            <Glyph name="x" />
          </button>
        </div>
      ))}
    </div>
  );
}
