import { describe, it, expect } from "vitest";
import { parseRational, rational } from "../src/math/rational";
import {
  expressionFor,
  tangleFraction,
  tangleColors,
  coloringFraction,
  tangleConnectivity,
  mirrorExpression,
  closureComponents,
  closureName,
  type TangleOperation,
} from "../src/math/tangles";
describe("frozen rational tangle conventions", () => {
  it("handles zero, infinity, and the positive crossing independently through coloring", () => {
    expect(tangleConnectivity([])).toEqual(["NW–NE", "SW–SE"]);
    const r: TangleOperation = { kind: "rotate", turns: 1 };
    expect(tangleConnectivity([r])).toEqual(["NE–SE", "NW–SW"]);
    expect(tangleFraction([r])).toEqual(rational(1n, 0n));
    expect(tangleColors([{ kind: "twist", count: 1n }])).toEqual([
      0n,
      -1n,
      1n,
      0n,
    ]);
    expect(coloringFraction([{ kind: "twist", count: 1n }])).toEqual(
      rational(1n),
    );
  });
  it("matches exact arithmetic to diagram colors over signed operation words", () => {
    let ops: TangleOperation[] = [];
    for (let i = 0; i < 150; i++) {
      ops = [
        ...ops,
        i % 3
          ? { kind: "twist", count: BigInt((i % 7) - 3) }
          : { kind: "rotate", turns: i % 2 ? 1 : -1 },
      ];
      expect(coloringFraction(ops)).toEqual(tangleFraction(ops));
      const [a, b, c, d] = tangleColors(ops);
      expect(a + d).toBe(b + c);
    }
  });
  it("round-trips canonical rationals without confusing R with reciprocal", () => {
    for (const text of [
      "5/13",
      "-5/13",
      "13/5",
      "355/113",
      "0",
      "3",
      "-3",
      "1/2",
      "infinity",
    ]) {
      const r = parseRational(text),
        ops = expressionFor(r);
      expect(tangleFraction(ops)).toEqual(r);
      expect(coloringFraction(ops)).toEqual(r);
      const turned = [...ops, { kind: "rotate", turns: 1 } as const];
      expect(tangleFraction(turned)).toEqual(rational(-r.q, r.p));
      expect(tangleFraction([...turned, { kind: "rotate", turns: 1 }])).toEqual(
        r,
      );
      expect(
        tangleConnectivity([...turned, { kind: "rotate", turns: 1 }]),
      ).toEqual(tangleConnectivity(ops));
      expect(
        tangleFraction([
          ...ops,
          { kind: "twist", count: 3n },
          { kind: "twist", count: -3n },
        ]),
      ).toEqual(r);
      expect(
        tangleConnectivity([
          ...ops,
          { kind: "twist", count: 3n },
          { kind: "twist", count: -3n },
        ]),
      ).toEqual(tangleConnectivity(ops));
      expect(tangleFraction(mirrorExpression(ops))).toEqual(
        rational(-r.p, r.q),
      );
    }
  });
  it("checks closure fixtures and their mirrors, including the KL Fig.15 convention", () => {
    const fixtures = [
      ["0", "Two-component unlink", 2],
      ["infinity", "Unknot", 1],
      ["1/7", "Unknot", 1],
      ["-1/3", "Unknot", 1],
      ["2", "Hopf link (+ fixture)", 2],
      ["-2", "Hopf link (mirror fixture)", 2],
      ["3", "Right-handed trefoil", 1],
      ["-3", "Left-handed trefoil", 1],
      ["3/2", "Left-handed trefoil", 1],
      ["-3/2", "Right-handed trefoil", 1],
      ["5/2", "Figure-eight knot (amphichiral)", 1],
      ["-5/2", "Figure-eight knot (amphichiral)", 1],
    ] as const;
    for (const [text, name, count] of fixtures) {
      const r = parseRational(text);
      expect(closureName(r)).toBe(name);
      expect(closureComponents(r)).toBe(count);
    }
  });
});

import { tangleDiagram, diagramClosure } from "../src/math/tangleDiagram";
it("generates actual crossings, coloring relations, endpoint arcs, and independent closure topology", () => {
  for (const text of [
    "0",
    "infinity",
    "1/2",
    "-1/2",
    "3",
    "-3",
    "2",
    "-2",
    "5/2",
    "-5/2",
    "5/13",
    "355/113",
  ]) {
    const r = parseRational(text),
      ops = expressionFor(r),
      diagram = tangleDiagram(ops);
    expect(diagram.fraction).toEqual(r);
    for (const crossing of diagram.crossings) {
      const over = diagram.edges[crossing.over],
        under = diagram.edges[crossing.under];
      expect(diagram.nodes[over.from].color).toBe(diagram.nodes[over.to].color);
      expect(
        diagram.nodes[under.from].color + diagram.nodes[under.to].color,
      ).toBe(2n * diagram.nodes[over.from].color);
    }
    expect(diagramClosure(diagram).components).toBe(closureComponents(r));
    const restored = tangleDiagram([
      ...ops,
      { kind: "twist", count: 1n },
      { kind: "twist", count: -1n },
    ]);
    expect(restored.fraction).toEqual(r);
    expect(diagramClosure(restored).components).toBe(closureComponents(r));
  }
  expect(
    diagramClosure(tangleDiagram(expressionFor(rational(3n)))).writhe,
  ).toBe(3);
  expect(
    diagramClosure(tangleDiagram(expressionFor(rational(-3n)))).writhe,
  ).toBe(-3);
  expect(
    diagramClosure(tangleDiagram(expressionFor(rational(2n)))).linking,
  ).toBe(1);
  expect(
    diagramClosure(tangleDiagram(expressionFor(rational(-2n)))).linking,
  ).toBe(-1);
  expect(
    diagramClosure(tangleDiagram(expressionFor(rational(5n, 2n)))).writhe,
  ).toBe(0);
});
it("bounds crossing detail without changing connectivity or the exact diagram fraction", () => {
  const ops = expressionFor(rational(10n ** 40n + 1n, 2n)),
    diagram = tangleDiagram(ops);
  expect(diagram.boxes.length).toBeGreaterThan(0);
  expect(diagram.edges.length).toBeLessThan(20);
  expect(diagram.fraction).toEqual(tangleFraction(ops));
  expect(diagramClosure(diagram).components).toBe(1);
});
it("renders accepted tiny rationals with long coefficients as exact aggregate regions", () => {
  const r = rational(1n, 10n ** 200n + 3n);
  const ops = expressionFor(r);
  expect(tangleFraction(ops)).toEqual(r);
  const diagram = tangleDiagram(ops);
  expect(diagram.fraction).toEqual(r);
  expect(diagram.boxes).toHaveLength(1);
});
