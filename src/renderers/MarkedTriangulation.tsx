import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { type NumberSpec, specLabel, terms } from "../math/continuedFraction";
import { label, type Rational } from "../math/rational";
import {
  triangulationPath,
  triangleKey,
  flip,
  flipDetails,
  targetItinerary,
  followStatus,
  coefficientFlipRun,
  coefficientFlipPosition,
  type TriangulationState,
} from "../math/triangulation";
import { rationalRole } from "../math/correspondence";
import { flipColors } from "./triangulationGeometry";
import { useFlipPlayback } from "../useFlipPlayback";
import { LatticeTriangulation } from "./LatticeTriangulation";
import { FareyDisk, type DiskOptions } from "./FareyDisk";
import { stageColor } from "./dissectionColors";
type Props = {
  compact?: boolean;
  sharedControls?: boolean;
  selectedEdge?: number;
  onSelectedEdge?: (edge: number) => void;
  followCoefficient: boolean;
  onFollowCoefficient: (enabled: boolean) => void;
  onSeekCoefficient: (term: number) => void;
  coefficientSeekVersion: number;
  time: number;
  onFrame: (time: number, term: number) => void;
  view?: "square" | "farey";
  diskOptions?: DiskOptions;
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
};
const short = (r: Rational) =>
  label(r).length > 20
    ? label(r).slice(0, 8) + "…" + label(r).slice(-7)
    : label(r);
