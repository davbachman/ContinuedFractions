import { it, expect } from "vitest";
import {
  branchPoints,
  dehnShear,
  involution,
  liftedQuarterTurn,
  meridianCurves,
  mod1,
  pillowPoint,
} from "../src/math/pillowcase";
import { rational } from "../src/math/rational";
import { expressionFor, tangleConnectivity } from "../src/math/tangles";
it("verifies marked branch-point permutations for endpoint half-twist and active rotation", () => {
  const names = (
    f: (p: { x: number; y: number }) => { x: number; y: number },
  ) =>
    branchPoints.map((p) => {
      const q = f(p);
      return branchPoints.find((r) => r.x === q.x && r.y === q.y)!.name;
    });
  expect(names((p) => dehnShear(p))).toEqual(["NW", "SE", "SW", "NE"]);
  expect(names(liftedQuarterTurn)).toEqual(["SW", "NW", "SE", "NE"]);
  for (const p of branchPoints)
    expect(involution(p)).toEqual({ x: p.x, y: p.y });
});
it("identifies involution pairs in the pillowcase and swaps the parallel meridians", () => {
  for (const [p, q] of [
    [0, 1],
    [1, 0],
    [5, 13],
    [-3, 2],
    [2, 1],
  ]) {
    const r = rational(BigInt(p), BigInt(q)),
      data = meridianCurves(r);
    expect(data.limited).toBe(false);
    data.curves.forEach((curve, i) =>
      curve.forEach((z) => {
        expect(mod1(q * z.y - p * z.x)).toBeCloseTo(i ? 0.75 : 0.25, 9);
        const a = pillowPoint(z),
          b = pillowPoint(involution(z));
        expect(a.x).toBeCloseTo(b.x, 9);
        expect(a.y).toBeCloseTo(b.y, 9);
        // At a seam either face represents the same boundary point.
        if (a.y > 1e-8 && a.y < 1 - 1e-8 && a.x > 1e-8 && a.x < 1 - 1e-8)
          expect(a.face).toBe(b.face);
      }),
    );
    for (const segment of data.pillow)
      for (const z of segment.points) {
        expect(z.x).toBeGreaterThanOrEqual(-1e-9);
        expect(z.x).toBeLessThanOrEqual(1 + 1e-9);
        expect(z.y).toBeGreaterThanOrEqual(-1e-9);
        expect(z.y).toBeLessThanOrEqual(1 + 1e-9);
      }
    const groups = [0, 1]
      .map((parity) =>
        branchPoints
          .filter((b) => (((q * 2 * b.y - p * 2 * b.x) % 2) + 2) % 2 === parity)
          .map((b) => b.name)
          .join("–"),
      )
      .sort();
    expect(groups).toEqual(tangleConnectivity(expressionFor(r)));
  }
});
it("the lifted Dehn and quarter-turn maps give the same rational changes downstairs", () => {
  for (const [p, q] of [
    [5, 13],
    [-2, 3],
    [0, 1],
    [1, 0],
  ]) {
    const origin = { x: 0.11, y: 0.23 },
      epsilon = 1e-5,
      z = { x: origin.x + q * epsilon, y: origin.y + p * epsilon };
    const d0 = dehnShear(origin),
      d1 = dehnShear(z),
      a0 = liftedQuarterTurn(origin),
      a1 = liftedQuarterTurn(z);
    expect((d1.x - d0.x) / epsilon).toBeCloseTo(q, 7);
    expect((d1.y - d0.y) / epsilon).toBeCloseTo(p + q, 7);
    expect((a1.x - a0.x) / epsilon).toBeCloseTo(-p, 7);
    expect((a1.y - a0.y) / epsilon).toBeCloseTo(q, 7);
  }
  expect(meridianCurves(rational(10000n, 13n)).limited).toBe(true);
});
