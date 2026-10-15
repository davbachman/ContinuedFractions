export const representations = {
  symbolic: "Symbolic continued fraction",
  rectangle: "Rectangle dissection",
  h2: "H² · Farey and Ford",
  orbifold: "Modular surface",
  torus: "Punctured modular torus",
  farey: "Poincare Disk",
  triangulation: "Marked torus · edge flips",
  tangle: "Marked rational tangle",
  braid: "CF braid · 4-plat",
  pillowcase: "Marked torus / pillowcase",
} as const;
export type Representation = keyof typeof representations;
export const isRepresentation = (s: unknown): s is Representation =>
  typeof s === "string" && Object.hasOwn(representations, s);
export const isTrajectory = (s: Representation) =>
  ["h2", "farey", "orbifold", "torus"].includes(s);
export const isCoefficientView = (s: Representation) =>
  s === "symbolic" || s === "rectangle" || s === "braid";
export const isTangle = (s: Representation) =>
  ["tangle", "pillowcase"].includes(s);
