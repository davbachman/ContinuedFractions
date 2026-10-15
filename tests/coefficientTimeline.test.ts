import { expect, it } from "vitest";
import { parseInput, approximate, terms } from "../src/math/continuedFraction";
import { derive } from "../src/math/trajectory";
import {
  coefficientAtTime,
  coefficientInterval,
} from "../src/math/coefficientTimeline";
import { coefficientTrace } from "../src/renderers/selectedRun";

it.each(["13/20", "53/20", "-27/20", "phi", "5/13", "sqrt2", "1/2", "3", "0"])(
  "covers a0 and a1 for %s without changing crossing labels or manufacturing flips",
  (input) => {
    const spec = parseInput(input),
      cf = terms(spec, 24),
      math = derive(spec, 12),
      crossings = math.farey.crossings;
    const snapshot = crossings.map((c) => ({ ...c }));
    expect(coefficientAtTime(crossings, 0)).toBe(0);
    const initial = coefficientInterval(crossings, 0, 12)!;
    expect(initial.start).toBe(0);
    expect(initial.end).toBe(crossings[0]?.time ?? 12);
    if (cf.length > 1) {
      const one = coefficientInterval(crossings, 1, 12)!;
      expect(one.start).toBe(initial.end);
      expect(one.end).toBeGreaterThan(one.start);
      expect(coefficientAtTime(crossings, one.start)).toBe(1);
      expect(coefficientAtTime(crossings, (one.start + one.end) / 2)).toBe(1);
      if (cf[1] === 1n)
        expect(crossings.filter((c) => c.term === 1)).toHaveLength(0);
      if (one.end < 12) expect(coefficientAtTime(crossings, one.end)).toBe(2);
      const timeSamples = [
        0,
        one.start - 1e-4,
        one.start,
        (one.start + one.end) / 2,
        one.end,
      ];
      expect(timeSamples.map((t) => coefficientAtTime(crossings, t))).toEqual(
        [...timeSamples]
          .reverse()
          .map((t) => coefficientAtTime(crossings, t))
          .reverse(),
      );
    }
    for (const term of [0, 1, 2]) {
      const interval = coefficientInterval(crossings, term, 12);
      const trace = coefficientTrace(
        math.quotient.segments,
        crossings,
        term,
        approximate(spec),
        12,
      );
      if (!interval) {
        expect(trace).toEqual([]);
        continue;
      }
      expect(trace[0].start).toBeCloseTo(interval.start, 8);
      expect(trace.at(-1)!.end).toBeCloseTo(interval.end, 8);
      expect(trace.every((s) => s.start < s.end)).toBe(true);
    }
    expect(crossings).toEqual(snapshot);
    if (crossings.length)
      expect(crossings[0]).toMatchObject({ term: 0, direction: "initial" });
  },
);
it("does not select a coefficient whose entry is beyond the display cutoff", () => {
  const math = derive(parseInput("13/20"), 0.5);
  expect(coefficientInterval(math.farey.crossings, 0, 0.5)).toEqual({
    start: 0,
    end: 0.5,
  });
  expect(coefficientInterval(math.farey.crossings, 1, 0.5)).toBeUndefined();
});
