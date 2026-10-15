import {
  apply,
  determinant,
  inverse,
  multiply,
  S,
  type Matrix,
  type Point,
} from "./modular";
import { floor, rational } from "./rational";
export const mod6 = (n: number) => ((n % 6) + 6) % 6;
export const translation = (n: bigint): Matrix => [1n, n, 0n, 1n];
/** Exact abelianization of PSL(2,Z), independent of the reduction word. */
export function abelianization(matrix: Matrix): number {
  if (determinant(matrix) !== 1n)
    throw new Error("The modular cover requires determinant one.");
  let m = matrix,
    chi = 0n;
  for (let i = 0; i < 2048; i++) {
    if (m[2] === 0n) return Number((((chi + m[1] / m[0]) % 6n) + 6n) % 6n);
    const n = floor(rational(m[0], m[2]));
    m = multiply(S, multiply(translation(-n), m));
    chi += n - 3n;
  }
  throw new Error("Cover matrix exceeded the Euclidean reduction budget.");
}
// R acts FORWARD: w=Rz is in F. T^j R must have chi equal to the chosen lift.
export const coverSheet = (reduction: Matrix, lift = 0) =>
  mod6(lift - abelianization(reduction));
export function circularPairing(j: number): Matrix {
  const start = mod6(j);
  if (start >= 3) return inverse(circularPairing(start - 3));
  return multiply(
    translation(BigInt(start + 3)),
    multiply(S, translation(BigInt(-start))),
  );
}
export const verticalPairing = translation(6n);
export const hexVertex = (j: number): Point => ({
  x: Math.cos((j * Math.PI) / 3),
  y: Math.sin((j * Math.PI) / 3),
});
/** Six full domains map to six sectors. Cusp -> deleted center; circular side -> outer edge. */
export function coverHex(point: Point, sheet: number): Point {
  const u = Math.max(0, Math.min(1, point.x + 0.5));
  const radius = Math.sqrt(Math.max(0.75, 1 - point.x * point.x)) / point.y;
  const a = hexVertex(sheet),
    b = hexVertex(sheet + 1);
  return {
    x: radius * ((1 - u) * a.x + u * b.x),
    y: radius * ((1 - u) * a.y + u * b.y),
  };
}
// Opposite-edge translations generate L=< (3/2,sqrt(3)/2), (0,sqrt(3)) >.
export function hexCoordinates(p: Point): Point {
  return { x: (2 * p.x) / 3, y: p.y / Math.sqrt(3) - p.x / 3 };
}
export function embeddedTorus(uv: Point): [number, number, number] {
  const u = 2 * Math.PI * uv.x,
    v = 2 * Math.PI * uv.y;
  return [
    (1.65 + 0.62 * Math.cos(v)) * Math.cos(u),
    (1.65 + 0.62 * Math.cos(v)) * Math.sin(u),
    0.62 * Math.sin(v),
  ];
}
export const coverSurface = (p: Point, sheet: number) =>
  embeddedTorus(hexCoordinates(coverHex(p, sheet)));
export function coverTopology() {
  // Finite corners k identify k ~ k+4 under the circular pairing.
  const vertexClasses = [
    [0, 2, 4],
    [1, 3, 5],
  ];
  const cuspOrbit = Array.from({ length: 6 }, (_, j) => j);
  // Hexagon: V=2, E=3, F=1 => compact Euler characteristic zero.
  return {
    vertexClasses,
    cuspOrbit,
    cuspWidth: 6,
    eulerCompact: 2 - 3 + 1,
    genus: 1,
    punctures: 1,
  };
}
export function coverTransition(before: Matrix, after: Matrix, lift = 0) {
  const from = multiply(translation(BigInt(coverSheet(before, lift))), before);
  const to = multiply(translation(BigInt(coverSheet(after, lift))), after);
  return multiply(to, inverse(from));
}
export const coverPoint = (p: Point, reduction: Matrix, lift = 0) => {
  const q = apply(reduction, p),
    sheet = coverSheet(reduction, lift);
  return { point: { x: q.x + sheet, y: q.y }, sheet, local: q };
};
