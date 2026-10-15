import type { tangleDiagram } from "../math/tangleDiagram";

export type StrandPoint = { x: number; y: number; z: number };
const add = (a: StrandPoint, b: StrandPoint): StrandPoint => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
const scale = (p: StrandPoint, s: number): StrandPoint => ({
  x: p.x * s,
  y: p.y * s,
  z: p.z * s,
});
const sub = (a: StrandPoint, b: StrandPoint) => add(a, scale(b, -1));
const length = (p: StrandPoint) => Math.hypot(p.x, p.y, p.z);
const unit = (p: StrandPoint) => scale(p, 1 / (length(p) || 1));
const mix = (a: StrandPoint, b: StrandPoint, t: number) =>
  add(scale(a, 1 - t), scale(b, t));
const hermite = (
  a: StrandPoint,
  b: StrandPoint,
  da: StrandPoint,
  db: StrandPoint,
  t: number,
) =>
  add(
    add(
      scale(a, 2 * t ** 3 - 3 * t ** 2 + 1),
      scale(b, -2 * t ** 3 + 3 * t ** 2),
    ),
    add(scale(da, t ** 3 - 2 * t ** 2 + t), scale(db, t ** 3 - t ** 2)),
  );

/** Each crossing is one half-turn of two opposite circular helices.
 * Positive crossings lift the declared over-edge toward +z. Consecutive
 * half-turns join into a single constant-radius helix, including after rotation.
 * Short Hermite collars join different twist axes without changing the core,
 * endpoints, crossing order, or the user's operation word.
 */
export function tangleHelices(diagram: ReturnType<typeof tangleDiagram>) {
  const point = (id: number): StrandPoint => ({ ...diagram.nodes[id], z: 0 });
  const crossings = new Map(
    diagram.crossings.flatMap(
      (crossing) =>
        [
          [crossing.over, crossing],
          [crossing.under, crossing],
        ] as const,
    ),
  );
  const raw = diagram.edges.map((edge, id) => {
    const a = point(edge.from),
      b = point(edge.to),
      crossing = crossings.get(id);
    if (!crossing)
      return {
        radius: 0,
        at: (t: number) => mix(a, b, t),
        tangent: (_t: number) => sub(b, a),
      };
    const other =
      diagram.edges[id === crossing.over ? crossing.under : crossing.over];
    const start = mix(a, point(other.from), 0.5),
      end = mix(b, point(other.to), 0.5);
    const radial = sub(a, start),
      axis = sub(end, start),
      radius = length(radial);
    const sign = id === crossing.over ? 1 : -1;
    return {
      radius,
      at(t: number): StrandPoint {
        if (t === 0) return a;
        if (t === 1) return b;
        const p = add(mix(start, end, t), scale(radial, Math.cos(Math.PI * t)));
        return { ...p, z: sign * radius * Math.sin(Math.PI * t) };
      },
      tangent(t: number): StrandPoint {
        const p = sub(axis, scale(radial, Math.PI * Math.sin(Math.PI * t)));
        return { ...p, z: sign * radius * Math.PI * Math.cos(Math.PI * t) };
      },
    };
  });
  const adjacent = diagram.nodes.map(
    () => [] as { edge: number; end: 0 | 1 }[],
  );
  diagram.edges.forEach((edge, id) => {
    adjacent[edge.from].push({ edge: id, end: 0 });
    adjacent[edge.to].push({ edge: id, end: 1 });
  });
  const tangents = raw.map((curve) => [curve.tangent(0), curve.tangent(1)]);
  for (const incident of adjacent) {
    if (incident.length !== 2) continue;
    const outward = incident.map(({ edge, end }) =>
      unit(scale(raw[edge].tangent(end), end ? -1 : 1)),
    );
    const direction = unit(sub(outward[0], outward[1]));
    if (!length(direction)) continue;
    incident.forEach(({ edge, end }, i) => {
      tangents[edge][end] = scale(
        direction,
        (i ? -1 : 1) * (end ? -1 : 1) * length(raw[edge].tangent(end)),
      );
    });
  }
  return raw.map((curve, id) => {
    const collar = 0.12;
    const changed = (end: 0 | 1) =>
      length(sub(unit(curve.tangent(end)), unit(tangents[id][end]))) > 1e-8;
    const start = changed(0),
      end = changed(1);
    return {
      radius: curve.radius,
      at(t: number): StrandPoint {
        if (start && t < collar)
          return hermite(
            curve.at(0),
            curve.at(collar),
            scale(tangents[id][0], collar),
            scale(curve.tangent(collar), collar),
            t / collar,
          );
        if (end && t > 1 - collar)
          return hermite(
            curve.at(1 - collar),
            curve.at(1),
            scale(curve.tangent(1 - collar), collar),
            scale(tangents[id][1], collar),
            (t - 1 + collar) / collar,
          );
        return curve.at(t);
      },
    };
  });
}
