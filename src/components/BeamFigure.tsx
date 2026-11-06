'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { dict } from '@/content/dictionary';

type ApproachCopy = typeof dict.approach;
import type { Locale } from '@/content/types';
import { beam } from '@/content/site';
import { BEAM_REFERENCE_A, arrowHead, beamMetrics, beamMoment, clampLoad, deflectionRatio } from '@/lib/physics';
import { num } from '@/lib/format';
import { V } from './linework';

const SAMPLES = 64;
const RULER = [0, 0.25, 0.5, 0.75, 1];
const THUMB = 44; // touch target of the native range input

type Layout = { W: number; H: number; x0: number; span: number; fs: number; bmd: number };
// One composition per breakpoint; the compact one is re-laid out, not scaled.
const DESKTOP: Layout = { W: 800, H: 450, x0: 80, span: 640, fs: 16, bmd: beam.deflectionScale.desktop };
const COMPACT: Layout = { W: 360, H: 466, x0: 40, span: 280, fs: 15, bmd: beam.deflectionScale.compact };

const beamY = 128;
const pLen = 56;
const rulerYOf = (L: Layout) => L.H - 62;

/** UI-only easing of the drawn state (~120ms). Readouts always use the exact target; nothing oscillates. */
function useEased(target: number) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cur.current = target;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the motion preference can only be read in the browser, after mount
      setV(target);
      return;
    }
    let raf = 0;
    const step = () => {
      const d = target - cur.current;
      if (Math.abs(d) < 0.0006) {
        cur.current = target;
        setV(target);
        return;
      }
      cur.current += d * 0.35;
      setV(cur.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

type StageProps = {
  L: Layout;
  locale: Locale;
  shown: number; // eased load position used for drawing
  target: number; // exact load position (input value)
  hover: number | null;
  onChange: (a: number) => void;
  onHover: (a: number | null) => void;
  valueText: string;
  copy: ApproachCopy;
};

function Stage({ L, locale, shown, target, hover, onChange, onHover, valueText, copy }: StageProps) {
  const { W, H, x0, span, fs } = L;
  const x1 = x0 + span;
  const px = (x: number) => x0 + x * span;
  const m = beamMetrics(shown);
  const k = (L.bmd / 100) * span; // px per δ0 (exaggerated visual scale)
  const yAt = (x: number) => beamY + deflectionRatio(shown, x) * k;

  const line = useMemo(
    () =>
      Array.from(
        { length: SAMPLES + 1 },
        (_, i) => `${px(i / SAMPLES).toFixed(1)},${yAt(i / SAMPLES).toFixed(1)}`,
      ).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, L],
  );

  const ax = px(shown);
  const loadTip = yAt(shown);
  const rBase = 214;
  const raLen = pLen * m.ra;
  const rbLen = pLen * m.rb;
  const bmdY = 296;
  const apexY = bmdY + (beamMoment(shown, shown) / 0.25) * 44;
  const rulerY = rulerYOf(L);
  const dimY = 54;
  const lDimY = 26;
  const xm = px(m.xm);
  const showDelta = m.deltaRatio > 0.005;
  const flipM = shown > 0.7;

  const dim = (xa: number, xb: number, y: number) => (
    <path d={`M${xa} ${y} H${xb} M${xa} ${y - 5} V${y + 5} M${xb} ${y - 5} V${y + 5}`} className="svg-thin" />
  );

  // pointer → a/L through the SVG's own viewBox, so the load always sits in the beam's coordinate system
  const toA = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    return Math.round(clampLoad((vx - x0) / span) * 100) / 100;
  };
  const drag = useRef<{ id: number; touch: boolean; x: number; y: number; active: boolean } | null>(null);
  // capture keeps the drag alive outside the SVG; it can throw if the pointer already ended, which is harmless
  const capture = (e: React.PointerEvent<SVGSVGElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* drag still works while the pointer stays over the figure */
    }
  };

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const touch = e.pointerType !== 'mouse';
    drag.current = { id: e.pointerId, touch, x: e.clientX, y: e.clientY, active: !touch };
    onHover(null);
    if (!touch) {
      capture(e);
      onChange(toA(e));
    }
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) {
      if (e.pointerType === 'mouse') onHover(toA(e));
      return;
    }
    if (d.id !== e.pointerId) return;
    if (!d.active) {
      // touch: only a clearly horizontal gesture drags the load; vertical movement stays a page scroll (touch-action: pan-y)
      const dx = Math.abs(e.clientX - d.x);
      const dy = Math.abs(e.clientY - d.y);
      if (dx > 6 && dx > dy) {
        d.active = true;
        capture(e);
      } else return;
    }
    onChange(toA(e));
  };
  const up = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    // a touch tap (no drag, no scroll) places the load
    if (d && d.touch && !d.active && Math.abs(e.clientX - d.x) < 6 && Math.abs(e.clientY - d.y) < 6) onChange(toA(e));
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={copy.figAlt[locale]}
        className="block h-auto w-full cursor-pointer select-none overflow-visible"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => (drag.current = null)}
        onPointerLeave={() => onHover(null)}
      >
        {/* dimensions: L above, a and b below it */}
        {dim(x0, x1, lDimY)}
        <text x={(x0 + x1) / 2} y={lDimY - 8} fontSize={fs} textAnchor="middle" className="svg-text">
          L
        </text>
        {ax - x0 > 4 && dim(x0, ax, dimY)}
        {x1 - ax > 4 && dim(ax, x1, dimY)}
        {ax - x0 > 26 && (
          <text x={(x0 + ax) / 2} y={dimY - 8} fontSize={fs} textAnchor="middle" className="svg-text">
            a
          </text>
        )}
        {x1 - ax > 26 && (
          <text x={(ax + x1) / 2} y={dimY - 8} fontSize={fs} textAnchor="middle" className="svg-text">
            b
          </text>
        )}
        <path d={`M${ax} ${dimY + 6} V${loadTip - pLen - 6}`} className="svg-thin" />

        {/* hover preview (mouse only): pencil-grey ghost load, no deflection */}
        {hover !== null && (
          <g opacity={0.9}>
            <line
              x1={px(hover)}
              y1={beamY - pLen}
              x2={px(hover)}
              y2={beamY - 10}
              className="svg-thin"
              strokeWidth={1.5}
            />
            <polygon points={arrowHead(px(hover), beamY - 1, 0, 1)} fill="#76776F" />
          </g>
        )}

        {/* beam axis (undeformed) and deformed beam */}
        <line x1={x0 - 24} y1={beamY} x2={x1 + 24} y2={beamY} className="svg-axis" />
        <polyline points={line} className="svg-heavy" strokeWidth={2} />

        {/* supports */}
        <g transform={`translate(${x0} ${beamY})`}>
          <path d="M0 1 L-12 21 H12 Z" className="svg-heavy" />
          <path d="M-12 21 l-4 7 M0 21 l-4 7 M12 21 l-4 7" className="svg-thin" />
        </g>
        <g transform={`translate(${x1} ${beamY})`}>
          <path d="M0 1 L-12 19 H12 Z" className="svg-heavy" />
          <circle cx={-6} cy={22.5} r={3} className="svg-thin" />
          <circle cx={6} cy={22.5} r={3} className="svg-thin" />
          <path d="M-16 26 H16" className="svg-thin" />
        </g>

        {/* load P (red) */}
        <line x1={ax} y1={loadTip - pLen} x2={ax} y2={loadTip - 10} className="svg-red" />
        <polygon points={arrowHead(ax, loadTip - 1, 0, 1)} className="fill-red" />
        <text x={ax + 12} y={loadTip - pLen + 8} fontSize={fs + 4} className="font-serif italic fill-kirmizi">
          P
        </text>

        {/* reactions: graphite, length ∝ force, RA + RB = P in length */}
        {raLen > 0.5 && (
          <>
            <line x1={x0} y1={rBase} x2={x0} y2={rBase - raLen + 10} className="svg-heavy" />
            <polygon points={arrowHead(x0, rBase - raLen, 0, -1)} className="fill-grafit" />
          </>
        )}
        <text x={x0} y={rBase + 22} fontSize={fs} textAnchor="middle" className="svg-text">
          R
          <tspan fontSize={fs - 3} dy={4} fontStyle="normal">
            A
          </tspan>
        </text>
        {rbLen > 0.5 && (
          <>
            <line x1={x1} y1={rBase} x2={x1} y2={rBase - rbLen + 10} className="svg-heavy" />
            <polygon points={arrowHead(x1, rBase - rbLen, 0, -1)} className="fill-grafit" />
          </>
        )}
        <text x={x1} y={rBase + 22} fontSize={fs} textAnchor="middle" className="svg-text">
          R
          <tspan fontSize={fs - 3} dy={4} fontStyle="normal">
            B
          </tspan>
        </text>

        {/* δmax marker (hidden when the load sits on a support: no deflection) */}
        {showDelta && (
          <>
            <path d={`M${xm} ${beamY} V${yAt(m.xm)}`} className="svg-thin" />
            <path d={`M${xm - 4} ${yAt(m.xm)} H${xm + 4}`} className="svg-thin" />
            <text x={xm} y={yAt(m.xm) + 20} fontSize={fs} textAnchor="middle" className="svg-text">
              δ
              <tspan fontSize={fs - 3} dy={4} fontStyle="normal">
                {copy.maxSub[locale]}
              </tspan>
            </text>
          </>
        )}

        {/* bending moment diagram, tension side, pale pencil */}
        <path d={`M${x0} ${bmdY} H${x1}`} className="svg-thin" />
        <path d={`M${x0} ${bmdY} L${ax} ${apexY} L${x1} ${bmdY}`} className="svg-thin" strokeWidth={1.25} />
        <path d={`M${ax} ${bmdY} V${apexY}`} className="svg-thin" />
        {m.mmax > 0.03 && (
          <text
            x={flipM ? ax - 10 : ax + 10}
            y={apexY + 4}
            fontSize={fs}
            textAnchor={flipM ? 'end' : 'start'}
            className="svg-text"
          >
            M
            <tspan fontSize={fs - 3} dy={4} fontStyle="normal">
              {copy.maxSub[locale]}
            </tspan>
          </text>
        )}
        <text x={x0} y={bmdY - 10} fontSize={fs - 2} className="svg-text-muted">
          {copy.momentLabel[locale]}
        </text>

        {/* load-position ruler: same x-scale as the beam, so 0…1 L lines up with the supports */}
        <g aria-hidden>
          <path d={`M${x0} ${rulerY} H${x1}`} className="svg-heavy" strokeWidth={1} />
          {RULER.map((t) => (
            <g key={t}>
              <path d={`M${px(t)} ${rulerY} v10`} className="svg-heavy" strokeWidth={1} />
              <text x={px(t)} y={rulerY + 30} fontSize={fs - 2} textAnchor="middle" className="svg-text-muted">
                {num(t, locale, t === 0 || t === 1 ? 0 : 2)}
                <tspan fontStyle="italic" className="font-serif">
                  {' '}
                  L
                </tspan>
              </text>
            </g>
          ))}
          <polygon
            points={`${ax},${rulerY - 1} ${ax - 5},${rulerY - 12} ${ax + 5},${rulerY - 12}`}
            className="fill-grafit"
          />
        </g>
      </svg>

      {/*
        Native range input laid over the ruler. Its 44px thumb centre travels exactly x0 → x1
        (width = span + thumb, offset = −thumb/2), so it shares the beam's coordinate system.
      */}
      <input
        type="range"
        className="beam-range"
        min={0}
        max={1}
        step={0.01}
        value={target}
        aria-label={copy.controls[locale]}
        aria-valuetext={valueText}
        onChange={(e) => onChange(clampLoad(parseFloat(e.target.value)))}
        style={{
          left: `calc(${(x0 / W) * 100}% - ${THUMB / 2}px)`,
          width: `calc(${(span / W) * 100}% + ${THUMB}px)`,
          // thumb spans rulerY−30 … rulerY+14: it frames the ▼ marker and stays clear of the tick labels below
          top: `calc(${(rulerY / H) * 100}% - ${THUMB - 14}px)`,
        }}
      />
    </div>
  );
}

