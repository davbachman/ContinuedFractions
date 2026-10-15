import { expect, it } from "vitest";
import {
  expressionFor,
  mirrorExpression,
  type TangleExpression,
} from "../src/math/tangles";
import { parseRational } from "../src/math/rational";
import { tangleDiagram } from "../src/math/tangleDiagram";
import { tangleHelices } from "../src/renderers/tangleHelices";

it("uses opposite constant-radius helices with the declared crossing sign and exact endpoints", () => {
  for (const text of [
    "0",
    "infinity",
    "1",
    "-1",
    "4",
    "-4",
    "5/2",
    "5/13",
    "13/5",
  ]) {
    const diagram = tangleDiagram(expressionFor(parseRational(text))),
      curves = tangleHelices(diagram);
    diagram.edges.forEach((edge, id) => {
      for (const [t, node] of [
        [0, edge.from],
        [1, edge.to],
      ]) {
        const p = curves[id].at(t),
          q = diagram.nodes[node];
        expect(p.x).toBeCloseTo(q.x, 8);
        expect(p.y).toBeCloseTo(q.y, 8);
        expect(p.z).toBeCloseTo(0, 8);
      }
    });
    for (const crossing of diagram.crossings) {
      const over = diagram.edges[crossing.over],
        under = diagram.edges[crossing.under];
      const mid = (a: number, b: number) => ({
        x: (diagram.nodes[a].x + diagram.nodes[b].x) / 2,
        y: (diagram.nodes[a].y + diagram.nodes[b].y) / 2,
      });
      const start = mid(over.from, under.from),
        end = mid(over.to, under.to);
      const radius = curves[crossing.over].radius;
      for (const t of [0.12, 0.25, 0.5, 0.75, 0.88]) {
        const a = curves[crossing.over].at(t),
          b = curves[crossing.under].at(t);
        const center = {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        };
        expect((a.x + b.x) / 2).toBeCloseTo(center.x, 8);
        expect((a.y + b.y) / 2).toBeCloseTo(center.y, 8);
        expect(a.z + b.z).toBeCloseTo(0, 8);
        expect(Math.hypot(a.x - center.x, a.y - center.y, a.z)).toBeCloseTo(
          radius,
          8,
        );
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeCloseTo(
          2 * radius,
          8,
        );
      }
      expect(curves[crossing.over].at(0.5).z).toBeCloseTo(radius, 8);
      expect(curves[crossing.under].at(0.5).z).toBeCloseTo(-radius, 8);
    }
  }
});

it("joins half-turns and different twist axes smoothly, and mirrors reverse helix handedness", () => {
  const ops: TangleExpression = [
    { kind: "twist", count: 3n },
    { kind: "rotate", turns: 1 },
    { kind: "twist", count: -2n },
    { kind: "twist", count: 1n },
  ];
  const diagram = tangleDiagram(ops),
    curves = tangleHelices(diagram);
  const mirrored = tangleHelices(tangleDiagram(mirrorExpression(ops)));
  curves.forEach((curve, i) => {
    for (let step = 0; step <= 64; step++) {
      const a = curve.at(step / 64),
        b = mirrored[i].at(step / 64);
      expect(a.x).toBeCloseTo(b.x, 8);
      expect(a.y).toBeCloseTo(b.y, 8);
      expect(a.z).toBeCloseTo(-b.z, 8);
    }
  });
  diagram.nodes.forEach((_, node) => {
    const outgoing = diagram.edges.flatMap((edge, i) => {
      const t = edge.from === node ? 0 : edge.to === node ? 1 : -1;
      if (t < 0) return [];
      const p = curves[i].at(t),
        q = curves[i].at(t ? 1 - 1e-7 : 1e-7);
      const length = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
      return [
        {
          x: (q.x - p.x) / length,
          y: (q.y - p.y) / length,
          z: (q.z - p.z) / length,
        },
      ];
    });
    if (outgoing.length === 2) {
      const [a, b] = outgoing;
      expect(a.x * b.x + a.y * b.y + a.z * b.z).toBeCloseTo(-1, 6);
    }
  });
});
