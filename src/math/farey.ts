import { rational, floor, type Rational, value, label } from "./rational";
import {
  type NumberSpec,
  terms,
  fromCF,
  compareTo,
  difference,
} from "./continuedFraction";
export type Crossing = Readonly<{
  id: string;
  time: number;
  height: number;
  left: Rational;
  right: Rational;
  direction: "initial" | "L" | "R";
  term: number;
}>;
export const adjacent = (a: Rational, b: Rational) => {
  const d = a.p * b.q - a.q * b.p;
  return d === 1n || d === -1n;
};
export const mediant = (a: Rational, b: Rational) =>
  rational(a.p + b.p, a.q + b.q);
export function fareyCrossings(
  spec: NumberSpec,
  maxTime = 18,
  maxEvents = 800,
): { crossings: Crossing[]; word: string; limited: boolean; onEdge: boolean } {
  const cf = terms(spec, 96);
  const a0 = floor(spec.kind === "rational" ? spec.value : fromCF(cf));
  let l = rational(a0),
    r = rational(a0 + 1n);
  const crossings: Crossing[] = [];
  if (compareTo(spec, l) === 0)
    return { crossings, word: "", limited: false, onEdge: true };
  let term = 1,
    used = 0;
  const runLength = (i: number) =>
    cf[i] -
    (i === 1 ? 1n : 0n) -
    (spec.kind === "rational" && i === cf.length - 1 ? 1n : 0n);
  const append = (direction: Crossing["direction"], index: number) => {
    const height = Math.sqrt(difference(spec, l) * -difference(spec, r));
    const time = Math.log(2 / height);
    if (!Number.isFinite(time) || time > maxTime) return false;
    crossings.push({
      id: `farey:${label(l)}:${label(r)}`,
      time,
      height,
      left: l,
      right: r,
      direction,
      term: index,
    });
    return true;
  };
  if (!append("initial", 0))
    return { crossings, word: "", limited: false, onEdge: false };
  let word = "";
  for (let i = 0; i < maxEvents; i++) {
    const m = mediant(l, r),
      side = compareTo(spec, m);
    if (!side) return { crossings, word, limited: false, onEdge: false };
    while (term < cf.length && BigInt(used) >= runLength(term)) {
      term++;
      used = 0;
    }
    const direction = side < 0 ? "L" : "R";
    if (side < 0) r = m;
    else l = m;
    if (!append(direction, term))
      return { crossings, word, limited: false, onEdge: false };
    word += direction;
    used++;
  }
  return { crossings, word, limited: true, onEdge: false };
}
export type Edge = Readonly<{ left: Rational; right: Rational }>;
export function visibleFarey(
  min: number,
  max: number,
  pixelsPerUnit: number,
  budget = 2200,
): Edge[] {
  const edges: Edge[] = [];
  const stack: { l: Rational; r: Rational; depth: number }[] = [];
  for (let n = Math.floor(min); n < Math.ceil(max); n++)
    stack.push({
      l: rational(BigInt(n)),
      r: rational(BigInt(n + 1)),
      depth: 0,
    });
  while (stack.length && edges.length < budget) {
    const { l, r, depth } = stack.pop()!;
    const x = value(l),
      y = value(r);
    if (y < min || x > max) continue;
    edges.push({ left: l, right: r });
    if ((y - x) * pixelsPerUnit < 9 || depth >= 28) continue;
    const m = mediant(l, r);
    stack.push({ l: m, r, depth: depth + 1 }, { l, r: m, depth: depth + 1 });
  }
  return edges;
}
