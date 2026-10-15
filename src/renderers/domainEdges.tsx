export type DomainSide = "T" | "S";
export const domainEdgeColor: Record<DomainSide, string> = {
  T: "#197d9a",
  S: "#9450a1",
};
export function DomainEdgeLegend() {
  return (
    <div
      className="domain-edge-legend"
      aria-label="Fundamental-domain edge colors"
    >
      {(["T", "S"] as const).map((side) => (
        <span key={side}>
          <i style={{ background: domainEdgeColor[side] }} />
          {side}-paired edges
        </span>
      ))}
    </div>
  );
}
