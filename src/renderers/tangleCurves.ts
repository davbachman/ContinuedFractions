import type { tangleDiagram } from "../math/tangleDiagram";

type Point = { x: number; y: number };
const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const quadratic = (a: Point, b: Point, c: Point, t: number) =>
  mix(mix(a, b, t), mix(b, c, t), t);
const segmentDistance = (p: Point, a: Point, b: Point) => {
  const length = distance(a, b);
  const t = length
    ? ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length ** 2
    : 0;
  return distance(p, mix(a, b, Math.max(0, Math.min(1, t))));
};

/** Round only strand joints, in disjoint disks away from other strands.
 * The middle half of every edge (including each crossing and gap) stays straight.
 * Split each quadratic at its midpoint so edge/region identity is retained.
 */
export function tangleCurves(diagram: ReturnType<typeof tangleDiagram>) {
  const { nodes, edges } = diagram;
  const adjacent = nodes.map(() => [] as number[]);
  edges.forEach((edge, id) => {
    adjacent[edge.from].push(id);
    adjacent[edge.to].push(id);
  });
  const boxed = new Set(diagram.boxes.flatMap((box) => box.corners));
  const joints = nodes.map((p, id) => {
    const incident = adjacent[id];
    if (incident.length !== 2 || boxed.has(id)) return null;
    const neighbors = incident.map(
      (i) => nodes[edges[i].from === id ? edges[i].to : edges[i].from],
    );
    let radius = Math.min(24, ...neighbors.map((q) => distance(p, q) * 0.24));
    edges.forEach((edge) => {
      if (edge.from !== id && edge.to !== id)
        radius = Math.min(
          radius,
          0.4 * segmentDistance(p, nodes[edge.from], nodes[edge.to]),
        );
    });
    const trims = neighbors.map((q) =>
      mix(p, q, radius / (distance(p, q) || 1)),
    );
    const controls = trims.map((q) => mix(p, q, 0.5));
    return {
      incident,
      trims,
      controls,
      join: mix(controls[0], controls[1], 0.5),
    };
  });
  const end = (node: number, edge: number) => {
    const joint = joints[node];
    if (!joint)
      return { join: nodes[node], control: nodes[node], trim: nodes[node] };
    const i = joint.incident.indexOf(edge);
    return {
      join: joint.join,
      control: joint.controls[i],
      trim: joint.trims[i],
    };
  };
  return edges.map((edge, id) => {
    const a = end(edge.from, id),
      b = end(edge.to, id);
    const middle = mix(nodes[edge.from], nodes[edge.to], 0.5);
    const xy = (p: Point) => `${p.x},${p.y}`;
    return {
      path: `M${xy(a.join)} Q${xy(a.control)} ${xy(a.trim)} L${xy(b.trim)} Q${xy(b.control)} ${xy(b.join)}`,
      at(t: number): Point {
        if (t < 0.15) return quadratic(a.join, a.control, a.trim, t / 0.15);
        if (t < 0.5) return mix(a.trim, middle, (t - 0.15) / 0.35);
        if (t < 0.85) return mix(middle, b.trim, (t - 0.5) / 0.35);
        return quadratic(b.trim, b.control, b.join, (t - 0.85) / 0.15);
      },
    };
  });
}
