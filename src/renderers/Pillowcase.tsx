import { useSurfaceRotation, rotationHint } from "./useSurfaceRotation";
import { useEffect, useMemo, useState, useId } from "react";
import {
  branchPoints,
  meridianCurves,
  meridianTrace,
} from "../math/pillowcase";
import { embeddedTorus } from "../math/modularTorus";
import {
  label,
  parseRational,
  rational,
  type Rational,
} from "../math/rational";
import { surfaceProjection, svgPath } from "./ModularTorus";
const basisColors = ["#0072b2", "#d55e00"];
const liftColors = ["#3d7b78", "#9b4f89"];
const compact = (s: string) =>
  s.length > 20 ? s.slice(0, 9) + "…" + s.slice(-7) : s;
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
  const id = useId();
  const [showBasis, setShowBasis] = useState(true);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [rotation, setRotation] = useState(-0.7),
    [roll, setRoll] = useState(0),
    [slope, setSlope] = useState(label(fraction));
  const rotationControls = useSurfaceRotation(
    rotation,
    setRotation,
    true,
    -0.7,
    roll,
    setRoll,
  );
  useEffect(() => {
    setSlope(label(fraction));
    setProgress(0);
  }, [fraction]);
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
            roll,
          ),
        ),
      ),
    [rotation, roll],
  );
  const basis = useMemo(
    () => [
      Array.from({ length: 97 }, (_, i) => ({ x: i / 96, y: 0 })),
      Array.from({ length: 97 }, (_, i) => ({ x: 0.125, y: i / 96 })),
    ],
    [],
  );
  const trace = meridianTrace(fraction, progress / 1000);
  const winding = [fraction.q, fraction.p];
  const torus = (p: { x: number; y: number }) =>
    surfaceProjection(embeddedTorus(p), rotation, roll);
  return (
    <div className="pillowcase-panel">
      <p className="topology-note">
        <strong>The fraction is a winding ratio.</strong> For p/q, a lifted loop
        winds q times around the hole (U) and p times around the tube (V). The
        two colored loops lie over one separating curve on the pillowcase.
      </p>
      <div className="pillowcase-grid">
        <div>
          <h3>Upstairs · read the fraction on the torus</h3>
          <div className="pillow-windings" data-testid="pillow-windings">
            <div>
              <span>Slope p/q</span>
              <strong>{label(fraction)}</strong>
            </div>
            <div style={{ borderColor: basisColors[0] }}>
              <span>U · around the hole</span>
              <strong data-winding="u">q = {String(fraction.q)}</strong>
            </div>
            <div style={{ borderColor: basisColors[1] }}>
              <span>V · around the tube</span>
              <strong data-winding="v">p = {String(fraction.p)}</strong>
            </div>
          </div>
          <p className="pillow-reading">
            One circuit of loop A:{" "}
            <strong>
              {String(fraction.q)} U turns and {String(fraction.p)} V turns
            </strong>
            .
            {fraction.p < 0n
              ? " The negative V count means traveling opposite to the V arrow."
              : !fraction.q
                ? " With no U winding, the slope is ∞."
                : !fraction.p
                  ? " With no V winding, the slope is 0."
                  : " Slope = V winding ÷ U winding."}
          </p>
          <svg
            {...rotationControls}
            viewBox="0 -35 380 440"
            className="topology-svg"
            role="img"
            aria-label="Marked branched-cover torus with two parallel meridians"
            data-slope={label(fraction)}
          >
            <title>
              Marked slope {label(fraction)}: {String(fraction.q)} U turns
              around the hole and {String(fraction.p)} V turns around the tube.
              Two lifts of one separating curve.
            </title>
            <defs>
              {basisColors.map((color, i) => (
                <marker
                  key={i}
                  id={`${id}-arrow-${i}`}
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L8 4L0 8Z" fill={color} />
                </marker>
              ))}
            </defs>
            {wires.map((points, i) => (
              <path
                key={i}
                d={svgPath(points)}
                fill="none"
                stroke="#99ad92"
                opacity={0.2}
              />
            ))}
            {showBasis &&
              basis.map((points, i) => {
                const anchor = torus(points[i ? 28 : 35]);
                const textY = i ? 394 : -15;
                return (
                  <g
                    key={i}
                    data-torus-basis={i ? "V" : "U"}
                    pointerEvents="none"
                  >
                    <path
                      d={svgPath(points.map(torus))}
                      fill="none"
                      stroke={basisColors[i]}
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                    <path
                      d={svgPath(
                        points.slice(i ? 15 : 20, i ? 29 : 36).map(torus),
                      )}
                      fill="none"
                      stroke={basisColors[i]}
                      strokeWidth="2.5"
                      markerEnd={`url(#${id}-arrow-${i})`}
                    />
                    <path
                      d={`M${anchor.x} ${anchor.y}L${i ? 270 : 110} ${i ? textY - 16 : textY + 8}`}
                      fill="none"
                      stroke={basisColors[i]}
                      strokeWidth="1"
                      opacity=".6"
                    />
                    <text
                      x="190"
                      y={textY}
                      textAnchor="middle"
                      fill={basisColors[i]}
                      fontSize="13"
                      fontWeight="600"
                    >
                      {i ? "V: around the tube" : "U: around the hole"} ·{" "}
                      {compact(String(winding[i]))} turns
                      <title>{String(winding[i])} turns</title>
                    </text>
                  </g>
                );
              })}
            {data.curves.map((points, i) => (
              <g
                key={i}
                data-torus-lift={i ? "B" : "A"}
                opacity={highlight === null || highlight === i ? 1 : 0.16}
              >
                <path
                  d={svgPath(points.map(torus))}
                  fill="none"
                  stroke="#fffaf0"
                  strokeWidth={highlight === i ? 5 : 4}
                  opacity=".65"
                />
                <path
                  d={svgPath(points.map(torus))}
                  fill="none"
                  stroke={liftColors[i]}
                  strokeWidth={highlight === i ? 3.5 : 2.5}
                />
              </g>
            ))}
            {trace &&
              [trace.a, trace.b].map((p, i) => {
                const a = torus(p),
                  x = a.x + (i ? -18 : 18),
                  y = a.y + (i ? 20 : -20);
                return (
                  <g
                    key={i}
                    data-lift-marker={i ? "B" : "A"}
                    pointerEvents="none"
                  >
                    <path
                      d={`M${a.x} ${a.y}L${x} ${y}`}
                      stroke={liftColors[i]}
                      strokeWidth="1"
                    />
                    <circle
                      cx={a.x}
                      cy={a.y}
                      r="5"
                      fill={liftColors[i]}
                      stroke="#fffaf0"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="700"
                      fill={liftColors[i]}
                      stroke="#fffaf0"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {i ? "B" : "A"}
                    </text>
                  </g>
                );
              })}
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
          </svg>
          <div
            className="pillow-legend"
            role="group"
            aria-label="Highlight lifted loops"
          >
            {liftColors.map((color, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={highlight === i}
                style={{ borderBottomColor: color, color }}
                onClick={() => setHighlight(highlight === i ? null : i)}
              >
                Loop {i ? "B" : "A"} · lift {i + 1}
              </button>
            ))}
            <label>
              <input
                type="checkbox"
                checked={showBasis}
                onChange={(e) => setShowBasis(e.target.checked)}
              />{" "}
              Show coordinate loops
            </label>
          </div>
          <p>
            Solid A and B are the two lifts of the same pillowcase curve. The
            dashed U and V loops give the fixed coordinate directions; they
            rotate with the surface.
          </p>
          <label className="pillow-trace-control">
            Trace one circuit of loop A
            <input
              type="range"
              min="0"
              max="1000"
              step="1"
              value={progress}
              disabled={data.limited}
              aria-label="Trace lifted curve"
              onChange={(e) => setProgress(Number(e.target.value))}
            />
          </label>
          <p
            className="pillow-trace-readout"
            data-testid="pillow-trace-readout"
          >
            {data.limited ? (
              "Tracing is unavailable above the curve display limit; the winding counts remain exact."
            ) : (
              <>
                {progress / 10}% of one circuit · U turns:{" "}
                {label(rational(fraction.q * BigInt(progress), 1000n))} · V
                turns: {label(rational(fraction.p * BigInt(progress), 1000n))}.
                The two marked points project to the same dot on the pillowcase.
              </>
            )}
          </p>
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
                {trace && trace.image.face === face && (
                  <g data-pillow-trace="true" pointerEvents="none">
                    <circle
                      cx={160 * trace.image.x}
                      cy={160 * trace.image.y}
                      r="6"
                      fill={liftColors[0]}
                      stroke="#fffaf0"
                      strokeWidth="2"
                    />
                    <text
                      x={Math.max(18, Math.min(142, 160 * trace.image.x))}
                      y={Math.max(18, Math.min(146, 160 * trace.image.y - 12))}
                      textAnchor="middle"
                      fill="#244b40"
                      fontSize="12"
                      fontWeight="700"
                      stroke="#fffaf0"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      A = B
                    </text>
                  </g>
                )}
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
            Glue matching edges of FRONT and BACK to make the sphere around the
            tangle. The green curve is the boundary of a disk separating its two
            strands. The torus identifies (U,V) with (−U,−V), so A and B above
            have the same image here. Each lifted loop bounds a disk in the
            solid torus covering this tangle.
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
        slope to the modular-torus trajectory. This marked branched cover is
        separate from the six-sheeted hyperbolic torus. The donut is a schematic
        boundary display; its visible hole does not specify which slope bounds a
        disk in the filling.
      </p>
    </div>
  );
}
