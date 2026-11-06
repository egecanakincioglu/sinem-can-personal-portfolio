'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo, useRef, useState } from 'react';
import { devices, fold, screenHref, screens } from '../screens';
import { Dialog } from './feedback';
import { useAdmin } from './store';

type Cmd = { id: string; group: 'Eylemler' | 'Ekranlar'; label: string; run: () => void };

/** Ctrl/⌘+K palette skeleton: screens + actions. Combobox + listbox, Turkish-folded matching. */
export function CommandPalette({
  open,
  onClose,
  onTasks,
  onPublish,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  onTasks: () => void;
  onPublish: () => void;
  onReset: () => void;
}) {
  const router = useRouter();
  const { setEditLang, setPreviewLang, setDevice, save } = useAdmin();
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(0);
  const lid = useId();
  const input = useRef<HTMLInputElement>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQ('');
      setCur(0);
    }
  }

  const all = useMemo<Cmd[]>(
    () => [
      { id: 'save', group: 'Eylemler', label: 'Kaydet (sim.)', run: save },
      { id: 'publish', group: 'Eylemler', label: 'Yayınla (sim.)', run: onPublish },
      { id: 'tasks', group: 'Eylemler', label: 'Görev kuyruğunu aç', run: onTasks },
      { id: 'l-tr', group: 'Eylemler', label: 'Dil: TR düzenle', run: () => setEditLang('tr') },
      { id: 'l-en', group: 'Eylemler', label: 'Dil: EN düzenle', run: () => setEditLang('en') },
      ...devices.map((d) => ({
        id: `d-${d.id}`,
        group: 'Eylemler' as const,
        label: `Önizleme: ${d.label}`,
        run: () => setDevice(d.id),
      })),
      { id: 'pl-tr', group: 'Eylemler', label: 'Önizleme dili: TR', run: () => setPreviewLang('tr') },
      { id: 'pl-en', group: 'Eylemler', label: 'Önizleme dili: EN', run: () => setPreviewLang('en') },
      { id: 'reset', group: 'Eylemler', label: 'Demoyu sıfırla', run: onReset },
      ...screens.map((s) => ({
        id: `s-${s.slug}`,
        group: 'Ekranlar' as const,
        label: `Git: ${s.title}`,
        run: () => router.push(screenHref(s)),
      })),
    ],
    [router, save, onPublish, onTasks, onReset, setEditLang, setPreviewLang, setDevice],
  );

  const results = useMemo(() => {
    const toks = fold(q).split(/\s+/).filter(Boolean);
    return all.filter((c) => toks.every((t) => fold(c.label).includes(t)));
  }, [q, all]);

  const run = (c?: Cmd) => {
    if (!c) return;
    onClose();
    window.setTimeout(c.run, 0);
  };

  return (
    <Dialog open={open} onClose={onClose} label="Komut paleti" variant="palette" initialFocus="input">
      <div className="a-pal">
        <label htmlFor={`${lid}-i`} className="a-vh">
          Komut ara
        </label>
        <input
          ref={input}
          id={`${lid}-i`}
          className="a-input a-pal-input"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${lid}-l`}
          aria-autocomplete="list"
          aria-activedescendant={results[cur] ? `${lid}-o-${results[cur].id}` : undefined}
          placeholder="Ekran, alan ya da eylem ara…"
          value={q}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setCur(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCur((c) => Math.min(results.length - 1, c + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCur((c) => Math.max(0, c - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              run(results[cur]);
            }
          }}
        />
        <p className="a-help a-pal-count" role="status">
          {results.length ? `${results.length} sonuç` : 'Sonuç yok'}
        </p>
        <ul id={`${lid}-l`} role="listbox" aria-label="Sonuçlar" className="a-pal-list">
          {(['Eylemler', 'Ekranlar'] as const).map((g) => {
            const items = results.filter((r) => r.group === g);
            if (!items.length) return null;
            return (
              <li key={g} role="presentation">
                <p className="a-panel-k a-pal-group" aria-hidden="true">
                  {g}
                </p>
                <ul role="group" aria-label={g}>
                  {items.map((r) => (
                    <li
                      key={r.id}
                      id={`${lid}-o-${r.id}`}
                      role="option"
                      aria-selected={results[cur]?.id === r.id}
                      className={`a-pal-opt${results[cur]?.id === r.id ? ' is-cur' : ''}`}
                      onMouseMove={() => setCur(results.indexOf(r))}
                      onClick={() => run(r)}
                    >
                      {r.label}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="a-help a-pal-foot">↑ ↓ gez · Enter çalıştır · Esc kapat. Alan ve kayıt arama sonraki aşamada.</p>
      </div>
    </Dialog>
  );
}
