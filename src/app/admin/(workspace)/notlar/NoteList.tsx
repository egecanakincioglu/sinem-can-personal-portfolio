'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectRecord } from '@/content/projects/types';
import { fullDate } from '@/lib/format';
import { noteCounts, noteListRow } from '@/lib/note-record';
import { TextField } from '../../ui/controls';
import { Dialog, EmptyState, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { screenBySlug } from '../../screens';

const screen = screenBySlug('notlar')!;
const EXCERPT = 140;

/** Asks for the one thing a new note needs: its title. */
function NewNoteDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [tried, setTried] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() === '') {
      setTried(true);
      body.current?.querySelector<HTMLElement>('input')?.focus();
      return;
    }
    onCreate(title.trim());
  };
  return (
    <Dialog open={open} onClose={onClose} label="Yeni not">
      <form noValidate onSubmit={submit}>
        <h2 className="a-dialog-title">Yeni not</h2>
        <div className="a-dialog-body" ref={body}>
          <TextField
            name="yeni-not-baslik"
            meta={{
              label: 'Başlık (Türkçe)',
              required: true,
              error: tried && title.trim() === '' ? 'Bu alan boş bırakılamaz.' : undefined,
            }}
            value={title}
            onChange={setTitle}
          />
        </div>
        <div className="a-dialog-actions">
          <button type="button" className="a-btn" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="a-btn a-btn-primary">
            Oluştur
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Note list: hairline records with derived reading time and language chips, header counts, development samples. */
export function NoteList({ samples, projectSamples }: { samples: NoteRecord[]; projectSamples: ProjectRecord[] }) {
  const { state, seedSamples, clearSamples, createNote } = useAdmin();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const closeCreate = useCallback(() => setCreating(false), []);
  const c = noteCounts(state.notes);

  return (
    <>
      <PageHeader
        kicker="Pafta 04"
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
            <button type="button" className="a-btn" onClick={() => setCreating(true)}>
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
                  <div className="a-rec-tools a-rec-chips">
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
      <NewNoteDialog
        key={String(creating)}
        open={creating}
        onClose={closeCreate}
        onCreate={(title) => {
          const id = createNote(title);
          setCreating(false);
          router.push(`/admin/notlar/${encodeURIComponent(id)}`);
        }}
      />
    </>
  );
}
