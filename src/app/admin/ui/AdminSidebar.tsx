'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Glyph } from './feedback';
import { screenHref, screens, type SectionStatus } from '../screens';

const statusText: Record<SectionStatus, string> = { ok: 'tamam', draft: 'taslak metin var', later: 'sonraki aşamada' };

function SectionGlyph({ s }: { s: SectionStatus }) {
  return (
    <span className={`a-sg a-sg-${s}`} title={statusText[s]}>
      {s === 'ok' && <Glyph name="check" />}
      {s === 'draft' && <span className="a-sg-draft">Taslak</span>}
      {s === 'later' && <span aria-hidden="true">·</span>}
      <span className="a-vh">{statusText[s]}</span>
    </span>
  );
}

/** Left panel: screen switcher + section index of the current screen. */
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const slug = path.split('/').filter(Boolean)[1] ?? '';
  const screen = screens.find((s) => s.slug === slug) ?? screens[0];
  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Highlight the section nearest the top of the editor while scrolling.
  useEffect(() => {
    const ids = screen.sections.map((s) => `bolum-${s.id}`);
    const els = ids.map((i) => document.getElementById(i)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id.replace('bolum-', ''));
      },
      { rootMargin: '-10% 0px -70% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [screen]);

  const rovingKeys = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href]'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const n =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[n].focus();
  };

  const work = screens.filter((s) => s.group === 'work');
  const meta = screens.filter((s) => s.group === 'meta');
  const link = (s: (typeof screens)[number], n: number) => (
    <li key={s.slug || 'home'}>
      <Link
        href={screenHref(s)}
        className="a-nav-link"
        aria-current={s === screen ? 'page' : undefined}
        onClick={onNavigate}
        data-n={n}
      >
        <span className="a-num a-nav-n">{String(n).padStart(2, '0')}</span>
        <span className="a-nav-t">{s.title}</span>
      </Link>
    </li>
  );

  return (
    <div className="a-side-in">
      <button type="button" className="a-btn a-side-close" onClick={onNavigate}>
        Bölümleri kapat
      </button>
      <nav aria-label="Ekranlar" className="a-nav" ref={navRef} onKeyDown={rovingKeys}>
        <p className="a-panel-k">Pafta listesi</p>
        <ul className="a-nav-list">{work.map((s, i) => link(s, i + 1))}</ul>
        <ul className="a-nav-list a-nav-meta">{meta.map((s, i) => link(s, work.length + i + 1))}</ul>
      </nav>
      <nav aria-label="Bölüm dizini" className="a-index" onKeyDown={rovingKeys}>
        <p className="a-panel-k">Bölüm dizini · {screen.title}</p>
        {screen.sections.length ? (
          <ul className="a-nav-list">
            {screen.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#bolum-${s.id}`}
                  className="a-idx-link"
                  aria-current={active === s.id ? 'true' : undefined}
                  onClick={() => {
                    setActive(s.id);
                    onNavigate?.();
                  }}
                >
                  <span className="a-idx-t">{s.label}</span>
                  <SectionGlyph s={s.status} />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="a-help a-index-empty">Bu ekranın bölümleri sonraki aşamada listelenecek.</p>
        )}
      </nav>
    </div>
  );
}
