import { describe, it, expect } from "vitest";
import {
  rational,
  parseRational,
  label,
  compare,
  value,
  snap,
} from "../src/math/rational";
import {
  toCF,
  fromCF,
  convergents,
  alternate,
  parseInput,
  terms,
  compareTo,
  cylinder,
  DEFAULT,
} from "../src/math/continuedFraction";
import { fareyCrossings, adjacent } from "../src/math/farey";
import { fordEvents } from "../src/math/horocycles";
import {
  I,
  S,
  T,
  multiply,
  determinant,
  matrixKey,
  apply,
  reduce,
  inverse,
  tangent,
  quotientTrace,
} from "../src/math/modular";
import { derive, heightAt } from "../src/math/trajectory";
describe("exact arithmetic and expressions", () => {
  it("normalizes signs, zero, infinity and huge integers", () => {
    expect(rational(-6n, -9n)).toEqual(rational(2n, 3n));
    expect(rational(0n, -7n)).toEqual({ p: 0n, q: 1n });
    expect(label(rational(-4n, 0n))).toBe("∞");
    expect(() => rational(0n, 0n)).toThrow();
    expect(parseRational("9007199254740993/3").p).toBe(3002399751580331n);
  });
  it("uses floor for negative inputs and treats decimals exactly", () => {
    expect(toCF(rational(-5n, 13n))).toEqual([-1n, 1n, 1n, 1n, 1n, 2n]);
    expect(parseRational("-0.125")).toEqual(rational(-1n, 8n));
  });
  it("matches published design fixtures and alternate endings", () => {
    expect(toCF(rational(5n, 13n))).toEqual([0n, 2n, 1n, 1n, 2n]);
    expect(convergents([0n, 2n, 1n, 1n, 2n]).map(label)).toEqual([
      "0",
      "1/2",
      "1/3",
      "2/5",
      "5/13",
    ]);
    expect(toCF(rational(355n, 113n))).toEqual([3n, 7n, 16n]);
    expect(terms(parseInput("sqrt2"), 5)).toEqual([1n, 2n, 2n, 2n, 2n]);
    for (const n of [-3n, 0n, 4n])
      expect(fromCF(alternate([n]))).toEqual(rational(n));
  });
  it("round trips 2,000 deterministic random signed rationals and checks determinants", () => {
    let seed = 2026;
    for (let i = 0; i < 2000; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const r = rational(
          BigInt((seed % 200001) - 100000),
          BigInt((seed % 9999) + 1),
        ),
        a = toCF(r),
        c = convergents(a);
      expect(fromCF(a)).toEqual(r);
      expect(fromCF(alternate(a))).toEqual(r);
      for (let j = 1; j < c.length; j++)
        expect(c[j].p * c[j - 1].q - c[j - 1].p * c[j].q).toBe(
          j % 2 ? 1n : -1n,
        );
    }
  });
  it("rejects invalid tails and distinguishes prefix completion", () => {
    expect(() => parseInput("[0;0,2]")).toThrow();
    expect(parseInput("[0;2,1]")).toEqual({
      kind: "rational",
      value: rational(1n, 3n),
    });
    const s = parseInput("[0;2,1]", "ones");
    expect(s.kind).toBe("periodic");
    const [lo, hi] = cylinder([0n, 2n, 1n]);
    expect(compareTo(s, lo)).toBe(1);
    expect(compareTo(s, hi)).toBe(-1);
  });
  it("snaps with a declared denominator bound", () => {
    expect(snap(5 / 13, 64)).toEqual(rational(5n, 13n));
  });
});
describe("Farey geometry and coding", () => {
  it("matches LR fixtures independently of coefficients", () => {
    expect(fareyCrossings(parseInput("2/5")).word).toBe("LR");
    expect(fareyCrossings(parseInput("1/2")).word).toBe("");
    expect(fareyCrossings(DEFAULT).word).toBe("LRLR");
    expect(
      fareyCrossings(
        { kind: "periodic", prefix: [0n], period: [2n] },
        24,
      ).word.startsWith("LRRLLRR"),
    ).toBe(true);
  });
  it("checks run offsets on all reduced fractions with q ≤ 70", () => {
    for (let q = 2; q <= 70; q++)
      for (let p = 1; p < q; p++) {
        const s = parseInput(`${p}/${q}`),
          a = terms(s),
          f = fareyCrossings(s, 30);
        let expected = "";
        for (let i = 1; i < a.length; i++)
          expected += (i % 2 ? "L" : "R").repeat(
            Number(a[i]) - (i === 1 ? 1 : 0) - (i === a.length - 1 ? 1 : 0),
          );
        expect(f.word).toBe(expected);
        for (const e of f.crossings) {
          expect(adjacent(e.left, e.right)).toBe(true);
          expect(e.height ** 2).toBeCloseTo(
            (p / q - value(e.left)) * (value(e.right) - p / q),
            10,
          );
        }
      }
  });
  it("translates negative endpoints and flags integer edge trajectories", () => {
    expect(fareyCrossings(parseInput("-8/13")).word).toBe("LRLR");
    expect(fareyCrossings(parseInput("3")).onEdge).toBe(true);
  });
  it("does not confuse zero-length coefficient runs with crossings", () => {
    const f = fareyCrossings(parseInput("1/3"));
    expect(f.crossings.map((e) => e.term)).toEqual([0, 1]);
    expect(f.crossings[0].direction).toBe("initial");
  });
});
describe("Ford contact geometry", () => {
  it("detects golden-ratio miss and exact half tangencies", () => {
    expect(fordEvents(parseInput("phi"), rational(1n))).toEqual([]);
    for (const p of [0n, 1n])
      expect(
        fordEvents(parseInput("1/2"), rational(p)).map((e) => e.kind),
      ).toEqual(["ford-tangent"]);
  });
  it("has no finite exit at its rational endpoint", () => {
    const events = fordEvents(DEFAULT, rational(5n, 13n));
    expect(events).toHaveLength(1);
    expect(events[0].height).toBeCloseTo(1 / 169, 14);
  });
  it("satisfies circle equations at entry and exit", () => {
    const spec = parseInput("7/19"),
      c = rational(1n, 3n),
      r = 1 / 18;
    const e = fordEvents(spec, c);
    expect(e).toHaveLength(2);
    for (const x of e)
      expect((7 / 19 - 1 / 3) ** 2 + (x.height - r) ** 2).toBeCloseTo(
        r * r,
        14,
      );
    expect(e[0].time).toBeLessThan(e[1].time);
  });
  it("neighbor tangency is an exact determinant identity", () => {
    for (const [a, b] of [
      [rational(1n, 3n), rational(2n, 5n)],
      [rational(3n, 7n), rational(2n, 5n)],
    ]) {
      expect(adjacent(a, b)).toBe(true);
      const r = 1 / (2 * Number(a.q) ** 2),
        s = 1 / (2 * Number(b.q) ** 2);
      expect((value(a) - value(b)) ** 2 + (r - s) ** 2).toBeCloseTo(
        (r + s) ** 2,
        14,
      );
    }
  });
});
describe("modular group and seam continuity", () => {
  it("satisfies S²=(ST)³=I in PSL and inverse cancellation", () => {
    expect(matrixKey(multiply(S, S))).toBe(matrixKey(I));
    const st = multiply(S, T);
    expect(matrixKey(multiply(multiply(st, st), st))).toBe(matrixKey(I));
    const m = multiply(T, multiply(S, T));
    expect(determinant(m)).toBe(1n);
    expect(multiply(m, inverse(m))).toEqual(I);
  });
  it("reduces into F with deterministic boundaries", () => {
    for (const z of [
      { x: 0.5, y: 2 },
      { x: 0.4, y: 0.003 },
      { x: -12.1, y: 0.1 },
      { x: 0, y: 1 },
    ]) {
      const r = reduce(z);
      expect(r.point.x).toBeGreaterThanOrEqual(-0.500001);
      expect(r.point.x).toBeLessThan(0.500001);
      expect(r.point.x ** 2 + r.point.y ** 2).toBeGreaterThanOrEqual(1 - 1e-10);
      expect(determinant(r.matrix)).toBe(1n);
      expect(apply(r.matrix, z).x).toBeCloseTo(r.point.x, 8);
    }
    expect(reduce({ x: 0.5, y: 2 }).point.x).toBe(-0.5);
  });
  it("transforms tangents consistently with a numerical derivative", () => {
    const m = multiply(S, T),
      z = { x: 0.3, y: 0.7 },
      v = { x: 0, y: -0.7 },
      dt = 1e-6,
      a = apply(m, z),
      b = apply(m, { x: z.x + dt * v.x, y: z.y + dt * v.y }),
      t = tangent(m, z, v);
    expect((b.x - a.x) / dt).toBeCloseTo(t.x, 5);
    expect((b.y - a.y) / dt).toBeCloseTo(t.y, 5);
  });
  for (const alpha of [
    5 / 13,
    7 / 19,
    355 / 113,
    Math.SQRT2,
    (1 + Math.sqrt(5)) / 2,
    -5 / 13,
    0,
    0.5,
  ])
    it(`splits and pairs every seam for α=${alpha}`, () => {
      const q = quotientTrace(alpha, 18);
      expect(q.limited).toBe(false);
      for (const seam of q.seams) {
        const z = { x: alpha, y: heightAt(seam.time) },
          a = apply(seam.before, z),
          b = apply(seam.after, z),
          transition = multiply(seam.after, inverse(seam.before));
        const mapped = apply(transition, a);
        expect(mapped.x).toBeCloseTo(b.x, 5);
        expect(mapped.y).toBeCloseTo(b.y, 5);
        for (const p of [a, b])
          expect(
            Math.min(
              Math.abs(Math.abs(p.x) - 0.5),
              Math.abs(p.x * p.x + p.y * p.y - 1),
            ),
          ).toBeLessThan(2e-5);
      }
      for (const seg of q.segments) {
        expect(seg.points.every((p) => Math.abs(p.x) <= 0.5001)).toBe(true);
        expect(
          matrixKey(
            reduce({ x: alpha, y: heightAt((seg.start + seg.end) / 2) }).matrix,
          ),
        ).toBe(matrixKey(seg.matrix));
      }
    });
});
describe("time and deterministic replay", () => {
  it("is constant hyperbolic speed and never reaches the ideal boundary", () => {
    expect(Math.log(heightAt(2) / heightAt(7))).toBeCloseTo(5);
    expect(heightAt(24)).toBeGreaterThan(0);
  });
  it("rebuilds exactly identical event IDs and times", () => {
    expect(derive(DEFAULT, 12).events).toEqual(derive(DEFAULT, 12).events);
  });
  it("extends irrational coding while preserving earlier events", () => {
    const s = parseInput("phi"),
      short = derive(s, 8),
      long = derive(s, 18);
    expect(long.farey.crossings.length).toBeGreaterThan(
      short.farey.crossings.length,
    );
    expect(long.events.filter((e) => e.time <= 8)).toEqual(short.events);
  });
});
