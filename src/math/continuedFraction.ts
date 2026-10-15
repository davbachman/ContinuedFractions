import {
  type Rational,
  rational,
  floor,
  compare,
  subtract,
  value,
  label,
} from "./rational";
export type NumberSpec = Readonly<
  | { kind: "rational"; value: Rational }
  | { kind: "periodic"; prefix: readonly bigint[]; period: readonly bigint[] }
>;
export const DEFAULT: NumberSpec = {
  kind: "rational",
  value: rational(5n, 13n),
};
export function toCF(r: Rational): bigint[] {
  if (!r.q) throw new Error("Infinity has no finite regular expansion.");
  const a: bigint[] = [];
  let { p, q } = r;
  while (q) {
    const n = floor({ p, q });
    a.push(n);
    [p, q] = [q, p - n * q];
  }
  return a;
}
export function validateCF(a: readonly bigint[]) {
  if (!a.length || a.length > 128 || a.some((n, i) => i > 0 && n <= 0n))
    throw new Error(
      "Use 1–128 terms; every term after a₀ must be a positive integer.",
    );
}
export function convergents(a: readonly bigint[]): Rational[] {
  validateCF(a);
  let p0 = 0n,
    p1 = 1n,
    q0 = 1n,
    q1 = 0n;
  return a.map((n) => {
    const p = n * p1 + p0,
      q = n * q1 + q0;
    [p0, p1, q0, q1] = [p1, p, q1, q];
    return rational(p, q);
  });
}
export function fromCF(a: readonly bigint[]): Rational {
  return convergents(a).at(-1)!;
}
export function alternate(a: readonly bigint[]): bigint[] {
  if (a.length === 1) return [a[0] - 1n, 1n];
  return [...a.slice(0, -1), a.at(-1)! - 1n, 1n];
}
export function terms(spec: NumberSpec, count = 24): bigint[] {
  if (spec.kind === "rational") return toCF(spec.value);
  return Array.from({ length: Math.max(count, spec.prefix.length) }, (_, i) =>
    i < spec.prefix.length
      ? spec.prefix[i]
      : spec.period[(i - spec.prefix.length) % spec.period.length],
  );
}
export function cylinder(a: readonly bigint[]): [Rational, Rational] {
  const cs = convergents(a),
    v = cs.at(-1)!,
    prev = cs.at(-2) ?? rational(1n, 0n);
  const w = rational(v.p + prev.p, v.q + prev.q);
  return compare(v, w) < 0 ? [v, w] : [w, v];
}
export function compareTo(spec: NumberSpec, r: Rational): number {
  if (spec.kind === "rational") return compare(spec.value, r);
  for (let n = Math.max(spec.prefix.length + 2, 12); n <= 128; n += 8) {
    const [lo, hi] = cylinder(terms(spec, n));
    if (compare(lo, r) > 0) return 1;
    if (compare(hi, r) < 0) return -1;
  }
  throw new Error("Exact comparison exceeded the 128-term precision budget.");
}
export const approximate = (spec: NumberSpec) =>
  value(spec.kind === "rational" ? spec.value : fromCF(terms(spec, 40)));
export const difference = (spec: NumberSpec, r: Rational) =>
  value(
    subtract(
      spec.kind === "rational" ? spec.value : fromCF(terms(spec, 48)),
      r,
    ),
  );
export const specLabel = (s: NumberSpec) =>
  s.kind === "rational"
    ? label(s.value)
    : s.prefix.length === 1 &&
        s.prefix[0] === 1n &&
        s.period.length === 1 &&
        s.period[0] === 1n
      ? "φ"
      : s.prefix.length === 1 &&
          s.prefix[0] === 1n &&
          s.period.length === 1 &&
          s.period[0] === 2n
        ? "√2"
        : `[${s.prefix.join(", ")}; overline(${s.period.join(", ")})]`;
export function parseInput(
  text: string,
  completion: "finite" | "ones" = "finite",
): NumberSpec {
  const s = text.trim();
  if (["phi", "φ", "golden ratio"].includes(s.toLowerCase()))
    return { kind: "periodic", prefix: [1n], period: [1n] };
  if (["sqrt(2)", "sqrt2", "√2"].includes(s.toLowerCase()))
    return { kind: "periodic", prefix: [1n], period: [2n] };
  if (s.startsWith("[")) {
    if (s.length > 1024 || !/^\[\s*[+-]?\d+(?:\s*[;,]\s*\d+)*\s*\]$/.test(s))
      throw new Error("Use a list such as [0;2,1,1,2].");
    const a = s
      .slice(1, -1)
      .split(/[;,]/)
      .map((x) => BigInt(x.trim()));
    validateCF(a);
    return completion === "ones"
      ? { kind: "periodic", prefix: a, period: [1n] }
      : { kind: "rational", value: fromCF(a) };
  }
  return { kind: "rational", value: parseRationalInput(s) };
}
import { parseRational as parseRationalInput } from "./rational";
export function validateSpec(spec: NumberSpec) {
  if (spec.kind === "periodic") {
    validateCF(spec.prefix);
    if (spec.prefix.length > 96)
      throw new Error("Use at most 96 prefix terms for a periodic number.");
    if (
      !spec.period.length ||
      spec.period.length > 32 ||
      spec.period.some((a) => a <= 0n)
    )
      throw new Error("A period needs 1–32 positive coefficients.");
  }
  // Infinity is an exact tangle/marked-slope value; finite-only viewers handle it explicitly.
  if (spec.kind === "rational" && !spec.value.q) return;
  if (spec.kind === "rational" && toCF(spec.value).length > 128)
    throw new Error(
      "The exact continued fraction exceeds the 128-term input budget.",
    );
  if (
    !Number.isFinite(approximate(spec)) ||
    Math.abs(approximate(spec)) > 10000
  )
    throw new Error("The display supports finite endpoints with |α| ≤ 10,000.");
}