export function MarkedTriangulation(props: Props) {
  const { spec, speed, onChange, onTarget, onError } = props,
    state = props.state ?? targetItinerary(spec);
  const path = useMemo(
      () => triangulationPath(state),
      [state.start, state.steps],
    ),
    tri = path[state.cursor];
  const [localSelected, setLocalSelected] = useState(2),
    [puncture, setPuncture] = useState(false),
    [localPlaying, setLocalPlaying] = useState(false),
    [localView, setLocalView] = useState<"square" | "farey">("square"),
    [transition, setTransition] = useState<ReturnType<
      typeof flipDetails
    > | null>(null);
  const selected = props.selectedEdge ?? localSelected;
  const setSelected = props.onSelectedEdge ?? setLocalSelected;
  const playing = props.playback?.playing ?? localPlaying;
  const setPlaying = props.playback?.onChange ?? setLocalPlaying;
  const view = props.view ?? localView;
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
  useEffect(() => setPlaying(false), [props.coefficientSeekVersion]);
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
  const shown = transition?.before ?? tri;
  const operationIndex = Math.max(0, state.cursor - 1);
  const hasOperation = state.steps.length > 0;
  const operation =
    transition ??
    flipDetails(path[operationIndex], state.steps[operationIndex]?.edge ?? 2);
  const activeStatus = followStatus(spec, state);
  const coefficients =
    spec.kind === "rational" && !spec.value.q ? [] : terms(spec, 96);
  const term = props.coefficient ?? state.steps[state.cursor - 1]?.term ?? 0;
  const run = coefficientFlipRun(spec, state, term);
  const graph =
    view === "farey" ? "Poincare Disk" : "Marked torus · edge flips";
  return (
    <section
      className="panel triangulation-panel flip-focused"
      data-view={view}
      onKeyDown={(e) => {
        if (props.transport || props.sharedControls) return;
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
      {!props.view && (
        <div className="panel-heading">
          <div>
            <span className="panel-number">05</span>
            <h2>{graph}</h2>
          </div>
          <span className="small-tag">FIXED BASIS (q,p)</span>
        </div>
      )}
      {!props.compact && (
        <>
          {!props.view && (
            <p className="flip-target">
              Target α = <strong>{specLabel(spec)}</strong> · current slopes{" "}
              <strong>{triangleKey(tri)}</strong>
            </p>
          )}
          {!props.view && (
            <div className="tangle-controls" aria-label="Triangulation display">
              <button
                aria-pressed={view === "square"}
                onClick={() => setLocalView("square")}
              >
                Euclidean lattice
              </button>
              <button
                aria-pressed={view === "farey"}
                onClick={() => setLocalView("farey")}
              >
                Poincare Disk
              </button>
            </div>
          )}
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
        </>
      )}
      <div className="triangulation-grid">
        <div hidden={view !== "square"}>
          <LatticeTriangulation
            tri={shown}
            selected={selected}
            puncture={puncture}
            animating={!!transition}
            selectEdge={selectEdge}
            edgeAction={edgeAction}
          />
          {view === "square" && (
            <div className="tangle-controls flip-coefficient-controls">
              <label>
                <input
                  type="checkbox"
                  checked={puncture}
                  onChange={(e) => setPuncture(e.target.checked)}
                />
                Show a hole at the shared corner
              </label>
            </div>
          )}
        </div>
        <div hidden={view !== "farey"}>
          {view === "farey" && (
            <FareyDisk
              {...props.diskOptions}
              spec={spec}
              time={props.time}
              tri={tri}
              path={path}
              state={state}
              term={term}
              selectedEdge={selected}
              edgeAction={edgeAction}
              selectEdge={selectEdge}
            />
          )}
        </div>
      </div>
      <div
        className="flip-slope-strip"
        aria-label="Current triangulation slopes"
      >
        {tri.map((r, i) => (
          <button
            key={i}
            style={{ borderBottomColor: flipColors[i], color: flipColors[i] }}
            aria-label={`Highlight edge ${short(r)}`}
            data-testid={`triangulation-slope-${i}`}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            {label(r)} <small>{rationalRole(r, coefficients)}</small>
          </button>
        ))}
      </div>
      {!props.compact && (
        <div className="tangle-controls">
          <button
            aria-label={`Use slope ${label(tri[selected])} as target`}
            onClick={() => onTarget(tri[selected])}
          >
            Use {short(tri[selected])} as α
          </button>
        </div>
      )}
      {!props.compact && (
        <>
          {!props.sharedControls && (
            <TriangulationNavigation
              {...props}
              playback={{ playing, onChange: setPlaying }}
              onNavigate={navigate}
            />
          )}

          {hasOperation && (
            <p className="flip-operation" data-testid="flip-operation-caption">
              {state.cursor === 0 ? "Next flip: " : "Current flip: "}
              Retain {operation.retained.map(label).join(" and ")}; replace{" "}
              {label(operation.removed)} with {label(operation.inserted)}.
            </p>
          )}
          <p className="topology-note" role="status" data-testid="flip-status">
            Step {state.cursor} / {state.steps.length}. {activeStatus}
          </p>
          <details className="flip-details">
            <summary>How coefficients count flips</summary>
            <p>
              a₀ translates the initial bracket. The first crossing enters that
              bracket. Then turns alternate L/R: a₁−1, followed by the interior
              coefficients; a rational’s final run also subtracts one. If there
              is just one fractional coefficient, both offsets apply. A
              zero-length run creates no extra flip.
            </p>
            <p>
              A torus edge slope is a Farey vertex; its three slopes form a
              Farey triangle. Crossing one side replaces the opposite slope.
              This marked torus is distinct from the six-sheet modular cover.
            </p>
          </details>
        </>
      )}
    </section>
  );
}

/** Navigation is shared above the comparison panes; the atlas can embed it. */
export function TriangulationNavigation(
  props: Props & {
    onNavigate?: (cursor: number) => void;
    children?: ReactNode;
  },
) {
  const { spec, onChange } = props;
  const state = props.state ?? targetItinerary(spec);
  const path = triangulationPath(state);
  const coefficients =
    spec.kind === "rational" && !spec.value.q ? [] : terms(spec, 96);
  const term = props.coefficient ?? state.steps[state.cursor - 1]?.term ?? 0;
  const coefficientPosition = coefficientFlipPosition(spec, state, term);
  const playing = props.playback?.playing ?? false;
  const setPlaying = (value: boolean) => props.playback?.onChange(value);
  const commit = (next: TriangulationState, time?: number, term?: number) =>
    onChange(next, time, term);
  const navigate = (cursor: number) => {
    setPlaying(false);
    if (props.onNavigate) return props.onNavigate(cursor);
    if (cursor < 0 || cursor > state.steps.length) return;
    const step = state.steps[cursor - 1];
    commit({ ...state, cursor }, step?.time ?? 0, step?.term ?? 0);
  };
  const completePath =
    spec.kind === "rational" &&
    path[path.length - 1].some(
      (r) => r.p === spec.value.p && r.q === spec.value.q,
    );
  return (
    <>
      <div className={props.sharedControls ? "pane-transport" : undefined}>
        <div
          className={
            props.sharedControls ? "workspace-actions" : "tangle-controls"
          }
          role="group"
          aria-label="Flip path transport"
        >
          <button
            onClick={() => navigate(0)}
            aria-label="Restart flips"
            title="Restart flips"
          >
            <RotateCcw size={22} aria-hidden="true" />
          </button>
          {props.transport ?? (
            <>
              <button
                aria-label="Previous flip step"
                disabled={!state.cursor}
                onClick={() => {
                  setPlaying(false);
                  navigate(state.cursor - 1);
                }}
              >
                {props.sharedControls ? "Previous" : "Previous flip step"}
              </button>
              <button
                aria-label={playing ? "Pause flips" : "Play flips"}
                className="primary-action"
                disabled={state.cursor >= state.steps.length && !playing}
                onClick={() => setPlaying(!playing)}
              >
                {props.sharedControls
                  ? playing
                    ? "Pause"
                    : "Play"
                  : playing
                    ? "Pause flips"
                    : "Play flips"}
              </button>
              <button
                aria-label="Next flip step"
                disabled={state.cursor >= state.steps.length}
                onClick={() => navigate(state.cursor + 1)}
              >
                {props.sharedControls ? "Next" : "Next flip step"}
              </button>
            </>
          )}
        </div>
        {props.children}
      </div>
      {state.mode === "follow" && !props.transport && (
        <div className="tangle-controls flip-coefficient-controls">
          <button
            disabled={!coefficientPosition}
            aria-label="Go to selected coefficient"
            onClick={() => {
              setPlaying(false);
              props.onSeekCoefficient(term);
            }}
          >
            Go to a{term} = {String(coefficients[term] ?? "∞")}
          </button>
          <label>
            <input
              type="checkbox"
              checked={props.followCoefficient}
              disabled={!coefficients.length}
              onChange={(e) => {
                setPlaying(false);
                props.onFollowCoefficient(e.target.checked);
                if (e.target.checked) props.onSeekCoefficient(term);
              }}
            />
            Follow selected coefficient
          </label>
        </div>
      )}
      {!coefficientPosition && coefficients.length > 0 && (
        <p className="topology-note">
          This coefficient is beyond the generated flip path. Extend the
          itinerary below.
        </p>
      )}
      <details className="flip-details">
        <summary>Flip history</summary>
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
          {state.mode === "follow" && !completePath && (
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
    </>
  );
}
