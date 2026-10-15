import { it, expect } from "vitest";
import {
  flip,
  INITIAL_TRIANGLE,
  triangleKey,
  type Triangulation,
} from "../src/math/triangulation";
import { rational } from "../src/math/rational";
import { latticeGeometry } from "../src/renderers/latticeGeometry";
it("keeps a unit-area exact fundamental domain in frame after every initial flip and long flip sequences", () => {
  let tri = INITIAL_TRIANGLE;
  for (let step = 0; step < 400; step++) {
    tri = step < 3 ? flip(INITIAL_TRIANGLE, step) : flip(tri, step % 3);
    const before = triangleKey(tri),
      g = latticeGeometry(tri);
    expect(g.u.x * g.v.y - g.u.y * g.v.x).toSatisfy(
      (n: bigint) => n === 1n || n === -1n,
    );
    expect(g.cells).toHaveLength(81);
    for (const point of g.quad.map(g.project)) {
      expect(point.x).toBeGreaterThanOrEqual(60);
      expect(point.x).toBeLessThanOrEqual(320);
      expect(point.y).toBeGreaterThanOrEqual(45);
      expect(point.y).toBeLessThanOrEqual(305);
    }
    const central = g.cells.find((c) => c.central)!,
      neighbor = g.cells.find((c) => c.i === 1 && c.j === 0)!;
    expect(central.quad[1]).toEqual(neighbor.quad[0]);
    expect(central.quad[2]).toEqual(neighbor.quad[3]);
    expect(triangleKey(tri)).toBe(before);
  }
});
it("fits huge exact slopes without overflowing, rotating, or changing the marking", () => {
  const n = 10n ** 400n,
    tri: Triangulation = [rational(n), rational(1n, 0n), rational(n + 1n)];
  const g = latticeGeometry(tri);
  expect(g.span).toBe(n + 1n);
  expect(g.dense).toBe(true);
  expect(
    g.cells.every((c) =>
      c.quad.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    ),
  ).toBe(true);
  expect(g.project({ x: 1n, y: n }).y).toBeLessThan(
    g.project({ x: 0n, y: 0n }).y,
  );
});

import { latticeLines } from "../src/renderers/latticeGeometry";
it("tiles the whole viewport with the true three line families and bounds subpixel detail", () => {
  const g = latticeGeometry(INITIAL_TRIANGLE),
    result = latticeLines(INITIAL_TRIANGLE);
  expect(result.limited).toBe(false);
  expect(new Set(result.lines.map((l) => l.edge)).size).toBe(3);
  const origin = g.project({ x: 0n, y: 0n }),
    scale = g.scale;
  for (const line of result.lines) {
    const r = INITIAL_TRIANGLE[line.edge];
    const world = {
      x: (line.from.x - origin.x) / scale,
      y: (origin.y - line.from.y) / scale,
    };
    const determinant = Number(r.q) * world.y - Number(r.p) * world.x;
    expect(determinant).toBeCloseTo(Math.round(determinant), 10);
  }
  expect(
    latticeLines([rational(1000n), rational(1n, 0n), rational(1001n)]).limited,
  ).toBe(true);
});
