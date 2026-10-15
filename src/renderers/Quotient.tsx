import type { DomainFocus } from "./domainFocus";
import { useSurfaceRotation, rotationHint } from "./useSurfaceRotation";
import type { SelectedRun } from "./selectedRun";
import { useMemo, useState, useId, type MouseEvent } from "react";
import { type Segment, apply, tangent, reduce } from "../math/modular";
import { heightAt } from "../math/trajectory";
import { DomainEdgeLegend, domainEdgeColor } from "./domainEdges";
import {
  TranslucentSurface,
  type SurfaceFace,
  type SurfaceLine,
} from "./TranslucentSurface";
import { schematicPoint, project3d } from "./geometry";
type Props = {
  domainFocus?: DomainFocus;
  selectedRun?: SelectedRun;
  alpha: number;
  time: number;
  segments: readonly Segment[];
  onSeek: (t: number) => void;
  limited: boolean;
};
export function Quotient({
  alpha,
  time,
  segments,
  onSeek,
  limited,
  selectedRun,
  domainFocus,
}: Props) {
  const id = useId();
  const [mode, setMode] = useState<"folded" | "schematic">("folded"),
    [rotation, setRotation] = useState(-0.4),
    [roll, setRoll] = useState(0);
  const rotationControls = useSurfaceRotation(
    rotation,
    setRotation,
    mode === "schematic",
    -0.4,
    roll,
    setRoll,
  );
  const active = segments.find((s) => time >= s.start && time <= s.end),
    z = { x: alpha, y: heightAt(time) },
    reduced = active
      ? { matrix: active.matrix, point: apply(active.matrix, z) }
      : reduce(z),
    p = reduced.point;
  const currentTangent = tangent(reduced.matrix, z, { x: 0, y: -z.y });
  // Logarithmic vertical screen coordinate retains the reference domain's cusp.
  const project = (p: { x: number; y: number }) => ({
    x: 190 + p.x * 235,
    y: 328 - 100 * Math.log(Math.max(p.y, 0.001) / (Math.sqrt(3) / 2)),
  });
  const point = project(p),
    tv = { x: currentTangent.x * 235, y: (-100 * currentTangent.y) / p.y },
    len = Math.hypot(tv.x, tv.y) || 1;
  const circle = Array.from({ length: 61 }, (_, i) =>
    project({ x: -0.5 + i / 60, y: Math.sqrt(1 - (-0.5 + i / 60) ** 2) }),
  );
  const path = (points: readonly { x: number; y: number }[]) =>
    points
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)},${p.y.toFixed(3)}`)
      .join(" ");
  const projectSurface = ([x, y, z]: readonly number[]) => {
    // Roll around the model's center, keeping the default framing unchanged.
    const q = project3d([x, y, z - 0.35], rotation, roll);
    return {
      x: 190 + q.x * 125,
      y: 250 - (q.y + 0.35 * 0.88) * 130,
      depth: q.depth,
    };
  };
  const schematic = (p: { x: number; y: number }) =>
    projectSurface(schematicPoint(p));
  const cusp = projectSurface([0, 0, 1.35]);
  const surface = useMemo(() => {
    const at = (u: number, h: number) => {
      const x = u - 0.5;
      return schematic({ x, y: Math.sqrt(1 - x * x) * Math.exp(h / (1 - h)) });
    };
    const faces: SurfaceFace[] = [];
    for (let u = 0; u < 48; u++)
      for (let h = 0; h < 28; h++) {
        faces.push({
          color: "#b6cbb2",
          points: [
            [u, h],
            [u + 1, h],
            [u + 1, h + 1],
            [u, h + 1],
          ].map(([u, h]) => at(u / 48, (0.975 * h) / 28)),
        });
      }
    const edges: SurfaceLine[] = [
      {
        side: "T",
        color: domainEdgeColor.T,
        width: 2.4,
        points: Array.from({ length: 81 }, (_, i) => at(0, (0.975 * i) / 80)),
      },
      {
        side: "S",
        color: domainEdgeColor.S,
        width: 2.4,
        points: Array.from({ length: 61 }, (_, i) => at(i / 120, 0)),
      },
    ];
    return { faces, edges };
  }, [rotation, roll]);
  function selectTracePoint(
    event: MouseEvent<SVGPathElement>,
    points: readonly { x: number; y: number; time: number }[],
  ) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg || !points.length) return;
    const cursor = svg.createSVGPoint();
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    const transform = svg.getScreenCTM();
    if (!transform) return;
    const local = cursor.matrixTransform(transform.inverse());
    let nearest = points[0],
      distance = Infinity;
    for (const point of points) {
      const q = mode === "folded" ? project(point) : schematic(point),
        d = Math.hypot(q.x - local.x, q.y - local.y);
      if (d < distance) {
        distance = d;
        nearest = point;
      }
    }
    onSeek(nearest.time);
  }
  const drawable = segments.map((seg) => ({
    seg,
    points: [
      ...seg.points.filter((p) => p.time <= time),
      ...(time >= seg.start && time <= seg.end
        ? [{ ...apply(seg.matrix, z), time }]
        : []),
    ],
  }));
  return (
    <>
      <div className="quotient-mode" role="group" aria-label="Quotient view">
        <button
          className={mode === "folded" ? "active" : ""}
          onClick={() => setMode("folded")}
        >
          Folded domain
        </button>
        <button
          className={mode === "schematic" ? "active" : ""}
          onClick={() => setMode("schematic")}
        >
          Schematic 3D
        </button>
      </div>
      <div className="quotient-plot">
        <svg
          {...rotationControls}
          data-current-domain={domainFocus?.key}
          data-seam={domainFocus?.seam}
          viewBox="0 0 380 370"
          role="img"
          aria-label={
            mode === "folded"
              ? "Modular fundamental domain with paired vertical and circular seams, and the reduced trajectory."
              : "Schematic punctured sphere, with one cusp and cone points of orders 2 and 3."
          }
        >
          <defs>
            <linearGradient
              id={`${id}-domain-fill`}
              x1="0"
              y1="1"
              x2="0"
              y2="0"
            >
              <stop offset="0" stopColor="#e3e9d7" />
              <stop offset="1" stopColor="#edf0e5" stopOpacity="0.1" />
            </linearGradient>
            <clipPath id={`${id}-quotient-clip`}>
              <rect width="380" height="355" />
            </clipPath>
          </defs>
          {mode === "folded" ? (
            <>
              <path
                d={`M72.5 20 L72.5 328 ${path(circle).replace(/^M/, "L")} L307.5 20 Z`}
                fill={`url(#${id}-domain-fill)`}
              />
              <path
                d="M72.5 20V328 M307.5 20V328"
                stroke={domainEdgeColor.T}
                data-domain-side="T"
                strokeWidth={domainFocus?.seam === "T" ? 5 : 2}
                strokeDasharray="6 4"
                fill="none"
              />
              <path
                d={path(circle)}
                stroke={domainEdgeColor.S}
                data-domain-side="S"
                strokeWidth={domainFocus?.seam === "S" ? 5 : 2}
                fill="none"
              />
              <text x="190" y="32" className="svg-muted" textAnchor="middle">
                one cusp · y → ∞
              </text>
              <path d="M190 57v-14m-4 4 4-4 4 4" stroke="#8a9488" fill="none" />
              <text
                x="190"
                y="170"
                className="domain-letter"
                textAnchor="middle"
              >
                ℱ
              </text>
              <text x="55" y="200" className="svg-muted" textAnchor="middle">
                T
              </text>
              <text x="325" y="200" className="svg-muted" textAnchor="middle">
                T⁻¹
              </text>
              <text x="190" y="348" className="svg-muted" textAnchor="middle">
                S : z ↦ −1/z
              </text>
              <text x="72" y="365" className="svg-muted" textAnchor="middle">
                −½
              </text>
              <text x="307" y="365" className="svg-muted" textAnchor="middle">
                ½
              </text>
              {[
                { x: 0, y: 1, n: "2" },
                { x: -0.5, y: Math.sqrt(3) / 2, n: "3" },
                { x: 0.5, y: Math.sqrt(3) / 2, n: "3" },
              ].map((q, i) => {
                const s = project(q);
                return (
                  <g key={i}>
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r="5"
                      fill="#f7f7ef"
                      stroke="#8a7497"
                    />
                    <text
                      x={s.x + (i === 1 ? 13 : i === 2 ? -13 : 0)}
                      y={s.y - 12}
                      className="svg-muted"
                      textAnchor="middle"
                    >
                      {q.n}
                    </text>
                  </g>
                );
              })}
              <g clipPath={`url(#${id}-quotient-clip)`}>
                {selectedRun?.segments.map((s, i) => (
                  <path
                    key={`selected-${i}`}
                    data-selected-run={selectedRun.term}
                    d={path(s.points.map(project))}
                    fill="none"
                    stroke={selectedRun.color}
                    strokeWidth={4}
                    onClick={(event) => selectTracePoint(event, s.points)}
                  />
                ))}
                {drawable.map(({ seg, points }, i) => (
                  <path
                    key={i}
                    d={path(points.map(project))}
                    stroke="#c7744d"
                    strokeWidth="1.8"
                    fill="none"
                    opacity="0.65"
                    onClick={(event) => selectTracePoint(event, points)}
                  />
                ))}
                {point.y < 20 ? (
                  <text
                    x="190"
                    y="75"
                    className="svg-muted"
                    textAnchor="middle"
                  >
                    ↑ point higher in cusp
                  </text>
                ) : (
                  <>
                    <line
                      x1={point.x}
                      y1={point.y}
                      x2={point.x + (tv.x / len) * 18}
                      y2={point.y + (tv.y / len) * 18}
                      stroke="#a95734"
                      strokeWidth="2"
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="#c7744d"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  </>
                )}
              </g>
            </>
          ) : (
            <>
              <TranslucentSurface
                faces={surface.faces}
                lines={[
                  ...surface.edges.map((edge) => ({
                    ...edge,
                    width: domainFocus?.seam === edge.side ? 5 : edge.width,
                  })),
                  ...(selectedRun?.segments.map((s) => ({
                    points: s.points.map(schematic),
                    color: selectedRun.color,
                    width: 4,
                    selectedRun: selectedRun.term,
                    onSelect: (event: MouseEvent<SVGPathElement>) =>
                      selectTracePoint(event, s.points),
                  })) ?? []),
                  ...drawable.map(({ points }) => ({
                    points: points.map(schematic),
                    color: "#b74d29",
                    width: 2.5,
                    trail: true,
                    onSelect: (event: MouseEvent<SVGPathElement>) =>
                      selectTracePoint(event, points),
                  })),
                ]}
              />
              <circle
                cx={schematic(p).x}
                cy={schematic(p).y}
                r="5"
                fill="#c7744d"
                stroke="#fff"
              />
              {[
                { x: 0, y: 1, n: "order 2" },
                { x: -0.5, y: Math.sqrt(3) / 2, n: "order 3" },
              ].map((q) => {
                const a = schematic(q);
                return (
                  <g key={q.n}>
                    <circle cx={a.x} cy={a.y} r="4" fill="#8a7497" />
                    <text
                      x={a.x}
                      y={a.y + 20}
                      textAnchor="middle"
                      className="svg-muted"
                    >
                      {q.n}
                    </text>
                  </g>
                );
              })}
              <text
                x={cusp.x}
                y={Math.max(40, Math.min(350, cusp.y - 12))}
                textAnchor="middle"
                className="svg-muted"
              >
                cusp
              </text>
            </>
          )}
          {selectedRun && (
            <text
              x={14}
              y={18}
              fill={selectedRun.color}
              fontSize={11}
              stroke="#fbfbf6"
              strokeWidth={3}
              paintOrder="stroke"
              data-run-label={selectedRun.term}
            >
              {selectedRun.segments.length
                ? `a${selectedRun.term} · selected run`
                : selectedRun.term === 0
                  ? "a₀ · starting bracket"
                  : `a${selectedRun.term} · no displayed crossings`}
            </text>
          )}
        </svg>
      </div>
      {mode === "schematic" && <p className="rotation-hint">{rotationHint}</p>}
      <DomainEdgeLegend />
      <div className="quotient-caption">
        {limited
          ? "Precision limit: the verified trace ends before the requested cutoff."
          : mode === "folded"
            ? "Paired boundaries are the same points. The trace splits at every seam."
            : "Translucent surface: faint curve segments pass behind it. The Euclidean shape is schematic, not the hyperbolic metric."}
      </div>
      <details className="matrix-details">
        <summary>
          Inspect transformation <span>PSL(2, ℤ)</span>
        </summary>
        <div className="matrix-content">
          <code>
            [ {reduced.matrix.slice(0, 2).join("  ")} ;{" "}
            {reduced.matrix.slice(2).join("  ")} ]
          </code>
          <span>z ↦ (az + b)/(cz + d)</span>
          <span>
            Reduced point ≈ {p.x.toFixed(5)} + {p.y.toPrecision(5)}i
          </span>
        </div>
      </details>
    </>
  );
}
