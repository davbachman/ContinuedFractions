import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useId,
  type ReactNode,
} from "react";
import { type NumberSpec, specLabel, terms } from "../math/continuedFraction";
import { label, value, type Rational } from "../math/rational";
import {
  triangulationPath,
  triangleKey,
  flip,
  flipDetails,
  wrappedEdge,
  targetItinerary,
  followStatus,
  coefficientFlipRun,
  type TriangulationState,
  type Vector,
} from "../math/triangulation";
import { flipColors, ratio } from "./triangulationGeometry";
import { useFlipPlayback } from "../useFlipPlayback";
import { FareyDisk } from "./FareyDisk";
import { fareyTriangleColor, FAREY_FILL_OPACITY } from "./fareyColors";
import { stageColor } from "./dissectionColors";
import { svgPath } from "./ModularTorus";
type Props = {
  time: number;
  onFrame: (time: number, term: number) => void;
  view?: "square" | "farey";
  coefficient?: number;
  playback?: { playing: boolean; onChange: (playing: boolean) => void };
  transport?: ReactNode;
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
  const id = useId();
  const { spec, speed, onChange, onTarget, onError } = props,
    state = props.state ?? targetItinerary(spec);
  const path = useMemo(
      () => triangulationPath(state),
      [state.start, state.steps],
    ),
    tri = path[state.cursor];
  const [selected, setSelected] = useState(2),
    [puncture, setPuncture] = useState(false),
    [tiled, setTiled] = useState(false),
    [affine, setAffine] = useState(true),
    [localPlaying, setLocalPlaying] = useState(false),
    [localView, setLocalView] = useState<"square" | "farey">("square"),
    [inspectFlip, setInspectFlip] = useState(false),
    [transition, setTransition] = useState<ReturnType<
      typeof flipDetails
    > | null>(null);
  const playing = props.playback?.playing ?? localPlaying;
  const setPlaying = props.playback?.onChange ?? setLocalPlaying;
  const view = props.view ?? localView;
  useEffect(() => setInspectFlip(false), [view]);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const previous = useRef(tri);
  const previousSpec = useRef(spec);
  useEffect(() => {
    const before = previous.current;
    previous.current = tri;
    if (previousSpec.current !== spec) {
      previousSpec.current = spec;
      setTransition(null);
      return;
    }
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
      if (!reduced()) setTransition(details);
    } else {
      setTransition(null);
    }
  }, [tri, spec]);
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
  // Only adjacent steps on α's itinerary are interactive, never other branches.
  function adjacentCursor(edge: number) {
    if (state.steps[state.cursor]?.edge === edge) return state.cursor + 1;
    if (state.steps[state.cursor - 1]?.edge === edge) return state.cursor - 1;
    return undefined;
  }
  function selectEdge(edge: number) {
    setSelected(edge);
    const cursor = adjacentCursor(edge);
    if (cursor !== undefined) navigate(cursor);
  }
  function edgeAction(edge: number) {
    const cursor = adjacentCursor(edge);
    return cursor === undefined
      ? undefined
      : cursor > state.cursor
        ? "Next"
        : "Previous";
  }
  function navigate(cursor: number, automatic = false) {
    if (!automatic) setPlaying(false);
    if (cursor < 0 || cursor >= path.length) return;
    const step = state.steps[cursor - 1],
      forward = cursor > state.cursor;
    if (Math.abs(cursor - state.cursor) === 1) {
      const edge = state.steps[forward ? state.cursor : cursor].edge,
        details = flipDetails(tri, edge);
      setSelected(edge);
      if (!reduced()) setTransition(details);
    } else setTransition(null);
    commit(
      { ...state, cursor },
      state.mode === "follow" ? (step?.time ?? 0) : undefined,
      state.mode === "follow" ? (step?.term ?? 0) : undefined,
    );
  }
  useFlipPlayback(
    playing && !props.playback,
    state,
    props.time,
    speed,
    props.onFrame,
    () => setPlaying(false),
  );
  const shown = transition?.before ?? tri,
    wrapped = useMemo(() => shown.map((r) => wrappedEdge(r)), [shown]);
  const operationIndex = Math.max(0, state.cursor - 1);
  const hasOperation = state.steps.length > 0;
  const operation =
    transition ??
    flipDetails(path[operationIndex], state.steps[operationIndex]?.edge ?? 2);
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
  const activeStatus = followStatus(spec, state);
  const coefficients =
    spec.kind === "rational" && !spec.value.q ? [] : terms(spec, 96);
  const term = props.coefficient ?? state.steps[state.cursor - 1]?.term ?? 0;
  const run = coefficientFlipRun(spec, state, term);
  const runSteps = state.steps.flatMap((step, i) =>
    step.term === term ? [i] : [],
  );
  const graph =
    view === "farey" ? "Farey triangles" : "Marked torus · edge flips";
  return (
    <section
      className="panel triangulation-panel flip-focused"
      data-view={view}
      onKeyDown={(e) => {
        if (props.transport) return;
        if (
          (e.target as Element).closest(
            'button,input,select,summary,[role="button"]',
          )
        )
          return;
        if (!["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.code === "Space")
          setPlaying(!playing && state.cursor < state.steps.length);
        else navigate(state.cursor + (e.code === "ArrowRight" ? 1 : -1));
      }}
      tabIndex={0}
    >
      <div className="panel-heading">
        <div>
          <span className="panel-number">05</span>
          <h2>{graph}</h2>
        </div>
        <span className="small-tag">FIXED BASIS (q,p)</span>
      </div>
      <p className="flip-target">
        Target α = <strong>{specLabel(spec)}</strong> · current slopes{" "}
        <strong>{triangleKey(tri)}</strong>
      </p>
      {!props.view && (
        <div className="tangle-controls" aria-label="Triangulation display">
          <button
            aria-pressed={view === "square"}
            onClick={() => setLocalView("square")}
          >
            Marked square
          </button>
          <button
            aria-pressed={view === "farey"}
            onClick={() => setLocalView("farey")}
          >
            Farey triangles
          </button>
        </div>
      )}
      <div className="tangle-controls" role="group" aria-label="Target path">
        <span className="small-tag">Following α automatically</span>
        {view === "square" && hasOperation && (
          <button
            aria-pressed={inspectFlip}
            onClick={() => setInspectFlip(!inspectFlip)}
          >
            {inspectFlip ? "Back to diagram" : "Explain this flip"}
          </button>
        )}
      </div>
      <p
        className="flip-run-caption"
        data-testid="flip-run-caption"
        style={{ borderLeftColor: stageColor(term) }}
      >
        {state.cursor === 0 && term === 0
          ? `a₀ = ${coefficients[0] ?? "∞"} sets the starting bracket; it is not a left/right run.`
          : term === 0
            ? "Initial crossing into the Farey bracket. This first flip is separate from the coefficient’s left/right turns."
            : `a${term} = ${coefficients[term]} · ${run.direction} run · ${run.completed} of ${run.expected} flips completed${BigInt(run.generated) < run.expected ? ` (${run.generated} generated so far)` : ""}.`}
        {state.mode === "follow" &&
          term > 0 &&
          run.expected === 0n &&
          " This coefficient has no flip after the boundary offsets."}
      </p>
      {hasOperation && (
        <p className="flip-operation" data-testid="flip-operation-caption">
          {state.cursor === 0 ? "Next flip: " : "Current flip: "}
          Retain {operation.retained.map(label).join(" and ")}; replace{" "}
          {label(operation.removed)} with {label(operation.inserted)}.
        </p>
      )}
      <div
        className="triangulation-grid"
        hidden={view === "square" && inspectFlip && hasOperation}
      >
        <div hidden={view !== "square"}>
          <svg
            viewBox="0 0 380 370"
            role="group"
            aria-label="Marked torus triangulation"
            data-slopes={triangleKey(tri)}
            data-triangle-color={fareyTriangleColor(shown)}
          >
            <defs>
              <clipPath id={`${id}-marked-square-clip`}>
                <rect x={45} y={45} width={260} height={260} />
              </clipPath>
              <marker
                id={`${id}-basis-arrow`}
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
              fill="#fbfbf6"
              stroke="#70816c"
            />
            {!faceCopies.length && (
              <rect
                x={45}
                y={45}
                width={260}
                height={260}
                fill={fareyTriangleColor(shown)}
                fillOpacity={FAREY_FILL_OPACITY}
              />
            )}
            <g
              clipPath={`url(#${id}-marked-square-clip)`}
              className={transition ? "flip-incident-triangles" : ""}
            >
              {faceCopies.map((f, i) => (
                <path
                  key={i}
                  d={svgPath(f.points) + "Z"}
                  fill={fareyTriangleColor(shown)}
                  fillOpacity={FAREY_FILL_OPACITY}
                  data-torus-face={f.k}
                />
              ))}
            </g>
            {wrapped.map((w, i) => (
              <g
                key={i}
                role={edgeAction(i) ? "button" : "img"}
                tabIndex={edgeAction(i) ? 0 : undefined}
                aria-label={
                  edgeAction(i)
                    ? `${edgeAction(i)} path step via torus edge ${label(shown[i])}`
                    : `Torus edge ${label(shown[i])}`
                }
                onFocus={() => setSelected(i)}
                onClick={() => selectEdge(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectEdge(i);
                  }
                }}
              >
                <title>
                  Edge class {label(shown[i])}; both boundary copies represent
                  the same edge. Only steps on α’s path can be followed.
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
              markerEnd={`url(#${id}-basis-arrow)`}
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
          <p className="flip-diagram-caption">
            Step α’s path to see one edge change. Opposite square sides are
            identified. Face color matches the current Farey triangle; edge
            colors match its vertex labels.
          </p>
          {wrapped.some((w) => w.limited) && (
            <p className="topology-limit" role="status">
              Wrap display limit: edges with |p|+q &gt; 160 are hidden. Exact
              slopes and path controls remain available.
            </p>
          )}
          {!faceCopies.length && (
            <p className="topology-limit">
              Face shading exceeds the tile budget; edge classes remain exact.
            </p>
          )}
        </div>
        <div hidden={view !== "farey"}>
          {view === "farey" && (
            <FareyDisk
              spec={spec}
              time={props.time}
              tri={tri}
              path={path}
              state={state}
              term={term}
              edgeAction={edgeAction}
              selectEdge={selectEdge}
            />
          )}
        </div>
      </div>
      {view === "square" && hasOperation && (
        <div className="flip-patch" hidden={!inspectFlip}>
          <h3>Why this flip works</h3>
          <p>
            Unfold the two incident triangles. Keep the quadrilateral’s boundary
            and exchange its diagonal.
          </p>
          <label>
            <input
              type="checkbox"
              checked={tiled}
              onChange={(e) => setTiled(e.target.checked)}
            />
            Tiled-plane inset
          </label>
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
                fill={fareyTriangleColor(operation.before)}
                fillOpacity={FAREY_FILL_OPACITY}
                stroke="#60755f"
              />
            ))}
            {operation.quad.map((w, i) => {
              const retainedSlots = [0, 1, 2].filter(
                (j) => j !== operation.edge,
              );
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
            reconstructed upstairs, even when its edges wrap across several
            copies of the square. Apparent boundary meetings need not be new
            vertices.
          </p>
        </div>
      )}
      <div
        className="flip-slope-strip"
        aria-label="Current triangulation slopes"
      >
        {tri.map((r, i) => (
          <button
            key={i}
            style={{ borderBottomColor: flipColors[i], color: flipColors[i] }}
            aria-label={`Highlight edge ${short(r)}`}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            {label(r)}
          </button>
        ))}
      </div>
      {props.transport ?? (
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
        </div>
      )}
      <p className="topology-note" role="status" data-testid="flip-status">
        Step {state.cursor} / {state.steps.length}. {activeStatus}
      </p>
      {state.mode === "follow" && !props.transport && (
        <div className="flip-run-actions">
          <button
            disabled={term !== 0 && !runSteps.length}
            onClick={() => navigate(term === 0 ? 0 : runSteps[0] + 1)}
          >
            Go to selected run
          </button>
        </div>
      )}
      <details className="flip-details">
        <summary>Edge actions, history & display options</summary>
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
                aria-label={`Use slope ${label(r)} as target`}
                onClick={() => onTarget(r)}
              >
                Use this slope as target
              </button>
            </div>
          ))}
        </div>

        <div className="tangle-controls">
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
        </div>
        <p className="topology-note">
          Solid lines show completed steps; dashed lines show the path ahead.
          The disk camera changes coordinates only; the marking and slope labels
          stay fixed.
        </p>
        <div className="tangle-controls">
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
          <button onClick={() => navigate(0)}>Restart α’s path</button>
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
          Changing α rebuilds this path. Path navigation retains later steps and
          never changes α. Shared undo/redo restores the number and its playback
          position together. Saved scenes retain the exact target itinerary.
        </p>
      </details>
      <details className="flip-details">
        <summary>How coefficients count flips</summary>
        <p>
          a₀ translates the initial bracket. The first crossing enters that
          bracket. Then turns alternate L/R: a₁−1, followed by the interior
          coefficients; a rational’s final run also subtracts one. If there is
          just one fractional coefficient, both offsets apply. A zero-length run
          creates no extra flip.
        </p>
        <p>
          A torus edge slope is a Farey vertex; its three slopes form a Farey
          triangle. Crossing one side replaces the opposite slope. This marked
          torus is distinct from the six-sheet modular cover.
        </p>
      </details>
    </section>
  );
}
