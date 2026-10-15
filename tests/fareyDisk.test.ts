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
import { apply } from "../src/math/modular";
import {
  diskProjection,
  mappedDiskPoint,
  diskNeighborhood,
  diskTrianglePath,
  DISK_TRIANGLE_LIMIT,
} from "../src/renderers/fareyDisk";

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
  it("maps triangle centers consistently with their H² group action", () => {
    const state = targetItinerary(parseInput("13/5"));
    for (const tri of [
      INITIAL_TRIANGLE,
      flip(INITIAL_TRIANGLE, 2),
      ...triangulationPath(state),
    ]) {
      const matrix = triangulationMatrix(tri);
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

import { diskFordCircle, diskWorldPoint } from "../src/renderers/fareyDisk";
import { diskDomains } from "../src/renderers/diskDomains";
it("Ford horocycles map to circles tangent to the disk and preserve Farey tangencies", () => {
  for (const camera of [
    { x: rational(0n), y: 1 },
    { x: rational(5n, 13n), y: 0.003 },
  ]) {
    const rs = [rational(0n), rational(1n), rational(1n, 0n), rational(1n, 2n)];
    for (const r of rs) {
      const c = diskFordCircle(r, camera);
      expect(Math.hypot(c.x, c.y) + c.radius).toBeCloseTo(1, 12);
      if (r.q)
        for (const a of [0.2, 1, 2, 3, 5]) {
          const radius = 1 / (2 * Number(r.q) ** 2);
          // Sample finite world points on the original Ford circle.
          const x = value(r) + radius * Math.cos(a);
          const p = diskProjection(camera).point({
            x: rational(BigInt(Math.round(x * 1e12)), 10n ** 12n),
            y: radius * (1 + Math.sin(a)),
          });
          expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeCloseTo(c.radius, 7);
        }
    }
    for (const [a, b] of [
      [rs[0], rs[1]],
      [rs[0], rs[2]],
      [rs[0], rs[3]],
    ]) {
      const c = diskFordCircle(a, camera),
        d = diskFordCircle(b, camera);
      expect(Math.hypot(c.x - d.x, c.y - d.y)).toBeCloseTo(
        c.radius + d.radius,
        10,
      );
    }
  }
});
it("projects the six modular half-domains with three S and three T seam pieces per Farey triangle", () => {
  for (const tri of triangulationPath(targetItinerary(parseInput("5/13")))) {
    const ds = diskDomains(tri, { x: rational(5n, 13n), y: 0.1 });
    expect(ds).toHaveLength(6);
    expect(ds.filter((d) => d.s)).toHaveLength(3);
    expect(ds.filter((d) => d.t)).toHaveLength(3);
    expect(
      ds.every((d) => !/NaN|Infinity/.test(d.fill + (d.s ?? "") + (d.t ?? ""))),
    ).toBe(true);
  }
});
it("inverts disk camera coordinates without losing tiny cusp offsets", () => {
  for (const camera of [
    { x: rational(2n), y: 3 },
    { x: rational(5n, 13n), y: 1e-20 },
  ]) {
    for (const p of [
      { x: 0, y: 0 },
      { x: 0.3, y: 0.4 },
      { x: -0.8, y: 0.1 },
    ]) {
      const result = diskProjection(camera).point(diskWorldPoint(camera, p));
      expect(result.x).toBeCloseTo(p.x, 12);
      expect(result.y).toBeCloseTo(p.y, 12);
    }
  }
});

import { diskCameraTriangle } from "../src/renderers/fareyDisk";
it("seeds the tessellation at a freely panned camera, far from the target", () => {
  for (const camera of [
    { x: rational(1000000000000000000000000n), y: 1 },
    { x: rational(-777n, 47n), y: 1e-9 },
  ]) {
    const seed = diskCameraTriangle(camera),
      view = diskNeighborhood([seed], camera);
    expect(view.triangles.length).toBeGreaterThan(20);
    expect(diskTrianglePath(seed, camera)).not.toMatch(/NaN|Infinity/);
  }
});
