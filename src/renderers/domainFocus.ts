import {
  inverse,
  matrixKey,
  multiply,
  reduce,
  type Segment,
} from "../math/modular";
import { heightAt } from "../math/trajectory";
export type DomainFocus = { key: string; seam?: "S" | "T" };
/** Reduction charts act on the left. Only genuine generator seams get a cue. */
export function domainFocus(
  segments: readonly Segment[],
  alpha: number,
  time: number,
): DomainFocus {
  const current = segments.find((s) => time >= s.start && time <= s.end);
  const matrix =
    current?.matrix ?? reduce({ x: alpha, y: heightAt(time) }).matrix;
  let seam: "S" | "T" | undefined;
  for (let i = 1; i < segments.length; i++) {
    if (Math.abs(segments[i].start - time) > 0.075) continue;
    const [a, b, c, d] = multiply(
      segments[i].matrix,
      inverse(segments[i - 1].matrix),
    );
    if (c === 0n && b !== 0n && a === d) seam = "T";
    else if (a === 0n && d === 0n && b === -c) seam = "S";
    break;
  }
  return { key: matrixKey(matrix), seam };
}
