import { expect, it } from "vitest";
import { apply, I, reduce, type Matrix } from "../src/math/modular";
import { coverSheet } from "../src/math/modularTorus";
import { visibleFarey } from "../src/math/farey";
import { triangleMatrix } from "../src/renderers/modularGeometry";
import {
  domainSectors,
  modularDomainTiles,
  visibleTorusDomains,
} from "../src/renderers/torusDomains";

it("colors every transformed half-domain by the actual torus sheet, for all lifts", () => {
  const matrices: Matrix[] = [
    I,
    [1n, -3n, 0n, 1n],
    ...visibleFarey(-2, 2, 80).slice(0, 80).map(triangleMatrix),
  ];
  for (const matrix of matrices)
    for (let lift = 0; lift < 6; lift++) {
      const tiles = modularDomainTiles(matrix, 3, lift);
      expect(new Set(tiles.map((t) => t.sheet)).size).toBe(6);
      domainSectors.forEach(({ sample }, i) => {
        expect(tiles[i].sheet).toBe(
          coverSheet(reduce(apply(matrix, sample)).matrix, lift),
        );
      });
    }
});

it("clips infinite cusp rays and keeps small copies bounded and visible on zoom", () => {
  const rays = modularDomainTiles(I, 4)
    .flatMap((t) => t.boundaries)
    .filter((b) => b.kind === "line");
  expect(
    rays.some((b) => b.kind === "line" && (b.from.y === 4 || b.to.y === 4)),
  ).toBe(true);
  for (const alpha of [5 / 13, Math.SQRT2, -5 / 13])
    for (const scale of [150, 1500, 15000]) {
      const min = alpha - 400 / scale,
        max = alpha + 400 / scale;
      const tiles = visibleTorusDomains(
        visibleFarey(min, max, scale),
        min,
        max,
        scale,
        400,
      );
      expect(tiles.length).toBeGreaterThan(20);
      expect(tiles.length).toBeLessThan(14000);
      for (const t of tiles)
        for (const b of t.boundaries) {
          const values =
            b.kind === "line"
              ? [b.from.x, b.from.y, b.to.x, b.to.y]
              : [b.x, b.radius, b.from, b.to];
          expect(values.every(Number.isFinite)).toBe(true);
        }
    }
});
