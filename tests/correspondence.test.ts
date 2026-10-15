import { expect, it } from "vitest";
import { fromCF, toCF } from "../src/math/continuedFraction";
import { expressionFor } from "../src/math/tangles";
import { rational } from "../src/math/rational";
import {
  rationalRole,
  twistCoefficientGroups,
} from "../src/math/correspondence";
import { domainSectorKeys, domainSectors } from "../src/renderers/torusDomains";
import {
  apply,
  I,
  matrixKey,
  reduce,
  S,
  type Matrix,
  multiply,
  quotientTrace,
} from "../src/math/modular";
import { domainFocus } from "../src/renderers/domainFocus";

it("distinguishes convergents and intermediate convergents with exact integers", () => {
  expect(rationalRole(rational(1n, 0n), [])).toBeUndefined();
  const cf = toCF(rational(5n, 13n));
  expect(rationalRole(rational(1n, 2n), cf)).toBe("C1");
  expect(rationalRole(rational(3n, 8n), cf)).toBe("Intermediate C4 (1/2)");
  expect(rationalRole(rational(7n, 9n), cf)).toBeUndefined();
  expect(rationalRole(rational(1n, 0n), cf)).toBeUndefined();
  const huge = 10n ** 70n;
  expect(rationalRole(rational(huge + 1n, 1n), [huge, 1n])).toBe("C1");
  expect(rationalRole(rational(-1n, 2n), [-1n, 2n])).toBe("C1");
});

it("maps finite irrational prefixes including merged last-one endings without fabricating custom-word linkage", () => {
  for (const cf of [
    [1n, 1n, 1n, 1n, 1n],
    [1n, 2n, 2n, 2n],
    [0n, 2n, 1n, 1n, 2n],
    [0n, 1n],
  ]) {
    const ops = expressionFor(fromCF(cf));
    const groups = twistCoefficientGroups(ops, cf)!;
    expect([...groups.values()].flat().sort((a, b) => a - b)).toEqual(
      cf.map((_, i) => i),
    );
    if (cf.at(-1) === 1n)
      expect([...groups.values()]).toContainEqual([
        cf.length - 2,
        cf.length - 1,
      ]);
    expect(
      twistCoefficientGroups([...ops, { kind: "twist", count: 0n }], cf),
    ).toBeNull();
  }
});

it("identifies each modular copy by its reduction chart, independent of cover lift or display", () => {
  const T = (n: bigint): Matrix => [1n, n, 0n, 1n];
  for (const m of [I, T(3n), S, multiply(T(-2n), S), multiply(S, T(4n))]) {
    const keys = domainSectorKeys(m);
    domainSectors.forEach(({ sample }, i) =>
      expect(keys[i]).toBe(matrixKey(reduce(apply(m, sample)).matrix)),
    );
  }
});

it("seam cues use modular chart transitions, symmetrically during forward and reverse seeking", () => {
  const trace = quotientTrace(5 / 13, 8);
  for (let i = 1; i < trace.segments.length; i++) {
    const t = trace.segments[i].start;
    const before = domainFocus(trace.segments, 5 / 13, t - 0.02);
    const after = domainFocus(trace.segments, 5 / 13, t + 0.02);
    expect(before.seam).toBe(after.seam);
    expect(domainFocus(trace.segments, 5 / 13, t - 0.02)).toEqual(before);
  }
  expect(domainFocus(trace.segments, 5 / 13, 0).seam).toBeUndefined();
});
