'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectRecord } from '@/content/projects/types';
import { fullDate } from '@/lib/format';
import { noteCounts, noteListRow } from '@/lib/note-record';
import { TextField } from '../../ui/controls';
import { EmptyState, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { screenBySlug, sheetLabel } from '../../screens';

const screen = screenBySlug('notlar')!;
const EXCERPT = 140;

/** Note list: hairline records with derived reading time and language chips, header counts, development samples. */
export function NoteList({ samples, projectSamples }: { samples: NoteRecord[]; projectSamples: ProjectRecord[] }) {
  const { state, seedSamples, clearSamples, createNote } = useAdmin();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const c = noteCounts(state.notes);

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() === '') return;
    router.push(`/admin/notlar/${encodeURIComponent(createNote(title.trim()))}`);
  };

  return (
    <>
      <PageHeader
        kicker={sheetLabel('notlar')}
        title={screen.title}
        lede={screen.lede}
        aside={
          <p className="a-help" aria-live="polite">
            {c.total} kayıt · {c.published} yayında · {c.drafts} taslak · {c.approved} onaylı · {c.featured} öne çıkan
          </p>
        }
      />
      <Section id="kayitlar" title="Kayıtlar">
        <div className="a-field">
          <div className="a-proj-actions">
            <button type="button" className="a-btn" aria-expanded={creating} onClick={() => setCreating(true)}>
              Yeni not
            </button>
            <button
              type="button"
              className="a-btn"
              disabled={state.seeded || (samples.length === 0 && projectSamples.length === 0)}
              onClick={() => seedSamples(projectSamples, samples)}
            >
              Örnek verileri yükle
            </button>
            <button type="button" className="a-btn" disabled={!state.seeded} onClick={clearSamples}>
              Örnekleri kaldır
            </button>
          </div>
          <p className="a-help">
            Yeni not taslak olarak açılır. Örnek veriler yalnızca geliştirmede yüklenir ve “Geliştirme örneği” olarak
            işaretlenir.
          </p>
        </div>
        {creating && (
          <form className="a-field" onSubmit={create}>
            <TextField
              name="note-new-title"
              meta={{ label: 'Not başlığı (Türkçe)' }}
              value={title}
              onChange={setTitle}
            />
            <div className="a-proj-actions">
              <button type="submit" className="a-btn a-btn-primary" disabled={title.trim() === ''}>
                Oluştur
              </button>
              <button
                type="button"
                className="a-btn"
                onClick={() => {
                  setCreating(false);
                  setTitle('');
                }}
              >
                Vazgeç
              </button>
            </div>
          </form>
        )}
        {state.notes.length === 0 ? (
          <EmptyState title="Henüz yayımlanmış bir not yok.">
            <p>Genel sitede Notlar sayfası, ilk not yayımlanana kadar boş kalır.</p>
          </EmptyState>
        ) : (
          <ul className="a-list" aria-label="Notlar">
            {state.notes.map((n) => {
              const r = noteListRow(n, state.editLang);
              return (
                <li key={r.id} className="a-rec">
                  <p className="a-rec-meta a-num">{fullDate(r.date, 'tr')}</p>
                  <div className="a-rec-body">
                    <Link className="a-rec-link" href={`/admin/notlar/${encodeURIComponent(r.id)}`}>
                      {r.title || r.id}
                    </Link>
                    {r.summary !== '' && (
                      <p className="a-help">
                        {r.summary.length > EXCERPT ? `${r.summary.slice(0, EXCERPT).trimEnd()}…` : r.summary}
                      </p>
                    )}
                    <p className="a-help">{[r.topic, `${r.minutes} dk okuma`].filter((x) => x !== '').join(' · ')}</p>
                  </div>
                  <div className="a-rec-tools">
                    {r.langChip !== '' && <StatusChip kind="derived">{r.langChip}</StatusChip>}
                    <StatusChip kind={r.status === 'published' ? 'live' : 'draft'} />
                    {r.approved && <StatusChip kind="approved" />}
                    {r.featured && <StatusChip kind="derived">Öne çıkan</StatusChip>}
                    {n.fixture && <StatusChip kind="sample" />}
                    {r.missing.map((l) => (
                      <StatusChip key={l} kind="missing">
                        {l.toUpperCase()} eksik
                      </StatusChip>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
