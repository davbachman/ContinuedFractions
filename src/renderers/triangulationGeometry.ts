import { inverse, multiply, type Point } from "../math/modular";
import { rational, value, type Rational } from "../math/rational";
import { triangulationMatrix, type Triangulation } from "../math/triangulation";
export const flipColors = ["#197d9a", "#a65732", "#9450a1"];
export const ratio = (n: bigint, d: bigint) =>
  Number((n * 1000000000000n) / d) / 1e12;
export function diskVertex(r: Rational, frame: Triangulation): Point {
  const m = inverse(triangulationMatrix(frame)),
    p = m[0] * r.p + m[1] * r.q,
    q = m[2] * r.p + m[3] * r.q,
    d = p * p + q * q;
  return { x: ratio(p * p - q * q, d), y: ratio(-2n * p * q, d) };
}
export function diskCenter(tri: Triangulation, frame: Triangulation): Point {
  const [a, b, c, d] = multiply(
    inverse(triangulationMatrix(frame)),
    triangulationMatrix(tri),
  );
  const A = 2n * a * c + 2n * b * d + a * d + b * c,
    D = c * c + c * d + d * d,
    B = A * A + 4n * D * D + 3n,
    correction = 1 + Math.sqrt(3) * ratio(4n * D, B);
  return {
    x: ratio(A * A + 3n - 4n * D * D, B) / correction,
    y: ratio(-4n * A * D, B) / correction,
  };
}
export function diskArc(a: Point, b: Point): Point[] {
  const den = 1 + a.x * b.x + a.y * b.y;
  if (Math.abs(den) < 1e-9) return [a, b];
  const center = { x: (a.x + b.x) / den, y: (a.y + b.y) / den },
    radius = Math.sqrt(
      Math.max(0, center.x * center.x + center.y * center.y - 1),
    ),
    angle = Math.atan2(a.y - center.y, a.x - center.x),
    end = Math.atan2(b.y - center.y, b.x - center.x);
  let delta = ((end - angle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const mid = {
    x: center.x + radius * Math.cos(angle + delta / 2),
    y: center.y + radius * Math.sin(angle + delta / 2),
  };
  if (Math.hypot(mid.x, mid.y) > 1 + 1e-6)
    delta += delta > 0 ? -2 * Math.PI : 2 * Math.PI;
  return Array.from({ length: 33 }, (_, i) => ({
    x: center.x + radius * Math.cos(angle + (delta * i) / 32),
    y: center.y + radius * Math.sin(angle + (delta * i) / 32),
  }));
}
export const diskTriangle = (tri: Triangulation, frame: Triangulation) =>
  tri.flatMap((r, i) =>
    diskArc(diskVertex(r, frame), diskVertex(tri[(i + 1) % 3], frame)),
  );
export function planeTriangle(tri: Triangulation, top: number): Point[] {
  const finite = tri
      .filter((r) => r.q)
      .sort((a, b) => (a.p * b.q < b.p * a.q ? -1 : 1)),
    xs = finite.map(value);
  if (xs.some((x) => !Number.isFinite(x))) return [];
  const arc = (a: number, b: number) =>
    Array.from({ length: 49 }, (_, i) => {
      const radius = Math.abs(b - a) / 2,
        center = (a + b) / 2,
        theta = a < b ? Math.PI - (i * Math.PI) / 48 : (i * Math.PI) / 48;
      return {
        x: center + radius * Math.cos(theta),
        y: radius * Math.sin(theta),
      };
    });
  if (finite.length === 2)
    return [{ x: xs[0], y: top }, { x: xs[1], y: top }, ...arc(xs[1], xs[0])];
  return [...arc(xs[0], xs[2]), ...arc(xs[2], xs[1]), ...arc(xs[1], xs[0])];
}
export function insidePolygon(p: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
