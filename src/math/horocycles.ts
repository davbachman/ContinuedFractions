import {
  type Rational,
  rational,
  label,
  value,
  gcd,
  subtract,
  abs,
} from "./rational";
import {
  type NumberSpec,
  compareTo,
  difference,
  convergents,
  terms,
  approximate,
} from "./continuedFraction";
export type FordEvent = Readonly<{
  id: string;
  time: number;
  height: number;
  kind: "ford-entry" | "ford-exit" | "ford-tangent";
  rational: Rational;
}>;
export function fordEvents(
  spec: NumberSpec,
  center: Rational,
  maxTime = 18,
): FordEvent[] {
  if (!center.q)
    return [
      {
        id: "ford:infinity:entry",
        time: Math.log(2),
        height: 1,
        kind: "ford-entry",
        rational: center,
      },
    ];
  const radius = rational(1n, 2n * center.q * center.q),
    r = value(radius);
  // Compare against the two exact horizontal extremes before numerical square roots.
  const low = rational(2n * center.p * center.q - 1n, 2n * center.q * center.q),
    high = rational(2n * center.p * center.q + 1n, 2n * center.q * center.q);
  const cl = compareTo(spec, low),
    ch = compareTo(spec, high);
  if (cl < 0 || ch > 0) return [];
  const make = (height: number, kind: FordEvent["kind"]): FordEvent => ({
    id: `${kind}:${label(center)}`,
    time: Math.log(2 / height),
    height,
    kind,
    rational: center,
  });
  if (cl === 0 || ch === 0)
    return [make(r, "ford-tangent")].filter((e) => e.time <= maxTime);
  const delta = difference(spec, center),
    entry =
      r + Math.sqrt(Math.max(0, (r - Math.abs(delta)) * (r + Math.abs(delta))));
  const result = [make(entry, "ford-entry")];
  if (compareTo(spec, center) !== 0)
    result.push(make((delta * delta) / entry, "ford-exit"));
  return result.filter((e) => Number.isFinite(e.time) && e.time <= maxTime);
}
export function fordCandidates(
  spec: NumberSpec,
  maxDenominator = 32,
): Rational[] {
  const x = approximate(spec),
    map = new Map<string, Rational>();
  const put = (r: Rational) => map.set(label(r), r);
  for (let q = 1; q <= maxDenominator; q++) {
    const p = Math.round(x * q);
    for (let d = -1; d <= 1; d++) {
      if (gcd(BigInt(p + d), BigInt(q)) === 1n)
        put(rational(BigInt(p + d), BigInt(q)));
    }
  }
  convergents(terms(spec, 48)).forEach(put);
  put(rational(1n, 0n));
  return [...map.values()];
}
export function tangentFord(a: Rational, b: Rational): boolean {
  const d = abs(subtract(a, b).p);
  return d === 1n && abs(a.p * b.q - b.p * a.q) === 1n;
}
