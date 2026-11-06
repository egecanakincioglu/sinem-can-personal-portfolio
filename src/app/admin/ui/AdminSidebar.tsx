'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { entryOfIssue } from '@/lib/task-queue';
import { registry } from '../registry';
import { screenHref, screens, sheetNumber, type ScreenDef, type SectionStatus } from '../screens';
import { Glyph } from './feedback';
import { useAdmin } from './store';

const statusText: Record<SectionStatus, string> = { ok: 'tamam', draft: 'taslak metin var', later: 'sonraki aşamada' };

function SectionGlyph({ s, errors }: { s: SectionStatus; errors: boolean }) {
  if (errors) {
    return (
      <span className="a-sg a-sg-error" title="hata var">
        <span aria-hidden="true">!</span>
        <span className="a-vh">hata var</span>
      </span>
    );
  }
  return (
    <span className={`a-sg a-sg-${s}`} title={statusText[s]}>
      {s === 'ok' && <Glyph name="check" />}
      {s === 'draft' && <span className="a-sg-draft">Taslak</span>}
      {s === 'later' && <span aria-hidden="true">·</span>}
      <span className="a-vh">{statusText[s]}</span>
    </span>
  );
}

/** Arrow keys, Home and End move focus between the links of a list; only one link of the list is a tab stop. */
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

/** Left panel: screen switcher + section index of the current screen. */
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const slug = path.split('/').filter(Boolean)[1] ?? '';
  const screen = screens.find((s) => s.slug === slug) ?? screens[0];
  const isRecord = path.split('/').filter(Boolean).length > 2;
  const sections = (!isRecord && screen.listSections) || screen.sections;
  const { issues } = useAdmin();
  // The same issue list as the title block count and the task queue.
  const inSection = (section: string) =>
    issues.filter((i) => {
      const e = entryOfIssue(i, registry);
      return e?.screen === screen.slug && e.editorSection === section;
    });
  const [active, setActive] = useState<string | null>(null);
  const [navStop, setNavStop] = useState<string | null>(null);
  const [indexStop, setIndexStop] = useState<string | null>(null);
  const navStopId = navStop !== null && screens.some((s) => s.slug === navStop) ? navStop : screen.slug;
  const indexStopId = indexStop !== null && sections.some((s) => s.id === indexStop) ? indexStop : sections[0]?.id;

  // Highlight the section nearest the top of the editor while scrolling.
  useEffect(() => {
    const ids = sections.map((s) => `bolum-${s.id}`);
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
  }, [sections]);

  const work = screens.filter((s) => s.group === 'work');
  const meta = screens.filter((s) => s.group === 'meta');
  const link = (s: ScreenDef) => (
    <li key={s.slug || 'home'}>
      <Link
        href={screenHref(s)}
        className="a-nav-link"
        aria-current={s === screen ? 'page' : undefined}
        onClick={onNavigate}
        tabIndex={s.slug === navStopId ? 0 : -1}
        data-stop={s.slug}
      >
        <span className="a-num a-nav-n">{String(sheetNumber(s.slug)).padStart(2, '0')}</span>
        <span className="a-nav-s">{s.short}</span>
        <span className="a-nav-t">{s.title}</span>
      </Link>
    </li>
  );

  return (
    <div className="a-side-in">
      <button
        type="button"
        className="a-btn a-side-close"
        onClick={onNavigate}
        aria-expanded="true"
        aria-controls="a-side"
      >
        <span>Bölümler ve ekranlar</span>
        <span aria-hidden="true">−</span>
      </button>
      <nav
        aria-label="Ekranlar"
        className="a-nav"
        onKeyDown={rovingKeys}
        onFocus={(e) => setNavStop((e.target as HTMLElement).dataset.stop ?? null)}
      >
        <p className="a-panel-k">Pafta listesi</p>
        <ul className="a-nav-list">{work.map(link)}</ul>
        <ul className="a-nav-list a-nav-meta">{meta.map(link)}</ul>
      </nav>
      {sections.length > 0 && (
        <nav
          aria-label="Bölüm dizini"
          className="a-index"
          onKeyDown={rovingKeys}
          onFocus={(e) => setIndexStop((e.target as HTMLElement).dataset.stop ?? null)}
        >
          <p className="a-panel-k">Bölüm dizini · {screen.title}</p>
          <ul className="a-nav-list">
            {sections.map((s) => {
              const found = inSection(s.id);
              return (
                <li key={s.id}>
                  <a
                    href={`#bolum-${s.id}`}
                    className="a-idx-link"
                    aria-current={active === s.id ? 'true' : undefined}
                    tabIndex={s.id === indexStopId ? 0 : -1}
                    data-stop={s.id}
                    onClick={() => {
                      setActive(s.id);
                      onNavigate?.();
                    }}
                  >
                    <span className="a-idx-t">{s.label}</span>
                    <SectionGlyph s={s.status} errors={found.some((i) => i.severity === 'error')} />
                    {found.length > 0 && (
                      <span className="a-num a-sg">
                        {found.length}
                        <span className="a-vh"> görev</span>
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
