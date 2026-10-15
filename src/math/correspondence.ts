import { convergents, fromCF } from "./continuedFraction";
import { canonicalTwistCoefficients, type TangleExpression } from "./tangles";
import { type Rational } from "./rational";

export const sameRational = (a: Rational, b: Rational) =>
  a.p * b.q === b.p * a.q;

/** Identify a cusp in the selected number's CF, without approximate comparisons. */
export function rationalRole(
  r: Rational,
  coefficients: readonly bigint[],
): string | undefined {
  if (!coefficients.length) return undefined;
  const cs = convergents(coefficients);
  const index = cs.findIndex((c) => sameRational(c, r));
  if (index >= 0) return `C${index}`;
  for (let i = 1; i < coefficients.length; i++) {
    const u = cs[i - 1],
      v = i > 1 ? cs[i - 2] : { p: 1n, q: 0n };
    // det(r, v) / det(u, r) is the intermediate multiplier k.
    const numerator = r.p * v.q - v.p * r.q;
    const denominator = u.p * r.q - r.p * u.q;
    if (denominator && numerator % denominator === 0n) {
      const k = numerator / denominator;
      if (k > 0n && k < coefficients[i])
        return `Intermediate C${i} (${k}/${coefficients[i]})`;
    }
  }
  return undefined;
}

/** Finite prefixes ending in 1 merge their last two terms in canonical tangles. */
export function twistCoefficientGroups(
  ops: TangleExpression,
  prefix: readonly bigint[],
): Map<number, number[]> | null {
  if (!prefix.length) return null;
  const mapping = canonicalTwistCoefficients(ops, fromCF(prefix));
  if (!mapping) return null;
  const merged = prefix.length > 1 && prefix.at(-1) === 1n;
  return new Map(
    [...mapping].map(([region, index]) => [
      region,
      merged && index === prefix.length - 2 ? [index, index + 1] : [index],
    ]),
  );
}
