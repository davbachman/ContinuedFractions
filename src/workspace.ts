export const representations = {
  symbolic: "Symbolic continued fraction",
  rectangle: "Rectangle dissection",
  matrices: "Matrix products",
  h2: "H² · Farey and Ford",
  orbifold: "Modular surface",
  torus: "Punctured modular torus",
  farey: "Farey triangles · flip path",
  triangulation: "Marked torus · edge flips",
  tangle: "Marked rational tangle",
  braid: "CF braid · 4-plat",
  pillowcase: "Marked torus / pillowcase",
} as const;
export type Representation = keyof typeof representations;
export const isRepresentation = (s: unknown): s is Representation =>
  typeof s === "string" && Object.hasOwn(representations, s);
export const isTrajectory = (s: Representation) =>
  ["h2", "orbifold", "torus"].includes(s);
export const isPrefixView = (s: Representation): s is "matrices" =>
  s === "matrices";
export const isCoefficientView = (s: Representation) =>
  s === "symbolic" || s === "rectangle" || s === "braid" || isPrefixView(s);
export const isTangle = (s: Representation) =>
  ["tangle", "pillowcase"].includes(s);
export const comparisonPresets: {
  label: string;
  pair: [Representation, Representation];
  follow?: boolean;
}[] = [
  { label: "Understand the algorithm", pair: ["symbolic", "rectangle"] },
  { label: "See approximation", pair: ["symbolic", "h2"] },
  { label: "Watch the quotient", pair: ["h2", "orbifold"] },
  { label: "Lift to the torus", pair: ["h2", "torus"] },
  {
    label: "Continued fractions → flips",
    pair: ["farey", "triangulation"],
    follow: true,
  },
  { label: "Read the CF braid", pair: ["symbolic", "braid"] },
  { label: "Tangle and its plat closure", pair: ["tangle", "braid"] },
  { label: "Build a tangle", pair: ["symbolic", "tangle"] },
  { label: "Tangle and its cover", pair: ["tangle", "pillowcase"] },
  { label: "Read the matrix product", pair: ["symbolic", "matrices"] },
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
  if ((has("h2") || has("farey")) && has("triangulation"))
    return {
      kind: "Farey triangles ↔ flips",
      text: "A Farey triangle gives the three marked edge slopes. Both panes automatically follow α’s Farey itinerary. Step forward or backward along the path; each crossing replaces one edge slope.",
    };
  if (a === b)
    return {
      kind: "Same mathematical state",
      text: "Compare two displays of the same state with independent camera and display settings.",
    };
  if (
    (has("farey") || has("triangulation")) &&
    isCoefficientView(a === "farey" || a === "triangulation" ? b : a)
  )
    return {
      kind: "Coefficients → runs of flips",
      text: "α’s itinerary groups the left/right Farey turns by continued-fraction coefficient. Each crossed side flips one torus edge. The initial entry and first/last run offsets are shown explicitly. Selecting a coefficient highlights its run; Go to selected run seeks it.",
    };
  if (has("farey") && isTrajectory(a === "farey" ? b : a))
    return {
      kind: "Farey crossing → triangle step",
      text: "The selected α determines the vertical ray and its path through adjacent Farey triangles. Both views share the same crossing times. This marked triangulation does not assign a homology slope to the modular cover.",
    };
  if (has("braid") && (has("tangle") || has("pillowcase")))
    return {
      kind: "Rational tangle ↔ four-plat closure",
      text: "The CF braid presents the numerator closure of the same rational tangle using three active strands and a return strand. Custom tangle words retain their operations. Irrational inputs use the selected convergent; a closed knot does not uniquely determine α or a marking.",
    };
  if (has("braid") && (has("symbolic") || has("rectangle") || has("matrices")))
    return {
      kind: "Coefficients ↔ braid twist boxes",
      text: "Read the boxes downwards in CF order, alternating strands 1–2 and 2–3. Selecting a box highlights its coefficient; rectangle playback highlights successive groups. An even-length CF uses a split final ending, with both boxes linked to the same coefficient. For irrational α, the braid shows the selected convergent.",
    };
  if (isPrefixView(a) || isPrefixView(b)) {
    if (isCoefficientView(a) && isCoefficientView(b))
      return {
        kind: "Same prefix · different representations",
        text: "Selecting aₙ links the matrix product through A(aₙ) and its convergent. Rectangle groups use the same coefficient index. Selection leaves α unchanged.",
      };
    if (isTrajectory(a) || isTrajectory(b))
      return {
        kind: "Convergents and Farey runs",
        text: "The selected prefix determines a rational convergent and its coefficient’s Farey run, with the existing initial and terminal offsets. Prefix depth is not hyperbolic time. A convergent is not a homology marking on the six-sheet modular torus.",
      };
    if (isTangle(a) || isTangle(b))
      return {
        kind: "Shared value · explicit approximation",
        text: "Prefixes describe the selected exact number. For an irrational, the tangle uses the selected prefix’s explicitly labeled convergent; each is a discrete rational approximation. Use convergent as target explicitly makes all views rational.",
      };
    return {
      kind: "Target approximation · independent triangulation",
      text: "The prefix describes the target α and its convergents. The marked triangulation has its own exact slope triple and flip history; selecting a prefix does not flip it or replace its marking.",
    };
  }
  if (isTangle(a) && isTangle(b))
    return {
      kind: "Marked rational construction",
      text: "The tangle's separating curve lifts to parallel meridians on the marked branched-cover torus. Endpoint twists and marked Dehn twists share the verified slope convention.",
    };
  if (has("symbolic") && has("rectangle"))
    return {
      kind: "Coefficients ↔ square groups",
      text: "Each coefficient is a Euclidean quotient. Select a term or square group to highlight the same stage; editing either changes the exact shared number.",
    };
  if (
    (has("symbolic") || has("rectangle") || has("braid")) &&
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
