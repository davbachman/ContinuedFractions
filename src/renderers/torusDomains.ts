import {
  apply,
  reduce,
  multiply,
  inverse,
  matrixKey,
  type Matrix,
  type Point,
} from "../math/modular";
import { abelianization, coverSheet, mod6 } from "../math/modularTorus";
import { rational, value, type Rational } from "../math/rational";
import type { Edge } from "../math/farey";
import { idealImage, triangleMatrix } from "./modularGeometry";
import { stageColor } from "./dissectionColors";

export const torusDomainColor = (sheet: number) => stageColor(mod6(sheet));
type Vertex = Point | Rational;
type Support = readonly [Rational, Rational];
const zero = rational(0n),
  one = rational(1n),
  infinity = rational(1n, 0n);
const center = { x: 0.5, y: Math.sqrt(3) / 2 };
const left: Support = [rational(-1n), one];
const right: Support = [zero, rational(2n)];
const middle: Support = [rational(1n, 2n), infinity];

// A Farey triangle contains six half-domains. Halves on opposite sides of
// a Farey edge belong to the same full modular domain and receive the same color.
export const domainSectors = [
  {
    midpoint: { x: 0, y: 1 },
    cusp: infinity,
    supports: [left, [zero, infinity], middle],
    sample: { x: 0.25, y: 1.5 },
  },
  {
    midpoint: { x: 0, y: 1 },
    cusp: zero,
    supports: [left, [zero, infinity], right],
    sample: { x: 0.12, y: 0.65 },
  },
  {
    midpoint: { x: 0.5, y: 0.5 },
    cusp: zero,
    supports: [middle, [zero, one], right],
    sample: { x: 0.3, y: 0.6 },
  },
  {
    midpoint: { x: 0.5, y: 0.5 },
    cusp: one,
    supports: [middle, [zero, one], left],
    sample: { x: 0.7, y: 0.6 },
  },
  {
    midpoint: { x: 1, y: 1 },
    cusp: one,
    supports: [right, [one, infinity], left],
    sample: { x: 0.88, y: 0.65 },
  },
  {
    midpoint: { x: 1, y: 1 },
    cusp: infinity,
    supports: [right, [one, infinity], middle],
    sample: { x: 0.75, y: 1.5 },
  },
] satisfies {
  midpoint: Point;
  cusp: Rational;
  supports: Support[];
  sample: Point;
}[];
const sectorReductions = domainSectors.map(
  ({ sample }) => reduce(sample).matrix,
);
const sectorSheets = sectorReductions.map((matrix) => coverSheet(matrix));
export const domainSectorSheets = (matrix: Matrix, lift = 0) => {
  const chi = abelianization(matrix);
  return sectorSheets.map((sheet) => mod6(lift + chi + sheet));
};
export type DomainBoundary =
  | { kind: "line"; from: Point; to: Point }
  | { kind: "arc"; x: number; radius: number; from: number; to: number };
export const domainSectorKeys = (matrix: Matrix) =>
  sectorReductions.map((reduction) =>
    matrixKey(multiply(reduction, inverse(matrix))),
  );
export type DomainTile = {
  key: string;
  sheet: number;
  boundaries: DomainBoundary[];
};

export function modularDomainTiles(
  matrix: Matrix,
  top: number,
  lift = 0,
): DomainTile[] {
  const sheets = domainSectorSheets(matrix, lift);
  const keys = domainSectorKeys(matrix);
  const transformed = (v: Vertex): Point => {
    if ("x" in v) return apply(matrix, v);
    const r = idealImage(matrix, v);
    return r.q ? { x: value(r), y: 0 } : { x: 0, y: Infinity };
  };
  return domainSectors.map((sector, i) => {
    const vertices = [center, sector.midpoint, sector.cusp].map(transformed);
    return {
      // R maps the sample to F, so the transformed reduction is R M^-1.
      key: keys[i],
      sheet: sheets[i],
      boundaries: sector.supports.map((support, j): DomainBoundary => {
        const a = idealImage(matrix, support[0]),
          b = idealImage(matrix, support[1]);
        const from = vertices[j],
          to = vertices[(j + 1) % 3];
        if (!a.q || !b.q) {
          const x = value(a.q ? a : b);
          return {
            kind: "line",
            from: { x, y: Math.min(from.y, top) },
            to: { x, y: Math.min(to.y, top) },
          };
        }
        const delta = Number(b.p * a.q - a.p * b.q) / Number(a.q * b.q);
        const x = value(a) + delta / 2,
          radius = Math.abs(delta) / 2;
        return {
          kind: "arc",
          x,
          radius,
          from: Math.atan2(from.y, from.x - x),
          to: Math.atan2(to.y, to.x - x),
        };
      }),
    };
  });
}

export function visibleTorusDomains(
  edges: readonly Edge[],
  min: number,
  max: number,
  scale: number,
  height: number,
  lift = 0,
) {
  const tiles: DomainTile[] = [];
  const add = (m: Matrix) => {
    for (const tile of modularDomainTiles(m, height / scale, lift)) {
      const points = tile.boundaries.flatMap((b) =>
        b.kind === "line"
          ? [b.from, b.to]
          : [
              b.from,
              b.to,
              ...(Math.min(b.from, b.to) < Math.PI / 2 &&
              Math.max(b.from, b.to) > Math.PI / 2
                ? [Math.PI / 2]
                : []),
            ].map((t) => ({
              x: b.x + b.radius * Math.cos(t),
              y: b.radius * Math.sin(t),
            })),
      );
      const xs = points.map((p) => p.x),
        ys = points.map((p) => p.y);
      if (
        Math.max(...xs) < min ||
        Math.min(...xs) > max ||
        Math.min(...ys) > height / scale
      )
        continue;
      if (
        (Math.max(...xs) - Math.min(...xs)) * scale < 0.5 ||
        (Math.max(...ys) - Math.min(...ys)) * scale < 0.5
      )
        continue;
      tiles.push(tile);
    }
  };
  for (let n = Math.floor(min); n < Math.ceil(max); n++)
    add([1n, BigInt(n), 0n, 1n]);
  for (const edge of edges) add(triangleMatrix(edge));
  return tiles;
}
