import { describe, it, expect } from "vitest";
import { rational, value } from "../src/math/rational";
import { fromCF, parseInput, terms } from "../src/math/continuedFraction";
import { heightAt } from "../src/math/trajectory";
import {
  INITIAL_TRIANGLE,
  targetItinerary,
  triangulationPath,
  triangulationMatrix,
  flip,
} from "../src/math/triangulation";
import { apply, reduce } from "../src/math/modular";
import { coverSheet } from "../src/math/modularTorus";
import {
  diskProjection,
  mappedDiskPoint,
  diskDomainSectors,
  diskNeighborhood,
  diskTrianglePath,
  DISK_TRIANGLE_LIMIT,
} from "../src/renderers/fareyDisk";
import {
  domainSectors,
  modularDomainTiles,
} from "../src/renderers/torusDomains";

describe("continuous Poincaré disk", () => {
  it("centers the H² point and preserves hyperbolic distance, with continuous forward/reverse projection", () => {
    const alpha = rational(5n, 13n),
      z = { x: rational(2n, 7n), y: 0.6 };
    for (const time of [0, 0.4, 1, 2, 3, 6, 12, 24]) {
      const camera = { x: alpha, y: heightAt(time) },
        project = diskProjection(camera);
      expect(Math.hypot(...Object.values(project.point(camera)))).toBe(0);
      expect(project.vertex(alpha).x).toBe(-1);
      expect(project.vertex(alpha).y).toBeCloseTo(0);
      expect(project.vertex(rational(1n, 0n))).toEqual({ x: 1, y: 0 });
      const w = project.point(z),
        norm = w.x * w.x + w.y * w.y;
      if (time < 12)
        expect((1 + norm) / (1 - norm)).toBeCloseTo(
          1 +
            ((value(z.x) - value(alpha)) ** 2 + (z.y - camera.y) ** 2) /
              (2 * z.y * camera.y),
          6,
        );
      const before = diskProjection({
        ...camera,
        y: heightAt(time - 1e-6),
      }).vertex(rational(1n, 3n));
      const after = diskProjection({
        ...camera,
        y: heightAt(time + 1e-6),
      }).vertex(rational(1n, 3n));
      expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(
        3e-6,
      );
      expect(diskProjection(camera).point(z)).toEqual(w);
    }
  });
  it("subtracts exact rational centers before projection at tiny scales", () => {
    const n = 10n ** 100n,
      alpha = rational(n + 1n, n);
    const w = diskProjection({ x: alpha, y: 1e-100 }).vertex(
      rational(n + 2n, n),
    );
    expect(w.x).toBeCloseTo(0, 12);
    expect(w.y).toBeCloseTo(-1, 12);
  });
  it("matches every H² domain color, including all six cover lifts and adjacent triangles", () => {
    const state = targetItinerary(parseInput("13/5"));
    for (const tri of [
      INITIAL_TRIANGLE,
      flip(INITIAL_TRIANGLE, 2),
      ...triangulationPath(state),
    ]) {
      const matrix = triangulationMatrix(tri),
        camera = { x: rational(13n, 5n), y: 0.4 };
      for (let lift = 0; lift < 6; lift++) {
        const disk = diskDomainSectors(tri, camera, lift),
          plane = modularDomainTiles(matrix, 100, lift);
        expect(disk.map((s) => s.sheet)).toEqual(plane.map((s) => s.sheet));
        disk.forEach((s, i) => {
          expect(s.sheet).toBe(
            coverSheet(
              reduce(apply(matrix, domainSectors[i].sample)).matrix,
              lift,
            ),
          );
          expect(s.d).not.toMatch(/NaN|Infinity/);
        });
      }
      const sample = mappedDiskPoint(
        matrix,
        rational(1n, 2n),
        rational(3n, 4n),
      );
      const expected = apply(matrix, { x: 0.5, y: Math.sqrt(3) / 2 });
      expect(value(sample.x)).toBeCloseTo(expected.x, 12);
      expect(sample.y).toBeCloseTo(expected.y, 12);
    }
  });
  it("bounds tessellation detail without changing exact triangles at rational cusps, integers, or deep irrational times", () => {
    for (const input of ["5/13", "-13/5", "2", "sqrt2", "phi"]) {
      const spec = parseInput(input),
        state = targetItinerary(spec, 24),
        path = triangulationPath(state);
      const alpha =
        spec.kind === "rational" ? spec.value : fromCF(terms(spec, 128));
      for (const time of [0, 2, 12, 24]) {
        const cursor = state.steps.filter((s) => s.time! <= time).length,
          tri = path[cursor];
        const camera = { x: alpha, y: heightAt(time) },
          original = tri.map((r) => `${r.p}/${r.q}`);
        const view = diskNeighborhood([tri], camera);
        expect(view.triangles.length).toBeGreaterThan(3);
        expect(view.triangles.length).toBeLessThanOrEqual(DISK_TRIANGLE_LIMIT);
        for (const t of view.triangles)
          expect(diskTrianglePath(t, camera)).not.toMatch(/NaN|Infinity/);
        expect(tri.map((r) => `${r.p}/${r.q}`)).toEqual(original);
      }
    }
  });
});
