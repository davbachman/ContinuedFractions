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
    const out: { j: number; points: Point[]; depth: number }[] = [];
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
                  stroke={edges ? "#607568" : "none"}
                />
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
            {mesh.map((cell, i) => (
              <path
                key={i}
                d={svgPath(cell.points) + "Z"}
                fill={stageColor(cell.j)}
                fillOpacity={0.68}
                stroke={stageColor(cell.j)}
                strokeWidth={0.3}
              />
            ))}
            {edges &&
              [0, 1, 2, 3, 4, 5].map((j) => (
                <path
                  key={j}
                  d={svgPath(
                    Array.from({ length: 65 }, (_, i) =>
                      project(
                        {
                          x: -0.5,
                          y: Math.sqrt(3) / 2 / (0.045 + (0.955 * i) / 64),
                        },
                        j,
                      ),
                    ),
                  )}
                  fill="none"
                  stroke="#29483e"
                  strokeWidth={1}
                />
              ))}
            <text x={190} y={25} textAnchor="middle" className="svg-muted">
              SCHEMATIC · X-RAY TRAIL · CUSP CUTAWAY
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
        {trail &&
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
