import { type Matrix, type Point } from "../math/modular";
import { rational, subtract, label, type Rational } from "../math/rational";
import { ratioNumber } from "../math/approximations";
import {
  flip,
  triangulationMatrix,
  type Triangulation,
} from "../math/triangulation";
import { idealImage } from "./modularGeometry";
import { domainSectors, domainSectorSheets } from "./torusDomains";

export type DiskCamera = { x: Rational; y: number };
const num = (r: Rational) => ratioNumber(r.p, r.q);
const half = rational(1n, 2n);
// Keep the horizontal coordinate exact until subtracting the camera center.
// This avoids losing tiny domains near a deep rational convergent.
export function mappedDiskPoint(
  m: Matrix,
  x: Rational,
  ySquared: Rational,
): DiskCamera {
  const [a, b, c, d] = m,
    u = a * x.p + b * x.q,
    v = c * x.p + d * x.q;
  const den = v * v * ySquared.q + c * c * ySquared.p * x.q * x.q;
  return {
    x: rational(u * v * ySquared.q + a * c * ySquared.p * x.q * x.q, den),
    y: ratioNumber(x.q * x.q * ySquared.q, den) * Math.sqrt(num(ySquared)),
  };
}
const keys = new WeakMap<Triangulation, string>();
const key = (tri: Triangulation) => {
  let id = keys.get(tri);
  if (!id) {
    id = tri.map(label).sort().join("|");
    keys.set(tri, id);
  }
  return id;
};
function makeGeometry(tri: Triangulation) {
  const matrix = triangulationMatrix(tri),
    sheets = domainSectorSheets(matrix);
  return {
    center: mappedDiskPoint(matrix, half, rational(3n, 4n)),
    neighbors: [0, 1, 2].map((i) => flip(tri, i)),
    sectors: domainSectors.map((s, i) => ({
      sheet: sheets[i],
      midpoint: mappedDiskPoint(
        matrix,
        rational(BigInt(s.midpoint.x * 2), 2n),
        rational(BigInt(s.midpoint.y * s.midpoint.y * 4), 4n),
      ),
      cusp: idealImage(matrix, s.cusp),
    })),
  };
}
// Cache exact world geometry, not camera projections. Keep playback work and
// memory bounded even when the itinerary and moving camera visit many cells.
const geometry = new Map<string, ReturnType<typeof makeGeometry>>();
function cellGeometry(tri: Triangulation) {
  const id = tri.map(label).join("|");
  let cell = geometry.get(id);
  if (!cell) {
    cell = makeGeometry(tri);
    if (geometry.size >= 2048) geometry.delete(geometry.keys().next().value!);
    geometry.set(id, cell);
  }
  return cell;
}
export const triangleCenter = (tri: Triangulation) => cellGeometry(tri).center;

// Cayley((z-camera.x)/camera.y). Screen y is minus the imaginary part.
// The camera point maps to 0, infinity to (1,0), and camera.x to (-1,0).
export function diskProjection(camera: DiskCamera) {
  const point = (z: DiskCamera): Point => {
    const dx = num(subtract(z.x, camera.x)),
      dy = z.y,
      h = camera.y;
    const scale = Math.max(Math.abs(dx), dy, h);
    const x = dx / scale,
      y = dy / scale,
      k = h / scale;
    const den = x * x + (y + k) * (y + k);
    return { x: (x * x + y * y - k * k) / den, y: (-2 * x * k) / den };
  };
  const vertex = (r: Rational): Point =>
    r.q ? point({ x: r, y: 0 }) : { x: 1, y: 0 };
  return {
    point,
    vertex,
    center: (tri: Triangulation) => point(triangleCenter(tri)),
  };
}

/** Orthogonal-circle geodesic, also valid when either endpoint is interior. */
export function diskGeodesic(a: Point, b: Point) {
  const cross = a.x * b.y - a.y * b.x;
  if (Math.abs(cross) < 1e-8) return `L${b.x} ${b.y}`;
  const u = (1 + a.x * a.x + a.y * a.y) / 2,
    v = (1 + b.x * b.x + b.y * b.y) / 2;
  const c = { x: (u * b.y - v * a.y) / cross, y: (a.x * v - b.x * u) / cross };
  const radius = Math.hypot(a.x - c.x, a.y - c.y);
  const angle = Math.atan2(a.y - c.y, a.x - c.x),
    end = Math.atan2(b.y - c.y, b.x - c.x);
  const delta = Math.atan2(Math.sin(end - angle), Math.cos(end - angle));
  return `A${radius} ${radius} 0 0 ${delta > 0 ? 1 : 0} ${b.x} ${b.y}`;
}
export function diskPolygon(points: Point[]) {
  return (
    `M${points[0].x} ${points[0].y}` +
    points
      .map((p, i) => diskGeodesic(p, points[(i + 1) % points.length]))
      .join("") +
    "Z"
  );
}
export const diskTrianglePath = (tri: Triangulation, camera: DiskCamera) =>
  diskPolygon(tri.map(diskProjection(camera).vertex));

export function diskDomainSectors(
  tri: Triangulation,
  camera: DiskCamera,
  lift = 0,
) {
  const cell = cellGeometry(tri),
    projection = diskProjection(camera);
  const center = projection.point(cell.center);
  return cell.sectors.map((s) => ({
    sheet: (((s.sheet + lift) % 6) + 6) % 6,
    d: diskPolygon([
      center,
      projection.point(s.midpoint),
      projection.vertex(s.cusp),
    ]),
  }));
}
export const DISK_TRIANGLE_LIMIT = 180;
// Adaptive neighborhood in the dual tree. Tiny boundary triangles do not expand.
export function diskNeighborhood(
  seeds: readonly Triangulation[],
  camera: DiskCamera,
) {
  const projection = diskProjection(camera),
    queue = [...seeds],
    seen = new Set<string>();
  const triangles: Triangulation[] = [];
  let limited = false;
  for (let i = 0; i < queue.length; i++) {
    const tri = queue[i],
      id = key(tri);
    if (seen.has(id)) continue;
    seen.add(id);
    const vertices = tri.map(projection.vertex);
    const size = Math.max(
      ...vertices.map((p, j) =>
        Math.hypot(
          p.x - vertices[(j + 1) % 3].x,
          p.y - vertices[(j + 1) % 3].y,
        ),
      ),
    );
    if (size < 0.035 && i >= seeds.length) continue;
    if (triangles.length >= DISK_TRIANGLE_LIMIT) {
      limited = true;
      break;
    }
    triangles.push(tri);
    queue.push(...cellGeometry(tri).neighbors);
  }
  return { triangles, limited };
}
