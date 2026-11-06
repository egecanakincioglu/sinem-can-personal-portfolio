// Pure geometry + statics helpers. No React, no DOM: reusable by Phase B2 interactions.

export type ForceVector = { id: string; magnitude: number; angleDeg: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

export function components(v: ForceVector) {
  return { x: v.magnitude * Math.cos(rad(v.angleDeg)), y: v.magnitude * Math.sin(rad(v.angleDeg)) };
}

/** Vector sum of the data set. R is never drawn by hand: this is its only source. */
export function resultant(vectors: ForceVector[]) {
  let x = 0;
  let y = 0;
  for (const v of vectors) {
    const c = components(v);
    x += c.x;
    y += c.y;
  }
  return { x, y, magnitude: Math.hypot(x, y), angleDeg: (Math.atan2(y, x) * 180) / Math.PI };
}

/** Tip-to-tail positions of a vector chain, starting at the origin. Result has vectors.length + 1 points. */
export function chain(vectors: ForceVector[]) {
  const pts = [{ x: 0, y: 0 }];
  for (const v of vectors) {
    const c = components(v);
    const p = pts[pts.length - 1];
    pts.push({ x: p.x + c.x, y: p.y + c.y });
  }
  return pts;
}

/** Resultant of only the first `count` vectors (the construction's partial sum). count 0 → zero vector, angle 0. */
export function partialResultant(vectors: ForceVector[], count: number) {
  return resultant(vectors.slice(0, Math.max(0, Math.min(vectors.length, Math.floor(count)))));
}

/** Standard arrowhead: closed, filled, 10px long, 7px wide. Direction is a unit vector in screen space. */
export function arrowHead(tipX: number, tipY: number, dirX: number, dirY: number, len = 10, half = 3.5) {
  const bx = tipX - dirX * len;
  const by = tipY - dirY * len;
  const px = -dirY;
  const py = dirX;
  return `${tipX},${tipY} ${bx + px * half},${by + py * half} ${bx - px * half},${by - py * half}`;
}

// ---- Simply supported beam, point load P at x = a (Euler–Bernoulli). Normalised: P = L = EI = 1. ----

export function beamDeflection(a: number, x: number) {
  const b = 1 - a;
  return x <= a ? (b * x * (1 - b * b - x * x)) / 6 : (a * (1 - x) * (2 * x - x * x - a * a)) / 6;
}

/** Default load position and the clamp every input path goes through. */
export const BEAM_REFERENCE_A = 0.35;
export const clampLoad = (a: number) => (Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : BEAM_REFERENCE_A);

/** Deflection in units of δ0 = PL³/48EI (the mid-load case). Positive = downward. */
export const deflectionRatio = (a: number, x: number) => beamDeflection(a, x) * 48;

/** Bending moment M(x)/PL; peaks at x = a with value a·(1−a). Sagging, drawn on the tension side. */
export const beamMoment = (a: number, x: number) => (x <= a ? (1 - a) * x : a * (1 - x));

export function beamMetrics(load: number) {
  const a = clampLoad(load);
  const b = 1 - a;
  const k = 9 * Math.sqrt(3);
  const mirrored = a < b;
  const c = mirrored ? a : b;
  const xm = mirrored ? 1 - Math.sqrt((1 - c * c) / 3) : Math.sqrt((1 - c * c) / 3);
  const delta = (c * Math.pow(1 - c * c, 1.5)) / k;
  const delta0 = 1 / 48;
  return { ra: b, rb: a, mmax: a * b, deltaRatio: delta / delta0, xm, delta0 };
}

/**
 * Largest distance (in L) between the point of maximum deflection and midspan over every load position.
 * It is reached as the load approaches a support: xm → L/√3, so the offset is 1/√3 − 1/2 ≈ 0.0774 L.
 * Additive helper; no existing function is changed.
 */
export const beamMaxMidspanOffset = () => 1 / Math.sqrt(3) - 0.5;
