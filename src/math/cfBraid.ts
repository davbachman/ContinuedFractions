import { fromCF } from "./continuedFraction";
import { abs, rational, type Rational } from "./rational";
import type {
  DiagramNode,
  DiagramEdge,
  DiagramCrossing,
  TwistBox,
} from "./tangleDiagram";

export type BraidBlock = Readonly<{
  coefficient: number;
  count: bigint;
  pair: 1 | 2; // zero-based left slot among R, 1, 2, 3
  exponent: bigint;
  ending: "whole" | "minus-one" | "one";
}>;
/** Read downwards: active pairs 1–2, 2–3, ... . Positive exponent:
 * top-right passes over top-left. Close R–1 and 2–3 at both ends.
 * KL, Classification of Rational Knots, Figures 9–10; indices here start at 0.
 */
export function braidBlocks(coefficients: readonly bigint[]): BraidBlock[] {
  if (!coefficients.length || coefficients.length > 128)
    throw new Error("Use 1–128 coefficients for a finite CF braid.");
  const entries: {
    coefficient: number;
    count: bigint;
    ending: BraidBlock["ending"];
  }[] = coefficients.map((count, coefficient) => ({
    coefficient,
    count,
    ending: "whole",
  }));
  if (entries.length % 2 === 0) {
    const last = entries.at(-1)!;
    last.count -= 1n;
    last.ending = "minus-one";
    entries.push({ coefficient: last.coefficient, count: 1n, ending: "one" });
  }
  return entries.map((entry, i) => ({
    ...entry,
    pair: i % 2 ? 2 : 1,
    exponent: i % 2 ? -entry.count : entry.count,
  }));
}

/** Independent Fox coloring, propagated UP from bottom cap colors 0,0,1,1.
 * For a crossing pair (a,b), a positive downward crossing gives
 * (b,2b-a); undoing n crossings gives (a+n(a-b), b+n(a-b)).
 * Undo the word in reverse order. The top colors are (0,-p,q-p,q).
 */
export function braidColoringFraction(blocks: readonly BraidBlock[]): Rational {
  const colors = [0n, 0n, 1n, 1n];
  for (const block of [...blocks].reverse()) {
    const i = block.pair,
      delta = colors[i] - colors[i + 1];
    colors[i] += block.exponent * delta;
    colors[i + 1] += block.exponent * delta;
  }
  return rational(colors[0] - colors[1], colors[3] - colors[0]);
}

export const BRAID_X = [48, 146, 220, 294] as const;
export const BRAID_DETAIL_LIMIT = 160;
export function cfBraidDiagram(
  coefficients: readonly bigint[],
  infinity = false,
) {
  const blocks = infinity ? [] : braidBlocks(coefficients);
  const fraction = infinity ? rational(1n, 0n) : fromCF(coefficients);
  const nodes: DiagramNode[] = BRAID_X.map((x) => ({ x, y: 64, color: 0n }));
  // Cap edges are topological edges; the renderer draws them as smooth arches.
  const edges: DiagramEdge[] = [
    { from: 0, to: 1, region: -1 },
    { from: 2, to: 3, region: -1 },
  ];
  const crossings: DiagramCrossing[] = [],
    boxes: TwistBox[] = [];
  const regions: {
    block: BraidBlock;
    index: number;
    top: number;
    bottom: number;
    aggregated: boolean;
    edges: number[];
  }[] = [];
  let ends = [0, 1, 2, 3],
    y = 64;
  for (const [index, block] of blocks.entries()) {
    const count = abs(block.exponent);
    const aggregated =
      count > 16n || crossings.length + Number(count) > BRAID_DETAIL_LIMIT;
    const rows = aggregated || !count ? 1 : Number(count);
    const top = y,
      edgeIds: number[] = [];
    const rowHeight = Math.max(26, 60 / rows);
    for (let row = 0; row < rows; row++) {
      const next = BRAID_X.map((x) => {
        nodes.push({ x, y: y + rowHeight, color: 0n });
        return nodes.length - 1;
      });
      const swap = aggregated ? count % 2n === 1n : count > 0n;
      const start = edges.length;
      for (let slot = 0; slot < 4; slot++) {
        const out =
          swap && (slot === block.pair || slot === block.pair + 1)
            ? 2 * block.pair + 1 - slot
            : slot;
        edgeIds.push(edges.length);
        edges.push({ from: ends[slot], to: next[out], region: index });
      }
      if (aggregated)
        boxes.push({
          corners: [
            ends[block.pair],
            ends[block.pair + 1],
            next[block.pair + 1],
            next[block.pair],
          ],
          count: block.exponent,
          region: index,
        });
      else if (count)
        crossings.push({
          over: start + block.pair + (block.exponent > 0n ? 1 : 0),
          under: start + block.pair + (block.exponent > 0n ? 0 : 1),
          region: index,
        });
      ends = next;
      y += rowHeight;
    }
    regions.push({ block, index, top, bottom: y, aggregated, edges: edgeIds });
  }
  if (infinity) {
    const next = BRAID_X.map((x) => {
      nodes.push({ x, y: 164, color: 0n });
      return nodes.length - 1;
    });
    ends.forEach((from, i) => edges.push({ from, to: next[i], region: -1 }));
    ends = next;
    y = 164;
    // Bottom nested, crossing-free caps give the numerator closure of ∞.
    ends = [ends[0], ends[3], ends[1], ends[2]];
  }
  return {
    nodes,
    edges,
    crossings,
    boxes,
    ends,
    regions,
    blocks,
    fraction,
    width: 430,
    height: y + (infinity ? 125 : 62),
    bottom: y,
    component: [] as number[],
  };
}
