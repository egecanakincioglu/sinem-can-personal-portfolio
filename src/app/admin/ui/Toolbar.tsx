'use client';

import { usePathname } from 'next/navigation';
import { Glyph } from './feedback';
import { useAdmin } from './store';

// Screens with nothing to save or discard: they only read the working state (Genel bakış, Yayın, Kapsam).
const READ_ONLY = ['', 'yayin', 'kapsam'];

/**
 * Workspace toolbar. Desktop and tablet: one sticky strip over the editor. Mobile: the strip shrinks to the draft
 * status with Vazgeç at the top of the page, and the actions become a fixed one-row bottom bar. The "(sim.)" suffix
 * is visually hidden on mobile but stays in the accessible name.
 * Read-only screens have nothing to save or discard, so they offer Yayınla (and Önizle) only.
 */
export function Toolbar({
  hasPreview,
  previewOpen,
  onPreview,
  onPublish,
  onNav,
  navOpen,
}: {
  hasPreview: boolean;
  previewOpen: boolean;
  onPreview: () => void;
  onPublish: () => void;
  onNav: () => void;
  navOpen: boolean;
}) {
  const { state, save, discard } = useAdmin();
  const slug = usePathname().split('/').filter(Boolean)[1] ?? '';
  const readOnly = READ_ONLY.includes(slug);
  return (
    <div className="a-bar" role="toolbar" aria-label="Çalışma araçları">
      <button type="button" className="a-btn a-bar-nav" aria-expanded={navOpen} aria-controls="a-side" onClick={onNav}>
        Bölümler
      </button>
      {!readOnly && (
        <>
          <span className="a-bar-state" role="status">
            {state.dirty ? 'Kaydedilmemiş değişiklik (sim.)' : state.saveCount ? 'Kaydedildi (sim.)' : 'Değişiklik yok'}
          </span>
          <button
            type="button"
            className="a-btn a-bar-discard"
            onClick={discard}
            disabled={!state.dirty}
            aria-label="Vazgeç: değişiklikleri at"
            title="Değişiklikleri at: son kaydedilen değerlere dön"
          >
            Vazgeç
          </button>
        </>
      )}
      <div className="a-bar-actions">
        {!readOnly && (
          <button type="button" className="a-btn" data-save onClick={save}>
            Kaydet <span className="a-bar-sfx">(sim.)</span>
          </button>
        )}
        {hasPreview && (
          <button type="button" className="a-btn a-bar-preview" aria-pressed={previewOpen} onClick={onPreview}>
            {previewOpen ? 'Düzenle' : 'Önizle'}
          </button>
        )}
        <button type="button" className="a-btn a-btn-primary" onClick={onPublish}>
          Yayınla <span className="a-bar-sfx">(sim.)</span> <Glyph name="arrow" />
        </button>
      </div>
    </div>
  );
}
