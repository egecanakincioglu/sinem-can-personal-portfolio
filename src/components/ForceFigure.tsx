'use client';

import { useEffect, useRef, useState } from 'react';
import { dict } from '@/content/dictionary';

type ForcesCopy = typeof dict.forces;
import type { ForceRecord, Locale } from '@/content/types';
import { arrowHead, chain, partialResultant, resultant } from '@/lib/physics';
import { num } from '@/lib/format';
import { DirectionGlyph, V } from './linework';

type Layout = {
  W: number;
  H: number;
  pad: number;
  fs: number;
  sub: number;
  rFs: number;
  arc: number;
  axis: number;
  label: number;
};
// Two compositions, not one scaled: the compact one re-fits the polygon to a narrow box
// and sizes labels so they render at ≥12px on a 360px screen.
const WIDE: Layout = { W: 560, H: 340, pad: 52, fs: 20, sub: 14, rFs: 28, arc: 58, axis: 150, label: 18 };
const COMPACT: Layout = { W: 360, H: 250, pad: 30, fs: 15, sub: 11, rFs: 22, arc: 40, axis: 100, label: 15 };

const penMs = (px: number) => Math.min(900, Math.max(300, px / 1.2)); // constant pen speed ≈1.2 px/ms

type PolyProps = {
  records: ForceRecord[];
  locale: Locale;
  L: Layout;
  alt: string;
  reversed: boolean;
  count: number; // vectors drawn, in addition order
  animate: boolean;
  focusId: string | null;
  dimOthers: boolean;
  onHover: (id: string | null) => void;
};

