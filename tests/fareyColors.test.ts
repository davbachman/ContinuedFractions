import { describe, expect, it } from "vitest";
import { rational } from "../src/math/rational";
import { visibleFarey } from "../src/math/farey";
import {
  INITIAL_TRIANGLE,
  flip,
  validateTriangle,
  type Triangulation,
} from "../src/math/triangulation";
import {
  fareyTriangleColor,
  fareyTriangleId,
  visibleFareyTriangles,
} from "../src/renderers/fareyColors";

describe("fixed Farey triangle colors", () => {
  it("preserves the old initial palette without assigning gold to every current triangle", () => {
    expect(fareyTriangleColor(INITIAL_TRIANGLE)).toBe("#e4bf66");
    expect(
      [0, 1, 2].map((i) => fareyTriangleColor(flip(INITIAL_TRIANGLE, i))),
    ).toEqual(["#197d9a", "#a65732", "#9450a1"]);
  });
  it("gives different colors across every flip and survives reordered vectors, signs, deep paths and reversal", () => {
    let tri = INITIAL_TRIANGLE,
      seed = 1337;
    for (let step = 0; step < 1000; step++) {
      const color = fareyTriangleColor(tri);
      expect(fareyTriangleColor([tri[2], tri[0], tri[1]])).toBe(color);
      expect(
        fareyTriangleColor(
          tri.map((r) => ({ p: -r.p, q: -r.q })) as unknown as Triangulation,
        ),
      ).toBe(color);
      for (let edge = 0; edge < 3; edge++) {
        const next = flip(tri, edge);
        expect(fareyTriangleColor(next)).not.toBe(color);
        expect(fareyTriangleColor(flip(next, edge))).toBe(color);
      }
      seed = (1664525 * seed + 1013904223) >>> 0;
      tri = flip(tri, seed % 3);
    }
    // A large integral translation divisible by three preserves the coloring.
    const n = 3n * 10n ** 100n;
    expect(
      fareyTriangleColor([rational(n), rational(1n, 0n), rational(n + 1n)]),
    ).toBe("#e4bf66");
  });
  it("colors actual H² cells consistently across viewport changes and at negative slopes", () => {
    const known = new Map<string, string>();
    for (const [min, max, scale] of [
      [-3, 3, 100],
      [-0.3, 0.9, 800],
      [0.3, 0.5, 10000],
    ]) {
      const edges = visibleFarey(min, max, scale);
      const triangles = visibleFareyTriangles(edges, min, max);
      expect(triangles.length).toBeLessThanOrEqual(
        2200 + Math.ceil(max) - Math.floor(min),
      );
      for (const tri of triangles) {
        validateTriangle(tri);
        const id = fareyTriangleId(tri),
          color = fareyTriangleColor(tri);
        if (known.has(id)) expect(color).toBe(known.get(id));
        known.set(id, color);
      }
    }
  });
});
