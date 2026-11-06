'use client';

import type { ProjectRecord } from '@/content/projects/types';
import { formatSize, newAssetId } from '@/lib/glb';
import { toPublicProject } from '@/lib/projects';
import { BilingualField, RemoveButton } from '../../ui/controls';
import { Glyph } from '../../ui/feedback';
import { useAdmin } from '../../ui/store';

type Original = NonNullable<ProjectRecord['privateOriginals']>[number];

const formats: { value: Original['format']; label: string }[] = [
  { value: 'sldprt', label: 'SolidWorks parça' },
  { value: 'sldasm', label: 'SolidWorks montaj' },
  { value: 'nx', label: 'Siemens NX' },
  { value: 'step', label: 'STEP' },
  { value: 'iges', label: 'IGES' },
  { value: 'other', label: 'Diğer' },
];

/** Metadata of the private originals. There is no address or file field: the list never reaches the public site. */
export function OriginalsList({ project }: { project: ProjectRecord }) {
  const { patchProject } = useAdmin();
  const list = project.privateOriginals ?? [];
  const write = (next: Original[]) => patchProject(project.id, { privateOriginals: next });
  const edit = (i: number, patch: Partial<Original>) => write(list.map((o, j) => (i === j ? { ...o, ...patch } : o)));
  const add = () =>
    write([...list, { assetId: newAssetId(), format: 'other', label: { tr: '', en: '' }, access: 'private' }]);
  // The same function the public site and the preview use: the list must be gone from what a visitor receives.
  const hidden = !('privateOriginals' in toPublicProject(project));

  return (
    <div className="a-cad-form">
      <p className="a-help" aria-live="polite">
        {list.length} özel dosya (genel sitede görünmez)
      </p>
      <p className="a-cad-lock">
        <Glyph name="lock" />
        <span>
          Özel dosya. Genel sitede hiçbir zaman bağlantı olarak görünmez. İndirme için ileride sunucu tarafı
          yetkilendirme gerekir; bu prototipte indirme yoktur.
        </span>
      </p>
      <ul className="a-list" aria-label="Özel dosyalar">
        {list.map((o, i) => (
          <li key={o.assetId} className="a-rec a-cad-orig">
            <div className="a-rec-body">
              <div className="a-field">
                <label htmlFor={`orig-${o.assetId}-format`} className="a-label">
                  Biçim
                </label>
                <select
                  id={`orig-${o.assetId}-format`}
                  className="a-input"
                  value={o.format}
                  onChange={(e) => edit(i, { format: e.target.value as Original['format'] })}
                >
                  {formats.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <BilingualField
                name={`orig-${o.assetId}-label`}
                label="Etiket"
                max={80}
                tr={o.label.tr}
                en={o.label.en}
                onTr={(v) => edit(i, { label: { ...o.label, tr: v } })}
                onEn={(v) => edit(i, { label: { ...o.label, en: v } })}
              />
              <div className="a-field">
                <label htmlFor={`orig-${o.assetId}-id`} className="a-label">
                  Dosya anahtarı
                </label>
                <input id={`orig-${o.assetId}-id`} className="a-input" readOnly value={o.assetId} />
                <p className="a-help">
                  Sistem tarafından üretilir, değiştirilemez.
                  {o.sizeBytes !== undefined && ` Boyut: ${formatSize(o.sizeBytes)}.`}
                </p>
              </div>
            </div>
            <div className="a-rec-tools">
              <RemoveButton onClick={() => write(list.filter((_, j) => j !== i))} />
            </div>
          </li>
        ))}
      </ul>
      <div className="a-field">
        <button type="button" className="a-btn" onClick={add}>
          Özel dosya ekle
        </button>
        <p className="a-help">Yalnızca üst veri eklenir; dosya yüklenmez.</p>
      </div>
      {hidden && (
        <p className="a-cad-assert">
          <Glyph name="check" />
          <span>Bu liste genel sayfaya gönderilmez ✓</span>
        </p>
      )}
    </div>
  );
}
