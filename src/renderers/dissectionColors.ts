// Repeated palette; coefficient indices and outlines distinguish repeated colors.
const colors = [
  "#548875",
  "#bd8142",
  "#6589ab",
  "#a66b80",
  "#8c8750",
  "#8473ac",
  "#589b9b",
  "#b36e52",
];
export const stageColor = (index: number) => colors[index % colors.length];
