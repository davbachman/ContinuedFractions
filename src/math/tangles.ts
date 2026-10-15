import { toCF } from "./continuedFraction";
import { rational, abs, type Rational } from "./rational";
export type TangleOperation = Readonly<
  { kind: "twist"; count: bigint } | { kind: "rotate"; turns: 1 | -1 }
>;
export type TangleExpression = readonly TangleOperation[];
export type Endpoint = "NW" | "NE" | "SW" | "SE";
export const endpointNames: readonly Endpoint[] = ["NW", "NE", "SW", "SE"];
export function validateTangle(ops: TangleExpression) {
  if (ops.length > 512) throw new Error("Use at most 512 tangle operations.");
  let size = 0;
  for (const op of ops) {
    size += 40 + (op.kind === "twist" ? String(op.count).length : 0);
    if (size > 100000)
      throw new Error("Tangle expression exceeds the 100 KB operation budget.");
    if (
      op.kind === "twist" &&
      typeof op.count === "bigint" &&
      String(abs(op.count)).length <= 1024
    )
      continue;
    if (op.kind === "rotate" && (op.turns === 1 || op.turns === -1)) continue;
    throw new Error(
      "Invalid tangle operation or twist count (maximum 1,024 digits).",
    );
  }
}
export function tangleFraction(ops: TangleExpression): Rational {
  validateTangle(ops);
  return ops.reduce(
    (r, op) =>
      op.kind === "twist"
        ? rational(r.p + op.count * r.q, r.q)
        : rational(-r.q, r.p),
    rational(0n),
  );
}
export function expressionFor(r: Rational): TangleOperation[] {
  if (!r.q) return [{ kind: "rotate", turns: 1 }];
  const cf = toCF(r),
    out: TangleOperation[] = [];
  for (let i = cf.length - 1; i >= 0; i--) {
    if (i < cf.length - 1) out.push({ kind: "rotate", turns: 1 });
    out.push({ kind: "twist", count: i % 2 ? -cf[i] : cf[i] });
  }
  return out;
}
export function mirrorExpression(ops: TangleExpression): TangleOperation[] {
  return ops.map((op) =>
    op.kind === "twist" ? { ...op, count: -op.count } : op,
  );
}
/** Only the canonical construction has a direct coefficient-to-region map. */
export function canonicalTwistCoefficients(
  ops: TangleExpression,
  r: Rational,
): Map<number, number> | null {
  if (!r.q) return null;
  const canonical = expressionFor(r);
  if (
    ops.length !== canonical.length ||
    ops.some((op, i) => {
      const expected = canonical[i];
      return (
        op.kind !== expected.kind ||
        (op.kind === "twist" && expected.kind === "twist"
          ? op.count !== expected.count
          : op.kind === "rotate" &&
            expected.kind === "rotate" &&
            op.turns !== expected.turns)
      );
    })
  )
    return null;
  const count = toCF(r).length;
  return new Map(
    canonical.flatMap((op, i) =>
      op.kind === "twist" ? [[i, count - 1 - i / 2]] : [],
    ),
  );
}
export function rotateEndpoints<T>(e: readonly T[], turns: 1 | -1): T[] {
  return (turns === 1 ? [1, 3, 0, 2] : [2, 0, 3, 1]).map((i) => e[i]);
}
/** Independent Fox endpoint colors from the crossings, not from tangleFraction. */
export function tangleColors(ops: TangleExpression): readonly bigint[] {
  let colors = [0n, 0n, 1n, 1n];
  for (const op of ops) {
    if (op.kind === "rotate") colors = rotateEndpoints(colors, op.turns);
    else {
      const delta = colors[1] - colors[3];
      colors = [
        colors[0],
        colors[1] + op.count * delta,
        colors[2],
        colors[3] + op.count * delta,
      ];
    }
  }
  return colors;
}
export function coloringFraction(ops: TangleExpression): Rational {
  const [a, b, , d] = tangleColors(ops);
  return rational(b - a, b - d);
}
export function tangleConnectivity(ops: TangleExpression): string[] {
  let strands = [0, 0, 1, 1];
  for (const op of ops) {
    if (op.kind === "rotate") strands = rotateEndpoints(strands, op.turns);
    else if (abs(op.count) % 2n)
      [strands[1], strands[3]] = [strands[3], strands[1]];
  }
  return [0, 1]
    .map((s) => endpointNames.filter((_, i) => strands[i] === s).join("–"))
    .sort();
}
export function closureComponents(r: Rational): 1 | 2 {
  return !r.q || abs(r.p) % 2n === 1n ? 1 : 2;
}
/** Only verified small fixtures, not an inverse knot-table lookup. */
export function closureName(r: Rational): string {
  if (!r.q || abs(r.p) === 1n) return "Unknot";
  if (!r.p) return "Two-component unlink";
  if (abs(r.p) === 2n)
    return r.p > 0n ? "Hopf link (+ fixture)" : "Hopf link (mirror fixture)";
  const p = abs(r.p),
    q = (((r.p < 0n ? -r.q : r.q) % p) + p) % p;
  if (p === 3n)
    return q === 1n ? "Right-handed trefoil" : "Left-handed trefoil";
  if (p === 5n && (q === 2n || q === 3n))
    return "Figure-eight knot (amphichiral)";
  return closureComponents(r) === 1
    ? "Two-bridge knot"
    : "Two-component two-bridge link";
}
