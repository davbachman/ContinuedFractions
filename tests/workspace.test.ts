import { expect, it } from "vitest";
import { isRepresentation } from "../src/workspace";
import {
  canonicalTwistCoefficients,
  expressionFor,
  tangleFraction,
} from "../src/math/tangles";
import { rational } from "../src/math/rational";
import { toCF } from "../src/math/continuedFraction";
import { parseInput } from "../src/math/continuedFraction";
import { derive } from "../src/math/trajectory";
import { coefficientTrace } from "../src/renderers/selectedRun";
it("rejects removed and invalid representations", () => {
  for (const removed of [
    "closure",
    "intervals",
    "lattice",
    "errors",
    "matrices",
    "pillowcase",
  ])
    expect(isRepresentation(removed)).toBe(false);
  expect(isRepresentation("__proto__")).toBe(false);
});
it("clips selected coefficient runs into separate modular charts without changing playback time", () => {
  const math = derive(parseInput("5/13"), 12);
  const initial = coefficientTrace(
    math.quotient.segments,
    math.farey.crossings,
    0,
    5 / 13,
    12,
  );
  expect(initial[0].start).toBe(0);
  expect(initial.at(-1)!.end).toBeCloseTo(math.farey.crossings[0].time, 9);
  const parts = coefficientTrace(
    math.quotient.segments,
    math.farey.crossings,
    2,
    5 / 13,
    12,
  );
  const first = math.farey.crossings.find((e) => e.term === 2)!;
  const next = math.farey.crossings.find(
    (e) => e.time > first.time && e.term !== 2,
  )!;
  expect(parts.length).toBeGreaterThan(0);
  expect(parts[0].start).toBeCloseTo(first.time, 9);
  expect(parts.at(-1)!.end).toBeCloseTo(next.time, 9);
  for (const part of parts) {
    expect(part.points[0].time).toBe(part.start);
    expect(part.points.at(-1)!.time).toBe(part.end);
    expect(
      part.points.every((p) => p.time >= part.start && p.time <= part.end),
    ).toBe(true);
    expect(
      math.quotient.segments.some(
        (s) =>
          s.matrix === part.matrix &&
          part.start >= s.start &&
          part.end <= s.end,
      ),
    ).toBe(true);
  }
});
it("maps canonical signed twist regions to regular coefficients and refuses custom words", () => {
  for (const r of [
    rational(13n, 5n),
    rational(5n, 13n),
    rational(-3n, 7n),
    rational(0n),
    rational(3n),
  ]) {
    const ops = expressionFor(r),
      cf = toCF(r),
      mapping = canonicalTwistCoefficients(ops, r)!;
    for (const [region, index] of mapping) {
      const op = ops[region];
      expect(op.kind === "twist" && op.count).toBe(
        cf[index] * (index % 2 ? -1n : 1n),
      );
    }
    const custom = [
      ...ops,
      { kind: "twist" as const, count: 1n },
      { kind: "twist" as const, count: -1n },
    ];
    expect(tangleFraction(custom)).toEqual(r);
    expect(canonicalTwistCoefficients(custom, r)).toBeNull();
  }
  expect(
    canonicalTwistCoefficients(
      expressionFor(rational(1n, 0n)),
      rational(1n, 0n),
    ),
  ).toBeNull();
});
