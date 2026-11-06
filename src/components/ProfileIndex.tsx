'use client';

import { useEffect, useRef, useState } from 'react';

type Item = { id: string; label: string };

/**
 * Secondary navigation, Profile page only.
 * ≥1024px: sticky list in columns 1–2. <1024px: a "On this page" disclosure at the top of the page.
 * The active entry is set in Newsreader italic, the same language as the primary nav — no bar, dot or colour.
 */
export function ProfileIndex({ items, title }: { items: Item[]; title: string }) {
  const [active, setActive] = useState(items[0].id);
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const list = (touch: boolean) => (
    <ul className={touch ? 'pt-1' : ''}>
      {items.map((i) => {
        const on = active === i.id;
        return (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={on ? 'location' : undefined}
              onClick={() => details.current?.removeAttribute('open')}
              className={`inline-flex items-center ${touch ? 'min-h-11 min-w-11' : 'min-h-9'} ${
                on ? 'font-serif text-[18px] italic' : 'text-[15px] font-medium ulink'
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
        <p className="t-meta pb-2">{title}</p>
        {list(false)}
      </nav>

      <details ref={details} className="profile-disclosure hair border-b border-cizgi lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[15px] font-medium">
          <span className="ulink">{title}</span>
          <span aria-hidden className="profile-disclosure-mark" />
        </summary>
        <nav aria-label={title} className="pb-3">
          {list(true)}
        </nav>
      </details>
    </>
  );
}
