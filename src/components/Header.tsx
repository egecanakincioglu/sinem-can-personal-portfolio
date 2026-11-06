'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { dict } from '@/content/dictionary';
import { getSiteContent } from '@/content/site-content';
import { navKeys, sectionIds, type NavKey } from '@/content/structure';
import { locales, type Copy, type Locale } from '@/content/types';
import { navHref, switchPath, type AltPaths, type PageKey } from '@/lib/routes';
import { SECTION_EVENT } from './notes/ArticleToc';

const NAV_FOR_SECTION: Record<PageKey, Record<string, NavKey>> = {
  home: { profile: 'profile', work: 'projects', contact: 'contact' },
  profile: { contact: 'contact' },
  projects: { contact: 'contact' },
  project: { contact: 'contact' },
  notes: { contact: 'contact' },
  note: { contact: 'contact' },
};
type Dict = typeof dict;
const sectionName = (D: Dict, id: string, locale: Locale) => (D.sections as Record<string, Copy>)[id]?.[locale] ?? '';

function LangSwitch({
  D,
  locale,
  page,
  paths,
  full,
}: {
  D: Dict;
  locale: Locale;
  page: PageKey;
  paths?: AltPaths;
  full?: boolean;
}) {
  return (
    <span className="flex items-center gap-2" role="group" aria-label={D.nav.language[locale]}>
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden className="text-kalem">
              {full ? '·' : '/'}
            </span>
          )}
          <a
            href={switchPath(page, l, paths)}
            hrefLang={l}
            lang={l}
            aria-label={full ? D.langNames[l] : `${l.toUpperCase()}, ${D.langNames[l]}`}
            aria-current={l === locale ? 'true' : undefined}
            // Keep the reader's place: the equivalent page gets the current #hash (ids are language-neutral).
            onClick={(e) => {
              e.currentTarget.href = `${switchPath(page, l, paths)}${window.location.hash}`;
            }}
            className={`inline-flex min-h-11 items-center ${l === locale ? 'text-grafit' : 'text-kursun ulink'}`}
          >
            {full ? D.langNames[l] : l.toUpperCase()}
          </a>
        </span>
      ))}
    </span>
  );
}

