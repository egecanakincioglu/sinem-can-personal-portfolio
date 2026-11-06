'use client';

import type { ProjectRecord } from '@/content/projects/types';
import {
  LIMIT_BYTES,
  MB,
  TARGET_BYTES,
  formatSize,
  gaugeState,
  glbIdOf,
  glbModelUrl,
  isModelFile,
  preview3dChecklist,
  type GaugeState,
  type GlbEntry,
} from '@/lib/glb';
import type { MediaAsset } from '@/lib/media';
import { BilingualField } from '../../ui/controls';
import { Glyph } from '../../ui/feedback';
import { useAdmin } from '../../ui/store';

type Preview3D = NonNullable<ProjectRecord['preview3d']>;

const gaugeText: Record<GaugeState, string> = {
  ok: 'Hedef içinde (5 MB ve altı).',
  warning: 'Hedefin üzerinde; Draco/meshopt sıkıştırması önerilir.',
  error: '15 MB sınırının üstünde; genel sitede gösterilmez.',
};
const gaugePrefix: Record<GaugeState, string> = { ok: '', warning: 'Uyarı: ', error: 'Hata: ' };

/** A line gauge with ticks at the 5 MB target and the 15 MB limit. States are a glyph and a word, never a colour alone. */
export function Gauge({ bytes, compact }: { bytes: number; compact?: boolean }) {
  const state = gaugeState(bytes);
  const max = Math.max(20 * MB, bytes);
  const pct = (n: number) => `${(n / max) * 100}%`;
  return (
    <div className={`a-gauge a-gauge-${state}${compact ? ' is-compact' : ''}`}>
      <div
        className="a-gauge-track"
        role="img"
        aria-label={`${formatSize(bytes)}; hedef 5 MB, sınır 15 MB. ${gaugePrefix[state]}${gaugeText[state]}`}
      >
        <span className="a-gauge-fill" style={{ width: pct(bytes) }} />
        <span className="a-gauge-tick" style={{ left: pct(TARGET_BYTES) }} />
        <span className="a-gauge-tick" style={{ left: pct(LIMIT_BYTES) }} />
      </div>
      {!compact && (
        <>
          <p className="a-gauge-scale a-num" aria-hidden="true">
            <span style={{ left: pct(TARGET_BYTES) }}>5 MB hedef</span>
            <span style={{ left: pct(LIMIT_BYTES) }}>15 MB sınır</span>
          </p>
          <p className={`a-gauge-text${state === 'error' ? ' is-err' : ''}`}>
            <Glyph name={state === 'ok' ? 'check' : 'bang'} />
            <span>
              {gaugePrefix[state]}
              {gaugeText[state]}
            </span>
          </p>
        </>
      )}
    </div>
  );
}

