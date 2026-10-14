import { type NumberSpec, approximate } from "./continuedFraction";
import { fareyCrossings } from "./farey";
import { fordCandidates, fordEvents } from "./horocycles";
import { quotientTrace } from "./modular";
export const heightAt = (time: number) => 2 * Math.exp(-time);
export function derive(spec: NumberSpec, end = 12) {
  const farey = fareyCrossings(spec, end),
    ford = fordCandidates(spec).flatMap((r) => fordEvents(spec, r, end)),
    quotient = quotientTrace(approximate(spec), end);
  const events = [
    ...farey.crossings.map((e) => ({ ...e, kind: "farey" as const })),
    ...ford,
    ...quotient.seams.map((e) => ({ ...e, kind: "seam" as const })),
  ].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  return { farey, ford, quotient, events };
}
