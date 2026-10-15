import { coefficientInterval } from "../math/coefficientTimeline";
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
  const interval = coefficientInterval(crossings, term, end);
  if (!interval) return [];
  return segments.flatMap((s) => {
    const start = Math.max(s.start, interval.start),
      stop = Math.min(s.end, interval.end);
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
