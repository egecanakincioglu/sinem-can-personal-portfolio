'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { dict } from '@/content/dictionary';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectKind, ProjectRecord } from '@/content/projects/types';
import { FILTER_THRESHOLD } from '@/components/projects/ArchiveList';
import { listRow, projectCounts, workLayout } from '@/lib/public-snapshot';
import { TextField } from '../../ui/controls';
import { Dialog, EmptyState, Glyph, Readout, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { screenBySlug, sheetLabel } from '../../screens';

const screen = screenBySlug('projeler')!;

const kinds = Object.keys(dict.projects.kinds) as ProjectKind[];

/** Asks for the two things a new record needs: its title and its kind. Nothing is chosen for the user. */
function NewProjectDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; kind: ProjectKind }) => void;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ProjectKind | ''>('');
  const [tried, setTried] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const titleError = tried && title.trim() === '' ? 'Bu alan boş bırakılamaz.' : undefined;
  const kindError = tried && kind === '' ? 'Bir tür seçin.' : undefined;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() === '' || kind === '') {
      setTried(true);
      // The error text and aria-invalid land with the next render; focus moves to the first invalid field now.
      body.current?.querySelector<HTMLElement>(title.trim() === '' ? 'input' : 'select')?.focus();
      return;
    }
    onCreate({ title, kind });
  };
  return (
    <Dialog open={open} onClose={onClose} label="Yeni proje">
      <form noValidate onSubmit={submit}>
        <h2 className="a-dialog-title">Yeni proje</h2>
        <div className="a-dialog-body" ref={body}>
          <TextField
            name="yeni-proje-baslik"
            meta={{ label: 'Başlık (Türkçe)', required: true, error: titleError }}
            value={title}
            onChange={setTitle}
          />
          <div className="a-field">
            <div className="a-field-head">
              <label htmlFor="yeni-proje-tur" className="a-label">
                Tür<span className="a-sfx"> · zorunlu</span>
              </label>
            </div>
            <select
              id="yeni-proje-tur"
              className="a-input"
              value={kind}
              aria-invalid={kindError ? true : undefined}
              aria-describedby={kindError ? 'yeni-proje-tur-e' : undefined}
              onChange={(e) => setKind(e.target.value as ProjectKind | '')}
            >
              <option value="">Seçin</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {dict.projects.kinds[k].tr}
                </option>
              ))}
            </select>
            {kindError && (
              <p className="a-err" id="yeni-proje-tur-e">
                <Glyph name="bang" /> Hata: {kindError}
              </p>
            )}
          </div>
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

/** Project list ("pafta listesi"): hairline records, header counts, the Homepage Work state, development samples. */
export function ProjectList({ samples, noteSamples = [] }: { samples: ProjectRecord[]; noteSamples?: NoteRecord[] }) {
  const { state, snapshot, seedSamples, clearSamples, createProject } = useAdmin();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const closeCreate = useCallback(() => setCreating(false), []);
  const records = state.projects;
  const publicCount = snapshot.publicProjects.length;
  return (
    <>
      <PageHeader
        kicker={sheetLabel('projeler')}
        title={screen.title}
        lede={screen.lede}
        aside={
          <p className="a-help" aria-live="polite">
            {projectCounts(records)}
          </p>
        }
      />
      <Section
        id="durum"
        title="Yayın durumu"
        note="Sayılar, genel sitenin kullandığı görünürlük kuralından hesaplanır. Genel sitede yalnız yayında ve onaylı kayıtlar görünür. Geliştirme örnekleri yalnız geliştirmede görünür."
      >
        <dl className="a-readouts">
          <Readout
            derived
            label="Ana sayfadaki Çalışmalar bölümü"
            value={`${publicCount} yayında proje, 0 not. Görünüm: ${workLayout(publicCount, 0)}.`}
          />
        </dl>
        <p className="a-help">
          Genel sitedeki proje listesinde süzgeç, en az {FILTER_THRESHOLD} proje yayındayken görünür.
        </p>
      </Section>
      <Section id="kayitlar" title="Kayıtlar">
        <div className="a-field">
          <div className="a-proj-actions">
            <button
              type="button"
              className="a-btn"
              aria-describedby="proje-yeni-help"
              onClick={() => setCreating(true)}
            >
              Yeni proje
            </button>
            <button
              type="button"
              className="a-btn"
              disabled={state.seeded || samples.length === 0}
              onClick={() => seedSamples(samples, noteSamples)}
            >
              Örnek verileri yükle
            </button>
            <button type="button" className="a-btn" disabled={!state.seeded} onClick={clearSamples}>
              Örnekleri kaldır
            </button>
          </div>
          <p className="a-help" id="proje-yeni-help">
            Yeni proje taslak olarak açılır. Örnek veriler yalnızca geliştirmede yüklenir ve “Geliştirme örneği” olarak
            işaretlenir.
          </p>
        </div>
        {records.length === 0 ? (
          <EmptyState title="Pafta hazırlanıyor. — İlk projeyi ekleyin">
            <p>Henüz kayıt yok; genel sitede Çalışmalar bölümü boş pafta olarak kalır.</p>
          </EmptyState>
        ) : (
          <ul className="a-list" aria-label="Projeler">
            {records.map((p) => {
              const r = listRow(p);
              return (
                <li key={r.id} className="a-rec">
                  <p className="a-rec-meta a-num">{r.year ?? '—'}</p>
                  <div className="a-rec-body">
                    <Link className="a-rec-link" href={`/admin/projeler/${encodeURIComponent(r.id)}`}>
                      {r.title}
                    </Link>
                    <p className="a-help">{[r.kind, ...r.tools].join(' · ')}</p>
                  </div>
                  <div className="a-rec-tools a-rec-chips">
                    {r.chips.map((c) => (
                      <StatusChip key={c} kind={c} />
                    ))}
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
      <NewProjectDialog
        key={String(creating)}
        open={creating}
        onClose={closeCreate}
        onCreate={(input) => {
          const id = createProject(input);
          setCreating(false);
          router.push(`/admin/projeler/${encodeURIComponent(id)}`);
        }}
      />
    </>
  );
}
