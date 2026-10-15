import { rational, label, floor, abs, type Rational } from "./rational";
import { fareyCrossings, adjacent } from "./farey";
import { terms, type NumberSpec } from "./continuedFraction";
import { determinant, type Matrix } from "./modular";
export type Triangulation = readonly [Rational, Rational, Rational];
export type FlipStep = Readonly<{
  edge: number;
  source: "torus" | "farey" | "follow";
  time?: number;
  term?: number;
}>;
export type TriangulationState = Readonly<{
  start: Triangulation;
  steps: readonly FlipStep[];
  cursor: number;
  mode: "manual" | "follow";
  horizon: number;
}>;
export const INITIAL_TRIANGLE: Triangulation = [
  rational(0n),
  rational(1n, 0n),
  rational(1n),
];
export const MAX_FLIPS = 512;
export const initialTriangulation: TriangulationState = {
  start: INITIAL_TRIANGLE,
  steps: [],
  cursor: 0,
  mode: "manual",
  horizon: 12,
};
export const sameSlope = (a: Rational, b: Rational) =>
  a.p === b.p && a.q === b.q;
export const triangleKey = (t: Triangulation) => t.map(label).join(" | ");
export function validateTriangle(t: Triangulation) {
  if (
    t.length !== 3 ||
    !adjacent(t[0], t[1]) ||
    !adjacent(t[1], t[2]) ||
    !adjacent(t[2], t[0])
  )
    throw new Error(
      "A marked triangulation needs three pairwise determinant-one slopes.",
    );
}
export type Vector = { x: bigint; y: bigint };
export const vector = (r: Rational): Vector => ({ x: r.q, y: r.p });
const plus = (u: Vector, v: Vector): Vector => ({ x: u.x + v.x, y: u.y + v.y });
const slope = (v: Vector) => rational(v.y, v.x);
export function flipDetails(before: Triangulation, edge: number) {
  validateTriangle(before);
  if (!Number.isInteger(edge) || edge < 0 || edge > 2)
    throw new Error("Choose one of the three edge classes.");
  const retained = before.filter((_, i) => i !== edge),
    u = vector(retained[0]);
  let v = vector(retained[1]);
  if (!sameSlope(slope(plus(u, v)), before[edge])) v = { x: -v.x, y: -v.y };
  if (!sameSlope(slope(plus(u, v)), before[edge]))
    throw new Error("Current edge is not a diagonal of the retained basis.");
  const inserted = rational(u.y - v.y, u.x - v.x),
    after = [...before] as [Rational, Rational, Rational];
  after[edge] = inserted;
  const origin = { x: 0n, y: 0n },
    sum = plus(u, v);
  return {
    before,
    after: after as Triangulation,
    edge,
    removed: before[edge],
    inserted,
    retained,
    quad: [origin, u, sum, v],
    oldDiagonal: [origin, sum],
    newDiagonal: [u, v],
    triangles: [
      [origin, u, sum],
      [origin, v, sum],
    ],
  };
}
export const flip = (tri: Triangulation, edge: number) =>
  flipDetails(tri, edge).after;
