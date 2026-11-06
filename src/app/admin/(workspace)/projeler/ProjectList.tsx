'use client';

import Link from 'next/link';
import type { ProjectRecord } from '@/content/projects/types';
import { FILTER_THRESHOLD } from '@/components/projects/ArchiveList';
import { listRow, projectCounts, workLayout } from '@/lib/public-snapshot';
import { EmptyState, Readout, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { screenBySlug } from '../../screens';

const screen = screenBySlug('projeler')!;

/** Project list ("pafta listesi"): hairline records, header counts, the Homepage Work state, development samples. */
export function ProjectList({ samples }: { samples: ProjectRecord[] }) {
  const { state, snapshot, seedSamples, clearSamples } = useAdmin();
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
            <button type="button" className="a-btn" disabled aria-describedby="proje-yeni-help">
              Yeni proje
            </button>
            <button
              type="button"
              className="a-btn"
              disabled={state.seeded || samples.length === 0}
              onClick={() => seedSamples(samples)}
            >
              Örnek verileri yükle
            </button>
            <button type="button" className="a-btn" disabled={!state.seeded} onClick={clearSamples}>
              Örnekleri kaldır
            </button>
          </div>
          <p className="a-help" id="proje-yeni-help">
            Proje düzenleyicisi sonraki aşamada gelir. Örnek veriler yalnızca geliştirmede yüklenir ve “Geliştirme
            örneği” olarak işaretlenir.
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
    </>
  );
}
