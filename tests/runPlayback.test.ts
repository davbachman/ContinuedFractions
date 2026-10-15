import { it, expect } from "vitest";
import { parseInput } from "../src/math/continuedFraction";
import { coefficientStages, stageFrame } from "../src/math/runPlayback";
import {
  targetItinerary,
  MAX_FLIPS,
  validateTriangulationState,
} from "../src/math/triangulation";

it.each(["13/5", "5/13", "3", "1/2", "phi", "sqrt2"])(
  "groups %s without inventing or losing crossings",
  (input) => {
    const spec = parseInput(input),
      itinerary = targetItinerary(spec);
    const stages = coefficientStages(spec, itinerary);
    expect(stages.flatMap((s) => s.times)).toEqual(
      itinerary.steps.map((s) => s.time),
    );
    stages.forEach((s, i) => {
      expect(stageFrame(s, 0).time).toBe(
        i ? stageFrame(stages[i - 1], 1).time : 0,
      );
      expect(stageFrame(s, 1).completed).toBe(s.times.length);
      for (let k = 0; k <= 20; k++) {
        const forward = stageFrame(s, k / 20),
          reverse = stageFrame(s, 1 - (20 - k) / 20);
        expect(reverse.time).toBeCloseTo(forward.time, 10);
        expect(forward.time).toBeGreaterThanOrEqual(s.start);
        expect(forward.time).toBeLessThanOrEqual(s.times.at(-1) ?? s.start);
      }
    });
    if (spec.kind === "periodic") expect(stages.at(-1)?.complete).toBe(false);
    else expect(stages.every((s) => s.complete)).toBe(true);
  },
);

it("keeps zero coefficients, zero runs, initial entry and terminal offsets distinct", () => {
  const stages = (input: string) => {
    const s = parseInput(input);
    return coefficientStages(s, targetItinerary(s));
  };
  expect(stages("5/13").map((s) => s.expected)).toEqual([1n, 1n, 1n, 1n, 1n]);
  const half = stages("1/2");
  expect(half.map((s) => s.coefficient)).toEqual([0n, 2n]);
  expect(half.map((s) => s.expected)).toEqual([1n, 0n]);
  expect(stageFrame(half[1], 0).time).toBe(stageFrame(half[1], 1).time);
  expect(stages("3")[0].times).toEqual([]);
  expect(stages("phi")[1].expected).toBe(0n);
});

it("stops incomplete large runs at the exact rendering budget and never skips to later stages", () => {
  const spec = parseInput("1/10000"),
    itinerary = targetItinerary(spec, 24);
  validateTriangulationState(itinerary);
  expect(itinerary.steps.length).toBe(MAX_FLIPS);
  const stages = coefficientStages(spec, itinerary);
  expect(stages).toHaveLength(2);
  expect(stages[1].expected).toBe(9998n);
  expect(stages[1].complete).toBe(false);
  expect(stageFrame(stages[1], 1).completed).toBe(MAX_FLIPS - 1);
});

it("has no linked rectangle timeline for zero, negatives or infinity", () => {
  for (const input of ["0", "-5/13", "infinity"]) {
    const spec = parseInput(input);
    expect(coefficientStages(spec, targetItinerary(spec))).toEqual([]);
  }
});
