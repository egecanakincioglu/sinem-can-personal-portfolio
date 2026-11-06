'use client';

import { Glyph } from './feedback';
import { useAdmin } from './store';

/** Workspace toolbar: desktop/tablet = sticky strip over the editor; mobile = fixed bottom action bar. */
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
  return (
    <div className="a-bar" role="toolbar" aria-label="Çalışma araçları">
      <button type="button" className="a-btn a-bar-nav" aria-expanded={navOpen} aria-controls="a-side" onClick={onNav}>
        Bölümler
      </button>
      <span className="a-bar-state" role="status">
        {state.dirty ? 'Kaydedilmemiş değişiklik (sim.)' : state.saveCount ? 'Kaydedildi (sim.)' : 'Değişiklik yok'}
      </span>
      <div className="a-bar-actions">
        <button
          type="button"
          className="a-btn"
          onClick={discard}
          disabled={!state.dirty}
          aria-label="Vazgeç: değişiklikleri at"
          title="Değişiklikleri at: son kaydedilen değerlere dön"
        >
          Vazgeç
        </button>
        <button type="button" className="a-btn" onClick={save}>
          Kaydet (sim.)
        </button>
        {hasPreview && (
          <button type="button" className="a-btn a-bar-preview" aria-pressed={previewOpen} onClick={onPreview}>
            {previewOpen ? 'Düzenle' : 'Önizle'}
          </button>
        )}
        <button type="button" className="a-btn a-btn-primary" onClick={onPublish}>
          Yayınla (sim.) <Glyph name="arrow" />
        </button>
      </div>
    </div>
  );
}
