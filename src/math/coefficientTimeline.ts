import type { Crossing } from "./farey";

/** Presentation intervals for the vertical ray, distinct from L/R flip counts.
 * a0 labels the starting bracket before entry. Entry begins a1, even when
 * a1=1 contributes no L turns. Later runs begin at their first crossing.
 * The entry crossing itself retains term=0 in the Farey itinerary.
 */
type CoefficientCrossing = Pick<Crossing, "time" | "term">;
const afterCrossing = (crossing: CoefficientCrossing) =>
  crossing.term === 0 ? 1 : crossing.term;
export function coefficientAtTime(
  crossings: readonly CoefficientCrossing[],
  time: number,
): number {
  let term = 0;
  for (const crossing of crossings) {
    if (crossing.time > time + 1e-8) break;
    term = afterCrossing(crossing);
  }
  return term;
}
export function coefficientInterval(
  crossings: readonly CoefficientCrossing[],
  term: number,
  end: number,
) {
  const first =
    term === 0 ? undefined : crossings.find((c) => afterCrossing(c) === term);
  if (term !== 0 && !first) return undefined;
  const start = first?.time ?? 0;
  const stop = Math.min(
    end,
    crossings.find((c) => c.time > start && afterCrossing(c) !== term)?.time ??
      end,
  );
  return start < stop ? { start, end: stop } : undefined;
}
