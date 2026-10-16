// Colors describe mathematical roles, independent of the chosen representation.
export const visualColors = {
  endpoint: "#bc6944",
  point: "#c57548",
  trail: "#c7744d",
  strand: "#657b70",
};
export const DOMAIN_FILL_OPACITY = 0.26;
// Cover sheets are not coefficient indices. Keep their palette independent.
export const coverSheetColors = [
  "#7b91ae",
  "#b49b8b",
  "#97a78c",
  "#a992b0",
  "#87aaa7",
  "#b7ab78",
];

// Opaque tint avoids overlap artifacts between successive 3D curve fragments.
export const mutedCurveColor = (color: string) =>
  "#" +
  [1, 3, 5]
    .map((i) =>
      Math.round(
        0.35 * parseInt(color.slice(i, i + 2), 16) +
          0.65 * parseInt("#fbfbf6".slice(i, i + 2), 16),
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
