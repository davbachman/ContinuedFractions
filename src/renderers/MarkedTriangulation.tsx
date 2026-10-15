import { useEffect, useMemo, useState, useRef } from "react";
import { type NumberSpec, specLabel } from "../math/continuedFraction";
import { label, value, type Rational } from "../math/rational";
import {
  INITIAL_TRIANGLE,
  initialTriangulation,
  triangulationPath,
  triangleKey,
  flip,
  flipDetails,
  appendFlip,
  wrappedEdge,
  targetItinerary,
  followStatus,
  type TriangulationState,
  type Triangulation,
  type Vector,
} from "../math/triangulation";
import {
  diskVertex,
  diskCenter,
  diskTriangle,
  flipColors,
  ratio,
} from "./triangulationGeometry";
import { svgPath } from "./ModularTorus";
type Props = {
  externalPlaying: boolean;
  spec: NumberSpec;
  state?: TriangulationState;
  speed: number;
  onChange: (state: TriangulationState, time?: number, term?: number) => void;
  onTarget: (r: Rational) => void;
  onError: (s: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showPlane: boolean;
  onShowPlane: (b: boolean) => void;
};
const short = (r: Rational) =>
  label(r).length > 20
    ? label(r).slice(0, 8) + "…" + label(r).slice(-7)
    : label(r);
export function MarkedTriangulation(props: Props) {
  const { spec, speed, onChange, onTarget, onError } = props,
    state = props.state ?? initialTriangulation;
  const path = useMemo(
      () => triangulationPath(state),
      [state.start, state.steps],
    ),
    tri = path[state.cursor];
  const [selected, setSelected] = useState(2),
    [puncture, setPuncture] = useState(false),
    [tiled, setTiled] = useState(true),
    [affine, setAffine] = useState(true),
    [playing, setPlaying] = useState(false),
    [frame, setFrame] = useState<Triangulation>(INITIAL_TRIANGLE),
    [transition, setTransition] = useState<ReturnType<
      typeof flipDetails
    > | null>(null),
    [patch, setPatch] = useState<ReturnType<typeof flipDetails> | null>(null);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const previous = useRef(tri);
  useEffect(() => {
    const before = previous.current;
    previous.current = tri;
    if (triangleKey(before) === triangleKey(tri)) return;
    const changed = before.flatMap((r, i) =>
      label(r) !== label(tri[i]) ? [i] : [],
    );
    if (
      changed.length === 1 &&
      triangleKey(flip(before, changed[0])) === triangleKey(tri)
    ) {
      const details = flipDetails(before, changed[0]);
      setSelected(changed[0]);
      setPatch(details);
      if (!reduced()) setTransition(details);
    } else {
      setPatch(null);
      setTransition(null);
    }
  }, [tri]);
  useEffect(() => {
    if (!transition) return;
    const timer = setTimeout(() => setTransition(null), 700);
    return () => clearTimeout(timer);
  }, [transition]);
  useEffect(() => {
    if (transition && triangleKey(transition.after) !== triangleKey(tri))
      setTransition(null);
  }, [tri, transition]);
  useEffect(() => {
    setPlaying(false);
  }, [spec, state.mode]);
  useEffect(() => {
    if (props.externalPlaying) setPlaying(false);
  }, [props.externalPlaying]);
  const commit = (next: TriangulationState, time?: number, term?: number) => {
    try {
      onChange(next, time, term);
    } catch (e) {
      onError((e as Error).message);
    }
  };
  function manual(edge: number, source: "torus" | "farey") {
    if (state.mode !== "manual") return;
    try {
      const details = flipDetails(tri, edge),
        next = appendFlip(state, edge, source);
      setSelected(edge);
      setPatch(details);
      if (!reduced()) setTransition(details);
      commit(next);
      props.onShowPlane(true);
    } catch (e) {
      onError((e as Error).message);
    }
  }
  function navigate(cursor: number) {
    if (cursor < 0 || cursor >= path.length) return;
    const step = state.steps[cursor - 1],
      forward = cursor > state.cursor;
    if (Math.abs(cursor - state.cursor) === 1) {
      const edge = state.steps[forward ? state.cursor : cursor].edge,
        details = flipDetails(tri, edge);
      setSelected(edge);
      setPatch(details);
      if (!reduced()) setTransition(details);
    } else setTransition(null);
    commit(
      { ...state, cursor },
      state.mode === "follow" ? (step?.time ?? 0) : undefined,
      state.mode === "follow" ? (step?.term ?? 0) : undefined,
    );
  }
  useEffect(() => {
    if (!playing) return;
    if (state.cursor >= state.steps.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => navigate(state.cursor + 1), 1400 / speed);
    return () => clearTimeout(timer);
  }, [playing, state, speed]);
  const shown = transition?.before ?? tri,
    wrapped = useMemo(() => shown.map((r) => wrappedEdge(r)), [shown]);
  const operation = patch ?? flipDetails(tri, selected);
  const extent = operation.quad.reduce(
    (m, v) =>
      [v.x < 0n ? -v.x : v.x, v.y < 0n ? -v.y : v.y].reduce(
        (a, b) => (a > b ? a : b),
        m,
      ),
    1n,
  );
  const u = operation.quad[1],
    v = operation.quad[3],
    det = u.x * v.y - u.y * v.x;
  const qp = (w: Vector) =>
    affine
      ? {
          x: 110 + 160 * Number((w.x * v.y - w.y * v.x) / det),
          y: 270 - 160 * Number((u.x * w.y - u.y * w.x) / det),
        }
      : {
          x: 190 + 120 * ratio(w.x, extent),
          y: 180 - 120 * ratio(w.y, extent),
        };
  const pts = operation.quad.map(qp),
    left = Math.min(...pts.map((p) => p.x)),
    right = Math.max(...pts.map((p) => p.x)),
    top = Math.min(...pts.map((p) => p.y)),
    bottom = Math.max(...pts.map((p) => p.y));
  const patchView = `${left - 40} ${top - 40} ${Math.max(100, right - left + 80)} ${Math.max(100, bottom - top + 80)}`;
  const square = (p: { x: number; y: number }) => ({
    x: 45 + 260 * p.x,
    y: 305 - 260 * p.y,
  });
  const neighbors = tri.map((_, i) => flip(tri, i));
  const disk = (p: { x: number; y: number }) => ({
    x: 190 + 145 * p.x,
    y: 185 + 145 * p.y,
  });
  const faceData = flipDetails(shown, 2);
  const faceCopies = faceData.triangles.flatMap((triangle, k) => {
    const xs = triangle.map((v) => Number(v.x)),
      ys = triangle.map((v) => Number(v.y));
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    if ((maxX - minX + 2) * (maxY - minY + 2) > 180) return [];
    const copies = [];
    for (let x = Math.ceil(-maxX); x <= Math.floor(1 - minX); x++)
      for (let y = Math.ceil(-maxY); y <= Math.floor(1 - minY); y++)
        copies.push({
          k,
          points: triangle.map((v) =>
            square({ x: Number(v.x) + x, y: Number(v.y) + y }),
          ),
        });
    return copies;
  });
  const activeStatus =
    state.mode === "follow"
      ? followStatus(spec, state)
      : "Manual flips change this marked triangulation, not the target number.";
  return (
    <section className="panel triangulation-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-number">05</span>
          <h2>Marked torus · edge flips</h2>
        </div>
        <span className="small-tag">FIXED BASIS (q,p)</span>
      </div>
      <p className="topology-note">
        Two triangles, one identified vertex. This is the Farey correspondence
        for a marked torus, a separate model from the six-sheet hyperbolic
        cover. Target α = <strong>{specLabel(spec)}</strong>.
      </p>
      <div
        className="tangle-controls"
        role="group"
        aria-label="Triangulation editing mode"
      >
        <button
          aria-pressed={state.mode === "manual"}
          onClick={() => {
            setPlaying(false);
            commit({
              ...state,
              mode: "manual",
              steps: state.steps.slice(0, state.cursor),
            });
          }}
        >
          Manual flips
        </button>
        <button
          aria-pressed={state.mode === "follow"}
          onClick={() => {
            setPatch(null);
            setTransition(null);
            setPlaying(false);
            commit(targetItinerary(spec, state.horizon), 0, 0);
            props.onShowPlane(true);
          }}
        >
          Follow target
        </button>
        <label>
          <input
            type="checkbox"
            checked={props.showPlane}
            onChange={(e) => props.onShowPlane(e.target.checked)}
          />
          Show triangulation in H²
        </label>
        <label>
          <input
            type="checkbox"
            checked={puncture}
            onChange={(e) => setPuncture(e.target.checked)}
          />
          Puncture at vertex
        </label>
        <label>
          <input
            type="checkbox"
            checked={tiled}
            onChange={(e) => setTiled(e.target.checked)}
          />
          Tiled-plane inset
        </label>
      </div>
      <div className="triangulation-grid">
        <div>
          <h3>Marked square · opposite sides identified</h3>
          <svg
            viewBox="0 0 380 370"
            role="group"
            aria-label="Marked torus triangulation"
            data-slopes={triangleKey(tri)}
          >
            <defs>
              <clipPath id="marked-square-clip">
                <rect x={45} y={45} width={260} height={260} />
              </clipPath>
              <marker
                id="basis-arrow"
                markerWidth={7}
                markerHeight={7}
                refX={6}
                refY={3.5}
                orient="auto"
              >
                <path d="M0 0L7 3.5L0 7Z" fill="#425b48" />
              </marker>
            </defs>
            <rect
              x={45}
              y={45}
              width={260}
              height={260}
              fill="#f3f3e8"
              stroke="#70816c"
            />
            <g
              clipPath="url(#marked-square-clip)"
              className={transition ? "flip-incident-triangles" : ""}
            >
              {faceCopies.map((f, i) => (
                <path
                  key={i}
                  d={svgPath(f.points) + "Z"}
                  fill={f.k ? "#ead9b9" : "#dce9da"}
                />
              ))}
            </g>
            {wrapped.map((w, i) => (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`Flip torus edge ${label(shown[i])}`}
                aria-disabled={state.mode !== "manual"}
                onFocus={() => setSelected(i)}
                onClick={() => manual(i, "torus")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    manual(i, "torus");
                  }
                }}
              >
                <title>
                  Edge class {label(shown[i])}; both boundary copies select this
                  same edge
                </title>
                {w.segments.map((segment, j) => {
                  const d = svgPath(
                    segment.map((p) =>
                      square({ x: value(p.x), y: value(p.y) }),
                    ),
                  );
                  return (
                    <g key={j}>
                      <path
                        d={d}
                        stroke="transparent"
                        strokeWidth={18}
                        fill="none"
                      />
                      <path
                        d={d}
                        stroke={flipColors[i]}
                        strokeWidth={selected === i ? 4 : 2.7}
                        fill="none"
                        pointerEvents="none"
                      />
                    </g>
                  );
                })}
              </g>
            ))}
            {[0, 1].flatMap((x) =>
              [0, 1].map((y) => (
                <circle
                  key={`${x}${y}`}
                  cx={45 + 260 * x}
                  cy={45 + 260 * y}
                  r={puncture ? 7 : 4}
                  fill={puncture ? "#fbfbf6" : "#425b48"}
                  stroke="#425b48"
                  strokeDasharray={puncture ? "2 2" : undefined}
                />
              )),
            )}
            <path
              d="M45 332H155 M22 305V195"
              stroke="#425b48"
              markerEnd="url(#basis-arrow)"
            />
            <text x={170} y={337} className="svg-muted">
              meridian (1,0) → 0
            </text>
            <text x={45} y={25} className="svg-muted">
              longitude (0,1) ↑ ∞
            </text>
            <text x={175} y={360} textAnchor="middle" className="svg-muted">
              All four corners are the same marked vertex.
            </text>
          </svg>
          {wrapped.some((w) => w.limited) && (
            <p className="topology-limit" role="status">
              Wrap display limit: edges with |p|+q &gt; 160 are hidden. Exact
              slopes and all three flip controls remain available.
            </p>
          )}
          {!faceCopies.length && (
            <p className="topology-limit">
              Face shading exceeds the tile budget; edge classes remain exact.
            </p>
          )}
        </div>
        <div>
          <h3>Farey triangles · click a neighboring triangle</h3>
          <svg
            viewBox="0 0 380 370"
            role="group"
            aria-label="Interactive Farey triangles"
            data-slopes={triangleKey(tri)}
          >
            <circle cx={190} cy={185} r={145} fill="#f6f5ec" stroke="#b5c3aa" />
            {neighbors.map((t, i) => (
              <path
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`Flip via Farey triangle replacing ${label(tri[i])} with ${label(t[i])}`}
                aria-disabled={state.mode !== "manual"}
                onClick={() => manual(i, "farey")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    manual(i, "farey");
                  }
                }}
                d={svgPath(diskTriangle(t, frame).map(disk)) + "Z"}
                fill={flipColors[i] + "20"}
                stroke={flipColors[i]}
                strokeWidth={1.4}
              />
            ))}
            <path
              data-current-farey-triangle="true"
              d={svgPath(diskTriangle(tri, frame).map(disk)) + "Z"}
              fill="#e4bf6680"
              stroke="#887243"
              strokeWidth={2}
            />
            <path
              data-dual-flip-path="true"
              d={svgPath(
                path
                  .slice(0, state.cursor + 1)
                  .map((t) => disk(diskCenter(t, frame))),
              )}
              fill="none"
              stroke="#4e6652"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            {tri.map((r, i) => {
              const a = diskVertex(r, frame),
                p = disk(a);
              return (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={5} fill={flipColors[i]} />
                  <text
                    x={190 + 164 * a.x}
                    y={190 + 164 * a.y}
                    textAnchor="middle"
                    fill={flipColors[i]}
                    fontSize={13}
                  >
                    {short(r)}
                    <title>{label(r)}</title>
                  </text>
                </g>
              );
            })}
            {neighbors.map((t, i) => {
              const a = diskVertex(t[i], frame);
              return (
                <text
                  key={i}
                  x={190 + 163 * a.x}
                  y={190 + 163 * a.y}
                  textAnchor="middle"
                  fill={flipColors[i]}
                  fontSize={11}
                >
                  {short(t[i])}
                  <title>{label(t[i])}</title>
                </text>
              );
            })}
            <circle
              cx={disk(diskCenter(tri, frame)).x}
              cy={disk(diskCenter(tri, frame)).y}
              r={4}
              fill="#425b48"
            />
          </svg>
          <div className="tangle-controls">
            <button onClick={() => setFrame(tri)}>Center Farey triangle</button>
            <button onClick={() => setFrame(INITIAL_TRIANGLE)}>
              Reset Farey camera
            </button>
          </div>
          <p className="topology-note">
            Dotted line: the recorded dual-tree walk, including backtracks. The
            disk camera changes coordinates only; the marking and slope labels
            stay fixed.
          </p>
        </div>
      </div>
      <div className="flip-edge-controls">
        {tri.map((r, i) => (
          <div key={i} style={{ borderColor: flipColors[i] }}>
            <strong
              style={{ color: flipColors[i] }}
              data-testid={`triangulation-slope-${i}`}
            >
              {label(r)}
            </strong>
            <button
              disabled={state.mode !== "manual"}
              onClick={() => manual(i, "torus")}
            >
              Flip edge {short(r)}
            </button>
            <button
              onClick={() => {
                setSelected(i);
                setPatch(flipDetails(tri, i));
              }}
            >
              Inspect edge {short(r)}
            </button>
            <button
              aria-label={`Use slope ${label(r)} as target`}
              onClick={() => onTarget(r)}
            >
              Use this slope as target
            </button>
          </div>
        ))}
      </div>
      <div className="flip-patch">
        <h3>Unfolded quadrilateral · both incident triangles</h3>
        <div className="tangle-controls">
          <button aria-pressed={affine} onClick={() => setAffine(true)}>
            Affine patch close-up
          </button>
          <button aria-pressed={!affine} onClick={() => setAffine(false)}>
            Fixed-basis patch
          </button>
        </div>
        <p className="topology-note">
          {affine
            ? "Affine close-up in the two retained-edge directions; vertex labels and the tiled grid retain their original coordinates. This changes only the display, not the torus marking."
            : "Unfolded patch in the fixed meridian–longitude coordinates; deep flips can produce very thin quadrilaterals."}
        </p>
        <p data-testid="flip-operation-caption">
          Retain {operation.retained.map(label).join(" and ")}; replace{" "}
          {label(operation.removed)} with {label(operation.inserted)}.
        </p>
        <svg
          viewBox={patchView}
          role="img"
          aria-label="Universal-cover flip quadrilateral"
          className={transition ? "flip-animating" : ""}
          key={triangleKey(operation.before) + operation.edge + state.cursor}
        >
          {tiled &&
            extent <= 12n &&
            Array.from({ length: 49 }, (_, i) => i - 24).flatMap((i) => {
              const n = BigInt(i);
              return [
                <path
                  key={`x${i}`}
                  d={svgPath([qp({ x: n, y: -24n }), qp({ x: n, y: 24n })])}
                  stroke="#d9dfd1"
                />,
                <path
                  key={`y${i}`}
                  d={svgPath([qp({ x: -24n, y: n }), qp({ x: 24n, y: n })])}
                  stroke="#d9dfd1"
                />,
              ];
            })}
          {operation.triangles.map((t, i) => (
            <path
              key={i}
              d={svgPath(t.map(qp)) + "Z"}
              fill={i ? "#e8cea6b0" : "#bcd8b9b0"}
              stroke="#60755f"
            />
          ))}
          {operation.quad.map((w, i) => {
            const retainedSlots = [0, 1, 2].filter((j) => j !== operation.edge);
            return (
              <path
                key={`edge${i}`}
                d={svgPath([qp(w), qp(operation.quad[(i + 1) % 4])])}
                stroke={flipColors[retainedSlots[i % 2]]}
                strokeWidth={2}
                fill="none"
              />
            );
          })}
          <path
            className="old-flip-diagonal"
            d={svgPath(operation.oldDiagonal.map(qp))}
            stroke={flipColors[operation.edge]}
            strokeWidth={3}
            strokeDasharray="6 4"
            fill="none"
          />
          <path
            className="new-flip-diagonal"
            d={svgPath(operation.newDiagonal.map(qp))}
            stroke={flipColors[operation.edge]}
            strokeWidth={3}
            fill="none"
          />
          {operation.quad.map((v, i) => {
            const p = qp(v);
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={3} fill="#425b48" />
                <text x={p.x + 4} y={p.y - 7} fontSize={10}>
                  ({String(v.x).length > 10 ? "large" : String(v.x)},{" "}
                  {String(v.y).length > 10 ? "large" : String(v.y)})
                  <title>
                    ({String(v.x)}, {String(v.y)})
                  </title>
                </text>
              </g>
            );
          })}
        </svg>
        <p className="topology-note">
          Dashed: old diagonal. Solid: replacement. The quadrilateral is
          reconstructed upstairs, even when its edges wrap across several copies
          of the square. Apparent boundary meetings need not be new vertices.
        </p>
      </div>
      <div
        className="tangle-controls"
        role="group"
        aria-label="Flip path transport"
      >
        <button
          disabled={!state.cursor}
          onClick={() => {
            setPlaying(false);
            navigate(state.cursor - 1);
          }}
        >
          Previous flip step
        </button>
        <button
          disabled={state.cursor >= state.steps.length}
          onClick={() => navigate(state.cursor + 1)}
        >
          Next flip step
        </button>
        <button
          disabled={state.cursor >= state.steps.length && !playing}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? "Pause flips" : "Play flips"}
        </button>
        <button
          disabled={!props.canUndo}
          onClick={() => {
            setPlaying(false);
            props.onUndo();
          }}
        >
          Undo shared edit
        </button>
        <button
          disabled={!props.canRedo}
          onClick={() => {
            setPlaying(false);
            props.onRedo();
          }}
        >
          Redo shared edit
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setPatch(null);
            setTransition(null);
            commit(initialTriangulation);
          }}
        >
          Reset triangulation
        </button>
        {state.mode === "follow" && (
          <button
            disabled={state.horizon >= 24 || state.steps.length >= 512}
            onClick={() => {
              const next = targetItinerary(
                spec,
                Math.min(24, state.horizon + 4),
              );
              commit({
                ...next,
                cursor: Math.min(state.cursor, next.steps.length),
              });
            }}
          >
            Extend flip itinerary
          </button>
        )}
      </div>
      <p className="topology-note" role="status" data-testid="flip-status">
        Step {state.cursor} / {state.steps.length}. {activeStatus}
      </p>
      <div className="flip-history" aria-label="Recorded flip path">
        <button
          aria-current={state.cursor === 0 ? "step" : undefined}
          onClick={() => {
            setPlaying(false);
            navigate(0);
          }}
        >
          Start: {triangleKey(state.start)}
        </button>
        {state.steps.map((s, i) => (
          <button
            key={i}
            aria-current={state.cursor === i + 1 ? "step" : undefined}
            onClick={() => {
              setPlaying(false);
              navigate(i + 1);
            }}
          >
            {i + 1}. {label(path[i][s.edge])} → {label(path[i + 1][s.edge])}
            {s.term !== undefined ? ` · a${s.term}` : ""}
          </button>
        ))}
      </div>
      <p className="topology-note">
        Number edits and flips share undo/redo. Path navigation retains later
        steps; a new manual flip branches from the current step. Scene files
        preserve the exact slope triples through structured flip records.
      </p>
    </section>
  );
}
