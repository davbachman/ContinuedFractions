import type { MouseEvent } from "react";
export type SurfacePoint = { x: number; y: number; depth: number };
export type SurfaceFace = { points: SurfacePoint[]; color: string };
export type SurfaceLine = {
  points: SurfacePoint[];
  color: string;
  width: number;
  side?: "T" | "S";
  onSelect?: (event: MouseEvent<SVGPathElement>) => void;
  trail?: boolean;
  selectedRun?: number;
};
const path = (points: SurfacePoint[]) =>
  points
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)},${p.y.toFixed(3)}`)
    .join(" ");
function shade(face: SurfaceFace) {
  const [a, b, c] = face.points;
  const u = [(b.x - a.x) / 100, (b.y - a.y) / 100, b.depth - a.depth],
    v = [(c.x - a.x) / 100, (c.y - a.y) / 100, c.depth - a.depth];
  const n = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const norm = Math.hypot(...n) || 1;
  const light =
    0.72 + 0.28 * Math.abs((0.3 * n[0] - 0.4 * n[1] + 0.866 * n[2]) / norm);
  return `rgb(${[1, 3, 5].map((i) => Math.round(parseInt(face.color.slice(i, i + 2), 16) * light)).join(",")})`;
}
/** A filled surface layer with a projected depth test for its curves.
 * Group opacity avoids repeatedly attenuating the back trail through mesh cells.
 */
export function TranslucentSurface({
  faces,
  lines,
}: {
  faces: SurfaceFace[];
  lines: SurfaceLine[];
}) {
  const sorted = faces
    .map((face) => ({
      face,
      depth: face.points.reduce((n, p) => n + p.depth, 0) / face.points.length,
    }))
    .sort((a, b) => a.depth - b.depth);
  const buckets = new Map<string, SurfacePoint[][]>();
  for (const { points } of faces) {
    for (let i = 1; i < points.length - 1; i++) {
      const tri = [points[0], points[i], points[i + 1]],
        xs = tri.map((p) => p.x),
        ys = tri.map((p) => p.y);
      for (
        let x = Math.floor(Math.min(...xs) / 24);
        x <= Math.floor(Math.max(...xs) / 24);
        x++
      )
        for (
          let y = Math.floor(Math.min(...ys) / 24);
          y <= Math.floor(Math.max(...ys) / 24);
          y++
        ) {
          const key = `${x},${y}`;
          const bucket = buckets.get(key) ?? [];
          bucket.push(tri);
          buckets.set(key, bucket);
        }
    }
  }
  const front = (p: SurfacePoint) => {
    let depth = -Infinity;
    for (const [a, b, c] of buckets.get(
      `${Math.floor(p.x / 24)},${Math.floor(p.y / 24)}`,
    ) ?? []) {
      const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(det) < 1e-8) continue;
      const u = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / det;
      const v = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / det,
        w = 1 - u - v;
      if (Math.min(u, v, w) >= -1e-5)
        depth = Math.max(depth, u * a.depth + v * b.depth + w * c.depth);
    }
    return p.depth >= depth - 0.025;
  };
  const fragments = lines.flatMap((line, i) =>
    line.points.slice(1).flatMap((b, j) => {
      const a = line.points[j],
        steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
      return Array.from({ length: steps }, (_, k) => {
        const at = (t: number) => ({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          depth: a.depth + (b.depth - a.depth) * t,
        });
        const p = at(k / steps),
          q = at((k + 1) / steps);
        return {
          front: front(at((k + 0.5) / steps)),
          key: `${i}-${j}-${k}`,
          line,
          points: [p, q],
        };
      });
    }),
  );
  const curves = (foreground: boolean) =>
    fragments
      .filter((f) => f.front === foreground)
      .map((f) => (
        <path
          key={f.key}
          data-domain-side={f.line.side}
          data-surface-trail={f.line.trail || undefined}
          data-selected-run={f.line.selectedRun}
          data-surface-front={foreground}
          d={path(f.points)}
          fill="none"
          stroke={f.line.color}
          strokeWidth={f.line.width}
          strokeLinecap="round"
          onClick={f.line.onSelect}
        />
      ));
  return (
    <g data-translucent-surface="true">
      {curves(false)}
      <g opacity={0.78} data-surface-fill="true" pointerEvents="none">
        {sorted.map(({ face }, i) => {
          const color = shade(face);
          return (
            <path
              key={i}
              data-surface-face="true"
              d={path(face.points) + "Z"}
              fill={color}
              stroke={color}
              strokeWidth={0.45}
              strokeLinejoin="round"
            />
          );
        })}
      </g>
      {curves(true)}
    </g>
  );
}
