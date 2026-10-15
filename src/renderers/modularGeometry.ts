import { type Edge } from "../math/farey";
import { type Rational, rational, value } from "../math/rational";
import { type Matrix, type Point, apply } from "../math/modular";

import type { DomainSide } from "./domainEdges";

export type ModularArc = Readonly<
  { side: DomainSide } & (
    | { kind: "circle"; x: number; radius: number; low: number; high: number }
    | { kind: "vertical"; x: number; low: number; high: number }
  )
>;

export function idealImage(m: Matrix, r: Rational): Rational {
  return rational(m[0] * r.p + m[1] * r.q, m[2] * r.p + m[3] * r.q);
}

// PSL(2,Z) sends (0, 1, infinity) to (left, mediant, right).
export function triangleMatrix(edge: Edge): Matrix {
  return [edge.right.p, edge.left.p, edge.right.q, edge.left.q];
}

// The six spokes at the order-three point of (0,1,infinity) combine
// into three geodesic pieces. These are modular seams, not Farey edges.
const pieces: readonly {
  support: readonly [Rational, Rational];
  from: Point;
  to: Rational;
}[] = [
  {
    support: [rational(-1n), rational(1n)],
    from: { x: 0, y: 1 },
    to: rational(1n),
  },
  {
    support: [rational(0n), rational(2n)],
    from: { x: 1, y: 1 },
    to: rational(0n),
  },
  {
    support: [rational(1n, 2n), rational(1n, 0n)],
    from: { x: 0.5, y: 0.5 },
    to: rational(1n, 0n),
  },
];

export function modularTriangleArcs(matrix: Matrix): ModularArc[] {
  const vertex = apply(matrix, { x: 0.5, y: Math.sqrt(3) / 2 });
  return pieces.flatMap((piece): ModularArc[] => {
    const a = idealImage(matrix, piece.support[0]),
      b = idealImage(matrix, piece.support[1]);
    const start = apply(matrix, piece.from),
      end = idealImage(matrix, piece.to);
    // The finite midpoint-to-vertex segment is S-paired. Beyond the
    // order-three vertex the same geodesic is a T-paired cusp edge.
    if (!a.q || !b.q) {
      const x = value(a.q ? a : b),
        endHeight = end.q ? 0 : Infinity;
      return [
        {
          side: "S",
          kind: "vertical",
          x,
          low: Math.min(start.y, vertex.y),
          high: Math.max(start.y, vertex.y),
        },
        {
          side: "T",
          kind: "vertical",
          x,
          low: Math.min(vertex.y, endHeight),
          high: Math.max(vertex.y, endHeight),
        },
      ];
    }
    const delta = Number(b.p * a.q - a.p * b.q) / Number(a.q * b.q);
    const x = value(a) + delta / 2,
      radius = Math.abs(delta) / 2;
    const angle = Math.atan2(start.y, start.x - x),
      middle = Math.atan2(vertex.y, vertex.x - x),
      endpointAngle = value(end) < x ? Math.PI : 0;
    return [
      {
        side: "S",
        kind: "circle",
        x,
        radius,
        low: Math.min(angle, middle),
        high: Math.max(angle, middle),
      },
      {
        side: "T",
        kind: "circle",
        x,
        radius,
        low: Math.min(middle, endpointAngle),
        high: Math.max(middle, endpointAngle),
      },
    ];
  });
}

export function visibleModularArcs(
  edges: readonly Edge[],
  min: number,
  max: number,
  scale: number,
  height: number,
): ModularArc[] {
  const arcs: ModularArc[] = [];
  const top = height / scale;
  const add = (matrix: Matrix) => {
    for (const arc of modularTriangleArcs(matrix)) {
      if (arc.kind === "vertical") {
        if (arc.x >= min && arc.x <= max && arc.low <= top) arcs.push(arc);
      } else {
        if (arc.radius * scale < 1.5) continue;
        const left = arc.x + arc.radius * Math.cos(arc.high),
          right = arc.x + arc.radius * Math.cos(arc.low);
        const bottom =
          arc.radius * Math.min(Math.sin(arc.low), Math.sin(arc.high));
        if (right >= min && left <= max && bottom <= top) arcs.push(arc);
      }
    }
  };
  // The triangles above the integer semicircles, including their actual
  // infinite cusp rays. No finite truncation of infinity is needed.
  for (let n = Math.floor(min); n < Math.ceil(max); n++)
    add([1n, BigInt(n), 0n, 1n]);
  // Every visible interval contributes its child ideal triangle. The same
  // pixel/depth budget used by Farey geometry controls the refinement.
  for (const edge of edges) add(triangleMatrix(edge));
  return arcs;
}
