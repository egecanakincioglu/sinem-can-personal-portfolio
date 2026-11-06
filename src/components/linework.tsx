import { arrowHead } from '@/lib/physics';

/** Math variable: italic symbol, upright descriptive subscript. */
export function V({ n, s }: { n: string; s?: string }) {
  return (
    <>
      <i>{n}</i>
      {s ? <sub>{s}</sub> : null}
    </>
  );
}

/** Arrow link: one arrowhead standard, shaft grows on hover. */
export function Cta({
  href,
  children,
  external,
  label,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  label?: string;
}) {
  return (
    <a href={href} className="cta" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      <span className="label">{children}</span>
      {label ? <span className="sr-only"> ({label})</span> : null}
      <span aria-hidden className="arrow" />
    </a>
  );
}

const PIN = (x: number) => (
  <g>
    <path d={`M${x} 0.75 L${x - 7} 14 H${x + 7} Z`} className="svg-heavy" />
    <path d={`M${x - 7} 14 l-3 5 M${x} 14 l-3 5 M${x + 7} 14 l-3 5`} className="svg-thin" />
  </g>
);
const ROLLER = (x: number) => (
  <g>
    <path d={`M${x} 0.75 L${x - 7} 12 H${x + 7} Z`} className="svg-heavy" />
    <circle cx={x - 3.5} cy={14.5} r={2.2} className="svg-thin" />
    <circle cx={x + 3.5} cy={14.5} r={2.2} className="svg-thin" />
    <path d={`M${x - 10} 17.5 H${x + 10}`} className="svg-thin" />
  </g>
);

/** Static supported line: pin left, roller right. Used at most twice per page. */
export function SupportLine({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-9 ${className}`} aria-hidden>
      <div className="absolute left-[10px] right-[10px] top-0 h-[1.5px] bg-grafit" />
      <svg className="absolute left-0 top-0" width="20" height="34" viewBox="0 0 14 24">
        {PIN(7)}
      </svg>
      <svg className="absolute right-0 top-0" width="20" height="34" viewBox="0 0 14 24">
        {ROLLER(7)}
      </svg>
    </div>
  );
}

/**
 * The resultant R, drawn from the computed angle — never a hand-set one.
 * `animate` adds the hero draw-in classes (only active during the intro sequence).
 */
export function RVector({
  size,
  theta,
  label,
  animate = false,
}: {
  size: number;
  theta: number;
  label: string;
  animate?: boolean;
}) {
  const r = (theta * Math.PI) / 180;
  const dx = Math.cos(r);
  const dy = -Math.sin(r);
  const pad = 6;
  const labelRoom = size > 120 ? 34 : 24;
  const w = Math.ceil(size * dx + pad * 2 + labelRoom);
  const h = Math.ceil(size * -dy + pad * 2 + 8);
  const sx = pad;
  const sy = h - pad;
  const tx = sx + size * dx;
  const ty = sy + size * dy;
  const ex = tx - dx * 10;
  const ey = ty - dy * 10;
  const fs = size > 120 ? 30 : 20;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      className="shrink-0 overflow-visible"
    >
      <line x1={sx} y1={sy} x2={ex} y2={ey} pathLength={1} className={`svg-red ${animate ? 'i-r-line' : ''}`} />
      <polygon points={arrowHead(tx, ty, dx, dy)} className={`fill-red ${animate ? 'i-r-head' : ''}`} />
      <text
        x={tx + 8}
        y={ty + fs * 0.2}
        fontSize={fs}
        className={`font-serif italic fill-kirmizi ${animate ? 'i-r-label' : ''}`}
      >
        R
      </text>
    </svg>
  );
}

/** Small direction glyph for a force record: shows that vector's angle. Mobile-first replacement for the sticky figure. */
export function DirectionGlyph({ angleDeg, size = 24 }: { angleDeg: number; size?: number }) {
  const r = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(r);
  const dy = -Math.sin(r);
  const c = size / 2;
  const half = size * 0.44;
  const tx = c + dx * half;
  const ty = c + dy * half;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <line x1={c - dx * half} y1={c - dy * half} x2={tx - dx * 6} y2={ty - dy * 6} className="svg-heavy" />
      <polygon points={arrowHead(tx, ty, dx, dy, 6, 2.4)} className="fill-grafit" />
    </svg>
  );
}
