import { describe, it, expect } from "vitest";
import { visibleFarey } from "../src/math/farey";
import { rational, value } from "../src/math/rational";
import {
  I,
  T,
  apply,
  determinant,
  matrixKey,
  reduce,
  type Matrix,
} from "../src/math/modular";
import {
  idealImage,
  modularTriangleArcs,
  triangleMatrix,
  visibleModularArcs,
} from "../src/renderers/modularGeometry";

describe("adaptive modular-domain boundaries", () => {
  it("maps each Farey triangle with an exact orientation-preserving modular matrix", () => {
    for (const edge of visibleFarey(-2, 3, 300)) {
      const m = triangleMatrix(edge);
      expect(determinant(m)).toBe(1n);
      expect(idealImage(m, rational(0n))).toEqual(edge.left);
      expect(idealImage(m, rational(1n, 0n))).toEqual(edge.right);
      expect(idealImage(m, rational(1n))).toEqual(
        rational(edge.left.p + edge.right.p, edge.left.q + edge.right.q),
      );
    }
  });
  it("retains the genuine infinite cusp ray and the two quarter circles in the reference triangle", () => {
    const arcs = modularTriangleArcs(I);
    expect(arcs).toEqual([
      { kind: "circle", x: 0, radius: 1, low: 0, high: Math.PI / 2 },
      { kind: "circle", x: 1, radius: 1, low: Math.PI / 2, high: Math.PI },
      { kind: "vertical", x: 0.5, low: 0.5, high: Infinity },
    ]);
    expect(modularTriangleArcs(T)[2]).toEqual({
      kind: "vertical",
      x: 1.5,
      low: 0.5,
      high: Infinity,
    });
  });
  it("each transformed spoke is a true change of modular chart, not a Farey edge", () => {
    const matrices: Matrix[] = [
      I,
      T,
      triangleMatrix({ left: rational(1n, 3n), right: rational(2n, 5n) }),
      triangleMatrix({ left: rational(-1n, 2n), right: rational(0n) }),
    ];
    const samples = [
      {
        x: Math.cos(Math.PI / 5),
        y: Math.sin(Math.PI / 5),
        nx: Math.cos(Math.PI / 5),
        ny: Math.sin(Math.PI / 5),
      },
      {
        x: 1 + Math.cos((4 * Math.PI) / 5),
        y: Math.sin((4 * Math.PI) / 5),
        nx: Math.cos((4 * Math.PI) / 5),
        ny: Math.sin((4 * Math.PI) / 5),
      },
      { x: 0.5, y: 1.7, nx: 1, ny: 0 },
    ];
    for (const m of matrices)
      for (const p of samples) {
        const a = apply(m, { x: p.x + p.nx * 1e-6, y: p.y + p.ny * 1e-6 }),
          b = apply(m, { x: p.x - p.nx * 1e-6, y: p.y - p.ny * 1e-6 });
        expect(matrixKey(reduce(a).matrix)).not.toBe(
          matrixKey(reduce(b).matrix),
        );
      }
  });
  it("reveals progressively smaller modular arcs near irrational and rational endpoints", () => {
    for (const alpha of [5 / 13, Math.SQRT2, 355 / 113, -5 / 13]) {
      let previous = Infinity;
      for (const scale of [150, 1500, 15000]) {
        const min = alpha - 400 / scale,
          max = alpha + 400 / scale;
        const arcs = visibleModularArcs(
          visibleFarey(min, max, scale),
          min,
          max,
          scale,
          400,
        );
        const radii = arcs
          .filter((a) => a.kind === "circle")
          .map((a) => a.radius);
        expect(radii.length).toBeGreaterThan(10);
        const smallest = Math.min(...radii);
        expect(smallest).toBeLessThan(previous / 2);
        previous = smallest;
        expect(arcs.length).toBeLessThan(7000);
      }
    }
  });
  it("deep copies have correct geodesic support despite nearly equal endpoint coordinates", () => {
    const m: Matrix = [28657n, 17711n, 17711n, 10946n];
    expect(determinant(m)).toBe(1n);
    const arcs = modularTriangleArcs(m);
    const samples = [
      { x: Math.cos(Math.PI / 5), y: Math.sin(Math.PI / 5) },
      { x: 1 + Math.cos((4 * Math.PI) / 5), y: Math.sin((4 * Math.PI) / 5) },
      { x: 0.5, y: 1 },
    ];
    arcs.forEach((a, i) => {
      const p = apply(m, samples[i]);
      if (a.kind === "circle")
        expect(Math.hypot(p.x - a.x, p.y) / a.radius).toBeCloseTo(1, 5);
    });
  });
});
