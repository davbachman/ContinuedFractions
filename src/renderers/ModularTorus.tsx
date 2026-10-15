import { useMemo, useState } from "react";
import {
  apply,
  reduce,
  tangent,
  type Point,
  type Segment,
} from "../math/modular";
import {
  coverHex,
  coverSheet,
  coverSurface,
  embeddedTorus,
  hexCoordinates,
  hexVertex,
} from "../math/modularTorus";
import { heightAt } from "../math/trajectory";
import { DomainEdgeLegend, domainEdgeColor } from "./domainEdges";
import {
  TranslucentSurface,
  type SurfacePoint,
  type SurfaceLine,
} from "./TranslucentSurface";
import { stageColor } from "./dissectionColors";
export function surfaceProjection(p: readonly number[], rotation: number) {
  const x = p[0] * Math.cos(rotation) - p[1] * Math.sin(rotation),
    d = p[0] * Math.sin(rotation) + p[1] * Math.cos(rotation);
  return {
    x: 190 + x * 73,
    y: 190 - (p[2] * 0.85 - d * 0.52) * 95,
    depth: d * 0.85 + p[2] * 0.52,
  };
}
export const svgPath = (points: readonly Point[]) =>
  points
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)},${p.y.toFixed(3)}`)
    .join(" ");
export function ModularTorus({
  alpha,
  time,
  segments,
  limited,
  onSeek,
}: {
  alpha: number;
  time: number;
  segments: readonly Segment[];
  limited: boolean;
  onSeek: (t: number) => void;
}) {
  const [mode, setMode] = useState<"flat" | "surface">("flat"),
    [rotation, setRotation] = useState(-0.6),
    [lift, setLift] = useState(0),
    [edges, setEdges] = useState(true),
    [trail, setTrail] = useState(true),
    [labels, setLabels] = useState(true);
  const active = segments.find((s) => time >= s.start && time <= s.end),
    z = { x: alpha, y: heightAt(time) },
    matrix = active?.matrix ?? reduce(z).matrix;
  const p = apply(matrix, z),
    sheet = coverSheet(matrix, lift),
    v = tangent(matrix, z, { x: 0, y: -z.y });
  const project = (p: Point, j: number) =>
    mode === "flat"
      ? { x: 190 + 155 * coverHex(p, j).x, y: 190 - 155 * coverHex(p, j).y }
      : surfaceProjection(coverSurface(p, j), rotation);
  const current = project(p, sheet),
    moved = project({ x: p.x + v.x * 1e-5, y: p.y + v.y * 1e-5 }, sheet),
    norm = Math.hypot(moved.x - current.x, moved.y - current.y) || 1;
  const mesh = useMemo(() => {
    const out: { j: number; points: SurfacePoint[]; depth: number }[] = [];
    for (let j = 0; j < 6; j++)
      for (let r = 0; r < 16; r++)
        for (let u = 0; u < 12; u++) {
          const points = [
            [r, u],
            [r + 1, u],
            [r + 1, u + 1],
            [r, u + 1],
          ].map(([r, u]) => {
            const radius = 0.045 + (0.955 * r) / 16,
              t = u / 12,
              a = hexVertex(j),
              b = hexVertex(j + 1);
            return surfaceProjection(
              embeddedTorus(
                hexCoordinates({
                  x: radius * ((1 - t) * a.x + t * b.x),
                  y: radius * ((1 - t) * a.y + t * b.y),
                }),
              ),
              rotation,
            );
          });
          out.push({
            j,
            points,
            depth: points.reduce((n, p) => n + p.depth, 0) / 4,
          });
        }
    return out.sort((a, b) => a.depth - b.depth);
  }, [rotation]);
  const surfaceEdges: SurfaceLine[] = [
    ...Array.from({ length: 6 }, (_, j) => ({
      side: "T" as const,
      color: domainEdgeColor.T,
      width: 2.2,
      points: Array.from({ length: 81 }, (_, i) =>
        surfaceProjection(
          coverSurface(
            { x: -0.5, y: Math.sqrt(3) / 2 / (0.045 + (0.955 * i) / 80) },
            j,
          ),
          rotation,
        ),
      ),
    })),
    ...Array.from({ length: 3 }, (_, j) => ({
      side: "S" as const,
      color: domainEdgeColor.S,
      width: 2.2,
      points: Array.from({ length: 81 }, (_, i) => {
        const x = -0.5 + i / 80;
        return surfaceProjection(
          coverSurface({ x, y: Math.sqrt(1 - x * x) }, j),
          rotation,
        );
      }),
    })),
  ];
  const surfaceTrail: SurfaceLine[] = segments.map((s) => {
    const points = s.points.filter((p) => p.time <= time),
      j = coverSheet(s.matrix, lift);
    if (time >= s.start && time <= s.end)
      points.push({ ...apply(s.matrix, z), time });
    return {
      points: points.map((p) =>
        surfaceProjection(coverSurface(p, j), rotation),
      ),
      color: "#ac4029",
      width: 2.5,
      trail: true,
      onSelect: () => onSeek((s.start + Math.min(time, s.end)) / 2),
    };
  });
  return (
    <>
      <div
        className="quotient-mode"
        role="group"
        aria-label="Punctured torus display"
      >
        <button
          className={mode === "flat" ? "active" : ""}
          onClick={() => setMode("flat")}
        >
          Flat hexagon
        </button>
        <button
          className={mode === "surface" ? "active" : ""}
          onClick={() => setMode("surface")}
        >
          Torus 3D
        </button>
      </div>
      <div className="topology-options">
        <label>
          <input
            type="checkbox"
            checked={edges}
            onChange={(e) => setEdges(e.target.checked)}
          />
          Domain edges
        </label>
        <label>
          <input
            type="checkbox"
            checked={trail}
            onChange={(e) => setTrail(e.target.checked)}
          />
          Cover trail
        </label>
        <label>
          <input
            type="checkbox"
            checked={labels}
            onChange={(e) => setLabels(e.target.checked)}
          />
          Sheet labels
        </label>
        <label>
          Lift{" "}
          <select
            aria-label="Cover lift"
            value={lift}
            onChange={(e) => setLift(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
      </div>
      <svg
        className="topology-svg"
        viewBox="0 0 380 380"
        role="img"
        aria-label={
          mode === "flat"
            ? "Six-sheet punctured torus hexagon"
            : "Schematic six-sheet punctured torus"
        }
        data-sheet={sheet}
        data-trail-segments={
          trail ? segments.filter((s) => s.start <= time).length : 0
        }
      >
        {mode === "flat" ? (
          <>
            {[0, 1, 2, 3, 4, 5].map((j) => {
              const a = hexVertex(j),
                b = hexVertex(j + 1);
              return (
                <path
                  key={j}
                  d={`M190 190 L${190 + 155 * a.x} ${190 - 155 * a.y} L${190 + 155 * b.x} ${190 - 155 * b.y} Z`}
                  fill={stageColor(j)}
                  fillOpacity={0.32}
                  stroke="none"
                />
              );
            })}
            {edges &&
              [0, 1, 2, 3, 4, 5].map((j) => {
                const a = hexVertex(j),
                  b = hexVertex(j + 1);
                return (
                  <g key={j}>
                    <path
                      data-domain-side="T"
                      d={`M${190 + 7 * a.x} ${190 - 7 * a.y} L${190 + 155 * a.x} ${190 - 155 * a.y}`}
                      stroke={domainEdgeColor.T}
                      strokeWidth={2}
                    />
                    <path
                      data-domain-side="S"
                      d={`M${190 + 155 * a.x} ${190 - 155 * a.y} L${190 + 155 * b.x} ${190 - 155 * b.y}`}
                      stroke={domainEdgeColor.S}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
            <circle
              cx={190}
              cy={190}
              r={7}
              fill="#fbfbf6"
              stroke="#405e50"
              strokeDasharray="2 2"
            />
            <text x={190} y={211} textAnchor="middle" className="svg-muted">
              removed cusp
            </text>
            {edges &&
              [0, 1, 2, 3, 4, 5].map((j) => {
                const a = hexVertex(j),
                  b = hexVertex(j + 1);
                return (
                  <text
                    key={j}
                    x={190 + (175 * (a.x + b.x)) / 2}
                    y={190 - (175 * (a.y + b.y)) / 2}
                    textAnchor="middle"
                    className="svg-muted"
                  >
                    {["A →", "B →", "C →", "A ←", "B ←", "C ←"][j]}
                  </text>
                );
              })}
          </>
        ) : (
          <>
            <TranslucentSurface
              faces={mesh.map((cell) => ({
                points: cell.points,
                color: stageColor(cell.j),
              }))}
              lines={[
                ...(edges ? surfaceEdges : []),
                ...(trail ? surfaceTrail : []),
              ]}
            />
            <text x={190} y={25} textAnchor="middle" className="svg-muted">
              TRANSLUCENT SURFACE · CUSP CUTAWAY
            </text>
          </>
        )}
        {labels &&
          [0, 1, 2, 3, 4, 5].map((j) => {
            const a = project({ x: 0, y: 1 / 0.65 }, j);
            return (
              <text
                key={j}
                x={a.x}
                y={a.y}
                textAnchor="middle"
                fill="#163d32"
                fontSize={13}
              >
                T{["⁰", "¹", "²", "³", "⁴", "⁵"][j]}ℱ
              </text>
            );
          })}
        {mode === "flat" &&
          trail &&
          segments.map((s, i) => {
            const points = s.points.filter((p) => p.time <= time),
              j = coverSheet(s.matrix, lift);
            if (time >= s.start && time <= s.end)
              points.push({ ...apply(s.matrix, z), time });
            return (
              <path
                key={i}
                d={svgPath(points.map((p) => project(p, j)))}
                fill="none"
                stroke="#ac4029"
                strokeWidth={2}
                onClick={() => onSeek((s.start + Math.min(time, s.end)) / 2)}
              >
                <title>
                  Chart {i + 1}, sheet {j}; select this trajectory interval
                </title>
              </path>
            );
          })}
        <line
          x1={current.x}
          y1={current.y}
          x2={current.x + (16 * (moved.x - current.x)) / norm}
          y2={current.y + (16 * (moved.y - current.y)) / norm}
          stroke="#a53e28"
          strokeWidth={2}
        />
        <circle
          cx={current.x}
          cy={current.y}
          r={5}
          fill="#bd4d31"
          stroke="white"
          strokeWidth={2}
        />
      </svg>
      {mode === "surface" && (
        <label className="rotation">
          Rotate torus
          <input
            aria-label="Rotate punctured torus"
            type="range"
            min={-3.14}
            max={3.14}
            step={0.01}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
          />
        </label>
      )}
      {edges && <DomainEdgeLegend />}
      <p className="quotient-caption">
        Sheet {sheet} · χ(T)=1, χ(S)=3 · one cusp of width 6 · genus 1.{" "}
        {limited
          ? "Trajectory stops at the existing precision cutoff."
          : "Same H² trajectory; reverse and seeking preserve its lift."}
      </p>
      <p className="quotient-caption">
        Opposite outer hexagon edges are identified. This is the commutator
        cover, not Γ(2). Six full modular domains; twelve reflection triangles.
        Schematic geometry, not an isometric embedding.
      </p>
      <p className="quotient-caption">
        The endpoint α is not a homology slope on this torus. A cusp-to-cusp
        trajectory is not automatically simple or closed.
      </p>
    </>
  );
}
