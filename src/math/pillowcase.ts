import type { Point } from "./modular";
import type { Rational } from "./rational";
export const branchPoints = [
  { name: "NW", x: 0, y: 0 },
  { name: "NE", x: 0.5, y: 0 },
  { name: "SW", x: 0, y: 0.5 },
  { name: "SE", x: 0.5, y: 0.5 },
] as const;
export const mod1 = (x: number) => ((x % 1) + 1) % 1;
export const involution = (p: Point): Point => ({
  x: mod1(-p.x),
  y: mod1(-p.y),
});
export const dehnShear = (p: Point, n = 1): Point => ({
  x: mod1(p.x),
  y: mod1(p.y + n * p.x),
});
export const liftedQuarterTurn = (p: Point): Point => ({
  x: mod1(-p.y),
  y: mod1(p.x + 0.5),
});
export function pillowPoint(p: Point) {
  let u = mod1(p.x),
    v = mod1(p.y);
  if (u > 0.5) {
    u = 1 - u;
    v = mod1(-v);
  }
  const face = v <= 0.5 ? 0 : 1;
  return { x: 2 * u, y: 2 * (face ? 1 - v : v), face };
}
export function meridianCurves(r: Rational) {
  const p = Number(r.p),
    q = Number(r.q),
    complexity = Math.abs(p) + q;
  if (complexity > 512)
    return {
      curves: [] as Point[][],
      pillow: [] as { points: Point[]; face: number }[],
      limited: true,
    };
  const curves: Point[][] = [],
    pillow: { points: Point[]; face: number }[] = [];
  for (const delta of [0.25, -0.25]) {
    const origin = q ? { x: 0, y: delta / q } : { x: -delta / p, y: 0 };
    const at = (t: number) => ({ x: origin.x + q * t, y: origin.y + p * t });
    const count = Math.max(80, Math.ceil(complexity * 32));
    curves.push(Array.from({ length: count + 1 }, (_, i) => at(i / count)));
    // Exact parameter locations of all half-lattice chart boundaries (up to display doubles).
    const breaks = [0, 1];
    for (const [start, velocity] of [
      [origin.x, q],
      [origin.y, p],
    ]) {
      if (!velocity) continue;
      const end = start + velocity;
      for (
        let k = Math.ceil(2 * Math.min(start, end));
        k <= Math.floor(2 * Math.max(start, end));
        k++
      ) {
        const t = (k / 2 - start) / velocity;
        if (t > 1e-12 && t < 1 - 1e-12) breaks.push(t);
      }
    }
    const sorted = [...new Set(breaks)].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i],
        end = sorted[i + 1];
      if (end - start < 1e-12) continue;
      const mid = at((start + end) / 2),
        fu = Math.floor(mid.x),
        fv = Math.floor(mid.y),
        flip = mod1(mid.x) > 0.5;
      const mv = flip ? mod1(-mid.y) : mod1(mid.y),
        face = mv <= 0.5 ? 0 : 1;
      const chart = (p: Point) => {
        let u = p.x - fu,
          v = p.y - fv;
        if (flip) {
          u = 1 - u;
          v = 1 - v;
        }
        return { x: 2 * u, y: 2 * (face ? 1 - v : v) };
      };
      pillow.push({ face, points: [chart(at(start)), chart(at(end))] });
    }
  }
  return { curves, pillow, limited: false };
}

/** Follow one lifted curve and its involution partner, which share a quotient point. */
export function meridianTrace(r: Rational, progress: number) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    throw new Error("Trace progress must lie between 0 and 1.");
  if ((r.p < 0n ? -r.p : r.p) + r.q > 512n) return null;
  const p = Number(r.p),
    q = Number(r.q);
  const a = {
    x: (q ? 0 : -0.25 / p) + q * progress,
    y: (q ? 0.25 / q : 0) + p * progress,
  };
  const b = involution(a);
  return { a, b, image: pillowPoint(a) };
}
