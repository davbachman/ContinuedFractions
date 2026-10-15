export const representations = {
  symbolic: "Symbolic continued fraction",
  rectangle: "Rectangle dissection",
  h2: "H² · Farey and Ford",
  orbifold: "Modular surface",
  torus: "Punctured modular torus",
  triangulation: "Marked torus · edge flips",
  tangle: "Marked rational tangle",
  closure: "2-bridge knot / link",
  pillowcase: "Marked torus / pillowcase",
} as const;
export type Representation = keyof typeof representations;
export const isRepresentation = (s: unknown): s is Representation =>
  typeof s === "string" && Object.hasOwn(representations, s);
export const isTrajectory = (s: Representation) =>
  ["h2", "orbifold", "torus"].includes(s);
export const isTangle = (s: Representation) =>
  ["tangle", "closure", "pillowcase"].includes(s);
export const comparisonPresets: {
  label: string;
  pair: [Representation, Representation];
}[] = [
  { label: "Understand the algorithm", pair: ["symbolic", "rectangle"] },
  { label: "See approximation", pair: ["symbolic", "h2"] },
  { label: "Watch the quotient", pair: ["h2", "orbifold"] },
  { label: "Lift to the torus", pair: ["h2", "torus"] },
  { label: "Explore flips", pair: ["h2", "triangulation"] },
  { label: "Build a knot / link", pair: ["symbolic", "closure"] },
  { label: "Tangle and its cover", pair: ["tangle", "pillowcase"] },
];
export function correspondence(
  a: Representation,
  b: Representation,
): { kind: string; text: string } {
  const has = (x: Representation) => a === x || b === x;
  if (isTrajectory(a) && isTrajectory(b))
    return {
      kind: "Same trajectory",
      text: "The point and trail share hyperbolic time through the quotient and covering maps. Cameras are independent; the torus lift is explicit.",
    };
  if (has("h2") && has("triangulation"))
    return {
      kind: "Farey triangles ↔ flips",
      text: "A Farey triangle gives the three marked edge slopes. Click a neighboring triangle or a torus edge to flip. Manual flips preserve the target α; Follow target uses its Farey itinerary.",
    };
  if (a === b)
    return {
      kind: "Same mathematical state",
      text: "Compare two displays of the same state with independent camera and display settings.",
    };
  if (isTangle(a) && isTangle(b))
    return {
      kind: "Marked rational construction",
      text: has("closure")
        ? "The marked tangle determines its numerator closure. The closed knot or link alone does not recover a unique fraction. Both panes retain the marked construction."
        : "The tangle's separating curve lifts to parallel meridians on the marked branched-cover torus. Endpoint twists and marked Dehn twists share the verified slope convention.",
    };
  if (has("symbolic") && has("rectangle"))
    return {
      kind: "Coefficients ↔ square groups",
      text: "Each coefficient is a Euclidean quotient. Select a term or square group to highlight the same stage; editing either changes the exact shared number.",
    };
  if (
    (has("symbolic") || has("rectangle")) &&
    (isTrajectory(a) || isTrajectory(b))
  )
    return {
      kind: "Linked by coefficient",
      text: "The selected coefficient identifies its Farey run and corresponding trajectory interval, with the initial and terminal offsets. Euclidean stages, modular seams, and Ford contacts have different clocks.",
    };
  if ((has("symbolic") || has("rectangle")) && (isTangle(a) || isTangle(b)))
    return {
      kind: "Linked by expression",
      text: "Canonical twist regions correspond to continued-fraction coefficients, with alternating signs and reversed construction order. A custom signed expression retains its own operations; only the rational value is then linked.",
    };
  return {
    kind: "Shared number · independent operations",
    text: "Both constructions use α, but their steps do not have a direct correspondence. In particular, the hyperbolic endpoint is not a homology slope on the six-sheet torus. Playback is independent.",
  };
}
