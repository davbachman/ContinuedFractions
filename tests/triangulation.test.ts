import { it, expect } from "vitest";
import {
  INITIAL_TRIANGLE,
  flip,
  flipDetails,
  validateTriangle,
  triangleKey,
  wrappedEdge,
  targetItinerary,
  triangulationPath,
  followStatus,
  triangulationMatrix,
} from "../src/math/triangulation";
import { rational, label } from "../src/math/rational";
import { parseInput } from "../src/math/continuedFraction";
import { fareyCrossings } from "../src/math/farey";
import { determinant } from "../src/math/modular";
it("all three initial edges flip exactly, including identified square sides", () => {
  expect(flip(INITIAL_TRIANGLE, 2).map(label)).toEqual(["0", "∞", "-1"]);
  expect(flip(INITIAL_TRIANGLE, 0).map(label)).toEqual(["2", "∞", "1"]);
  expect(flip(INITIAL_TRIANGLE, 1).map(label)).toEqual(["0", "1/2", "1"]);
});
it("flips are involutions, preserve primitive determinants, and build a unit-area universal-cover quadrilateral", () => {
  let tri = INITIAL_TRIANGLE,
    seed = 17;
  for (let i = 0; i < 600; i++) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const edge = seed % 3,
      d = flipDetails(tri, edge);
    expect(triangleKey(flip(d.after, edge))).toBe(triangleKey(tri));
    validateTriangle(d.after);
    const u = d.quad[1],
      v = d.quad[3];
    expect([1n, -1n]).toContain(u.x * v.y - u.y * v.x);
    expect(determinant(triangulationMatrix(d.after))).toBe(1n);
    tri = d.after;
  }
});
it("wrap splits use exact boundary intersections and never connect across a chart boundary", () => {
  for (const r of [
    rational(0n),
    rational(1n, 0n),
    rational(1n),
    rational(-1n),
    rational(13n, 5n),
    rational(-7n, 19n),
  ]) {
    const data = wrappedEdge(r);
    expect(data.limited).toBe(false);
    for (const [a, b] of data.segments) {
      for (const p of [a, b])
        for (const v of [p.x, p.y]) {
          expect(v.p >= 0n && v.p <= v.q).toBe(true);
        }
      const dx = rational(b.x.p * a.x.q - a.x.p * b.x.q, b.x.q * a.x.q),
        dy = rational(b.y.p * a.y.q - a.y.p * b.y.q, b.y.q * a.y.q);
      expect(dx.p * r.p * dy.q - dy.p * r.q * dx.q).toBe(0n);
    }
  }
  expect(wrappedEdge(rational(0n)).segments).toHaveLength(2);
  expect(wrappedEdge(rational(1n, 0n)).segments).toHaveLength(2);
  expect(wrappedEdge(rational(10n ** 100n, 3n)).limited).toBe(true);
});
it("target following uses exactly the existing Farey crossing and coefficient map", () => {
  for (const input of ["5/13", "13/5", "-5/13", "1/2", "phi", "sqrt2"]) {
    const spec = parseInput(input),
      state = targetItinerary(spec),
      events = fareyCrossings(spec, 12, 512).crossings,
      path = triangulationPath(state);
    expect(state.steps.map((s) => [s.time, s.term])).toEqual(
      events.map((e) => [e.time, e.term]),
    );
    events.forEach((e, i) => {
      for (const r of [e.left, e.right]) {
        expect(path[i].map(label)).toContain(label(r));
        expect(path[i + 1].map(label)).toContain(label(r));
      }
    });
    const status = followStatus(spec, { ...state, cursor: state.steps.length });
    expect(status).toContain(
      spec.kind === "rational" ? "Terminal triangle" : "Infinite itinerary",
    );
  }
  expect(
    followStatus(parseInput("3"), targetItinerary(parseInput("3"))),
  ).toContain("ray lies on a Farey edge");
  expect(targetItinerary(parseInput("infinity")).steps).toHaveLength(0);
});