function Polygon({ records, locale, L, alt, reversed, count, animate, focusId, dimOthers, onHover }: PolyProps) {
  void locale;
  const { W, H, pad } = L;
  const N = records.length;
  const seq = reversed ? [...records].reverse() : records;
  const fwd = chain(records);
  const rev = chain([...records].reverse());
  const pts = reversed ? rev : fwd;

  // fit both orders into one box, so toggling the order never rescales the figure or moves R
  const all = [...fwd, ...rev];
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2 - 24) / (maxY - minY));
  const X = (x: number) => pad + (x - minX) * scale;
  const Y = (y: number) => H - pad - 6 - (y - minY) * scale;

  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const x1 = X(a.x),
      y1 = Y(a.y),
      x2 = X(b.x),
      y2 = Y(b.y);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const dx = (x2 - x1) / len,
      dy = (y2 - y1) / len;
    return { x1, y1, x2, y2, dx, dy, len, ex: x2 - dx * 10, ey: y2 - dy * 10, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
  };

  const rFinal = seg(fwd[0], fwd[N]);
  const rNow = count >= 1 ? seg(pts[0], pts[count]) : null;
  const angleNow = (partialResultant(seq, count).angleDeg * Math.PI) / 180;
  const ox = X(0),
    oy = Y(0);
  // labels go on the side farther from the FINAL resultant line, so they never jump while R grows
  const distR = (px: number, py: number) => Math.abs(rFinal.dx * (py - rFinal.y1) - rFinal.dy * (px - rFinal.x1));

  // label positions are computed up front so R's own label can pick the free spot along its line
  const labels = seq.slice(0, count).map((v, i) => {
    const s = seg(pts[i], pts[i + 1]);
    const nx = s.dy,
      ny = -s.dx;
    const a = { x: s.mx + nx * L.label, y: s.my + ny * L.label };
    const b = { x: s.mx - nx * L.label, y: s.my - ny * L.label };
    return distR(a.x, a.y) >= distR(b.x, b.y) ? a : b;
  });
  let rLabel = { x: 0, y: 0 };
  if (rNow) {
    let best = -1;
    for (const t of [0.5, 0.64, 0.78, 0.36]) {
      for (const side of [1, -1]) {
        const c = {
          x: rNow.x1 + (rNow.x2 - rNow.x1) * t - rNow.dy * side * (L.rFs * 0.9),
          y: rNow.y1 + (rNow.y2 - rNow.y1) * t + rNow.dx * side * (L.rFs * 0.9),
        };
        const clear = Math.min(...labels.map((p) => Math.hypot(p.x - c.x, p.y - c.y)), 999);
        if (clear > best + 0.5) {
          best = clear;
          rLabel = c;
        }
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt} className="block h-auto w-full overflow-visible">
      <line x1={ox} y1={oy} x2={ox + L.axis} y2={oy} className="svg-axis" />
      {rNow && (
        <path
          d={`M${ox + L.arc} ${oy} A${L.arc} ${L.arc} 0 0 0 ${ox + L.arc * Math.cos(angleNow)} ${oy - L.arc * Math.sin(angleNow)}`}
          className="svg-thin"
        />
      )}
      <text x={ox + L.axis * 0.72} y={oy + L.fs + 2} fontSize={L.fs - 2} className="svg-text">
        θ
        <tspan fontSize={L.sub - 2} dy={3} fontStyle="normal">
          R
        </tspan>
      </text>

      {seq.slice(0, count).map((v, i) => {
        const s = seg(pts[i], pts[i + 1]);
        const n = records.findIndex((r) => r.id === v.id) + 1; // label keeps the chronological number
        const p = labels[i];
        const focused = focusId === v.id;
        const dim = dimOthers && !focused; // dimming only on explicit hover/focus, not for the scroll-active vector
        const anim = {
          '--dur': `${penMs(s.len)}ms`,
          '--delay': reversed ? `${i * 70}ms` : '0ms',
        } as React.CSSProperties;
        return (
          <g
            key={`${reversed ? 'r' : 'f'}-${v.id}`}
            className="vec"
            opacity={dim ? 0.4 : 1}
            onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(v.id)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
          >
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="transparent" strokeWidth={16} />
            <line
              x1={s.x1}
              y1={s.y1}
              x2={s.ex}
              y2={s.ey}
              pathLength={1}
              className={`svg-heavy vec-line ${animate ? 'draw-in' : ''}`}
              style={{ ...anim, strokeWidth: focused ? 2.8 : 1.5 }}
            />
            <polygon
              points={arrowHead(s.x2, s.y2, s.dx, s.dy)}
              className={`fill-grafit ${animate ? 'draw-head' : ''}`}
              style={anim}
            />
            <text
              x={p.x}
              y={p.y + L.fs * 0.32}
              fontSize={L.fs}
              textAnchor="middle"
              className="svg-text"
              fontWeight={focused ? 600 : 400}
            >
              F
              <tspan fontSize={L.sub} dy={3} fontStyle="normal">
                {n}
              </tspan>
            </text>
          </g>
        );
      })}

      {/* resultant (red): sum of the vectors currently drawn; at the last step it equals the final R */}
      {rNow && (
        <g>
          <line x1={rNow.x1} y1={rNow.y1} x2={rNow.ex} y2={rNow.ey} className="svg-red" />
          <polygon points={arrowHead(rNow.x2, rNow.y2, rNow.dx, rNow.dy)} className="fill-red" />
          <text
            x={rLabel.x}
            y={rLabel.y + L.rFs * 0.32}
            fontSize={L.rFs}
            textAnchor="middle"
            className="font-serif italic fill-kirmizi"
          >
            R
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * Force polygon narrative: the list is real, chronological content; the polygon is its
 * conceptual summary. Desktop: sticky figure, vectors appear as entries cross mid-screen. Below 1024px
 * or with reduced motion: the complete polygon, no progressive drawing.
 */
export function ForcesInteractive({
  records,
  locale,
  copy = dict.forces,
}: {
  records: ForceRecord[];
  locale: Locale;
  copy?: ForcesCopy;
}) {
  const N = records.length;
  const [step, setStep] = useState(N); // SSR / no-JS / mobile: complete polygon
  const [reversed, setReversed] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [scrollId, setScrollId] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    let io: IntersectionObserver | null = null;
    let onScroll: (() => void) | null = null;
    const stopScroll = () => {
      if (onScroll) window.removeEventListener('scroll', onScroll);
      onScroll = null;
    };

    const setup = () => {
      io?.disconnect();
      io = null;
      stopScroll();
      if (!wide.matches || calm.matches || !list.current) {
        setAnimate(false);
        setStep(N);
        setScrollId(null);
        return;
      }
      setAnimate(true);
      const items = Array.from(list.current.children) as HTMLElement[];
      const compute = () => {
        // entries whose top has passed the middle of the viewport; at least F1 so the figure is never empty
        const line = window.innerHeight * 0.51;
        let k = 0;
        items.forEach((el, i) => {
          if (el.getBoundingClientRect().top <= line) k = i + 1;
        });
        k = Math.max(1, k);
        setStep(k);
        setScrollId(records[k - 1].id);
      };
      io = new IntersectionObserver(compute, { rootMargin: '-50% 0px -49% 0px' });
      items.forEach((el) => io!.observe(el));
      compute();
      // the observer band is thin: a fast jump (End key, scrollbar drag, anchor) can skip entries, so also re-evaluate on scroll
      let raf = 0;
      onScroll = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(compute);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
    };

    setup();
    wide.addEventListener('change', setup);
    calm.addEventListener('change', setup);
    return () => {
      io?.disconnect();
      stopScroll();
      wide.removeEventListener('change', setup);
      calm.removeEventListener('change', setup);
    };
  }, [N, records]);

  const focusId = hoverId ?? scrollId;
  const count = reversed ? N : step; // reversed order shows the whole chain, added backwards
  const part = partialResultant(records, step);
  const full = resultant(records);
  const isFinal = reversed || step >= N;
  const shown = isFinal ? full : part;
  const alt = copy.figAlt[locale];
  const poly = {
    records,
    locale,
    alt,
    reversed,
    count,
    animate,
    focusId,
    dimOthers: hoverId !== null,
    onHover: setHoverId,
  };

  return (
    <>
      {/* bottom padding keeps the sticky figure pinned while the last entry is still in the reading zone */}
      <div className="col-[1/-1] mt-14 lg:col-[1/6] lg:mt-20 lg:pb-[28vh]">
        <p className="t-meta mb-2">{copy.list[locale]}</p>
        {/* always chronological, whatever order the diagram uses */}
        <ol ref={list}>
          {records.map((f, i) => {
            const on = focusId === f.id;
            return (
              <li
                key={f.id}
                tabIndex={0}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHoverId(f.id)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setHoverId(null)}
                onFocus={() => setHoverId(f.id)}
                onBlur={() => setHoverId(null)}
                className={`flex gap-4 border-t border-l-2 border-t-kalem/50 py-5 pl-3 -ml-3 transition-colors ${
                  on ? 'border-l-grafit bg-kagit' : 'border-l-transparent'
                }`}
              >
                <div className="flex w-10 shrink-0 flex-col items-start gap-2">
                  <i className="text-[18px] leading-none">
                    F<sub>{i + 1}</sub>
                  </i>
                  <DirectionGlyph angleDeg={f.angleDeg} />
                </div>
                <div className="min-w-0">
                  <p className="t-meta">{f.period[locale]}</p>
                  <h3 className="mt-0.5 text-[19px] font-semibold leading-[1.3]">{f.title[locale]}</h3>
                  <p className="mt-1 max-w-[44ch] text-[16px] text-kursun">{f.text[locale]}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* stretches to the list's height so the inner figure has room to stay sticky */}
      <div className="col-[1/-1] mt-14 lg:col-[7/13] lg:mt-20">
        <div className="lg:sticky lg:top-24">
          <figure>
            <div className="hidden md:block">
              <Polygon {...poly} L={WIDE} />
            </div>
            <div className="md:hidden">
              <Polygon {...poly} L={COMPACT} />
            </div>
            <figcaption className="mt-5 max-w-[56ch]">
              <p className="t-caption">
                <span className="font-semibold text-grafit">{copy.figure[locale]} — </span>
                {copy.caption[locale]}
              </p>
            </figcaption>
          </figure>

          <p className="mt-5 max-w-[56ch] text-[16px] leading-snug">
            <span className="font-semibold">
              {isFinal ? copy.result[locale] : `${copy.partial[locale]} (F₁–F${'₀₁₂₃₄₅₆₇₈₉'[step]})`}
            </span>
            <span className="tnum text-kursun">
              {' '}
              (<V n="θ" s="R" /> = {num(shown.angleDeg, locale, 1)}°{reversed ? `, ${copy.reversedNote[locale]}` : ''})
              {isFinal ? ': ' : ''}
            </span>
            {isFinal && <span className="text-kursun">{copy.resultText[locale]}</span>}
          </p>
          <p className="t-note mt-3">{copy.note[locale]}</p>

          <button
            type="button"
            onClick={() => setReversed((r) => !r)}
            aria-pressed={reversed}
            aria-label={`${copy.reverse[locale]}. ${copy.reverseLabel[locale]}`}
            className="ulink mt-4 inline-flex min-h-11 items-center px-1 text-[15px] font-medium"
          >
            {copy.reverse[locale]}
          </button>
        </div>
      </div>
    </>
  );
}
