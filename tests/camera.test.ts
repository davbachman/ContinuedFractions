import { describe, it, expect } from "vitest";
import {
  automaticZoom,
  cameraScale,
  endpointAtPointer,
} from "../src/renderers/camera";
import { heightAt } from "../src/math/trajectory";
import { value } from "../src/math/rational";
import { initialScene, deserialize, serialize } from "../src/state";

describe("slow-descent camera", () => {
  it("magnifies while leaving a slow, strictly descending trajectory throughout the display horizon", () => {
    let previous = Infinity;
    for (let t = 0; t <= 24; t += 0.25) {
      const distance = heightAt(t) * cameraScale(430, 1, t, true, 5 / 13);
      expect(distance).toBeLessThan(previous);
      previous = distance;
      expect(
        distance / (heightAt(0) * cameraScale(430, 1, 0, true, 5 / 13)),
      ).toBeCloseTo(Math.exp(-0.08 * t), 10);
    }
    expect(automaticZoom(1)).toBeGreaterThan(1);
  });
  it("supports fixed zoom and bounds floating point resolution at large endpoints", () => {
    expect(cameraScale(430, 1, 0, false, 0)).toBe(
      cameraScale(430, 1, 24, false, 0),
    );
    const scale = cameraScale(430, 10000, 24, true, 10000);
    expect(10000 + 1 / scale).toBeGreaterThan(10000);
  });
  it("snaps nearby simple fractions but preserves movement under deep zoom", () => {
    expect(value(endpointAtPointer(0.50001, 150))).toBe(0.5);
    const x = 5 / 13 + 40 / 1e8;
    expect(Math.abs(value(endpointAtPointer(x, 1e8)) - x) * 1e8).toBeLessThan(
      0.1,
    );
  });
  it("migrates old scenes to automatic zoom, while preserving new explicit fixed-camera choices", () => {
    const v1 = JSON.parse(serialize({ ...initialScene, follow: false }));
    v1.version = 1;
    expect(deserialize(JSON.stringify(v1)).follow).toBe(true);
    expect(
      deserialize(serialize({ ...initialScene, follow: false })).follow,
    ).toBe(false);
  });
});
