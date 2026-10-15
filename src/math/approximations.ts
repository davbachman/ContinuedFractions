import {
  convergents,
  terms,
  validateCF,
  type NumberSpec,
} from "./continuedFraction";
import { I, multiply, type Matrix } from "./modular";
import { abs, compare, rational, subtract, type Rational } from "./rational";

export type Prefix = {
  index: number;
  coefficient: bigint;
  matrix: Matrix;
  convergent: Rational;
  previous: Rational;
  interval: readonly [Rational, Rational];
  width: Rational;
};
export const coefficientMatrix = (a: bigint): Matrix => [a, 1n, 1n, 0n];
export function prefixData(coefficients: readonly bigint[]): Prefix[] {
  if (!coefficients.length) return [];
  validateCF(coefficients);
  const cs = convergents(coefficients);
  let matrix = I;
  return coefficients.map((a, index) => {
    matrix = multiply(matrix, coefficientMatrix(a));
    const c = cs[index],
      previous = cs[index - 1] ?? rational(1n, 0n);
    const other = rational(c.p + previous.p, c.q + previous.q);
    const interval: [Rational, Rational] =
      compare(c, other) < 0 ? [c, other] : [other, c];
    return {
      index,
      coefficient: a,
      matrix,
      convergent: c,
      previous,
      interval,
      width: subtract(interval[1], interval[0]),
    };
  });
}

// Exact enclosure, always deeper than every displayed convergent. This is an
// internal precision budget, independent of the 128-term editable CF budget.
// Periodic input supplies these extra terms exactly, without floating arithmetic.
export function targetBounds(
  spec: NumberSpec,
  depth: number,
): readonly [Rational, Rational] {
  if (spec.kind === "rational") {
    if (!spec.value.q)
      throw new Error("Infinity has no finite error or interval.");
    return [spec.value, spec.value];
  }
  let m = I;
  for (const a of terms(spec, Math.max(depth + 16, spec.prefix.length + 16)))
    m = multiply(m, coefficientMatrix(a));
  const a = rational(m[0], m[2]),
    b = rational(m[0] + m[1], m[2] + m[3]);
  return compare(a, b) < 0 ? [a, b] : [b, a];
}
export type ErrorBound = {
  signed: readonly [Rational, Rational];
  absolute: readonly [Rational, Rational];
  scaled: readonly [Rational, Rational];
  exact: boolean;
  zero: boolean;
};
export function convergentError(
  spec: NumberSpec,
  c: Rational,
  bounds: readonly [Rational, Rational],
): ErrorBound {
  const signed = bounds.map((r) => subtract(r, c)) as [Rational, Rational];
  const magnitudes = signed.map((r) => rational(abs(r.p), r.q));
  const absolute: [Rational, Rational] =
    signed[0].p <= 0n && signed[1].p >= 0n
      ? [
          rational(0n),
          compare(magnitudes[0], magnitudes[1]) > 0
            ? magnitudes[0]
            : magnitudes[1],
        ]
      : compare(magnitudes[0], magnitudes[1]) < 0
        ? [magnitudes[0], magnitudes[1]]
        : [magnitudes[1], magnitudes[0]];
  return {
    signed,
    absolute,
    scaled: absolute.map((r) => rational(r.p * c.q * c.q, r.q)) as [
      Rational,
      Rational,
    ],
    exact: spec.kind === "rational",
    zero: spec.kind === "rational" && signed[0].p === 0n,
  };
}
// Convert only after exact subtraction/division. Leading digits avoid Infinity /
// Infinity, cancellation, and Number's integer range limit in deep display data.
export function ratioNumber(p: bigint, q: bigint): number {
  if (!p) return 0;
  if (!q) return NaN;
  const n = abs(p).toString(),
    d = abs(q).toString();
  return (
    (((p < 0n !== q < 0n ? -1 : 1) * Number(n.slice(0, 15))) /
      Number(d.slice(0, 15))) *
    10 ** (Math.max(0, n.length - 15) - Math.max(0, d.length - 15))
  );
}
export function logRational(r: Rational): number {
  if (!r.p) return -Infinity;
  const log = (n: bigint) => {
    const s = abs(n).toString();
    return Math.log10(Number(s.slice(0, 15))) + Math.max(0, s.length - 15);
  };
  return log(r.p) - log(r.q);
}
export function relativePosition(
  r: Rational,
  lo: Rational,
  hi: Rational,
): number {
  const x = subtract(r, lo),
    width = subtract(hi, lo);
  return ratioNumber(x.p * width.q, x.q * width.p);
}
export type LatticeVector = readonly [bigint, bigint];
export const latticeVector = (r: Rational): LatticeVector => [r.q, r.p];
export const vectorDet = (u: LatticeVector, v: LatticeVector) =>
  u[0] * v[1] - u[1] * v[0];
export function basisCoordinates(
  w: LatticeVector,
  u: LatticeVector,
  v: LatticeVector,
): LatticeVector {
  const d = vectorDet(u, v);
  if (abs(d) !== 1n)
    throw new Error("The convergent basis must be unimodular.");
  return [vectorDet(w, v) / d, vectorDet(u, w) / d];
}

// Rounded presentation only; exact values/bounds remain available separately.
export function scientificRational(r: Rational): string {
  if (!r.p) return "0";
  const x = logRational(r),
    exponent = Math.floor(x);
  return `${r.p < 0n ? "−" : ""}${(10 ** (x - exponent)).toFixed(5)} × 10^${exponent}`;
}
