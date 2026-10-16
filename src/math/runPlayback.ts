import { terms, type NumberSpec } from "./continuedFraction";
import {
  coefficientFlipRun,
  MAX_FLIPS,
  type TriangulationState,
} from "./triangulation";
import { coefficientInterval } from "./coefficientTimeline";

export type CoefficientStage = {
  term: number;
  coefficient: bigint;
  expected: bigint;
  times: number[];
  start: number;
  end: number;
  complete: boolean;
};

/** Group the existing itinerary, including its separate entry crossing.
 * Never manufacture crossings for a zero run or beyond the display window. */
export function coefficientStages(
  spec: NumberSpec,
  itinerary: TriangulationState,
) {
  if (spec.kind === "rational" && (spec.value.p <= 0n || !spec.value.q))
    return [];
  const cf = terms(spec, 96);
  const stages: CoefficientStage[] = [];
  const crossings = itinerary.steps.map((s) => ({
    time: s.time!,
    term: s.term!,
  }));
  // Never move beyond the exact itinerary when its rendering budget is exhausted.
  const end =
    itinerary.steps.length >= MAX_FLIPS
      ? crossings.at(-1)!.time
      : itinerary.horizon;
  for (let term = 0; term < cf.length; term++) {
    const interval = coefficientInterval(crossings, term, end);
    if (!interval) break;
    const expected =
      term === 0
        ? spec.kind === "rational" && spec.value.q === 1n
          ? 0n
          : 1n
        : coefficientFlipRun(spec, itinerary, term).expected;
    const times = itinerary.steps
      .filter((s) => s.term === term)
      .map((s) => s.time!);
    const complete =
      BigInt(times.length) === expected &&
      (interval.end < end ||
        (spec.kind === "rational" && term === cf.length - 1));
    stages.push({
      term,
      coefficient: cf[term],
      expected,
      times,
      ...interval,
      complete,
    });
    if (!complete) break;
  }
  return stages;
}

/** Move through the coefficient's presentation interval, including the
 * interior of a triangle when there are no flips. Flip counts stay separate. */
export function stageFrame(
  stage: CoefficientStage,
  progress: number,
  reduced = false,
) {
  const p = Math.max(0, Math.min(1, progress));
  const time =
    p === 1 ? stage.end : stage.start + p * (stage.end - stage.start);
  const completed = stage.times.filter((t) => t <= time + 1e-8).length;
  return {
    time:
      reduced && p < 1
        ? Math.max(stage.start, stage.times[completed - 1] ?? stage.start)
        : time,
    completed,
  };
}

export const stageDuration = (stage: CoefficientStage) =>
  (stage.end - stage.start) * 1000;

/** One hyperbolic-time axis for the displayed sequence. Coefficients occupy
 * their actual trajectory intervals, including intervals without flips. */
export function sequenceProgress(
  stages: CoefficientStage[],
  position: { term: number; progress: number },
) {
  const durations = stages.map(stageDuration);
  const total = durations.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const term = Math.max(0, Math.min(stages.length - 1, position.term));
  return (
    (durations.slice(0, term).reduce((a, b) => a + b, 0) +
      durations[term] * Math.max(0, Math.min(1, position.progress))) /
    total
  );
}

export function sequencePosition(stages: CoefficientStage[], progress: number) {
  if (!stages.length || progress <= 0) return { term: 0, progress: 0 };
  if (progress >= 1) return { term: stages.length - 1, progress: 1 };
  const durations = stages.map(stageDuration);
  let remaining =
    Math.max(0, Math.min(1, progress)) * durations.reduce((a, b) => a + b, 0);
  for (let term = 0; term < stages.length; term++) {
    if (remaining < durations[term] - 1e-9 || term === stages.length - 1)
      return {
        term,
        progress: Math.max(0, Math.min(1, remaining / durations[term])),
      };
    remaining -= durations[term];
  }
  return { term: 0, progress: 0 };
}
