import { terms, type NumberSpec } from "./continuedFraction";
import { coefficientFlipRun, type TriangulationState } from "./triangulation";

export type CoefficientStage = {
  term: number;
  coefficient: bigint;
  expected: bigint;
  times: number[];
  start: number;
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
  let start = 0;
  for (let term = 0; term < cf.length; term++) {
    const expected =
      term === 0
        ? spec.kind === "rational" && spec.value.q === 1n
          ? 0n
          : 1n
        : coefficientFlipRun(spec, itinerary, term).expected;
    const times = itinerary.steps
      .filter((s) => s.term === term)
      .map((s) => s.time!);
    const complete = BigInt(times.length) === expected;
    stages.push({
      term,
      coefficient: cf[term],
      expected,
      times,
      start,
      complete,
    });
    start = times.at(-1) ?? start;
    if (!complete) break;
  }
  return stages;
}

/** Equal animation beats per crossing, with continuous hyperbolic position.
 * This is deliberately a reparameterization, not constant hyperbolic speed. */
export function stageFrame(
  stage: CoefficientStage,
  progress: number,
  reduced = false,
) {
  const p = Math.max(0, Math.min(1, progress));
  const position = p * stage.times.length;
  const completed = Math.min(stage.times.length, Math.floor(position + 1e-9));
  const before = stage.times[completed - 1] ?? stage.start;
  const after = stage.times[completed] ?? before;
  return {
    time: reduced ? before : before + (after - before) * (position - completed),
    completed,
  };
}

export const stageDuration = (stage: CoefficientStage) =>
  Math.min(6000, Math.max(1800, stage.times.length * 600));
