'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { publishChecks, revLetter } from '@/lib/publish';
import { DiffView } from './DiffView';
import { Dialog } from './feedback';
import { useAdmin } from './store';

const SHOWN = 8;

/** Simulated publish: what changes, what blocks it, what needs an acknowledgement, then the confirm. */
export function PublishDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { issues } = useAdmin();
  const hasBlocking = useMemo(() => issues.some((i) => i.severity === 'error'), [issues]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Yayınla (simülasyon)"
      initialFocus={hasBlocking ? '[data-summary]' : '[data-cancel]'}
    >
      <PublishBody onClose={onClose} />
    </Dialog>
  );
}

// Mounted only while the dialog is open, so the acknowledgements start unticked on every publish.
function PublishBody({ onClose }: { onClose: () => void }) {
  const { state, pending, issues, publish } = useAdmin();
  const { blocking, acknowledge } = publishChecks(issues);
  const [acked, setAcked] = useState<string[]>([]);
  const ready = blocking.length === 0 && acknowledge.every((g) => acked.includes(g.group));
  return (
    <>
      <h2 className="a-dialog-title">Yayınla (simülasyon)</h2>
      <div className="a-dialog-body">
        <p>
          Rev. {revLetter(state.rev)} → Rev. {revLetter(state.rev + 1)} olarak simüle edilecek.
        </p>
        <p className="a-help">Gerçek site bu işlemden etkilenmez. Hiçbir şey sunucuya gönderilmez.</p>

        {blocking.length > 0 && (
          <div className="a-pub-summary" role="alert" tabIndex={-1} data-summary>
            <h3 className="a-help">Yayını engelleyen hatalar ({blocking.length})</h3>
            <ul className="a-pub-group">
              {blocking.map((i) => (
                <li key={`${i.fieldId}:${i.text}`}>{i.text}</li>
              ))}
            </ul>
          </div>
        )}

        <h3 className="a-help">Değişiklikler ({pending.length})</h3>
        <DiffView changes={pending.slice(0, SHOWN)} label="Bekleyen değişiklikler" />
        {pending.length > SHOWN && (
          <p className="a-help">
            {pending.length - SHOWN} değişiklik daha var.{' '}
            <Link href="/admin/yayin" className="a-link" onClick={onClose}>
              Tümü Yayın ekranında
            </Link>
          </p>
        )}

        {acknowledge.map((g) => (
          <div key={g.group}>
            <label className="a-check">
              <input
                type="checkbox"
                checked={acked.includes(g.group)}
                onChange={(e) => setAcked((a) => (e.target.checked ? [...a, g.group] : a.filter((x) => x !== g.group)))}
              />
              <span>
                {g.group}: {g.items.length} uyarı var, gördüm ve yine de devam ediyorum.
              </span>
            </label>
            <ul className="a-pub-group">
              {g.items.map((i) => (
                <li key={`${i.fieldId}:${i.text}`}>{i.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="a-dialog-actions">
        <button type="button" className="a-btn" data-cancel onClick={onClose}>
          Vazgeç
        </button>
        <button
          type="button"
          className="a-btn a-btn-primary"
          disabled={!ready}
          onClick={() => {
            publish();
            onClose();
          }}
        >
          Yayını simüle et
        </button>
      </div>
    </>
  );
}
