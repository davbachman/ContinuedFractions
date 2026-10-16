import { label, rational, type Rational } from "../math/rational";
import { mediant, type Edge } from "../math/farey";
import type { Triangulation } from "../math/triangulation";

// The old disk palette, now attached to exact triangles rather than selection.
// P¹(F₃) has four slope classes: 0, ∞, 1, −1. A Farey triangle uses three;
// its missing class colors it. Across a flip, u+v and u−v give the two other
// classes, so adjacent triangles always have different colors.
export const fareyPalette = ["#197d9a", "#a65732", "#9450a1", "#e4bf66"];
export const FAREY_FILL_OPACITY = 0.3;
export const fareyEdgeStyle = {
  color: "#879a9165",
  width: 1,
  currentColor: "#425b48",
  currentWidth: 1.7,
  selectedWidth: 2.5,
  neighborWidth: 1.4,
};
export const fareyEdgeId = (a: Rational, b: Rational) =>
  [label(a), label(b)].sort().join("|");
const mod3 = (n: bigint) => ((n % 3n) + 3n) % 3n;
function slopeClass(r: Rational) {
  const p = mod3(r.p),
    q = mod3(r.q);
  return q === 0n ? 1 : p === 0n ? 0 : p === q ? 2 : 3;
}
export const fareyTriangleColor = (tri: Triangulation) =>
  fareyPalette[6 - tri.reduce((sum, r) => sum + slopeClass(r), 0)];
export const fareyTriangleId = (tri: Triangulation) =>
  tri.map(label).sort().join("|");

/** Same adaptive cells as the H² Farey edges, including the cusp at infinity. */
export function visibleFareyTriangles(
  edges: readonly Edge[],
  min: number,
  max: number,
) {
  const triangles: Triangulation[] = [];
  for (let n = Math.floor(min); n < Math.ceil(max); n++)
    triangles.push([
      rational(BigInt(n)),
      rational(1n, 0n),
      rational(BigInt(n + 1)),
    ]);
  for (const { left, right } of edges)
    triangles.push([left, mediant(left, right), right]);
  return triangles;
}
