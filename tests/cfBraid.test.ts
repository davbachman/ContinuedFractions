import { describe, it, expect } from "vitest";
import {
  braidBlocks,
  braidColoringFraction,
  cfBraidDiagram,
  BRAID_DETAIL_LIMIT,
} from "../src/math/cfBraid";
import { toCF, fromCF } from "../src/math/continuedFraction";
import { rational, parseRational } from "../src/math/rational";
import { closureComponents, expressionFor } from "../src/math/tangles";
import { diagramClosure, tangleDiagram } from "../src/math/tangleDiagram";

describe("CF three-active-strand / four-plat convention", () => {
  it("reads α in top-to-bottom order using independent crossing color relations", () => {
    for (let p = -40; p <= 40; p++)
      for (let q = 1; q <= 30; q++) {
        const r = rational(BigInt(p), BigInt(q)),
          cf = toCF(r),
          blocks = braidBlocks(cf);
        expect(braidColoringFraction(blocks)).toEqual(r);
        expect(fromCF(blocks.map((b) => b.count))).toEqual(r);
        expect(blocks.length % 2).toBe(1);
        expect(diagramClosure(cfBraidDiagram(cf)).components).toBe(
          closureComponents(r),
        );
      }
  });
  it("alternates the active pair, keeps zero boxes, and maps split endings to their original coefficient", () => {
    const blocks = braidBlocks([2n, 1n, 1n, 2n]);
    expect(blocks.map((b) => b.count)).toEqual([2n, 1n, 1n, 1n, 1n]);
    expect(blocks.map((b) => b.pair)).toEqual([1, 2, 1, 2, 1]);
    expect(blocks.map((b) => b.exponent)).toEqual([2n, -1n, 1n, -1n, 1n]);
    expect(blocks.map((b) => b.coefficient)).toEqual([0, 1, 2, 3, 3]);
    expect(braidBlocks([0n, 2n, 1n, 1n, 2n])[0].count).toBe(0n);
    expect(braidColoringFraction(braidBlocks([1n, 1n]))).toEqual(rational(2n));
  });
  it("matches oriented closure fixtures, signs and mirrors against the existing tangle diagrams", () => {
    for (const text of [
      "0",
      "1",
      "-1",
      "2",
      "-2",
      "3",
      "-3",
      "5/2",
      "-5/2",
      "13/5",
      "5/13",
    ]) {
      const r = parseRational(text),
        plat = cfBraidDiagram(toCF(r));
      const actual = diagramClosure(plat),
        reference = diagramClosure(tangleDiagram(expressionFor(r)));
      expect(actual.components).toBe(reference.components);
      // Writhe is not invariant under the extra terminal Reidemeister-I move.
      if (["0", "1", "-1", "3", "-3"].includes(text)) {
        expect(actual.writhe).toBe(reference.writhe);
        expect(Math.abs(actual.linking)).toBe(Math.abs(reference.linking));
      }
    }
    expect(diagramClosure(cfBraidDiagram([3n])).writhe).toBe(3);
    expect(diagramClosure(cfBraidDiagram([-3n])).writhe).toBe(-3);
    expect(diagramClosure(cfBraidDiagram([], true)).components).toBe(1);
    expect(cfBraidDiagram([], true).crossings).toHaveLength(0);
  });
  it("bounds display detail while keeping exact coloring and closure connectivity", () => {
    const cf = [0n, 10n ** 200n + 3n];
    const d = cfBraidDiagram(cf);
    expect(d.boxes.length).toBeGreaterThan(0);
    expect(d.edges.length).toBeLessThan(25);
    expect(d.crossings.length).toBeLessThanOrEqual(BRAID_DETAIL_LIMIT);
    expect(braidColoringFraction(d.blocks)).toEqual(fromCF(cf));
    expect(diagramClosure(d).components).toBe(1);
    const deep = cfBraidDiagram(Array.from({ length: 128 }, () => 12n));
    expect(deep.crossings.length).toBeLessThanOrEqual(BRAID_DETAIL_LIMIT);
    expect(deep.edges.length).toBeLessThan(1200);
  });
});