/**
 * `defaultLoad` (a0 in units of L) is the initial load, the reset target and the reset-disabled reference; it is
 * passed through `clampLoad`, so only 0 <= a0 <= 1 is ever used. `copy` is the approach copy (defaults to the
 * public dictionary). Physics, drag and slider behaviour are unchanged.
 */
export function BeamFigure({
  locale,
  defaultLoad = BEAM_REFERENCE_A,
  copy: A = dict.approach,
}: {
  locale: Locale;
  defaultLoad?: number;
  copy?: ApproachCopy;
}) {
  const a0 = clampLoad(defaultLoad);
  const [a, setA] = useState(a0);
  const [hover, setHover] = useState<number | null>(null);
  const shown = useEased(a);
  const m = beamMetrics(a);
  const n = (v: number) => num(v, locale);

  const setHoverIfChanged = (v: number | null) => setHover((p) => (p === v ? p : v));
  const valueText = A.valueText[locale].replace('{a}', n(a)).replace('{ra}', n(m.ra)).replace('{rb}', n(m.rb));

  const rows: { label: React.ReactNode; value: string }[] = [
    {
      label: (
        <>
          <V n="a" />/<V n="L" />
        </>
      ),
      value: n(a),
    },
    {
      label: (
        <>
          <V n="R" s="A" />/<V n="P" />
        </>
      ),
      value: n(m.ra),
    },
    {
      label: (
        <>
          <V n="R" s="B" />/<V n="P" />
        </>
      ),
      value: n(m.rb),
    },
    {
      label: (
        <>
          <V n="M" s={A.maxSub[locale]} />/<V n="PL" />
        </>
      ),
      value: n(m.mmax),
    },
    {
      label: (
        <>
          δ<sub>{A.maxSub[locale]}</sub>/δ<sub>0</sub>
        </>
      ),
      value: n(m.deltaRatio),
    },
    // with the load on a support there is no deflection, so its location is undefined
    {
      label: (
        <>
          <V n="x" s="m" />/<V n="L" />
        </>
      ),
      value: m.deltaRatio > 0.005 ? n(m.xm) : '—',
    },
  ];

  const stage = {
    locale,
    copy: A,
    shown,
    target: a,
    hover,
    onChange: (v: number) => setA(clampLoad(v)),
    onHover: setHoverIfChanged,
    valueText,
  };

  return (
    <figure>
      <p className="t-lead mb-12 max-w-[28ch]">{A.hint[locale]}</p>

      <div id="beam-controls" role="group" aria-label={A.controls[locale]}>
        <div className="hidden md:block">
          <Stage L={DESKTOP} {...stage} />
        </div>
        <div className="md:hidden">
          <Stage L={COMPACT} {...stage} />
        </div>
      </div>

      <p className="mt-3 text-right">
        <button
          type="button"
          onClick={() => setA(a0)}
          disabled={a === a0}
          aria-label={`${A.reset[locale]}. ${A.resetLabel[locale].replace('{a0}', n(a0))}`}
          className="ulink inline-flex min-h-11 items-center px-1 text-[15px] font-medium disabled:cursor-default disabled:text-kursun disabled:no-underline"
        >
          {A.reset[locale]}
        </button>
      </p>

      <p className="t-meta tnum pb-1">{A.readoutsAt[locale].replace('{a}', n(a))}</p>
      <dl className="grid grid-cols-2 gap-x-[var(--g)] md:grid-cols-3">
        {rows.map((r, i) => (
          <div key={i} className="hair flex items-baseline justify-between gap-3 py-3">
            <dt className="font-serif text-[17px]">{r.label}</dt>
            <dd className="tnum min-w-[3.2ch] text-right font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>

      <figcaption className="mt-8 grid gap-8 md:grid-cols-2 md:gap-[var(--g)]">
        <div className="space-y-4">
          <p className="t-caption max-w-[48ch]">
            <span className="font-semibold text-grafit">{A.figure[locale]} — </span>
            {A.caption[locale]}
          </p>
          <p className="t-caption max-w-[48ch]">{A.exaggeration[locale]}</p>
          <p className="t-note hair max-w-[44ch] !mt-7 pt-4">
            <span className="font-sans text-[13px] font-semibold text-grafit">{A.assumptionsTitle[locale]}. </span>
            {A.assumptions[locale]}
          </p>
        </div>
        <div>
          <p className="t-meta mb-2">{A.equations[locale]}</p>
          <ul className="serif text-[18px] leading-[1.9]">
            <Eq n={1}>
              <V n="R" s="A" /> = <V n="P" />·<V n="b" /> / <V n="L" />
            </Eq>
            <Eq n={2}>
              <V n="R" s="B" /> = <V n="P" />·<V n="a" /> / <V n="L" />
            </Eq>
            <Eq n={3}>
              <V n="M" s={A.maxSub[locale]} /> =<V n="P" />·<V n="a" />·<V n="b" /> / <V n="L" />
            </Eq>
          </ul>
        </div>
      </figcaption>
    </figure>
  );
}

function Eq({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-4">
      <span>{children}</span>
      <span className="tnum font-sans text-[14px] text-kursun">({n})</span>
    </li>
  );
}
