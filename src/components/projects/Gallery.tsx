'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type GalleryItem = {
  n: number;
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  /** Video items open their external page instead of the lightbox. */
  externalUrl?: string;
};

export type GalleryLabels = {
  figure: string;
  enlarge: string;
  lightbox: string;
  prev: string;
  next: string;
  close: string;
  watch: string;
  external: string;
};

/** A figure keeps its own aspect ratio: width/height are reserved up front and nothing is cropped. */
function Img({ it, className = '' }: { it: GalleryItem; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={it.src}
      alt={it.alt}
      width={it.width}
      height={it.height}
      loading="lazy"
      decoding="async"
      className={`block h-auto w-full ${className}`}
    />
  );
}

export function Gallery({ items, labels }: { items: GalleryItem[]; labels: GalleryLabels }) {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  // Lightbox navigates images only; videos are links.
  const viewable = items.filter((i) => !i.externalUrl);
  const idx = open === null ? -1 : viewable.findIndex((i) => i.n === open);

  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus();
  }, []);
  const step = useCallback(
    (d: number) =>
      setOpen((cur) => {
        if (cur === null) return cur;
        const i = viewable.findIndex((v) => v.n === cur);
        return viewable[(i + d + viewable.length) % viewable.length].n;
      }),
    [viewable],
  );

  useEffect(() => {
    if (open === null) return;
    document.body.style.overflow = 'hidden';
    box.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close();
      if (e.key === 'ArrowRight') return step(1);
      if (e.key === 'ArrowLeft') return step(-1);
      if (e.key !== 'Tab') return;
      const f = Array.from(box.current?.querySelectorAll<HTMLElement>('button') ?? []);
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
  }, [open, close, step]);

  const cur = idx >= 0 ? viewable[idx] : null;

  const figure = (it: GalleryItem, mobile: boolean) => (
    <figure
      key={it.n}
      className={
        mobile
          ? 'w-[82vw] max-w-[28rem] shrink-0 snap-center'
          : it.width >= it.height && it.n === items[0].n
            ? 'lg:col-span-2'
            : ''
      }
    >
      <div className="border border-cizgi bg-white">
        {it.externalUrl ? (
          <a href={it.externalUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Img it={it} />
            <span className="sr-only">
              {' '}
              {labels.watch} ({labels.external})
            </span>
          </a>
        ) : (
          <button
            type="button"
            className="block w-full cursor-zoom-in"
            aria-haspopup="dialog"
            aria-label={`${labels.enlarge}: ${labels.figure} ${it.n}`}
            onClick={(e) => {
              opener.current = e.currentTarget;
              setOpen(it.n);
            }}
          >
            <Img it={it} />
          </button>
        )}
      </div>
      <figcaption className="t-caption mt-2.5 flex gap-3">
        <span className="tnum shrink-0 font-medium text-grafit">
          {labels.figure} {it.n}
        </span>
        <span>
          {it.caption}
          {it.externalUrl && (
            <>
              {it.caption ? ' ' : ''}
              <a href={it.externalUrl} target="_blank" rel="noopener noreferrer" className="ulink text-grafit">
                {labels.watch} ↗
              </a>
            </>
          )}
        </span>
      </figcaption>
    </figure>
  );

  return (
    <>
      {/* <lg: horizontal scroll-snap strip. lg+: two-column plate sheet, the first landscape figure across both. */}
      <div
        className="-mx-[var(--pad)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--pad)] pb-4 lg:hidden"
        tabIndex={0}
        role="group"
        aria-label={labels.lightbox}
      >
        {items.map((it) => figure(it, true))}
      </div>
      <div className="hidden items-start gap-x-[var(--g)] gap-y-10 lg:grid lg:grid-cols-2">
        {items.map((it) => figure(it, false))}
      </div>

      {cur && (
        <div
          ref={box}
          role="dialog"
          aria-modal="true"
          aria-label={labels.lightbox}
          className="menu-sheet fixed inset-0 z-50 flex flex-col bg-kagit"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
          }}
        >
          <div className="shell flex h-[72px] w-full shrink-0 items-center justify-between">
            <p className="tnum t-meta" aria-live="polite">
              {labels.figure} {cur.n} · {idx + 1} / {viewable.length}
            </p>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center px-1 text-[15px] font-medium"
            >
              <span className="ulink">{labels.close}</span>
            </button>
          </div>
          <div className="shell flex min-h-0 w-full flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cur.src}
              alt={cur.alt}
              width={cur.width}
              height={cur.height}
              className="max-h-full max-w-full bg-white object-contain"
            />
          </div>
          <div className="shell flex w-full items-start justify-between gap-6 pb-6 pt-4">
            <p className="t-caption max-w-[60ch]">{cur.caption}</p>
            {viewable.length > 1 && (
              <div className="flex shrink-0 gap-5 text-[15px] font-medium">
                <button type="button" onClick={() => step(-1)} className="inline-flex min-h-11 items-center">
                  <span className="ulink">
                    ← <span className="sr-only">{labels.prev}</span>
                  </span>
                </button>
                <button type="button" onClick={() => step(1)} className="inline-flex min-h-11 items-center">
                  <span className="ulink">
                    <span className="sr-only">{labels.next}</span> →
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