export function Header({
  locale,
  page = 'home',
  paths,
  sections,
  ownerName = getSiteContent().ownerName,
  email = getSiteContent().contact.email,
  copy,
}: {
  locale: Locale;
  page?: PageKey;
  paths?: AltPaths;
  /** Article pages: the H2 sections, named in the running head while they are being read. */
  sections?: { id: string; label: string }[];
  /** Optional preview overrides for the two editorial strings this client component shows. */
  ownerName?: string;
  email?: string;
  /** Preview only: the interface dictionary (navigation labels, running head names). Defaults to the public one. */
  copy?: Dict;
}) {
  const D = copy ?? dict;
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const ids = sectionIds[page];
  const [current, setCurrent] = useState<string>(ids[0]);
  const [articleSection, setArticleSection] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const headerEl = useRef<HTMLElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // Articles: the header gets out of the way while reading down and returns on the way up.
      if (page === 'note') setHidden(y > 240 && y > last && !headerEl.current?.contains(document.activeElement));
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [page]);

  useEffect(() => {
    if (page !== 'note') return;
    const onSection = (e: Event) => setArticleSection((e as CustomEvent<string | null>).detail);
    window.addEventListener(SECTION_EVENT, onSection);
    return () => window.removeEventListener(SECTION_EVENT, onSection);
  }, [page]);

  // Running head: the section crossing the middle of the viewport.
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  const close = useCallback(() => {
    setOpen(false);
    menuBtn.current?.focus();
  }, []);

  // Menu: scroll lock, Esc, focus trap.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const focusables = () =>
      Array.from(sheet.current?.querySelectorAll<HTMLElement>('a[href], button') ?? []).filter(
        (el) => !el.hasAttribute('disabled'),
      );
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // On the Profile page the Profile link stays active until the Contact block takes over.
  const activeNav: NavKey | undefined =
    NAV_FOR_SECTION[page][current] ??
    (page === 'profile'
      ? 'profile'
      : page === 'projects' || page === 'project'
        ? 'projects'
        : page === 'notes' || page === 'note'
          ? 'notes'
          : undefined);

  // Running head text: on an article it names the H2 being read, until the Contact block takes over.
  const headLabel =
    page === 'note' && current !== 'contact'
      ? (sections?.find((s) => s.id === articleSection)?.label ?? D.sections.note[locale])
      : sectionName(D, current, locale);

  return (
    <>
      <header
        ref={headerEl}
        className={`fixed inset-x-0 top-0 z-40 bg-[rgb(246_247_242/0.96)] transition-[height,transform] duration-200 ${
          scrolled ? 'h-[52px] border-b border-cizgi' : 'h-[72px]'
        } ${hidden ? '-translate-y-full' : ''}`}
      >
        <div className="shell flex h-full items-center gap-6">
          <a href={`/${locale}`} className="font-serif text-xl leading-none tracking-[-0.01em]">
            {ownerName}
          </a>
          <span aria-hidden className="hidden min-w-0 truncate font-serif text-[15px] italic text-kursun md:block">
            — {headLabel}
          </span>

          {/* The footer carries the same navigation under the main label; landmarks of one kind need distinct names. */}
          <nav
            aria-label={D.nav.menu[locale]}
            className="ml-auto hidden items-center gap-5 text-[15px] font-medium md:flex lg:gap-8"
          >
            {navKeys.map((key) => {
              const active = activeNav === key;
              return (
                <a
                  key={key}
                  href={navHref(key, page, locale)}
                  aria-current={
                    active
                      ? key === page ||
                        (key === 'projects' && page === 'project') ||
                        (key === 'notes' && page === 'note')
                        ? 'page'
                        : 'location'
                      : undefined
                  }
                  className={`inline-flex min-h-11 items-center ${active ? 'font-serif text-[17px] italic' : 'ulink'}`}
                >
                  {D.nav[key][locale]}
                </a>
              );
            })}
            <span className="ml-2 text-[15px]">
              <LangSwitch D={D} locale={locale} page={page} paths={paths} />
            </span>
          </nav>

          <button
            ref={menuBtn}
            type="button"
            className="ml-auto inline-flex min-h-11 items-center px-1 text-[15px] font-medium md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
          >
            <span className="ulink">{D.nav.menu[locale]}</span>
          </button>
        </div>
      </header>

      {open && (
        <div
          ref={sheet}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={D.nav.menu[locale]}
          className="menu-sheet fixed inset-0 z-50 flex flex-col overflow-y-auto bg-kagit"
        >
          {/* .shell centres with auto margins; in a flex column that shrinks it to its content, so it needs w-full */}
          <div className="shell flex h-[72px] w-full shrink-0 items-center justify-between">
            <span className="font-serif text-xl leading-none">{ownerName}</span>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center px-1 text-[15px] font-medium"
            >
              <span className="ulink">{D.nav.close[locale]}</span>
            </button>
          </div>
          <nav aria-label={D.nav.label[locale]} className="shell mt-8 flex w-full flex-1 flex-col gap-1">
            {navKeys.map((key) => (
              <a
                key={key}
                href={navHref(key, page, locale)}
                onClick={() => setOpen(false)}
                className="block py-2 font-serif text-[40px] leading-[1.1] tracking-[-0.015em]"
              >
                {D.nav[key][locale]}
              </a>
            ))}
          </nav>
          <div className="shell w-full pb-10 pt-12 text-[17px]">
            <div className="hair pt-4">
              <LangSwitch D={D} locale={locale} page={page} paths={paths} full />
            </div>
            <a href={`mailto:${email}`} className="ulink mt-2 inline-block whitespace-nowrap">
              {email}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
