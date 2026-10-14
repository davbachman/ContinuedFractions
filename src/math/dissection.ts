import { compareTo, fromCF, terms, type NumberSpec } from "./continuedFraction";
import { label, rational, type Rational } from "./rational";

// Exact lengths in Z·α + Z. For a rational α these evaluate to rationals;
// for a periodic α they remain symbolic, without cancellation or rounding.
export type Length = Readonly<{ a: bigint; b: bigint }>;
export type ExactRectangle = Readonly<{
  x: Length;
  y: Length;
  width: Length;
  height: Length;
}>;
export type DissectionStage = Readonly<{
  index: number;
  count: bigint;
  axis: "x" | "y";
  before: ExactRectangle;
  side: Length;
  remainder: ExactRectangle;
  terminal: boolean;
}>;
export const ZERO: Length = { a: 0n, b: 0n };
export const ONE: Length = { a: 0n, b: 1n };
export const ALPHA: Length = { a: 1n, b: 0n };
export const plus = (x: Length, y: Length): Length => ({
  a: x.a + y.a,
  b: x.b + y.b,
});
export const times = (x: Length, n: bigint): Length => ({
  a: x.a * n,
  b: x.b * n,
});
export const minus = (x: Length, y: Length) => plus(x, times(y, -1n));
export const originalRectangle: ExactRectangle = {
  x: ZERO,
  y: ZERO,
  width: ALPHA,
  height: ONE,
};
export const MAX_DISSECTION_STAGES = 96;
export function evaluateLength(x: Length, alpha: Rational): Rational {
  return rational(x.a * alpha.p + x.b * alpha.q, alpha.q);
}
export function lengthLabel(x: Length, spec: NumberSpec): string {
  if (spec.kind === "rational") return label(evaluateLength(x, spec.value));
  if (!x.a) return String(x.b);
  if (x.a < 0n && x.b > 0n) return `${x.b} − ${x.a === -1n ? "α" : `${-x.a}α`}`;
  const first =
    x.a === 1n ? "α" : x.a === -1n ? "−α" : `${String(x.a).replace("-", "−")}α`;
  return !x.b
    ? first
    : `${first} ${x.b < 0n ? "−" : "+"} ${x.b < 0n ? -x.b : x.b}`;
}
export function dimensionsLabel(
  rectangle: ExactRectangle,
  spec: NumberSpec,
): string {
  const width = lengthLabel(rectangle.width, spec),
    height = lengthLabel(rectangle.height, spec);
  return spec.kind === "periodic"
    ? `(${width}) × (${height})`
    : `${width} × ${height}`;
}
export function dissectionUnavailable(spec: NumberSpec): string | undefined {
  if (spec.kind === "rational" && !spec.value.q)
    return "Rectangle dissection is unavailable for infinity: a finite rectangle needs a finite positive width.";
  if (compareTo(spec, rational(0n)) <= 0)
    return "Rectangle dissection is unavailable for zero or negative α: width α and height 1 must both be positive. The shared number has not been changed.";
}
export function dissect(spec: NumberSpec, requested = 8): DissectionStage[] {
  if (dissectionUnavailable(spec)) return [];
  // Rational expansions are complete; periodic stages are generated only as requested.
  const coefficients = terms(
    spec,
    Math.max(1, Math.min(MAX_DISSECTION_STAGES, requested)),
  );
  const count =
    spec.kind === "rational"
      ? coefficients.length
      : Math.min(requested, MAX_DISSECTION_STAGES);
  let rectangle = originalRectangle;
  const stages: DissectionStage[] = [];
  for (let i = 0; i < count; i++) {
    const axis = i % 2 === 0 ? "x" : "y";
    const side = axis === "x" ? rectangle.height : rectangle.width;
    const removed = times(side, coefficients[i]);
    const remainder =
      axis === "x"
        ? {
            ...rectangle,
            x: plus(rectangle.x, removed),
            width: minus(rectangle.width, removed),
          }
        : {
            ...rectangle,
            y: plus(rectangle.y, removed),
            height: minus(rectangle.height, removed),
          };
    const terminal =
      spec.kind === "rational" &&
      evaluateLength(
        axis === "x" ? remainder.width : remainder.height,
        spec.value,
      ).p === 0n;
    stages.push({
      index: i,
      count: coefficients[i],
      axis,
      before: rectangle,
      side,
      remainder,
      terminal,
    });
    rectangle = remainder;
    if (terminal) break;
  }
  return stages;
}

// A group is always stored in O(1) space, even when its count is enormous.
export function squareAt(
  stage: DissectionStage,
  index: bigint,
): ExactRectangle {
  if (index < 0n || index >= stage.count)
    throw new RangeError("Square index outside this stage.");
  const offset = times(stage.side, index);
  return {
    x: stage.axis === "x" ? plus(stage.before.x, offset) : stage.before.x,
    y: stage.axis === "y" ? plus(stage.before.y, offset) : stage.before.y,
    width: stage.side,
    height: stage.side,
  };
}
export function squareGroup(stage: DissectionStage): ExactRectangle {
  return {
    ...stage.before,
    width: stage.axis === "x" ? times(stage.side, stage.count) : stage.side,
    height: stage.axis === "y" ? times(stage.side, stage.count) : stage.side,
  };
}

// Use an exact convergent ONLY to project symbolic lengths to display coordinates.
// Subtract before converting to doubles, so deep remainders remain resolvable.
// No rendering approximation decides the square count or termination.
export function projectionAlpha(spec: NumberSpec): Rational {
  return spec.kind === "rational" ? spec.value : fromCF(terms(spec, 128));
}
export function lengthRatio(x: Length, unit: Length, alpha: Rational): number {
  const numerator = x.a * alpha.p + x.b * alpha.q;
  const denominator = unit.a * alpha.p + unit.b * alpha.q;
  if (!denominator) return NaN;
  // Leading decimal digits also work when either integer exceeds Number.MAX_VALUE.
  const n = (numerator < 0n ? -numerator : numerator).toString();
  const d = (denominator < 0n ? -denominator : denominator).toString();
  const sign = numerator < 0n !== denominator < 0n ? -1 : 1;
  return (
    ((sign * Number(n.slice(0, 15))) / Number(d.slice(0, 15))) *
    10 ** (Math.max(0, n.length - 15) - Math.max(0, d.length - 15))
  );
}
