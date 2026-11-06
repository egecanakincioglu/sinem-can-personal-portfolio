'use client';

import { useState } from 'react';
import type { MediaAsset } from '@/lib/media';
import { Thumb } from '../(workspace)/medya/MediaEditor';

/** Picks one library picture. There is no upload: the library is the only source. */
export function MediaPicker({
  label,
  assets,
  selectedId,
  onPick,
  onClear,
}: {
  label: string;
  assets: readonly MediaAsset[];
  selectedId?: string;
  onPick: (asset: MediaAsset) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = assets.find((a) => a.id === selectedId);
  return (
    <div className="a-picker">
      <p className="a-label">{label}</p>
      {current ? (
        <div className="a-picker-now">
          <Thumb a={current} />
          <p className="a-media-id">{current.alt.tr || current.id}</p>
        </div>
      ) : (
        <p className="a-help">Görsel seçilmedi.</p>
      )}
      <div className="a-proj-actions">
        <button type="button" className="a-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Kitaplığı kapat' : current ? 'Görseli değiştir' : 'Kitaplıktan seç'}
        </button>
        {current && onClear && (
          <button type="button" className="a-btn" onClick={onClear}>
            Görseli kaldır
          </button>
        )}
      </div>
      {open &&
        (assets.length === 0 ? (
          <p className="a-help">Kitaplıkta görsel yok.</p>
        ) : (
          <ul className="a-media-grid" aria-label={`${label}: kitaplık`}>
            {assets.map((a) => (
              <li key={a.id} className="a-media-card">
                <Thumb a={a} />
                <p className="a-media-id">{a.alt.tr || a.id}</p>
                <button
                  type="button"
                  className="a-btn"
                  aria-pressed={a.id === selectedId}
                  onClick={() => {
                    onPick(a);
                    setOpen(false);
                  }}
                >
                  Seç: {a.alt.tr || a.id}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
