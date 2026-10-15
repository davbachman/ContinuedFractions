import { expect, it } from "vitest";
import { expressionFor } from "../src/math/tangles";
import { parseRational } from "../src/math/rational";
import { tangleDiagram } from "../src/math/tangleDiagram";
import { tangleCurves } from "../src/renderers/tangleCurves";

it("rounds joints with matching tangents while fixing endpoints and crossing positions", () => {
  for (const value of [
    "0",
    "infinity",
    "3",
    "-3",
    "5/2",
    "-5/2",
    "5/13",
    "13/5",
    "1/1000000",
  ]) {
    const diagram = tangleDiagram(expressionFor(parseRational(value)));
    const curves = tangleCurves(diagram);
    const boxed = new Set(diagram.boxes.flatMap((box) => box.corners));
    diagram.nodes.forEach((node, id) => {
      const incident = diagram.edges.flatMap((edge, i) => {
        const t = edge.from === id ? 0 : edge.to === id ? 1 : -1;
        return t < 0 ? [] : [{ curve: curves[i], t }];
      });
      for (const { curve, t } of incident) {
        const p = curve.at(t);
        expect(Number.isFinite(p.x + p.y)).toBe(true);
        if (diagram.ends.includes(id) || boxed.has(id)) {
          expect(p.x).toBeCloseTo(node.x, 9);
          expect(p.y).toBeCloseTo(node.y, 9);
        }
      }
      if (incident.length === 2 && !boxed.has(id)) {
        const [a, b] = incident.map(({ curve, t }) => curve.at(t));
        expect(a.x).toBeCloseTo(b.x, 9);
        expect(a.y).toBeCloseTo(b.y, 9);
        const tangents = incident.map(({ curve, t }) => {
          const p = curve.at(t),
            q = curve.at(t ? 1 - 1e-6 : 1e-6);
          const length = Math.hypot(q.x - p.x, q.y - p.y);
          return { x: (q.x - p.x) / length, y: (q.y - p.y) / length };
        });
        expect(
          tangents[0].x * tangents[1].x + tangents[0].y * tangents[1].y,
        ).toBeCloseTo(-1, 6);
      }
    });
    for (const crossing of diagram.crossings) {
      const points = [crossing.over, crossing.under].map((id) => {
        const edge = diagram.edges[id],
          a = diagram.nodes[edge.from],
          b = diagram.nodes[edge.to];
        const p = curves[id].at(0.5);
        expect(p.x).toBeCloseTo((a.x + b.x) / 2, 9);
        expect(p.y).toBeCloseTo((a.y + b.y) / 2, 9);
        return p;
      });
      expect(points[0]).toEqual(points[1]);
    }
  }
});
