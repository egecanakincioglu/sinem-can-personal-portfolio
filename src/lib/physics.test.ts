import { describe, expect, it } from 'vitest';
import {
  BEAM_REFERENCE_A,
  arrowHead,
  beamDeflection,
  beamMaxMidspanOffset,
  beamMetrics,
  beamMoment,
  chain,
  clampLoad,
  components,
  deflectionRatio,
  partialResultant,
  resultant,
  type ForceVector,
} from './physics';

const forces: ForceVector[] = [
  { id: 'f1', magnitude: 10, angleDeg: 0 },
  { id: 'f2', magnitude: 5, angleDeg: 90 },
  { id: 'f3', magnitude: 7, angleDeg: 215 },
];

describe('force polygon', () => {
  it('splits a vector into x and y components', () => {
    const c = components({ id: 'v', magnitude: 2, angleDeg: 60 });
    expect(c.x).toBeCloseTo(1, 10);
    expect(c.y).toBeCloseTo(Math.sqrt(3), 10);
  });

  it('computes the resultant as the vector sum', () => {
    const r = resultant([
      { id: 'a', magnitude: 3, angleDeg: 0 },
      { id: 'b', magnitude: 4, angleDeg: 90 },
    ]);
    expect(r.x).toBeCloseTo(3, 10);
    expect(r.y).toBeCloseTo(4, 10);
    expect(r.magnitude).toBeCloseTo(5, 10);
    expect(r.angleDeg).toBeCloseTo((Math.atan2(4, 3) * 180) / Math.PI, 10);
  });

  it('does not depend on the order of the vectors', () => {
    const a = resultant(forces);
    const b = resultant([...forces].reverse());
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
    expect(b.magnitude).toBeCloseTo(a.magnitude, 9);
  });

  it('returns a zero vector for an empty or balanced set', () => {
    expect(resultant([]).magnitude).toBe(0);
    const balanced = resultant([
      { id: 'a', magnitude: 6, angleDeg: 30 },
      { id: 'b', magnitude: 6, angleDeg: 210 },
    ]);
    expect(balanced.magnitude).toBeCloseTo(0, 9);
  });

  it('builds a tip-to-tail chain that ends at the resultant', () => {
    const pts = chain(forces);
    expect(pts).toHaveLength(forces.length + 1);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    const r = resultant(forces);
    expect(pts[pts.length - 1].x).toBeCloseTo(r.x, 9);
    expect(pts[pts.length - 1].y).toBeCloseTo(r.y, 9);
  });

  it('computes partial resultants and clamps the count', () => {
    expect(partialResultant(forces, 0).magnitude).toBe(0);
    expect(partialResultant(forces, -3).magnitude).toBe(0);
    expect(partialResultant(forces, 1).magnitude).toBeCloseTo(10, 10);
    expect(partialResultant(forces, 2.9).magnitude).toBeCloseTo(Math.hypot(10, 5), 10);
    expect(partialResultant(forces, 99).magnitude).toBeCloseTo(resultant(forces).magnitude, 10);
  });

  it('draws an arrowhead behind the tip with the requested size', () => {
    const pts = arrowHead(100, 50, 1, 0)
      .split(' ')
      .map((p) => p.split(',').map(Number));
    expect(pts[0]).toEqual([100, 50]);
    expect(pts[1]).toEqual([90, 53.5]);
    expect(pts[2]).toEqual([90, 46.5]);
  });
});

describe('simply supported beam', () => {
  it('keeps R_A + R_B = P for any load position', () => {
    for (const a of [0, 0.1, 0.35, 0.5, 0.8, 1]) {
      const m = beamMetrics(a);
      expect(m.ra + m.rb).toBeCloseTo(1, 12);
    }
  });

  it('puts the maximum at midspan with ratio 1 when the load is centred', () => {
    const m = beamMetrics(0.5);
    expect(m.xm).toBeCloseTo(0.5, 10);
    expect(m.deltaRatio).toBeCloseTo(1, 10);
    expect(deflectionRatio(0.5, 0.5)).toBeCloseTo(1, 10);
  });

  it('matches the reference values at a = 0.35 L within 0.01', () => {
    const m = beamMetrics(BEAM_REFERENCE_A);
    expect(Math.abs(m.ra - 0.65)).toBeLessThan(0.01);
    expect(Math.abs(m.rb - 0.35)).toBeLessThan(0.01);
    expect(Math.abs(m.mmax - 0.23)).toBeLessThan(0.01);
    expect(Math.abs(m.deltaRatio - 0.89)).toBeLessThan(0.01);
    expect(Math.abs(m.xm - 0.46)).toBeLessThan(0.01);
  });

  it('has no deflection when the load sits on a support', () => {
    expect(beamMetrics(0).deltaRatio).toBeCloseTo(0, 12);
    expect(beamMetrics(1).deltaRatio).toBeCloseTo(0, 12);
    for (const x of [0, 0.25, 0.5, 1]) expect(beamDeflection(0, x)).toBeCloseTo(0, 12);
  });

  it('agrees between the closed-form maximum and the deflection curve', () => {
    for (const a of [0.2, 0.35, 0.5, 0.7]) {
      const m = beamMetrics(a);
      expect(deflectionRatio(a, m.xm)).toBeCloseTo(m.deltaRatio, 6);
    }
  });

  it('mirrors the beam when a becomes 1 - a', () => {
    const left = beamMetrics(0.3);
    const right = beamMetrics(0.7);
    expect(right.deltaRatio).toBeCloseTo(left.deltaRatio, 12);
    expect(right.xm).toBeCloseTo(1 - left.xm, 12);
    expect(right.ra).toBeCloseTo(left.rb, 12);
    expect(beamDeflection(0.7, 0.4)).toBeCloseTo(beamDeflection(0.3, 0.6), 12);
  });

  it('is zero at both supports and continuous under the load', () => {
    expect(beamDeflection(0.4, 0)).toBe(0);
    expect(beamDeflection(0.4, 1)).toBeCloseTo(0, 12);
    expect(beamDeflection(0.4, 0.4 - 1e-9)).toBeCloseTo(beamDeflection(0.4, 0.4 + 1e-9), 8);
  });

  it('peaks the moment under the load at a(1 - a)', () => {
    expect(beamMoment(0.35, 0.35)).toBeCloseTo(0.35 * 0.65, 12);
    expect(beamMoment(0.35, 0)).toBe(0);
    expect(beamMoment(0.35, 1)).toBeCloseTo(0, 12);
    expect(beamMoment(0.35, 0.2)).toBeLessThan(beamMoment(0.35, 0.35));
    expect(beamMetrics(0.35).mmax).toBeCloseTo(0.2275, 12);
  });

  it('clamps load positions and falls back for non-finite input', () => {
    expect(clampLoad(-1)).toBe(0);
    expect(clampLoad(2)).toBe(1);
    expect(clampLoad(0.4)).toBe(0.4);
    expect(clampLoad(Number.NaN)).toBe(BEAM_REFERENCE_A);
    expect(clampLoad(Infinity)).toBe(BEAM_REFERENCE_A);
    expect(beamMetrics(5).rb).toBe(1);
  });

  it('bounds the offset of the maximum from midspan', () => {
    const limit = beamMaxMidspanOffset();
    expect(limit).toBeCloseTo(0.0774, 4);
    for (const a of [0.001, 0.05, 0.2, 0.5, 0.95]) {
      expect(Math.abs(beamMetrics(a).xm - 0.5)).toBeLessThanOrEqual(limit + 1e-12);
    }
  });
});