/** The public 3D preview of one project: visibility, poster, model from the library, size gauge, checklist, caption. */
export function Preview3DPanel({
  project,
  posters,
  library,
}: {
  project: ProjectRecord;
  posters: MediaAsset[];
  library: GlbEntry[];
}) {
  const { patchProject, probeProject } = useAdmin();
  const p = project.preview3d;
  const set = (next: Partial<Preview3D>) => p && patchProject(project.id, { preview3d: { ...p, ...next } });

  const pickPoster = (src: string) => {
    const a = posters.find((x) => x.src === src);
    if (!a) return;
    const poster: Preview3D['poster'] = {
      id: a.id,
      kind: a.kind,
      src: a.src,
      width: a.width,
      height: a.height,
      alt: a.alt,
      ...(a.caption ? { caption: a.caption } : {}),
    };
    if (p) set({ poster });
    else patchProject(project.id, { preview3d: { id: `${project.id}-3d`, approved: false, poster, modelSrc: '' } });
  };
  const pickModel = (id: string) => {
    const entry = library.find((e) => e.id === id);
    set(
      entry ? { modelSrc: glbModelUrl(entry.id), sizeBytes: entry.sizeBytes } : { modelSrc: '', sizeBytes: undefined },
    );
  };

  const selected = library.find((e) => e.id === glbIdOf(p?.modelSrc));
  const caption = p?.caption ?? { tr: '', en: '' };
  const setCaption = (l: 'tr' | 'en', v: string) => {
    const next = { ...caption, [l]: v };
    set({ caption: next.tr || next.en ? next : undefined });
  };
  const checklist = preview3dChecklist(project, posters);

  return (
    <div className="a-cad-form">
      {!p && <p className="a-help">Bu projede 3B önizleme yok. Bir poster seçerek taslak bir önizleme başlatın.</p>}
      <div className="a-field">
        <label className="a-check">
          <input
            type="checkbox"
            name={`cad-${project.id}-approved`}
            checked={p?.approved === true}
            disabled={!p}
            onChange={(e) => set({ approved: e.target.checked })}
          />
          <span>Yayında göster</span>
        </label>
        <p className="a-help">Kapalıyken genel sitede 3B önizleme görünmez.</p>
      </div>
      <div className="a-field">
        <label htmlFor={`cad-${project.id}-poster`} className="a-label">
          Poster
        </label>
        <select
          id={`cad-${project.id}-poster`}
          className="a-input"
          value={posters.find((a) => a.src === p?.poster.src)?.src ?? ''}
          onChange={(e) => pickPoster(e.target.value)}
        >
          <option value="" disabled>
            Seçilmedi
          </option>
          {posters.map((a) => (
            <option key={a.id} value={a.src}>
              {a.id} ({a.width} × {a.height})
            </option>
          ))}
        </select>
        <p className="a-help">
          Görsel kitaplığından seçilir; portre poster olarak seçilemez. Alternatif metin kitaplıktaki görselden gelir.
        </p>
      </div>
      <div className="a-field">
        <label htmlFor={`cad-${project.id}-model`} className="a-label">
          Model
        </label>
        <select
          id={`cad-${project.id}-model`}
          className="a-input"
          value={selected?.id ?? ''}
          disabled={!p}
          onChange={(e) => pickModel(e.target.value)}
        >
          <option value="">Seçilmedi</option>
          {library
            .filter((e) => isModelFile(e.fileName))
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.fileName}
              </option>
            ))}
        </select>
        <p className="a-help">
          Yalnızca .glb ve .gltf dosyaları seçilebilir. SolidWorks/NX dosyaları tarayıcıda gösterilmez; önce GLB olarak
          dışa aktarın.
        </p>
        {p?.modelSrc && !selected && <p className="a-help">Kayıtlı adres model kitaplığında yok.</p>}
        {selected?.declared && (
          <p className="a-help">Bu girişte dosya yok; önizleme, görüntüleyicinin hata durumunu gösterir.</p>
        )}
      </div>
      {p?.sizeBytes !== undefined && (
        <div className="a-field">
          <p className="a-label">Dosya boyutu</p>
          <p className="a-num">{formatSize(p.sizeBytes)}</p>
          <Gauge bytes={p.sizeBytes} />
        </div>
      )}
      <BilingualField
        name={`cad-${project.id}-caption`}
        label="Açıklama"
        max={200}
        multiline
        optional
        tr={caption.tr}
        en={caption.en}
        onTr={(v) => setCaption('tr', v)}
        onEn={(v) => setCaption('en', v)}
        helper="Görüntüleyicinin altında görünen kısa açıklama."
      />
      <div className="a-field">
        <p className="a-label">Genel sitede görünme koşulları</p>
        <ul className="a-checklist" aria-label="Görünme koşulları">
          {checklist.map((c) => (
            <li key={c.id}>
              <Glyph name={c.ok ? 'check' : 'bang'} />
              <span>
                {c.label}
                {c.ok ? '' : ' — eksik'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="a-field">
        <button type="button" className="a-btn" disabled={!p} onClick={() => probeProject(project.id)}>
          Önizlemeyi sına
        </button>
        <p className="a-help">
          Canlı önizlemede projenin 3B bölümünü açar. Üç boyutlu görüntüleyici yalnızca tıklayınca yüklenir.
        </p>
      </div>
    </div>
  );
}
