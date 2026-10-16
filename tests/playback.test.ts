import { describe, expect, it } from "vitest";
import { advanceBounce } from "../src/math/playback";

describe("bouncing playback", () => {
  it("carries overshoot at both ends without changing speed", () => {
    expect(advanceBounce(9, 1, 3, 10)).toEqual({
      position: 8,
      direction: -1,
      boundary: 10,
    });
    expect(advanceBounce(1, -1, 3, 10)).toEqual({
      position: 2,
      direction: 1,
      boundary: 0,
    });
  });
  it("starts inward at either endpoint, including resume after a seek", () => {
    expect(advanceBounce(10, 1, 1, 10)).toEqual({ position: 9, direction: -1 });
    expect(advanceBounce(0, -1, 1, 10)).toEqual({ position: 1, direction: 1 });
  });
  it("repeats indefinitely and handles multiple turns in one update", () => {
    let at: { position: number; direction: 1 | -1 } = {
      position: 0,
      direction: 1,
    };
    for (let i = 0; i < 1000; i++) {
      at = advanceBounce(at.position, at.direction, 1, 10);
      expect(at.position).toBeGreaterThanOrEqual(0);
      expect(at.position).toBeLessThanOrEqual(10);
    }
    expect(at.position).toBe(0);
    expect(at.direction).toBe(1);
    expect(advanceBounce(0, 1, 47, 10).position).toBe(7);
  });
  it("handles empty playback ranges", () => {
    expect(advanceBounce(0, 1, 10, 0)).toEqual({ position: 0, direction: 1 });
  });
});
