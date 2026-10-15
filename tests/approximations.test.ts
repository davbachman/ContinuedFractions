import { describe, it, expect } from "vitest";
import { parseInput, terms, cylinder } from "../src/math/continuedFraction";
import { compare, rational, subtract } from "../src/math/rational";
import { determinant, multiply, I } from "../src/math/modular";
import {
  prefixData,
  targetBounds,
  convergentError,
  coefficientMatrix,
  latticeVector,
  vectorDet,
  basisCoordinates,
  ratioNumber,
  logRational,
  relativePosition,
} from "../src/math/approximations";

describe("prefix intervals and convergent lattice bases", () => {
  for (const input of [
    "13/5",
    "5/13",
    "3",
    "1/2",
    "0",
    "-13/5",
    "phi",
    "sqrt2",
  ]) {
    it(`keeps exact nested enclosures and unimodular recurrences for ${input}`, () => {
      const spec = parseInput(input),
        cf = terms(spec, 40),
        data = prefixData(cf),
        target = targetBounds(spec, cf.length);
      for (const p of data) {
        const [lo, hi] = p.interval;
        expect(p.interval).toEqual(cylinder(cf.slice(0, p.index + 1)));
        expect(compare(lo, target[0])).toBeLessThanOrEqual(0);
        expect(compare(hi, target[1])).toBeGreaterThanOrEqual(0);
        expect(p.width).toEqual(
          rational(1n, p.convergent.q * (p.convergent.q + p.previous.q)),
        );
        if (p.index) {
          expect(
            compare(lo, data[p.index - 1].interval[0]),
          ).toBeGreaterThanOrEqual(0);
          expect(
            compare(hi, data[p.index - 1].interval[1]),
          ).toBeLessThanOrEqual(0);
        }
        const u = latticeVector(p.previous),
          v = latticeVector(p.convergent);
        expect(vectorDet(u, v)).toBe(p.index % 2 ? 1n : -1n);
        expect(basisCoordinates(u, u, v)).toEqual([1n, 0n]);
        expect(basisCoordinates(v, u, v)).toEqual([0n, 1n]);
        const old = p.index
          ? latticeVector(data[p.index - 1].previous)
          : [1n, 0n];
        expect(v).toEqual([
          p.coefficient * u[0] + old[0],
          p.coefficient * u[1] + old[1],
        ]);
      }
    });
  }
  it("does not collapse the last rational prefix interval to a singleton", () => {
    const data = prefixData(terms(parseInput("5/13")));
    expect(data.at(-1)!.interval).toEqual([
      rational(5n, 13n),
      rational(7n, 18n),
    ]);
    expect(data.at(-1)!.width.p).toBe(1n);
  });
});
describe("matrix products and error bounds", () => {
  it("multiplies on the right and reads the correct columns, including signed a0", () => {
    for (const input of ["13/5", "5/13", "-13/5", "phi"]) {
      let m = I;
      for (const p of prefixData(terms(parseInput(input), 32))) {
        m = multiply(m, coefficientMatrix(p.coefficient));
        expect(p.matrix).toEqual(m);
        expect(m).toEqual([
          p.convergent.p,
          p.previous.p,
          p.convergent.q,
          p.previous.q,
        ]);
        expect(determinant(m)).toBe(p.index % 2 ? 1n : -1n);
      }
    }
    expect(prefixData([2n, 1n, 1n, 2n]).at(-1)!.matrix).toEqual([
      13n,
      5n,
      5n,
      2n,
    ]);
  });
  it("reports exact rational errors and a separate exact-zero terminal point", () => {
    const spec = parseInput("13/5"),
      data = prefixData(terms(spec)),
      bounds = targetBounds(spec, data.length);
    expect(
      data.map((p) => convergentError(spec, p.convergent, bounds).absolute[0]),
    ).toEqual([
      rational(3n, 5n),
      rational(2n, 5n),
      rational(1n, 10n),
      rational(0n),
    ]);
    expect(convergentError(spec, data.at(-1)!.convergent, bounds).zero).toBe(
      true,
    );
  });
  it("bounds deep irrational errors without cancellation, underflow, or false termination", () => {
    for (const name of ["phi", "sqrt2"]) {
      const spec = parseInput(name),
        data = prefixData(terms(spec, 96)),
        bounds = targetBounds(spec, 96);
      for (const p of data) {
        const e = convergentError(spec, p.convergent, bounds);
        expect(e.exact).toBe(false);
        expect(e.zero).toBe(false);
        expect(e.absolute[0].p).toBeGreaterThan(0n);
        expect(compare(e.scaled[1], rational(1n))).toBeLessThan(0);
        expect(Math.sign(Number(e.signed[0].p))).toBe(p.index % 2 ? -1 : 1);
        expect(Number.isFinite(logRational(e.absolute[0]))).toBe(true);
      }
      const p = data.at(-1)!;
      expect(relativePosition(bounds[0], ...p.interval)).toBeGreaterThan(0);
      expect(relativePosition(bounds[1], ...p.interval)).toBeLessThan(1);
      expect(
        logRational(convergentError(spec, p.convergent, bounds).absolute[0]),
      ).toBeLessThan(-35);
    }
  });
  it("keeps very large exact integers and display ratios usable", () => {
    const huge = 10n ** 400n,
      data = prefixData([0n, huge, 2n]);
    expect(determinant(data[2].matrix)).toBe(-1n);
    expect(ratioNumber(huge, 2n * huge)).toBe(0.5);
    expect(logRational(rational(1n, huge))).toBe(-400);
    expect(
      relativePosition(
        rational(huge + 1n, huge),
        rational(1n),
        rational(huge + 2n, huge),
      ),
    ).toBe(0.5);
    expect(subtract(...data[1].interval).p).not.toBe(0n);
    expect(prefixData([])).toEqual([]);
    expect(() => targetBounds(parseInput("infinity"), 1)).toThrow(/Infinity/);
  });
});
