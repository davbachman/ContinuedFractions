export type Matrix = readonly [bigint, bigint, bigint, bigint];
export type Point = Readonly<{ x: number; y: number }>;
export const I: Matrix = [1n, 0n, 0n, 1n],
  S: Matrix = [0n, -1n, 1n, 0n],
  T: Matrix = [1n, 1n, 0n, 1n];
export const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
];
export const determinant = (m: Matrix) => m[0] * m[3] - m[1] * m[2];
export const inverse = (m: Matrix): Matrix => [m[3], -m[1], -m[2], m[0]];
export const matrixKey = (m: Matrix) => {
  const sign = m.find((x) => x !== 0n)! < 0n ? -1n : 1n;
  return m.map((x) => String(x * sign)).join(",");
};
export function apply(m: Matrix, z: Point): Point {
  const [a, b, c, d] = m.map(Number),
    u = c * z.x + d,
    v = c * z.y,
    den = u * u + v * v;
  return { x: ((a * z.x + b) * u + a * c * z.y * z.y) / den, y: z.y / den };
}
export function tangent(m: Matrix, z: Point, v: Point): Point {
  const c = Number(m[2]),
    d = Number(m[3]),
    u = c * z.x + d,
    w = c * z.y,
    re = u * u - w * w,
    im = 2 * u * w,
    den = re * re + im * im;
  return { x: (v.x * re + v.y * im) / den, y: (v.y * re - v.x * im) / den };
}
export function reduce(z: Point): { point: Point; matrix: Matrix } {
  if (!Number.isFinite(z.x) || !Number.isFinite(z.y) || z.y <= 0)
    throw new Error("Reduction needs a finite point in the upper half-plane.");
  let point = z,
    matrix = I;
  for (let i = 0; i < 100; i++) {
    const n = Math.floor(point.x + 0.5);
    if (n) {
      point = { x: point.x - n, y: point.y };
      matrix = multiply([1n, BigInt(-n), 0n, 1n], matrix);
    }
    if (point.x * point.x + point.y * point.y >= 1 - 1e-12)
      return { point, matrix };
    const norm = point.x * point.x + point.y * point.y;
    point = { x: -point.x / norm, y: point.y / norm };
    matrix = multiply(S, matrix);
  }
  throw new Error("Modular reduction exceeded its precision/iteration limit.");
}
export type Seam = Readonly<{
  id: string;
  time: number;
  before: Matrix;
  after: Matrix;
}>;
export type Segment = Readonly<{
  start: number;
  end: number;
  matrix: Matrix;
  points: readonly (Point & { time: number })[];
}>;
export function quotientTrace(
  alpha: number,
  end: number,
): { segments: Segment[]; seams: Seam[]; limited: boolean } {
  const segments: Segment[] = [],
    seams: Seam[] = [];
  let start = 0,
    matrix = reduce({ x: alpha, y: 2 }).matrix;
  for (let guard = 0; guard < 1200; guard++) {
    const [a, b, c, d] = matrix.map(Number),
      A = a * alpha + b,
      C = c * alpha + d;
    const candidates: number[] = [];
    const root = (num: number, den: number) => {
      if (Math.abs(den) > 1e-30) {
        const u = num / den;
        if (u > 0) {
          const time = Math.log(2 / Math.sqrt(u));
          if (time > start + 1e-8 && time <= end) candidates.push(time);
        }
      }
    };
    for (const side of [-0.5, 0.5])
      root(side * C * C - A * C, a * c - side * c * c);
    root(C * C - A * A, a * a - c * c);
    let stop = end,
      next: Matrix | undefined;
    for (const t of candidates.sort((x, y) => x - y)) {
      const after = reduce({ x: alpha, y: 2 * Math.exp(-(t + 1e-7)) }).matrix;
      if (matrixKey(after) !== matrixKey(matrix)) {
        stop = t;
        next = after;
        break;
      }
    }
    const count = Math.max(2, Math.ceil((stop - start) / 0.025));
    const points = Array.from({ length: count + 1 }, (_, i) => {
      const time = start + ((stop - start) * i) / count;
      return { ...apply(matrix, { x: alpha, y: 2 * Math.exp(-time) }), time };
    });
    if (
      points.some(
        (p) =>
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          Math.abs(p.x) > 0.501 ||
          p.x * p.x + p.y * p.y < 0.999,
      )
    )
      return { segments, seams, limited: true };
    segments.push({ start, end: stop, matrix, points });
    if (!next) return { segments, seams, limited: false };
    seams.push({
      id: `seam:${seams.length}`,
      time: stop,
      before: matrix,
      after: next,
    });
    start = stop;
    matrix = next;
  }
  return { segments, seams, limited: true };
}
export function modularTiles(depth = 4): Matrix[] {
  const map = new Map<string, Matrix>();
  let layer: Matrix[] = [I];
  for (let i = 0; i <= depth; i++) {
    const next: Matrix[] = [];
    for (const m of layer) {
      const key = matrixKey(m);
      if (map.has(key)) continue;
      map.set(key, m);
      for (const n of [S, T, inverse(T)]) next.push(multiply(m, n));
    }
    layer = next;
  }
  return [...map.values()];
}
