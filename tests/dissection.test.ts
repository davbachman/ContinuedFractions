import { describe, expect, it } from "vitest";
import {
  compareTo,
  parseInput,
  type NumberSpec,
} from "../src/math/continuedFraction";
import { add, compare, rational } from "../src/math/rational";
import {
  dissect,
  dissectionUnavailable,
  evaluateLength,
  lengthLabel,
  lengthRatio,
  MAX_DISSECTION_STAGES,
  minus,
  ONE,
  projectionAlpha,
  squareAt,
  squareGroup,
  type Length,
  type ExactRectangle,
} from "../src/math/dissection";

// Polynomial identities verify area without approximating α, even for irrationals.
const product = (x: Length, y: Length) => [
  x.a * y.a,
  x.a * y.b + x.b * y.a,
  x.b * y.b,
];
const area = (r: ExactRectangle) => product(r.width, r.height);
const sign = (x: Length, spec: NumberSpec) =>
  !x.a
    ? x.b < 0n
      ? -1
      : x.b > 0n
        ? 1
        : 0
    : compareTo(spec, rational(-x.b, x.a)) * (x.a > 0n ? 1 : -1);
function disjoint(a: ExactRectangle, b: ExactRectangle, spec: NumberSpec) {
  const end = (p: Length, size: Length): Length => ({
    a: p.a + size.a,
    b: p.b + size.b,
  });
  return (
    sign(minus(end(a.x, a.width), b.x), spec) <= 0 ||
    sign(minus(end(b.x, b.width), a.x), spec) <= 0 ||
    sign(minus(end(a.y, a.height), b.y), spec) <= 0 ||
    sign(minus(end(b.y, b.height), a.y), spec) <= 0
  );
}

describe("exact rectangle dissection", () => {
  for (const [input, expected] of [
    ["13/5", [2n, 1n, 1n, 2n]],
    ["5/13", [0n, 2n, 1n, 1n, 2n]],
    ["3", [3n]],
    ["1/2", [0n, 2n]],
    ["phi", [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n]],
    ["sqrt2", [1n, 2n, 2n, 2n, 2n, 2n, 2n, 2n]],
  ] as const) {
    it(`${input}: correct counts, exact conserved area, disjoint squares, and termination`, () => {
      const spec = parseInput(input),
        stages = dissect(spec, 8);
      expect(stages.map((s) => s.count)).toEqual(expected);
      const squares: ExactRectangle[] = [];
      for (const [index, s] of stages.entries()) {
        expect(s.index).toBe(index);
        if (index) expect(s.before).toEqual(stages[index - 1].remainder);
        const before = area(s.before),
          rest = area(s.remainder),
          removed = product(s.side, s.side);
        expect(before).toEqual(rest.map((v, j) => v + s.count * removed[j]));
        expect(sign(s.remainder.width, spec)).toBeGreaterThanOrEqual(0);
        expect(sign(s.remainder.height, spec)).toBeGreaterThanOrEqual(0);
        const residual =
          s.axis === "x" ? s.remainder.width : s.remainder.height;
        expect(sign(minus(residual, s.side), spec)).toBeLessThan(0);
        for (let k = 0n; k < s.count; k++) {
          const square = squareAt(s, k);
          expect(square.width).toEqual(square.height);
          for (const earlier of squares)
            expect(disjoint(square, earlier, spec)).toBe(true);
          if (!s.terminal)
            expect(disjoint(square, s.remainder, spec)).toBe(true);
          squares.push(square);
        }
      }
      expect(stages.slice(0, -1).every((s) => !s.terminal)).toBe(true);
      expect(stages.at(-1)!.terminal).toBe(spec.kind === "rational");
      if (spec.kind === "rational") {
        const last = stages.at(-1)!;
        expect(
          evaluateLength(
            last.axis === "x" ? last.remainder.width : last.remainder.height,
            spec.value,
          ),
        ).toEqual(rational(0n));
        const sum = squares.reduce((total, r) => {
          const w = evaluateLength(r.width, spec.value),
            h = evaluateLength(r.height, spec.value);
          return add(total, rational(w.p * h.p, w.q * h.q));
        }, rational(0n));
        expect(compare(sum, spec.value)).toBe(0);
      } else
        expect(
          stages.every(
            (s) =>
              sign(s.remainder.width, spec) > 0 &&
              sign(s.remainder.height, spec) > 0,
          ),
        ).toBe(true);
    });
  }
  it("retains the original orientation and exact dimensions for 5/13", () => {
    const spec = parseInput("5/13"),
      stages = dissect(spec);
    expect(stages[0].before).toEqual(stages[0].remainder);
    expect(
      stages.map((s) => [
        lengthLabel(s.remainder.width, spec),
        lengthLabel(s.remainder.height, spec),
      ]),
    ).toEqual([
      ["5/13", "1"],
      ["5/13", "3/13"],
      ["2/13", "3/13"],
      ["2/13", "1/13"],
      ["0", "1/13"],
    ]);
  });
  it("matches 13/5's exact remainders", () => {
    const spec = parseInput("13/5");
    expect(
      dissect(spec).map((s) => [
        lengthLabel(s.remainder.width, spec),
        lengthLabel(s.remainder.height, spec),
      ]),
    ).toEqual([
      ["3/5", "1"],
      ["3/5", "2/5"],
      ["1/5", "2/5"],
      ["1/5", "0"],
    ]);
  });
  it("generates periodic stages on demand without declaring a cutoff terminal", () => {
    for (const input of ["phi", "sqrt2", "[0;2,3]"]) {
      const spec = parseInput(input, "ones");
      expect(dissect(spec, 4)).toEqual(dissect(spec, 16).slice(0, 4));
      const deep = dissect(spec, 200);
      expect(deep).toHaveLength(MAX_DISSECTION_STAGES);
      expect(deep.some((s) => s.terminal)).toBe(false);
      const last = deep.at(-1)!,
        alpha = projectionAlpha(spec);
      expect(
        lengthRatio(last.remainder.width, last.side, alpha),
      ).toBeGreaterThan(0);
      expect(
        lengthRatio(last.remainder.height, last.side, alpha),
      ).toBeGreaterThan(0);
      expect(lengthRatio(last.side, ONE, alpha)).toBeGreaterThan(0);
    }
  });
  it("represents enormous square counts in constant space", () => {
    const spec = parseInput("1/1000000000000000000000000000000"),
      stages = dissect(spec);
    expect(stages).toHaveLength(2);
    const last = stages[1];
    expect(last.count).toBe(10n ** 30n);
    expect(last.terminal).toBe(true);
    expect(lengthLabel(squareGroup(last).height, spec)).toBe("1");
    expect(lengthLabel(squareAt(last, last.count - 1n).y, spec)).toBe(
      "999999999999999999999999999999/1000000000000000000000000000000",
    );
    expect(() => squareAt(last, last.count)).toThrow(RangeError);
  });
  it("rejects zero, negative, and infinite widths without changing their specifications", () => {
    for (const input of ["0", "-1", "infinity"]) {
      const spec = parseInput(input),
        before = structuredClone(spec);
      expect(dissectionUnavailable(spec)).toContain("unavailable");
      expect(dissect(spec)).toEqual([]);
      expect(spec).toEqual(before);
    }
  });
});
