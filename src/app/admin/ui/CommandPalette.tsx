'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo, useRef, useState } from 'react';
import type { ProjectRecord } from '@/content/projects/types';
import { fieldCommands, recordCommands, searchCommands, type Searchable } from '@/lib/palette';
import { registry } from '../registry';
import { devices, screenHref, screens } from '../screens';
import { Dialog } from './feedback';
import { useAdmin } from './store';

type Group = 'Eylemler' | 'Ekranlar' | 'Alanlar' | 'Kayıtlar';
type Cmd = Searchable & { id: string; group: Group; run: () => void };

const GROUPS: readonly Group[] = ['Eylemler', 'Ekranlar', 'Alanlar', 'Kayıtlar'];
const RECENT = 'Son kullanılanlar';

/** Ctrl/⌘+K palette: actions, screens, registry fields and records. Combobox + listbox, Turkish-folded matching. */
export function CommandPalette({
  open,
  onClose,
  onTasks,
  onPublish,
  onReset,
  samples = [],
}: {
  open: boolean;
  onClose: () => void;
  onTasks: () => void;
  onPublish: () => void;
  onReset: () => void;
  samples?: ProjectRecord[];
}) {
  const router = useRouter();
  const {
    state,
    setEditLang,
    setPreviewLang,
    setDevice,
    setPreviewSource,
    save,
    seedSamples,
    clearSamples,
    pushRecent,
  } = useAdmin();
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

  const { seeded, projects, values, recent } = state;

  const all = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => router.push(href);
    const actions: Cmd[] = [
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
      { id: 'ps-draft', group: 'Eylemler', label: 'Önizleme: Taslak', run: () => setPreviewSource('draft') },
      {
        id: 'ps-published',
        group: 'Eylemler',
        label: 'Önizleme: Yayınlanan',
        run: () => setPreviewSource('published'),
      },
      { id: 'pl-tr', group: 'Eylemler', label: 'Önizleme dili: TR', run: () => setPreviewLang('tr') },
      { id: 'pl-en', group: 'Eylemler', label: 'Önizleme dili: EN', run: () => setPreviewLang('en') },
      ...(seeded
        ? [{ id: 'seed-off', group: 'Eylemler' as const, label: 'Örnek verileri kaldır', run: clearSamples }]
        : samples.length
          ? [
              {
                id: 'seed-on',
                group: 'Eylemler' as const,
                label: 'Örnek verileri yükle',
                run: () => seedSamples(samples),
              },
            ]
          : []),
      { id: 'reset', group: 'Eylemler', label: 'Demoyu sıfırla', run: onReset },
    ];
    const links = [...fieldCommands(registry, values), ...recordCommands(projects)].map((c) => ({
      ...c,
      run: go(c.href),
    }));
    const pages = screens.map((s) => ({
      id: `s-${s.slug}`,
      group: 'Ekranlar' as const,
      label: `Git: ${s.title}`,
      run: go(screenHref(s)),
    }));
    return [...actions, ...pages, ...links];
  }, [
    router,
    save,
    onPublish,
    onTasks,
    onReset,
    setEditLang,
    setPreviewLang,
    setDevice,
    setPreviewSource,
    seeded,
    samples,
    seedSamples,
    clearSamples,
    values,
    projects,
  ]);

  // An empty query lists the last commands used; before any, the actions and screens.
  const showRecent = !q.trim() && recent.length > 0;
  const results = useMemo(() => {
    if (q.trim()) return searchCommands(all, q);
    if (recent.length) return recent.flatMap((id) => all.filter((c) => c.id === id));
    return all.filter((c) => c.group === 'Eylemler' || c.group === 'Ekranlar');
  }, [q, all, recent]);
  const listed = showRecent ? [RECENT] : GROUPS;
  const inGroup = (g: string) => (showRecent ? results : results.filter((r) => r.group === g));

  const run = (c?: Cmd) => {
    if (!c) return;
    pushRecent(c.id);
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
          placeholder="Ekran, alan, kayıt ya da eylem ara…"
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
          {listed.map((g) => {
            const items = inGroup(g);
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
                      <span>{r.label}</span>
                      {r.hint && <span className="a-help a-pal-hint"> · {r.hint}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="a-help a-pal-foot">↑ ↓ gez · Enter çalıştır · Esc kapat</p>
      </div>
    </Dialog>
  );
}
