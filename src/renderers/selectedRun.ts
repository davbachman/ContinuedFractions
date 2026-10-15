import { apply, type Segment } from "../math/modular";
import type { Crossing } from "../math/farey";
import { heightAt } from "../math/trajectory";
export type SelectedRun = { segments: Segment[]; term: number; color: string };
export function coefficientTrace(
  segments: readonly Segment[],
  crossings: readonly Crossing[],
  term: number,
  alpha: number,
  end: number,
): Segment[] {
  if (!term) return [];
  const first = crossings.find(
    (e) => e.term === term && e.direction !== "initial",
  );
  if (!first) return [];
  const last =
    crossings.find((e) => e.time > first.time && e.term !== term)?.time ?? end;
  return segments.flatMap((s) => {
    const start = Math.max(s.start, first.time),
      stop = Math.min(s.end, last);
    // A Farey crossing can coincide with a modular seam up to roundoff.
    // Omit sub-pixel, zero-length chart slivers from the inspection overlay.
    if (stop - start < 1e-10) return [];
    const at = (time: number) => ({
      ...apply(s.matrix, { x: alpha, y: heightAt(time) }),
      time,
    });
    return [
      {
        ...s,
        start,
        end: stop,
        points: [
          at(start),
          ...s.points.filter((p) => p.time > start && p.time < stop),
          at(stop),
        ],
      },
    ];
  });
}