// Test-only state-sum invariant, independently using the drawn over/under graph.
// A-smoothing pairs an over-end with the next end clockwise in SVG coordinates.
function normalizedBracket(
  d: ReturnType<typeof cfBraidDiagram> | ReturnType<typeof tangleDiagram>,
) {
  const count = d.crossings.length;
  if (count > 12 || d.boxes.length)
    throw new Error("Use small, fully drawn fixtures");
  const crossingEdges = new Set(d.crossings.flatMap((c) => [c.over, c.under]));
  const smoothings = d.crossings.map((c) => {
    const over = d.edges[c.over],
      under = d.edges[c.under];
    const ids = [over.from, under.from, over.to, under.to];
    const x = ids.reduce((s, i) => s + d.nodes[i].x, 0) / 4,
      y = ids.reduce((s, i) => s + d.nodes[i].y, 0) / 4;
    ids.sort(
      (a, b) =>
        Math.atan2(d.nodes[a].y - y, d.nodes[a].x - x) -
        Math.atan2(d.nodes[b].y - y, d.nodes[b].x - x),
    );
    const k = ids.indexOf(over.from);
    return [0, 1, 2, 3].map((i) => ids[(k + i) % 4]);
  });
  const poly = new Map<number, bigint>();
  const writhe = diagramClosure(d).writhe;
  for (let state = 0; state < 2 ** count; state++) {
    const parent = d.nodes.map((_, i) => i);
    const root = (i: number): number =>
      parent[i] === i ? i : (parent[i] = root(parent[i]));
    const join = (a: number, b: number) => {
      parent[root(a)] = root(b);
    };
    d.edges.forEach((e, i) => {
      if (!crossingEdges.has(i)) join(e.from, e.to);
    });
    join(d.ends[0], d.ends[1]);
    join(d.ends[2], d.ends[3]);
    let bCount = 0;
    smoothings.forEach(([a, b, c, e], i) => {
      if (state & (1 << i)) {
        join(a, e);
        join(b, c);
        bCount++;
      } else {
        join(a, b);
        join(c, e);
      }
    });
    const loops = new Set(parent.map((_, i) => root(i))).size;
    const power = loops - 1;
    let binomial = 1n;
    for (let j = 0; j <= power; j++) {
      const exponent = count - 2 * bCount + 2 * power - 4 * j - 3 * writhe;
      const coefficient = (Math.abs(power + writhe) % 2 ? -1n : 1n) * binomial;
      poly.set(exponent, (poly.get(exponent) ?? 0n) + coefficient);
      binomial = (binomial * BigInt(power - j)) / BigInt(j + 1);
    }
  }
  return [...poly].filter(([, n]) => n !== 0n).sort((a, b) => a[0] - b[0]);
}
it("matches the normalized bracket of the existing numerator closure, including chiral mirrors", () => {
  for (const text of [
    "0",
    "1",
    "-1",
    "3",
    "-3",
    "3/2",
    "-3/2",
    "5/2",
    "-5/2",
    "13/5",
    "5/13",
    "-5/13",
  ]) {
    const r = parseRational(text);
    expect(normalizedBracket(cfBraidDiagram(toCF(r))), text).toEqual(
      normalizedBracket(tangleDiagram(expressionFor(r))),
    );
  }
  const trefoil = normalizedBracket(cfBraidDiagram([3n]));
  const mirror = normalizedBracket(cfBraidDiagram([-3n]));
  expect(mirror).toEqual(
    trefoil
      .map(([e, c]) => [-e, c] as [number, bigint])
      .sort((a, b) => a[0] - b[0]),
  );
  expect(mirror).not.toEqual(trefoil);
  expect(normalizedBracket(cfBraidDiagram([1n]))).toEqual([[0, 1n]]);
});
