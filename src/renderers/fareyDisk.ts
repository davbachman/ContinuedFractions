import {
  reduce,
  inverse,
  multiply,
  type Matrix,
  type Point,
} from "../math/modular";
import {
  rational,
  subtract,
  floor,
  label,
  type Rational,
} from "../math/rational";
import { ratioNumber } from "../math/approximations";
import {
  flip,
  triangulationMatrix,
  type Triangulation,
} from "../math/triangulation";

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
  const matrix = triangulationMatrix(tri);
  return {
    center: mappedDiskPoint(matrix, half, rational(3n, 4n)),
    neighbors: [0, 1, 2].map((i) => flip(tri, i)),
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

/** Cayley image of the standard Ford horocycle, including y=1 at infinity. */
export function diskFordCircle(r: Rational, camera: DiskCamera) {
  const contact = diskProjection(camera).vertex(r);
  const h = camera.y;
  const dxq = ratioNumber(r.p * camera.x.q - camera.x.p * r.q, camera.x.q);
  const a = dxq / Math.sqrt(h),
    b = ratioNumber(r.q, 1n) * Math.sqrt(h);
  const radius = r.q ? 1 / (1 + a * a + b * b) : h / (1 + h);
  return { x: (1 - radius) * contact.x, y: (1 - radius) * contact.y, radius };
}

export function diskWorldPoint(camera: DiskCamera, point: Point): DiskCamera {
  const den = (1 - point.x) ** 2 + point.y ** 2;
  const dx = (-2 * camera.y * point.y) / den;
  // Preserve small camera offsets even deep in a cusp (fixed decimal rounding would erase them).
  const [mantissa, exponent] = dx.toExponential(16).split("e");
  const power = Number(exponent) - 16;
  const numerator = BigInt(mantissa.replace(".", ""));
  const offset =
    power >= 0
      ? rational(numerator * 10n ** BigInt(power))
      : rational(numerator, 10n ** BigInt(-power));
  return {
    x: rational(
      camera.x.p * offset.q + offset.p * camera.x.q,
      camera.x.q * offset.q,
    ),
    y: (camera.y * (1 - point.x ** 2 - point.y ** 2)) / den,
  };
}

/** Find a local seed when a free camera moves away from the selected trajectory. */
export function diskCameraTriangle(camera: DiskCamera): Triangulation {
  const n = floor(camera.x),
    local = subtract(camera.x, rational(n));
  const chart = reduce({ x: num(local), y: camera.y });
  const m = multiply([1n, n, 0n, 1n], inverse(chart.matrix));
  const rs =
    chart.point.x >= 0
      ? [rational(0n), rational(1n, 0n), rational(1n)]
      : [rational(-1n), rational(1n, 0n), rational(0n)];
  return rs.map((r) =>
    rational(m[0] * r.p + m[1] * r.q, m[2] * r.p + m[3] * r.q),
  ) as unknown as Triangulation;
}
