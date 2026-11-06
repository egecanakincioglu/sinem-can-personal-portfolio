'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { dict } from '@/content/dictionary';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectKind, ProjectRecord } from '@/content/projects/types';
import { FILTER_THRESHOLD } from '@/components/projects/ArchiveList';
import { listRow, projectCounts, workLayout } from '@/lib/public-snapshot';
import { TextField } from '../../ui/controls';
import { Dialog, EmptyState, Readout, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { screenBySlug } from '../../screens';

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
  const ready = title.trim() !== '' && kind !== '';
  return (
    <Dialog open={open} onClose={onClose} label="Yeni proje">
      <h2 className="a-dialog-title">Yeni proje</h2>
      <div className="a-dialog-body">
        <TextField
          name="yeni-proje-baslik"
          meta={{ label: 'Başlık (Türkçe)', required: true }}
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
            onChange={(e) => setKind(e.target.value as ProjectKind | '')}
          >
            <option value="">Seçin</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {dict.projects.kinds[k].tr}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="a-dialog-actions">
        <button type="button" className="a-btn" onClick={onClose}>
          Vazgeç
        </button>
        <button
          type="button"
          className="a-btn a-btn-primary"
          disabled={!ready}
          onClick={() => kind && onCreate({ title, kind })}
        >
          Oluştur
        </button>
      </div>
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
        kicker="Pafta 03"
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
            label="Çalışmalar bölümü"
            value={`Projeler: ${publicCount} · Notlar: 0 → Düzen: ${workLayout(publicCount, 0)}`}
          />
        </dl>
        <p className="a-help">Filtre {FILTER_THRESHOLD}+ projede görünür.</p>
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
                  <div className="a-rec-tools">
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
