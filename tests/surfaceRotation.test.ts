import { it, expect } from "vitest";
import { project3d, rollCameraPoint } from "../src/renderers/geometry";
import { surfaceProjection } from "../src/renderers/ModularTorus";
it("vertical rolling rotates height and depth together and reverses exactly", () => {
  const p = { x: 0.3, y: 0.4, depth: 0.8 };
  for (const angle of [-2, -0.5, 0, 0.7, Math.PI]) {
    const q = rollCameraPoint(p, angle),
      back = rollCameraPoint(q, -angle);
    expect(q.x).toBe(p.x);
    expect(q.y ** 2 + q.depth ** 2).toBeCloseTo(p.y ** 2 + p.depth ** 2, 12);
    expect(back.y).toBeCloseTo(p.y, 12);
    expect(back.depth).toBeCloseTo(p.depth, 12);
  }
  const front = rollCameraPoint({ x: 0, y: 0, depth: 1 }, -0.1);
  expect(front.y).toBeLessThan(0); // downward drag moves a front point down the screen
});
it("orbifold and torus projections roll both geometry and depth", () => {
  for (const project of [project3d, surfaceProjection]) {
    const first = project([0.5, 0.7, 0.2], -0.4, 0);
    const rolled = project([0.5, 0.7, 0.2], -0.4, -0.5);
    expect(rolled.x).toBe(first.x);
    expect(rolled.y).not.toBe(first.y);
    expect(rolled.depth).not.toBe(first.depth);
    expect(project([0.5, 0.7, 0.2], -0.4, 2 * Math.PI).y).toBeCloseTo(
      first.y,
      10,
    );
  }
});
