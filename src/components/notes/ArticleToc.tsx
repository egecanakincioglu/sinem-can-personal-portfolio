'use client';

import { useEffect, useRef, useState } from 'react';

export type TocItem = { id: string; label: string; level: 2 | 3; parent: string };

/** Broadcast so the running head (Header) can show the active H2 in italic. */
export const SECTION_EVENT = 'article:section';

/**
 * Reading navigation for an article. ≥1024px: sticky list in the left columns. <1024px: an "In this note"
 * disclosure that also names the section being read. The active entry is Newsreader italic with a drawn
 * rule beside it, the same language as the primary nav.
 */
export function ArticleToc({ items, title, startLabel }: { items: TocItem[]; title: string; startLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id));
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let cur: string | null = null;
      els.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) cur = items[i].id;
      });
      setActive(cur);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  const activeItem = items.find((i) => i.id === active);
  const activeH2 = activeItem ? activeItem.parent : null;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(SECTION_EVENT, { detail: activeH2 }));
  }, [activeH2]);

  const list = (touch: boolean) => (
    <ul className={`relative ${touch ? 'pt-1' : 'border-l border-cizgi'}`}>
      {items.map((i) => {
        const on = active === i.id;
        return (
          <li key={i.id} className="relative">
            {on && !touch && <span aria-hidden className="absolute -left-px bottom-1.5 top-1.5 w-[1.5px] bg-grafit" />}
            <a
              href={`#${i.id}`}
              aria-current={on ? 'location' : undefined}
              onClick={() => details.current?.removeAttribute('open')}
              className={`inline-flex items-center leading-snug ${touch ? 'min-h-11' : 'min-h-9 py-1'} ${i.level === 3 ? (touch ? 'pl-5' : 'pl-7') : touch ? '' : 'pl-4'} ${
                on
                  ? 'font-serif text-[18px] italic'
                  : `${i.level === 3 ? 'text-[14px]' : 'text-[15px] font-medium'} ulink`
              }`}
            >
              {i.label}
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <nav aria-label={title} className="hidden lg:sticky lg:top-28 lg:block">
        <p className="t-meta pb-3">{title}</p>
        {list(false)}
      </nav>

      <details ref={details} className="profile-disclosure hair border-b border-cizgi lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
          <span className="min-w-0">
            <span className="ulink">{title}</span>
            <span className="block truncate font-serif text-[15px] font-normal italic text-kursun">
              {activeItem?.label ?? startLabel}
            </span>
          </span>
          <span aria-hidden className="profile-disclosure-mark shrink-0" />
        </summary>
        <nav aria-label={title} className="pb-3">
          {list(true)}
        </nav>
      </details>
    </>
  );
}
