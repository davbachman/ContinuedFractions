import { useId, useMemo } from "react";
import { type Triangulation, triangleKey } from "../math/triangulation";
import { label } from "../math/rational";
import { latticeGeometry, latticeLines } from "./latticeGeometry";
import { flipColors } from "./triangulationGeometry";
import { fareyTriangleColor } from "./fareyColors";
import { svgPath } from "./ModularTorus";

type Props = {
  tri: Triangulation;
  selected: number;
  puncture: boolean;
  animating: boolean;
  selectEdge: (edge: number) => void;
  edgeAction: (edge: number) => string | undefined;
};
export function LatticeTriangulation({
  tri,
  selected,
  puncture,
  animating,
  selectEdge,
  edgeAction,
}: Props) {
  const id = useId(),
    geometry = useMemo(() => latticeGeometry(tri), [tri]);
  const background = useMemo(() => latticeLines(tri), [tri]);
  const diameter = Math.max(...centralLengths(geometry));
  const edgeWidth = Math.max(
    0.6,
    Math.min(2.5, (0.35 * geometry.scale ** 2) / diameter),
  );
  const color = fareyTriangleColor(tri);
  const central = geometry.cells.find((c) => c.central)!;
  // Sides parallel to u have class 0, sides parallel to v class 1; u+v is class 2.
  const edges = [
    [0, 1, 0],
    [3, 2, 0],
    [0, 3, 1],
    [1, 2, 1],
    [0, 2, 2],
  ];
  return (
    <>
      <svg
        viewBox="0 0 380 370"
        role="group"
        aria-label="Marked torus triangulation"
        data-slopes={triangleKey(tri)}
        data-triangle-color={color}
        data-lattice-span={String(geometry.span)}
      >
        <defs>
          <clipPath id={`${id}-lattice`}>
            <rect x="10" y="10" width="360" height="315" rx="8" />
          </clipPath>
          <marker
            id={`${id}-arrow`}
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0 0L7 3.5L0 7Z" fill="#425b48" />
          </marker>
        </defs>
        <rect x="10" y="10" width="360" height="315" rx="8" fill="#fbfbf6" />
        <g clipPath={`url(#${id}-lattice)`}>
          <rect
            x="10"
            y="10"
            width="360"
            height="315"
            fill={color}
            fillOpacity=".045"
          />
          <g data-lattice-background="true" pointerEvents="none">
            {background.lines.map((line, i) => (
              <path
                key={i}
                d={svgPath([line.from, line.to])}
                stroke={flipColors[line.edge]}
                strokeOpacity=".13"
                strokeWidth=".8"
              />
            ))}
          </g>
          <g
            data-central-domain="true"
            className={animating ? "flip-incident-triangles" : undefined}
          >
            {central.faces.map((face, i) => (
              <path
                key={i}
                data-torus-face={i}
                d={svgPath(face) + "Z"}
                fill={color}
                fillOpacity="0.32"
              />
            ))}
          </g>
          {[0, 1, 2].map((k) => (
            <g
              key={k}
              role={edgeAction(k) ? "button" : "img"}
              tabIndex={edgeAction(k) ? 0 : undefined}
              aria-label={
                edgeAction(k)
                  ? `${edgeAction(k)} path step via torus edge ${label(tri[k])}`
                  : `Torus edge ${label(tri[k])}`
              }
              onClick={() => selectEdge(k)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectEdge(k);
                }
              }}
            >
              <title>
                Edge {label(tri[k])}. Parallel copies are the same torus edge.
              </title>
              {edges
                .filter((e) => e[2] === k)
                .map(([a, b], i) => (
                  <g key={i}>
                    <path
                      d={svgPath([central.quad[a], central.quad[b]])}
                      stroke="transparent"
                      strokeWidth="20"
                      fill="none"
                    />
                    <path
                      data-lattice-edge={k}
                      d={svgPath([central.quad[a], central.quad[b]])}
                      stroke={flipColors[k]}
                      strokeWidth={selected === k ? edgeWidth * 1.4 : edgeWidth}
                      fill="none"
                      pointerEvents="none"
                    />
                  </g>
                ))}
            </g>
          ))}
          {central.quad.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={puncture ? 6 : 3}
              fill={puncture ? "#fbfbf6" : "#425b48"}
              stroke="#425b48"
              strokeDasharray={puncture ? "2 2" : undefined}
              pointerEvents="none"
            />
          ))}
        </g>
        <path
          d="M25 350H76 M25 350V300"
          stroke="#425b48"
          markerEnd={`url(#${id}-arrow)`}
        />
        <text x="85" y="354" className="svg-muted">
          meridian (1,0) → 0
        </text>
        <text x="20" y="292" className="svg-muted">
          longitude (0,1) ↑ ∞
        </text>
        <text x="360" y="354" textAnchor="end" className="svg-muted">
          central area = 1
        </text>
      </svg>
      <p className="flip-diagram-caption">
        The darker parallelogram is one torus fundamental domain; opposite sides
        are identified. Its translates tile the Euclidean plane. The fixed axes
        do not rotate or shear; the camera fits the entire domain. Three edge
        colors match the three slope labels in the hyperbolic view.
      </p>
      {background.limited && (
        <p className="topology-limit" role="status">
          Thin-domain detail: background line families less than two pixels
          apart are omitted. Exact slopes and the central unit-area domain are
          unchanged.
        </p>
      )}
    </>
  );
}

function centralLengths(g: ReturnType<typeof latticeGeometry>) {
  const q = g.quad.map(g.project);
  return [
    Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y),
    Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y),
  ];
}
