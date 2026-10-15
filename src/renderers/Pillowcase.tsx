import { useSurfaceRotation, rotationHint } from "./useSurfaceRotation";
import { useEffect, useMemo, useState } from "react";
import { branchPoints, meridianCurves } from "../math/pillowcase";
import { embeddedTorus } from "../math/modularTorus";
import { label, parseRational, type Rational } from "../math/rational";
import { surfaceProjection, svgPath } from "./ModularTorus";
export function Pillowcase({
  fraction,
  onSlope,
  onTwist,
  onRotate,
  onError,
}: {
  fraction: Rational;
  onSlope: (r: Rational) => void;
  onTwist: (n: bigint) => void;
  onRotate: () => void;
  onError: (message: string) => void;
}) {
  const [rotation, setRotation] = useState(-0.7),
    [slope, setSlope] = useState(label(fraction));
  const rotationControls = useSurfaceRotation(
    rotation,
    setRotation,
    true,
    -0.7,
  );
  useEffect(() => setSlope(label(fraction)), [fraction]);
  const data = useMemo(() => meridianCurves(fraction), [fraction]);
  const wires = useMemo(
    () =>
      Array.from({ length: 24 }, (_, k) =>
        Array.from({ length: 81 }, (_, i) =>
          surfaceProjection(
            embeddedTorus(
              k < 12
                ? { x: k / 12, y: i / 80 }
                : { x: i / 80, y: (k - 12) / 12 },
            ),
            rotation,
          ),
        ),
      ),
    [rotation],
  );
  const torus = (p: { x: number; y: number }) =>
    surfaceProjection(embeddedTorus(p), rotation);
  return (
    <div className="pillowcase-panel">
      <p className="topology-note">
        <strong>Marked branched-cover torus → pillowcase.</strong> This torus
        covers the four-marked sphere by the involution (U,V) → (−U,−V). It is a
        different construction from the six-sheeted hyperbolic cover.
      </p>
      <div className="pillowcase-grid">
        <div>
          <h3>
            Upstairs · meridians (q,p) = ({String(fraction.q)},{" "}
            {String(fraction.p)})
          </h3>
          <svg
            {...rotationControls}
            viewBox="0 0 380 380"
            className="topology-svg"
            role="img"
            aria-label="Marked branched-cover torus with two parallel meridians"
          >
            {wires.map((points, i) => (
              <path
                key={i}
                d={svgPath(points)}
                fill="none"
                stroke="#99ad92"
                opacity={0.55}
              />
            ))}
            {data.curves.map((points, i) => (
              <path
                key={i}
                d={svgPath(points.map(torus))}
                fill="none"
                stroke={i ? "#ab6a3d" : "#3d7b78"}
                strokeWidth={2.5}
              />
            ))}
            {branchPoints.map((p) => {
              const q = torus(p);
              return (
                <g key={p.name}>
                  <circle cx={q.x} cy={q.y} r={4} fill="#885a88" />
                  <text x={q.x + 5} y={q.y - 7} className="svg-muted">
                    {p.name}
                  </text>
                </g>
              );
            })}
            <text x={190} y={355} textAnchor="middle" className="svg-muted">
              qV − pU = ±¼ · schematic, transparent surface
            </text>
          </svg>
          <p className="rotation-hint">{rotationHint}</p>
        </div>
        <div>
          <h3>Downstairs · separating-disk boundary</h3>
          <svg
            viewBox="0 0 420 270"
            className="pillowcase-svg"
            role="img"
            aria-label="Pillowcase front and back with four branch points and separating curve"
          >
            {[0, 1].map((face) => (
              <g key={face} transform={`translate(${face ? 235 : 25} 45)`}>
                <rect
                  width={160}
                  height={160}
                  rx={3}
                  fill={face ? "#e9eff0" : "#f3efdc"}
                  stroke="#8e9c8c"
                />
                {data.pillow
                  .filter((s) => s.face === face)
                  .map((s, i) => (
                    <path
                      key={i}
                      d={svgPath(
                        s.points.map((p) => ({ x: 160 * p.x, y: 160 * p.y })),
                      )}
                      fill="none"
                      stroke="#3d7b78"
                      strokeWidth={1.8}
                    />
                  ))}
                {[
                  [0, 0, "NW"],
                  [160, 0, "NE"],
                  [0, 160, "SW"],
                  [160, 160, "SE"],
                ].map(([x, y, name]) => (
                  <g key={name}>
                    <circle cx={x} cy={y} r={5} fill="#885a88" />
                    <text
                      x={x}
                      y={Number(y) + (Number(y) ? 23 : -12)}
                      textAnchor="middle"
                      className="svg-muted"
                    >
                      {name}
                    </text>
                  </g>
                ))}
                <text x={80} y={-30} textAnchor="middle" className="svg-muted">
                  {face ? "BACK" : "FRONT"}
                </text>
              </g>
            ))}
            <text x={210} y={255} textAnchor="middle" className="svg-muted">
              Matching boundaries glue; repeated labels are the same four
              points.
            </text>
          </svg>
          <p>
            The two parallel meridians upstairs are exchanged by the involution.
            Together they project to one separating curve downstairs. Each
            bounds a disk in the solid-torus branched cover of the tangle.
          </p>
        </div>
      </div>
      {data.limited && (
        <p className="topology-limit" role="status">
          Curve display limit: |p| + q must be at most 512. The marked slope and
          all operations remain exact.
        </p>
      )}
      <div className="tangle-controls">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              onSlope(parseRational(slope));
            } catch (error) {
              onError((error as Error).message);
            }
          }}
        >
          <label>
            Marked slope
            <input
              aria-label="Marked torus slope"
              value={slope}
              onChange={(e) => setSlope(e.target.value)}
            />
          </label>
          <button type="submit">Apply marked slope</button>
        </form>
        <button onClick={() => onTwist(1n)}>Dehn twist +1</button>
        <button onClick={() => onTwist(-1n)}>Dehn twist −1</button>
        <button onClick={onRotate}>Lift quarter-turn</button>
      </div>
      <p className="topology-note">
        Current marked slope: <strong>{label(fraction)}</strong>. In this
        verified marking, D(U,V)=(U,V+U) sends (q,p) to (q,p+q): the NE/SE
        half-twist downstairs. Active rotation lifts to (−V,U)+(0,½). These
        edits change the tangle and the shared rational; they do not assign a
        slope to the modular-torus trajectory.
      </p>
    </div>
  );
}
