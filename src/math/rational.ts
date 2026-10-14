export type Rational = Readonly<{ p: bigint; q: bigint }>;
export const abs = (n: bigint) => (n < 0n ? -n : n);
export function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
export function rational(p: bigint, q = 1n): Rational {
  if (!q) {
    if (!p) throw new Error("0/0 is undefined.");
    return { p: 1n, q: 0n };
  }
  if (q < 0n) {
    p = -p;
    q = -q;
  }
  const g = gcd(p, q);
  return { p: p / g, q: q / g };
}
export const label = (r: Rational) =>
  r.q === 0n ? "∞" : r.q === 1n ? String(r.p) : `${r.p}/${r.q}`;
export const value = (r: Rational) => Number(r.p) / Number(r.q);
export const compare = (a: Rational, b: Rational) => {
  const d = a.p * b.q - b.p * a.q;
  return d < 0n ? -1 : d > 0n ? 1 : 0;
};
export const add = (a: Rational, b: Rational) =>
  rational(a.p * b.q + b.p * a.q, a.q * b.q);
export const subtract = (a: Rational, b: Rational) =>
  rational(a.p * b.q - b.p * a.q, a.q * b.q);
export function floor(r: Rational) {
  if (!r.q) throw new Error("Infinity has no finite floor.");
  const d = r.p / r.q;
  return r.p < 0n && r.p % r.q ? d - 1n : d;
}
export function parseRational(s: string): Rational {
  const text = s.trim();
  if (/^[+-]?(?:∞|infinity)$/i.test(text)) return rational(1n, 0n);
  if (text.length > 1024)
    throw new Error("Use at most 1,024 input characters.");
  const m = text.match(/^([+-]?\d+)\s*(?:\/\s*([+-]?\d+))?$/);
  if (m) return rational(BigInt(m[1]), m[2] === undefined ? 1n : BigInt(m[2]));
  const decimal = text.match(/^([+-]?)(\d*)\.(\d+)$/);
  if (decimal)
    return rational(
      BigInt(
        (decimal[1] === "-" ? "-" : "") + (decimal[2] || "0") + decimal[3],
      ),
      10n ** BigInt(decimal[3].length),
    );
  throw new Error(
    "Enter a rational (5/13), integer, decimal, or continued fraction [0;2,1,1,2].",
  );
}
export function snap(x: number, maxDenominator = 64): Rational {
  let best = rational(BigInt(Math.round(x))),
    error = Math.abs(value(best) - x);
  for (let q = 2; q <= maxDenominator; q++) {
    const p = Math.round(x * q),
      e = Math.abs(p / q - x);
    if (e < error) {
      error = e;
      best = rational(BigInt(p), BigInt(q));
    }
  }
  return best;
}
