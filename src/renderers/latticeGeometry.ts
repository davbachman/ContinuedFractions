import { flipDetails, type Triangulation } from "../math/triangulation";
import { ratioNumber } from "../math/approximations";

/** Exact unimodular fundamental domain, projected by translation and uniform scale only. */
export function latticeGeometry(tri: Triangulation) {
  const { quad, triangles } = flipDetails(tri, 2);
  const u = quad[1],
    v = quad[3];
  const abs = (n: bigint) => (n < 0n ? -n : n);
  const width = abs(u.x) + abs(v.x),
    height = abs(u.y) + abs(v.y);
  const span = width > height ? width : height;
  // Show neighboring cells at the start; zoom out once the domain grows.
  const extent = span <= 2n ? 120 * Number(span) : 260;
  const scale = ratioNumber(BigInt(extent), span);
  const project = (p: { x: bigint; y: bigint }) => ({
    x: 190 + (extent / 2) * ratioNumber(2n * p.x - u.x - v.x, span),
    y: 175 - (extent / 2) * ratioNumber(2n * p.y - u.y - v.y, span),
  });
  const cells = [];
  // A bounded neighborhood of exact translates. No approximate lattice vectors.
  for (let i = -4; i <= 4; i++)
    for (let j = -4; j <= 4; j++) {
      const translate = (p: { x: bigint; y: bigint }) =>
        project({
          x: p.x + BigInt(i) * u.x + BigInt(j) * v.x,
          y: p.y + BigInt(i) * u.y + BigInt(j) * v.y,
        });
      cells.push({
        i,
        j,
        central: i === 0 && j === 0,
        quad: quad.map(translate),
        faces: triangles.map((t) => t.map(translate)),
      });
    }
  return {
    u,
    v,
    quad,
    span,
    scale,
    project,
    cells,
    // At this scale adjacent parallel edges are less than a pixel apart.
    dense: span > 16n,
  };
}

/** Infinite triangulation edges form three straight line families in the cover.
 * Enumerate the lines that intersect the viewport; omit subpixel families rather
 * than sample false edge locations. The highlighted exact cell is never omitted.
 */
export function latticeLines(tri: Triangulation) {
  const g = latticeGeometry(tri),
    origin = g.project({ x: 0n, y: 0n });
  const scale = g.scale;
  const corners = [
    { x: 10, y: 10 },
    { x: 370, y: 10 },
    { x: 370, y: 325 },
    { x: 10, y: 325 },
  ];
  let limited = false;
  const lines = tri.flatMap((r, edge) => {
    const length = Math.hypot(ratioNumber(r.p, 1n), ratioNumber(r.q, 1n));
    const spacing = scale / length;
    if (spacing < 2) {
      limited = true;
      return [];
    }
    const n = {
      x: ratioNumber(r.p, 1n) / length,
      y: ratioNumber(r.q, 1n) / length,
    };
    const offsets = corners.map(
      (c) => (n.x * (c.x - origin.x) + n.y * (c.y - origin.y)) / spacing,
    );
    const start = Math.ceil(Math.min(...offsets)),
      end = Math.floor(Math.max(...offsets));
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => {
      const k = start + i,
        base = {
          x: origin.x + n.x * k * spacing,
          y: origin.y + n.y * k * spacing,
        };
      return {
        edge,
        from: { x: base.x - 700 * n.y, y: base.y + 700 * n.x },
        to: { x: base.x + 700 * n.y, y: base.y - 700 * n.x },
      };
    });
  });
  return { lines, limited };
}
