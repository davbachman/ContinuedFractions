import { type Point } from "../math/modular";
// The base circle is folded by u ~ 1-u; vertical sides identify u=0 and u=1.
// This gives a punctured sphere with labeled branch points, not an isometry.
export function schematicPoint(p: Point): [number, number, number] {
  const u = p.x + 0.5,
    base = Math.sqrt(Math.max(0.75, 1 - p.x * p.x));
  const v = Math.max(0, Math.log(p.y / base)),
    h = v / (1 + v),
    theta = 2 * Math.PI * u;
  return [
    (1 - h) * Math.cos(theta),
    (1 - h) * Math.sin(theta) * Math.sqrt(h),
    2 * h - 0.65,
  ];
}
export function project3d(
  p: readonly number[],
  rotation: number,
): Point & { depth: number } {
  const [x, y, z] = p,
    cos = Math.cos(rotation),
    sin = Math.sin(rotation),
    xx = x * cos - y * sin,
    yy = x * sin + y * cos;
  return { x: xx, y: z * 0.88 - yy * 0.45, depth: yy * 0.88 + z * 0.45 };
}
