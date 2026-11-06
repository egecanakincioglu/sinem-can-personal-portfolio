'use client';

import { useEffect, useRef, useState } from 'react';
import { cadRows, formatSize, posterCandidates, type GlbEntry } from '@/lib/glb';
import type { MediaAsset } from '@/lib/media';
import { EmptyState } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { screenBySlug } from '../../screens';
import { OriginalsList } from './OriginalsList';
import { Gauge, Preview3DPanel } from './Preview3DPanel';

const screen = screenBySlug('cad-glb')!;

/** Overview of the projects that have a 3D preview or private originals; a row opens both editors below. */
export function CadScreen({
  assets,
  portraitId,
  library,
  projectCount,
}: {
  assets: MediaAsset[];
  portraitId: string;
  library: GlbEntry[];
  projectCount: number;
}) {
  const { state, probeProject } = useAdmin();
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = cadRows(state.projects);
  const open = rows.some((r) => r.id === openId) ? state.projects.find((p) => p.id === openId) : undefined;

  // Leaving the screen ends any 3D preview that was being tried.
  const clear = useRef(probeProject);
  useEffect(() => {
    clear.current = probeProject;
  });
  useEffect(() => () => clear.current(null), []);

  const approved = rows.filter((r) => r.state === 'Onaylı').length;
  const draft = rows.filter((r) => r.state === 'Taslak').length;
  const originals = rows.reduce((n, r) => n + r.originals, 0);
  const openTitle = open ? open.title.tr || open.title.en : undefined;

  return (
    <>
      <PageHeader
        kicker="Pafta 06"
        title={screen.title}
        lede={screen.lede}
        aside={
          <p className="a-help" aria-live="polite">
            {`${rows.length} proje · ${approved} onaylı · ${draft} taslak · ${originals} özel dosya`}
          </p>
        }
      />
      <Section
        id="projeler"
        title="Projeler"
        note="3B önizlemesi ya da özel dosyası olan projeler. Bir satır, aşağıda iki düzenleyiciyi açar."
      >
        {rows.length === 0 ? (
          <EmptyState title="Henüz 3B önizleme ya da özel dosya yok.">
            <p>
              {projectCount > 0
                ? 'Projeler ekranından örnek verileri yükleyin; örneklerde 3B önizleme ve özel dosya bulunur.'
                : 'Projeler eklendiğinde 3B önizlemesi ya da özel dosyası olanlar burada listelenir.'}
            </p>
          </EmptyState>
        ) : (
          <ul className="a-list" aria-label="3B ve CAD kayıtları">
            {rows.map((r) => (
              <li key={r.id} className="a-rec">
                <p className="a-rec-meta">
                  <span>GLB</span>
                  <span>{r.state}</span>
                </p>
                <div className="a-rec-body">
                  <button
                    type="button"
                    className="a-rec-link a-rec-open"
                    aria-expanded={open?.id === r.id}
                    onClick={() => setOpenId(open?.id === r.id ? null : r.id)}
                  >
                    {r.title}
                  </button>
                  {r.sizeBytes !== undefined && (
                    <>
                      <Gauge bytes={r.sizeBytes} compact />
                      <p className="a-help a-num">{formatSize(r.sizeBytes)}</p>
                    </>
                  )}
                  <p className="a-help">{r.originals} özel dosya</p>
                </div>
                <div className="a-rec-tools">
                  {r.issues.map((i) => (
                    <span key={i} className="a-chip a-chip-missing">
                      {i}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section id="onizleme" title="3B önizleme" note={openTitle}>
        {open ? (
          <Preview3DPanel project={open} posters={posterCandidates(assets, portraitId)} library={library} />
        ) : (
          <p className="a-help">Düzenlemek için yukarıdan bir proje seçin.</p>
        )}
      </Section>
      <Section id="ozgunler" title="Özel dosyalar" note={openTitle}>
        {open ? <OriginalsList project={open} /> : <p className="a-help">Düzenlemek için yukarıdan bir proje seçin.</p>}
      </Section>
    </>
  );
}