export function triangulationPath(state: TriangulationState): Triangulation[] {
  const path = [state.start];
  for (const step of state.steps) path.push(flip(path.at(-1)!, step.edge));
  return path;
}
export function currentTriangulation(state: TriangulationState) {
  return triangulationPath(state)[state.cursor];
}
export function appendFlip(
  state: TriangulationState,
  edge: number,
  source: "torus" | "farey",
): TriangulationState {
  if (state.cursor >= MAX_FLIPS)
    throw new Error(
      `Flip history is limited to ${MAX_FLIPS} steps. Reset to begin a new path.`,
    );
  flip(currentTriangulation(state), edge);
  return {
    ...state,
    mode: "manual",
    steps: [...state.steps.slice(0, state.cursor), { edge, source }],
    cursor: state.cursor + 1,
  };
}
/** Reuse the application's crossing labels, including the initial and terminal CF run offsets. */
export function targetItinerary(
  spec: NumberSpec,
  horizon = 12,
): TriangulationState {
  if (spec.kind === "rational" && !spec.value.q)
    return { ...initialTriangulation, mode: "follow", horizon };
  const a0 = terms(spec, 1)[0];
  const start: Triangulation = [
    rational(a0),
    rational(1n, 0n),
    rational(a0 + 1n),
  ];
  const crossings = fareyCrossings(spec, horizon, MAX_FLIPS - 1).crossings;
  const steps: FlipStep[] = [];
  let tri = start;
  for (const crossing of crossings) {
    const edge = tri.findIndex(
      (r) => !sameSlope(r, crossing.left) && !sameSlope(r, crossing.right),
    );
    if (
      edge < 0 ||
      !tri.some((r) => sameSlope(r, crossing.left)) ||
      !tri.some((r) => sameSlope(r, crossing.right))
    )
      throw new Error(
        "Farey itinerary is not adjacent to the marked triangulation.",
      );
    tri = flip(tri, edge);
    steps.push({
      edge,
      source: "follow",
      time: crossing.time,
      term: crossing.term,
    });
  }
  return { start, steps, cursor: 0, mode: "follow", horizon };
}
export function followStatus(spec: NumberSpec, state: TriangulationState) {
  if (spec.kind === "rational" && !spec.value.q)
    return "Infinity has no finite vertical-ray itinerary. Choose a finite α to see its flip path.";
  if (spec.kind === "rational" && spec.value.q === 1n)
    return "The ray lies on a Farey edge. The triangle on its right is shown; automatic crossing is ambiguous, so no flips are generated.";
  if (
    spec.kind === "rational" &&
    currentTriangulation(state).some((r) => sameSlope(r, spec.value))
  )
    return "Terminal triangle incident to the rational target cusp. The ideal endpoint is not reached in finite hyperbolic time.";
  if (state.cursor < state.steps.length)
    return `Follow target: ${state.steps.length - state.cursor} generated flips remain.`;
  return `${spec.kind === "periodic" ? "Infinite itinerary" : "Rational itinerary incomplete"}: display window t ≤ ${state.horizon}, at most ${MAX_FLIPS} crossings. ${state.horizon < 24 ? "Extend the itinerary to continue." : "Display limit reached; this is not mathematical termination."}`;
}
/** A positive modular matrix sending {0, infinity, 1} to this slope triple. Used only as a Farey camera. */
export function triangulationMatrix(t: Triangulation): Matrix {
  const { quad } = flipDetails(t, 2),
    u = quad[1],
    v = quad[3];
  const m: Matrix = [v.y, u.y, v.x, u.x];
  return determinant(m) === 1n ? m : [u.y, v.y, u.x, v.x];
}
export function validateTriangulationState(s: TriangulationState) {
  validateTriangle(s.start);
  if (
    !["manual", "follow"].includes(s.mode) ||
    !Number.isInteger(s.cursor) ||
    s.cursor < 0 ||
    s.cursor > s.steps.length ||
    s.steps.length > MAX_FLIPS ||
    !Number.isFinite(s.horizon) ||
    s.horizon < 4 ||
    s.horizon > 24
  )
    throw new Error("Invalid triangulation history or display horizon.");
  for (const step of s.steps) {
    if (
      !["torus", "farey", "follow"].includes(step.source) ||
      !Number.isInteger(step.edge) ||
      step.edge < 0 ||
      step.edge > 2 ||
      (step.time !== undefined &&
        (!Number.isFinite(step.time) || step.time < 0 || step.time > 24)) ||
      (step.term !== undefined &&
        (!Number.isInteger(step.term) || step.term < 0 || step.term > 127))
    )
      throw new Error("Invalid flip record.");
  }
  triangulationPath(s);
}
export type ExactPoint = { x: Rational; y: Rational };
export function wrappedEdge(r: Rational, budget = 160) {
  if (abs(r.p) + r.q > BigInt(budget))
    return { segments: [] as ExactPoint[][], limited: true };
  const cuts = [rational(0n), rational(1n)];
  for (const count of [r.q, abs(r.p)])
    for (let k = 1n; k < count; k++) cuts.push(rational(k, count));
  cuts.sort((a, b) =>
    a.p * b.q < b.p * a.q ? -1 : a.p * b.q > b.p * a.q ? 1 : 0,
  );
  const unique = cuts.filter((r, i) => !i || !sameSlope(r, cuts[i - 1])),
    segments: ExactPoint[][] = [];
  for (let i = 0; i < unique.length - 1; i++) {
    const a = unique[i],
      b = unique[i + 1],
      mid = rational(a.p * b.q + b.p * a.q, 2n * a.q * b.q),
      ix = floor(rational(r.q * mid.p, mid.q)),
      iy = floor(rational(r.p * mid.p, mid.q));
    segments.push(
      [a, b].map((t) => ({
        x: rational(r.q * t.p - ix * t.q, t.q),
        y: rational(r.p * t.p - iy * t.q, t.q),
      })),
    );
  }
  // Axis-aligned classes appear on both sides of the square, with the same identity.
  if (!r.p) segments.push(segments[0].map((p) => ({ ...p, y: rational(1n) })));
  if (!r.q) segments.push(segments[0].map((p) => ({ ...p, x: rational(1n) })));
  return { segments, limited: false };
}

/** Coefficient run lengths use the same entry/terminal offsets as fareyCrossings.
 * Generated counts are a display window, never the mathematical run length. */
export function coefficientFlipRun(
  spec: NumberSpec,
  state: TriangulationState,
  term: number,
) {
  const cf = spec.kind === "rational" && !spec.value.q ? [] : terms(spec, 96);
  let expected =
    term > 0 && cf[term] !== undefined
      ? cf[term] -
        (term === 1 ? 1n : 0n) -
        (spec.kind === "rational" && term === cf.length - 1 ? 1n : 0n)
      : 0n;
  if (expected < 0n) expected = 0n;
  return {
    direction: term === 0 ? "initial" : term % 2 ? "L" : "R",
    expected,
    generated:
      term === 0 ? 0 : state.steps.filter((step) => step.term === term).length,
    completed:
      term === 0
        ? 0
        : state.steps
            .slice(0, state.cursor)
            .filter((step) => step.term === term).length,
  };
}

/** Seek to a coefficient's first crossing, or the preceding boundary for an
 * empty run. Missing display depth must not be mistaken for a zero-length run. */
export function coefficientFlipPosition(
  spec: NumberSpec,
  state: TriangulationState,
  term: number,
) {
  const cf = spec.kind === "rational" && !spec.value.q ? [] : terms(spec, 96);
  if (!Number.isInteger(term) || term < 0 || term >= cf.length) return null;
  if (term === 0) return { cursor: 0, time: 0 };
  const first = state.steps.findIndex((step) => step.term === term);
  if (first >= 0)
    return { cursor: first + 1, time: state.steps[first].time ?? 0 };
  if (coefficientFlipRun(spec, state, term).expected !== 0n) return null;
  for (let i = 0; i < term; i++) {
    const expected =
      i === 0
        ? spec.kind === "rational" && spec.value.q === 1n
          ? 0n
          : 1n
        : coefficientFlipRun(spec, state, i).expected;
    if (BigInt(state.steps.filter((step) => step.term === i).length) < expected)
      return null;
  }
  const cursor = state.steps.filter(
    (step) => (step.term ?? Infinity) < term,
  ).length;
  return { cursor, time: state.steps[cursor - 1]?.time ?? 0 };
}
