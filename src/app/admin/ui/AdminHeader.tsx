'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { screens, screenHref } from '../screens';
import { Segmented } from './controls';
import { revLetter, useAdmin } from './store';

/** Title block (antet): the working context as ruled cells. 6 cells → 3×2 → 2×3. */
export function AdminHeader({ onTasks, onPalette }: { onTasks: () => void; onPalette: () => void }) {
  const path = usePathname();
  const { state, setEditLang, issues } = useAdmin();
  const seg = path.split('/').filter(Boolean).slice(1);
  const screen = screens.find((s) => s.slug === (seg[0] ?? '')) ?? screens[0];
  const trail = seg[1] ? `${screen.title} › ${decodeURIComponent(seg[1])}` : screen.title;
  const status = state.dirty ? 'Taslak' : state.saveCount > 0 ? 'Kaydedildi (sim.)' : 'Taslak';
  return (
    <header className="a-tb" aria-label="Antet">
      <div className="a-tb-cell a-tb-brand">
        <span className="a-tb-k">Çizen</span>
        <Link href="/admin" className="a-tb-v a-serif" aria-label="Admin · prototip: ANTET, genel bakış">
          Admin · prototip
        </Link>
      </div>
      <div className="a-tb-cell">
        <span className="a-tb-k">Pafta</span>
        <span className="a-tb-v a-serif" title={trail}>
          {trail}
        </span>
      </div>
      <div className="a-tb-cell">
        <span className="a-tb-k" id="tb-lang">
          Dil
        </span>
        <Segmented
          label="Düzenleme dili"
          value={state.editLang}
          onChange={setEditLang}
          options={[
            { value: 'tr', label: 'TR' },
            { value: 'en', label: 'EN' },
          ]}
        />
      </div>
      <div className="a-tb-cell">
        <span className="a-tb-k">Durum</span>
        <span className="a-tb-v">{status}</span>
      </div>
      <div className="a-tb-cell">
        <span className="a-tb-k">Rev.</span>
        <span className="a-tb-v a-num">
          {revLetter(state.rev)} · Kayıt {state.saveCount}
        </span>
      </div>
      <div className="a-tb-cell a-tb-actions">
        <button type="button" className="a-btn a-btn-quiet" onClick={onTasks}>
          <span className="a-num">{issues.length}</span> görev
        </button>
        <button
          type="button"
          className="a-btn a-btn-quiet"
          onClick={onPalette}
          aria-label="Ara, ⌘K: komut paletini aç (Ctrl+K)"
        >
          <kbd className="a-kbd">⌘K</kbd>
          <span className="a-kbd-alt">Ara</span>
        </button>
      </div>
    </header>
  );
}

/** @public Used by the editor screens. */
export { screenHref };
