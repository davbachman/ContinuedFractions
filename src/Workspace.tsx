import { RotateCcw } from "lucide-react";
import { coefficientInterval } from "./math/coefficientTimeline";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ComponentProps,
} from "react";
import {
  isRepresentation,
  isTrajectory,
  representations,
  type Representation,
} from "./workspace";
import { rationalRole } from "./math/correspondence";
import type { Scene } from "./state";
import { approximate } from "./math/continuedFraction";
import { label, type Rational } from "./math/rational";
import { heightAt, type derive } from "./math/trajectory";
import {
  currentTriangulation,
  targetItinerary,
  triangulationPath,
} from "./math/triangulation";
import type { TangleExpression } from "./math/tangles";
import { FareyDisk } from "./renderers/FareyDisk";
import { HalfPlane } from "./renderers/HalfPlane";
import { Quotient } from "./renderers/Quotient";
import { ModularTorus } from "./renderers/ModularTorus";
import {
  RectangleDissection,
  DissectionExplanation,
} from "./renderers/RectangleDissection";
import { SymbolicView } from "./renderers/SymbolicView";
import {
  MarkedTriangulation,
  TriangulationNavigation,
} from "./renderers/MarkedTriangulation";
import { CFBraid } from "./renderers/CFBraid";
import { TanglePanel } from "./renderers/TanglePanel";
import { stageColor } from "./renderers/dissectionColors";
import { DomainEdgeLegend } from "./renderers/domainEdges";
import { domainFocus } from "./renderers/domainFocus";
import { coefficientTrace } from "./renderers/selectedRun";
import { useFlipPlayback } from "./useFlipPlayback";
import { useRunPlayback } from "./useRunPlayback";
import type { TriangulationState } from "./math/triangulation";

export type WorkspaceProps = {
  numberEditor: ReactNode;
  inputError: ReactNode;
  scene: Scene;
  coefficients: bigint[];
  convergents: Rational[];
  selected: number;
  onSelect: (i: number) => void;
  onEditCoefficient: (value: string) => void;
  onExtendTerms: () => void;
  onNumber: (r: Rational) => void;
  onTangle: (expression: TangleExpression) => void;
  onError: (message: string) => void;
  onPause: () => void;
  onRunFrame: (
    time: number,
    term: number,
    itinerary?: TriangulationState,
  ) => void;
  inspection?: { rational: Rational; label: string; color: string };
  onInspect?: (r: Rational | null) => void;
  approximationIndex?: number;
  linkedPlayback?: ReturnType<typeof useRunPlayback>;
  onPatch: (changes: Partial<Scene>) => void;
  math: ReturnType<typeof derive>;
  playing: boolean;
  reverse: boolean;
  onReverse: (b: boolean) => void;
  onToggleTrajectory: () => void;
  onSeek: (time: number) => void;
  onStepTrajectory: (direction: number) => void;
  rectangle: Pick<
    ComponentProps<typeof RectangleDissection>,
    "stages" | "onStart" | "onMove" | "onEnd"
  > & {
    unavailable: string | undefined | null;
    playing: boolean;
    onToggle: () => void;
    onStep: (direction: number) => void;
  };
  triangulation: ComponentProps<typeof MarkedTriangulation>;
};
type Pane = { id: string; kind: Representation; lift: number };
function initialPanes(): Pane[] {
  let stored: unknown;
  try {
    stored = JSON.parse(localStorage.getItem("cf-atlas-comparison") ?? "null");
  } catch {
    /* optional preferences */
  }
  const params = new URLSearchParams(location.search);
  const defaults = ["symbolic", "rectangle"] as const;
  return defaults.map((fallback, i) => {
    const raw =
      params.get(i ? "right" : "left") ??
      (Array.isArray(stored) ? stored[i]?.kind : undefined);
    const liftParam = params.get(i ? "rightLift" : "leftLift");
    const lift =
      liftParam !== null
        ? Number(liftParam)
        : Array.isArray(stored)
          ? stored[i]?.lift
          : 0;
    return {
      id: i ? "b" : "a",
      kind: isRepresentation(raw)
        ? raw
        : raw === "closure"
          ? "tangle"
          : raw === "intervals"
            ? "symbolic"
            : fallback,
      lift: Number.isInteger(lift) && lift >= 0 && lift < 6 ? lift : 0,
    };
  });
}
export function Workspace(props: WorkspaceProps) {
  const [panes, setPanes] = useState(initialPanes);
  const [selectedEdge, setSelectedEdge] = useState(2);
  const [inspect, setInspect] = useState<Rational | null>(null);
  const [approximationIndex, setApproximationIndex] = useState(4);
  const approximation = Math.min(
    approximationIndex,
    props.convergents.length - 1,
  );
  const finiteDiagram =
    props.scene.spec.kind === "periodic" &&
    panes.some((p) => p.kind === "tangle" || p.kind === "braid");
  const focused =
    inspect ??
    props.convergents[finiteDiagram ? approximation : props.selected];
  const inspection = focused
    ? {
        color: inspect
          ? "#344d43"
          : stageColor(finiteDiagram ? approximation : props.selected),
        rational: focused,
        label: rationalRole(focused, props.coefficients) ?? "Rational",
      }
    : undefined;
  useEffect(
    () => setInspect(null),
    [props.scene.spec, props.selected, approximation],
  );
  const [flipPlaying, setFlipPlaying] = useState(false);
  const canLink =
    !props.rectangle.unavailable &&
    panes.some((p) => p.kind === "rectangle") &&
    panes.some(
      (p) =>
        isTrajectory(p.kind) || ["farey", "triangulation"].includes(p.kind),
    );
  const runs = useRunPlayback(props, canLink);
  const flipState =
    props.scene.triangulation ?? targetItinerary(props.scene.spec);
  const previousFlip = useRef(flipState);
  useEffect(() => {
    if (
      previousFlip.current.steps !== flipState.steps ||
      flipState.cursor < previousFlip.current.cursor
    )
      setFlipPlaying(false);
    previousFlip.current = flipState;
  }, [flipState]);
  useEffect(() => setFlipPlaying(false), [props.scene.spec, flipState.mode]);
  useEffect(() => {
    if (props.triangulation.externalPlaying) setFlipPlaying(false);
  }, [props.triangulation.externalPlaying]);
  useFlipPlayback(
    flipPlaying,
    flipState,
    props.scene.time,
    props.scene.speed,
    props.onRunFrame,
    () => setFlipPlaying(false),
  );
  const [activePane, setActivePane] = useState<string | null>(null);
  const selectCoefficient = (i: number) => {
    setFlipPlaying(false);
    if (runs.enabled) runs.seek(i);
    else if (
      props.triangulation.followCoefficient &&
      panes.some((p) => ["farey", "triangulation"].includes(p.kind))
    )
      props.triangulation.onSeekCoefficient(i);
    else props.onSelect(i);
  };
  const [coefficientDraft, setCoefficientDraft] = useState("");
  const coefficientInput = useRef<HTMLInputElement>(null);
  const focusCoefficient = useRef(false);
  useEffect(() => {
    if (focusCoefficient.current) {
      coefficientInput.current?.focus();
      coefficientInput.current?.select();
      focusCoefficient.current = false;
    }
  }, [props.selected]);
  useEffect(
    () => setCoefficientDraft(String(props.coefficients[props.selected] ?? 0n)),
    [props.coefficients, props.selected],
  );
  useEffect(() => {
    try {
      localStorage.setItem("cf-atlas-comparison", JSON.stringify(panes));
    } catch {
      /* optional preferences */
    }
    const url = new URL(location.href);
    url.searchParams.set("left", panes[0].kind);
    url.searchParams.set("right", panes[1].kind);
    url.searchParams.set("leftLift", String(panes[0].lift));
    url.searchParams.set("rightLift", String(panes[1].lift));
    window.history.replaceState(null, "", url);
  }, [panes]);
  const setKind = (id: string, kind: Representation) => {
    setActivePane(null);
    setFlipPlaying(false);
    runs.disable();
    props.onPause();
    setPanes((p) => p.map((v) => (v.id === id ? { ...v, kind } : v)));
  };
  const infinite =
    props.scene.spec.kind === "rational" && !props.scene.spec.value.q;
  const [playbackChoice, setPlaybackChoice] = useState("");
  const playbackModes = [
    ...(panes.some((p) => p.kind === "triangulation") && !infinite
      ? [{ value: "flips", label: "Edge flips" }]
      : []),
    ...(panes.some((p) => isTrajectory(p.kind)) && !infinite
      ? [{ value: "trajectory", label: "Hyperbolic trajectory" }]
      : []),
    ...(panes.some((p) => p.kind === "rectangle") &&
    !props.rectangle.unavailable
      ? [{ value: "rectangle", label: "Rectangle stages" }]
      : []),
  ];
  const playbackMode = playbackModes.some((m) => m.value === playbackChoice)
    ? playbackChoice
    : playbackModes[0]?.value;
  const sharedTriangulation: WorkspaceProps["triangulation"] = {
    ...props.triangulation,
    sharedControls: true,
    selectedEdge,
    onSelectedEdge: setSelectedEdge,
    onSeekCoefficient: (i) => {
      runs.disable();
      setFlipPlaying(false);
      props.triangulation.onSeekCoefficient(i);
    },
    onChange: (...args) => {
      runs.disable();
      props.triangulation.onChange(...args);
    },
    onUndo: () => {
      runs.disable();
      props.triangulation.onUndo();
    },
    onRedo: () => {
      runs.disable();
      props.triangulation.onRedo();
    },
    playback: {
      playing: flipPlaying,
      onChange: (playing) => {
        if (playing) props.onPause();
        setFlipPlaying(playing);
      },
    },
    coefficient: props.selected,
  };
  const navigationProps = {
    ...props,
    onSeek: (time: number) => {
      setFlipPlaying(false);
      runs.disable();
      props.onSeek(time);
    },
    onStepTrajectory: (direction: number) => {
      setFlipPlaying(false);
      props.onStepTrajectory(direction);
    },
    onToggleTrajectory: () => {
      setFlipPlaying(false);
      props.onToggleTrajectory();
    },
  };
  const onNavigationKey = (code: string) => {
    if (runs.enabled) {
      if (code === "Space") runs.toggle();
      else runs.seek(runs.position.term + (code === "ArrowRight" ? 1 : -1));
    } else if (playbackMode === "flips") {
      props.onPause();
      if (code === "Space")
        setFlipPlaying(
          !flipPlaying && flipState.cursor < flipState.steps.length,
        );
      else {
        setFlipPlaying(false);
        const cursor = Math.max(
          0,
          Math.min(
            flipState.steps.length,
            flipState.cursor + (code === "ArrowRight" ? 1 : -1),
          ),
        );
        const step = flipState.steps[cursor - 1];
        props.triangulation.onChange(
          { ...flipState, cursor },
          step?.time ?? 0,
          step?.term ?? 0,
        );
      }
    } else if (playbackMode === "trajectory") {
      if (code === "Space") navigationProps.onToggleTrajectory();
      else navigationProps.onStepTrajectory(code === "ArrowRight" ? 1 : -1);
    } else if (playbackMode === "rectangle") {
      if (code === "Space") props.rectangle.onToggle();
      else props.rectangle.onStep(code === "ArrowRight" ? 1 : -1);
    }
  };
  return (
    <section
      className="comparison-workspace"
      aria-label="Compare representations"
    >
      <div
        className="comparison-strip"
        aria-label="Shared coefficient selection"
      >
        {props.numberEditor}
        <div className="comparison-coefficients">
          {props.coefficients.map((a, i) =>
            props.selected === i ? (
              <form
                key={i}
                className="coefficient-inline-editor"
                style={{ borderBottomColor: stageColor(i) }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (coefficientDraft !== String(a)) {
                    runs.disable();
                    props.onEditCoefficient(coefficientDraft);
                  }
                }}
              >
                <label>
                  <small>a{i}</small>
                  <input
                    ref={coefficientInput}
                    data-coefficient={i}
                    aria-label={`Edit coefficient a${i}`}
                    title="Enter to apply; Escape to cancel"
                    inputMode={i === 0 ? "text" : "numeric"}
                    enterKeyHint="done"
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      width: `${Math.min(16, Math.max(2, coefficientDraft.length))}ch`,
                    }}
                    value={coefficientDraft}
                    onFocus={(e) => {
                      setFlipPlaying(false);
                      props.onPause();
                      if (runs.playing) runs.toggle();
                      e.currentTarget.select();
                    }}
                    onClick={() => selectCoefficient(i)}
                    onChange={(e) => setCoefficientDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setCoefficientDraft(String(a));
                        props.onError("");
                        e.currentTarget.select();
                      }
                    }}
                    onBlur={() => setCoefficientDraft(String(a))}
                  />
                </label>
              </form>
            ) : (
              <button
                key={i}
                data-coefficient={i}
                aria-pressed={false}
                aria-label={`Highlight coefficient a${i} = ${a}`}
                style={{ borderBottomColor: stageColor(i) }}
                onClick={() => {
                  focusCoefficient.current = true;
                  setCoefficientDraft(String(a));
                  selectCoefficient(i);
                }}
              >
                <small>a{i}</small> {String(a)}
              </button>
            ),
          )}
          {props.scene.spec.kind === "periodic" && (
            <button
              onClick={props.onExtendTerms}
              aria-label="Generate more coefficients"
              disabled={props.coefficients.length >= 96}
            >
              …
            </button>
          )}
          {infinite && <span>No finite regular expansion</span>}
        </div>
      </div>
      {playbackModes.length > 0 && (
        <section className="shared-playback" aria-label="Shared playback">
          <div className="shared-playback-heading">
            {playbackModes.length > 1 && !runs.enabled ? (
              <label>
                Playback{" "}
                <select
                  aria-label="Playback process"
                  value={playbackMode}
                  onChange={(e) => {
                    props.onPause();
                    setFlipPlaying(false);
                    setPlaybackChoice(e.target.value);
                  }}
                >
                  {playbackModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <strong>
                {runs.enabled ? "Coefficient runs" : playbackModes[0].label}
              </strong>
            )}
          </div>
          {canLink && (
            <div className="run-link" aria-label="Coefficient synchronization">
              <label>
                <input
                  type="checkbox"
                  checked={runs.enabled}
                  onChange={(e) => {
                    setFlipPlaying(false);
                    if (e.target.checked) runs.enable();
                    else runs.disable();
                  }}
                />
                Synchronize by coefficient
              </label>
              {runs.enabled ? (
                <>
                  <RunTransport run={runs} />
                  <label className="pane-scrubber">
                    Progress through a{runs.position.term} ·{" "}
                    <span data-testid="linked-time">
                      t = {props.scene.time.toFixed(3)}
                    </span>
                    <input
                      aria-label="Progress through coefficient run"
                      type="range"
                      min="0"
                      max="1"
                      step="0.001"
                      value={runs.position.progress}
                      onChange={(e) =>
                        runs.seek(runs.position.term, Number(e.target.value))
                      }
                    />
                  </label>
                  <p data-testid="linked-run-status" role="status">
                    {runs.stage &&
                      (runs.stage.term === 0
                        ? `a₀ = ${runs.stage.coefficient}: ${runs.stage.coefficient === 0n ? "orientation change; no squares removed" : "initial square group"}. ${runs.stage.expected === 0n ? "The ray lies on a Farey edge; no automatic flip." : `Separate initial entry: ${runs.frame?.completed} of 1 crossing.`}`
                        : `a${runs.stage.term} = ${runs.stage.coefficient} · ${runs.stage.term % 2 ? "L" : "R"} run · ${runs.frame?.completed} of ${runs.stage.expected} flips. ${runs.stage.expected === 0n ? "No crossings after the initial/terminal offsets; the point holds while this rectangle stage is shown." : ""}`)}
                    {runs.stage &&
                      !runs.stage.complete &&
                      ` Only ${runs.stage.times.length} crossings fit this display window. Playback stops here; the run is incomplete.`}
                    {props.scene.spec.kind === "rational" &&
                      runs.position.progress === 1 &&
                      runs.position.term === runs.stages.length - 1 &&
                      runs.stage?.complete &&
                      " Rational dissection complete; the ideal cusp is not reached in finite hyperbolic time."}
                  </p>
                  <details className="workspace-details">
                    <summary>Linked playback options</summary>
                    <label>
                      Playback speed{" "}
                      <select
                        aria-label="Linked playback speed"
                        value={props.scene.speed}
                        onChange={(e) =>
                          props.onPatch({ speed: Number(e.target.value) })
                        }
                      >
                        {[0.25, 0.5, 1, 2, 4].map((v) => (
                          <option key={v} value={v}>
                            {v}×
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={props.reverse}
                        onChange={(e) => props.onReverse(e.target.checked)}
                      />{" "}
                      Reverse linked playback
                    </label>
                    <p>
                      One rectangle group spans a run of flips. Crossings
                      receive equal animation beats, so this is not constant
                      hyperbolic speed. The interval ends at the group’s last
                      crossing. a₀ sets the bracket; its entry crossing is
                      separate. The first and rational last runs use the
                      documented −1 offsets. Large runs have bounded animation
                      duration.
                    </p>
                    <p>
                      All flip paths follow α. Editing, undo, or switching views
                      pauses and releases the link. The marked flip torus and
                      six-sheet modular cover remain distinct constructions.
                    </p>
                  </details>
                  {runs.stage && !runs.stage.complete && (
                    <button
                      disabled={props.scene.end >= 24}
                      onClick={() => {
                        runs.disable();
                        props.onPatch({
                          end: Math.min(24, props.scene.end + 4),
                        });
                      }}
                    >
                      Extend depth +4, then relink
                    </button>
                  )}
                </>
              ) : null}
            </div>
          )}
          {!runs.enabled &&
            (playbackMode === "trajectory" ? (
              <TrajectoryControls shared={navigationProps} />
            ) : playbackMode === "flips" ? (
              <>
                <TriangulationNavigation {...sharedTriangulation}>
                  <label className="pane-scrubber">
                    Hyperbolic time · t = {props.scene.time.toFixed(2)}
                    <input
                      aria-label="Scrub trajectory"
                      type="range"
                      min={0}
                      max={props.scene.end}
                      step={0.001}
                      value={props.scene.time}
                      onChange={(e) =>
                        navigationProps.onSeek(Number(e.target.value))
                      }
                    />
                  </label>
                </TriangulationNavigation>
              </>
            ) : (
              <RectangleControls shared={props} />
            ))}
        </section>
      )}
      {finiteDiagram && (
        <div className="shared-approximation">
          <label>
            Finite diagram approximation{" "}
            <select
              aria-label="Diagram convergent"
              value={approximation}
              onChange={(e) => setApproximationIndex(Number(e.target.value))}
            >
              {props.convergents.map((r, i) => (
                <option key={i} value={i}>
                  C{i} = {label(r)}
                </option>
              ))}
            </select>
          </label>
          <span>
            α remains irrational; editing the tangle makes it rational.
          </span>
          <button
            onClick={() => props.onNumber(props.convergents[approximation])}
          >
            Use approximation as α
          </button>
        </div>
      )}
      {inspect && (
        <div className="shared-inspection" role="status">
          {inspection?.label}: {label(inspect)}
          <span>
            {inspect.q
              ? `Ford radius 1/${2n * inspect.q * inspect.q} in H²`
              : "Ford horocycle y = 1 in H²"}
          </span>
          <button onClick={() => props.onNumber(inspect)}>
            Use this endpoint
          </button>
          <button onClick={() => setInspect(null)}>Close inspection</button>
        </div>
      )}
      {props.inputError}
      <div className="comparison-grid">
        {panes.map((pane, i) => (
          <ComparisonPane
            key={pane.id}
            pane={pane}
            side={i ? "Right" : "Left"}
            other={panes[1 - i]}
            active={activePane === pane.id}
            onActivate={() => setActivePane(pane.id)}
            onNavigationKey={onNavigationKey}
            shared={{
              ...props,
              inspection,
              onInspect: setInspect,
              approximationIndex: approximation,
              linkedPlayback: runs.enabled ? runs : undefined,
              onSeek: (time) => {
                setFlipPlaying(false);
                runs.disable();
                props.onSeek(time);
              },
              onSelect: selectCoefficient,
              onEditCoefficient: (v) => {
                runs.disable();
                props.onEditCoefficient(v);
              },
              rectangle: {
                ...props.rectangle,
                onStart: () => {
                  runs.disable();
                  props.rectangle.onStart();
                },
              },
              triangulation: sharedTriangulation,
            }}
            onKind={(kind) => setKind(pane.id, kind)}
            onLift={(lift) =>
              setPanes((p) =>
                p.map((v) => (v.id === pane.id ? { ...v, lift } : v)),
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function RunTransport({ run }: { run: ReturnType<typeof useRunPlayback> }) {
  return (
    <div
      className="workspace-actions linked-transport"
      role="group"
      aria-label="Linked stage transport"
    >
      <button
        onClick={() => run.seek(0)}
        aria-label="Restart linked playback"
        title="Restart linked playback"
      >
        <RotateCcw size={22} aria-hidden="true" />
      </button>
      <button
        aria-label="Previous linked stage"
        disabled={run.position.term === 0}
        onClick={() => run.seek(run.position.term - 1)}
      >
        Previous
      </button>
      <button
        className="primary-action"
        onClick={run.toggle}
        aria-label={
          run.playing ? "Pause linked playback" : "Play linked playback"
        }
      >
        {run.playing ? "Pause" : "Play"}
      </button>
      <button
        aria-label="Next linked stage"
        disabled={run.position.term >= run.stages.length - 1}
        onClick={() => run.seek(run.position.term + 1)}
      >
        Next
      </button>
    </div>
  );
}

function TrajectoryControls({ shared: p }: { shared: WorkspaceProps }) {
  const [filter, setFilter] = useState("farey");
  const events = p.math.events.filter((e) =>
    filter === "ford" ? e.kind.startsWith("ford") : e.kind === filter,
  );
  const run = coefficientInterval(
    p.math.farey.crossings,
    p.selected,
    p.scene.end,
  );
  return (
    <div className="pane-transport">
      <div className="workspace-actions">
        <button
          onClick={() => p.onSeek(0)}
          aria-label="Restart trajectory"
          title="Restart trajectory"
        >
          <RotateCcw size={22} aria-hidden="true" />
        </button>
        <button
          aria-label="Previous crossing"
          title="Previous Farey crossing"
          onClick={() => p.onStepTrajectory(-1)}
        >
          Previous
        </button>
        <button
          aria-label={p.playing ? "Pause trajectory" : "Play trajectory"}
          className="primary-action"
          onClick={p.onToggleTrajectory}
        >
          {p.playing ? "Pause" : "Play"}
        </button>
        <button
          aria-label="Next crossing"
          title="Next Farey crossing"
          onClick={() => p.onStepTrajectory(1)}
        >
          Next
        </button>
      </div>
      <label className="pane-scrubber">
        Hyperbolic time · t = {p.scene.time.toFixed(2)}
        <input
          aria-label="Scrub trajectory"
          type="range"
          min={0}
          max={p.scene.end}
          step={0.001}
          value={p.scene.time}
          onChange={(e) => p.onSeek(Number(e.target.value))}
        />
      </label>
      <details className="workspace-details">
        <summary>Playback options & events</summary>{" "}
        <div className="workspace-actions">
          <label>
            <input
              type="checkbox"
              checked={p.reverse}
              onChange={(e) => p.onReverse(e.target.checked)}
            />{" "}
            Reverse
          </label>
          <label>
            Speed{" "}
            <select
              aria-label="Playback speed"
              value={p.scene.speed}
              onChange={(e) => p.onPatch({ speed: Number(e.target.value) })}
            >
              {[0.25, 0.5, 1, 2, 4].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>
          <button disabled={!run} onClick={() => run && p.onSeek(run.start)}>
            Seek selected run
          </button>
        </div>
        <p>
          z(t) = α + 2i exp(−t). Display cutoff y ={" "}
          {heightAt(p.scene.end).toExponential(1)}; the ideal endpoint is never
          reached in finite time.
        </p>
        <button
          disabled={p.scene.end >= 24}
          onClick={() => p.onPatch({ end: Math.min(24, p.scene.end + 4) })}
        >
          Extend depth +4
        </button>
        <label>
          Event type{" "}
          <select
            aria-label="Trajectory event type"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="farey">Farey crossings</option>
            <option value="ford">Ford encounters</option>
            <option value="seam">Modular seams</option>
          </select>
        </label>
        <div className="pane-events">
          {events.map((e) => (
            <button key={e.id} onClick={() => p.onSeek(e.time)}>
              t = {e.time.toFixed(3)} · {e.kind}
              {e.kind === "farey"
                ? ` · ${e.direction} · a${e.term}`
                : "rational" in e
                  ? ` · ${label(e.rational)}`
                  : ""}
            </button>
          ))}
          {!events.length && <p>No events in this display window.</p>}
        </div>
        <p>
          Ford window: q ≤ 32 plus convergents. Seam crossings, Ford encounters,
          and coefficients are different events.
        </p>
      </details>
    </div>
  );
}

function ComparisonPane({
  pane,
  other,
  side,
  shared: p,
  onKind,
  onLift,
  active,
  onActivate,
  onNavigationKey,
}: {
  pane: Pane;
  other: Pane;
  side: string;
  shared: WorkspaceProps;
  onKind: (k: Representation) => void;
  onLift: (n: number) => void;
  active: boolean;
  onActivate: () => void;
  onNavigationKey: (code: string) => void;
}) {
  const [overlays, setOverlays] = useState(p.scene.overlays),
    [follow, setFollow] = useState(p.scene.follow);
  const [camera, setCamera] = useState<"full" | "remainder">("full");
  const [showTriangulation, setShowTriangulation] = useState(false);
  const infinite = p.scene.spec.kind === "rational" && !p.scene.spec.value.q;
  const triangleVisible =
    showTriangulation || ["triangulation", "farey"].includes(other.kind);
  const triState = p.scene.triangulation ?? targetItinerary(p.scene.spec);
  const stage = p.rectangle.stages[p.selected];
  const selectedRun = !infinite
    ? {
        segments: coefficientTrace(
          p.math.quotient.segments,
          p.math.farey.crossings,
          p.selected,
          approximate(p.scene.spec),
          p.scene.end,
        ),
        term: p.selected,
        color: stageColor(p.selected),
      }
    : undefined;
  const flipPartner = other.kind === "triangulation";
  const focus = infinite
    ? undefined
    : domainFocus(
        p.math.quotient.segments,
        approximate(p.scene.spec),
        p.scene.time,
      );
  const surfacePartner = other.kind === "torus" || other.kind === "orbifold";
  const diskOptions = {
    domainFocus: surfacePartner ? focus : undefined,
    overlays: { ...overlays, dual: true },
    showFlipPath: flipPartner,
    showCurrentTriangle: other.kind === "h2",
    torusLift: other.kind === "torus" ? other.lift : undefined,
    onInspect: p.onInspect,
    inspection: p.inspection,
    selectedRun,
    selectedEdge: p.triangulation.selectedEdge,
    onEndpointStart: p.rectangle.onStart,
    onEndpointMove: p.rectangle.onMove,
    onEndpointEnd: p.rectangle.onEnd,
  };
  const localScene = {
    ...p.scene,
    overlays: { ...overlays, dual: flipPartner },
    follow,
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (
      (e.target as Element).closest(
        'button,input,select,textarea,[role="button"],.stacked-scroll,.tangle-scroll',
      )
    )
      return;
    if (!["Space", "ArrowLeft", "ArrowRight"].includes(e.code)) return;
    e.preventDefault();
    e.stopPropagation();
    onNavigationKey(e.code);
  };
  return (
    <section
      className="comparison-pane panel"
      aria-label={`${side} representation`}
      tabIndex={0}
      onKeyDown={onKey}
      data-representation={pane.kind}
      onPointerDownCapture={onActivate}
      onFocusCapture={onActivate}
    >
      <header className="pane-heading">
        <label>
          <span>{side} view</span>
          <select
            aria-label={`${side} representation`}
            value={pane.kind}
            onChange={(e) => onKind(e.target.value as Representation)}
          >
            {Object.entries(representations).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="pane-body">
        {pane.kind === "symbolic" && (
          <SymbolicView
            spec={p.scene.spec}
            coefficients={p.coefficients}
            selected={p.selected}
            onSelect={p.onSelect}
            sharedControls
            onEdit={p.onEditCoefficient}
            crossings={p.math.farey.crossings}
            onExtend={p.onExtendTerms}
          />
        )}
        {pane.kind === "braid" && (
          <CFBraid
            approximationIndex={p.approximationIndex}
            spec={p.scene.spec}
            coefficients={p.coefficients}
            selected={p.selected}
            onSelect={p.onSelect}
            sharedControls
            onEdit={p.onEditCoefficient}
            onNumber={p.onNumber}
            onExtend={p.onExtendTerms}
          />
        )}
        {pane.kind === "rectangle" && (
          <>
            {p.rectangle.unavailable ? (
              <p className="view-unavailable" role="status">
                {p.rectangle.unavailable}
              </p>
            ) : (
              <>
                <RectangleDissection
                  spec={p.scene.spec}
                  stages={p.rectangle.stages}
                  selected={p.selected}
                  onSelect={p.onSelect}
                  camera={camera}
                  onCamera={setCamera}
                  onStart={p.rectangle.onStart}
                  onMove={p.rectangle.onMove}
                  onEnd={p.rectangle.onEnd}
                />
              </>
            )}
            <details className="workspace-details">
              <summary>Current Euclidean division</summary>
              <DissectionExplanation
                spec={p.scene.spec}
                stage={stage}
                unavailable={p.rectangle.unavailable ?? undefined}
              />
            </details>
          </>
        )}
        {(pane.kind === "h2" || pane.kind === "farey") && (
          <>
            <div className="pane-overlays">
              {(
                [
                  ["farey", "Farey edges"],
                  ["ford", "Ford circles"],
                  ["modular", "Modular domains"],
                ] as const
              ).map(([key, name]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={overlays[key]}
                    onChange={(e) =>
                      setOverlays((v) => ({ ...v, [key]: e.target.checked }))
                    }
                  />
                  {name}
                </label>
              ))}
              {pane.kind === "h2" && (
                <label>
                  <input
                    type="checkbox"
                    checked={follow}
                    onChange={(e) => setFollow(e.target.checked)}
                  />
                  Auto zoom
                </label>
              )}
              {surfacePartner && !overlays.modular && (
                <button
                  className="layer-preset"
                  onClick={() =>
                    setOverlays((v) => ({
                      ...v,
                      modular: true,
                      farey: false,
                      ford: false,
                    }))
                  }
                >
                  Match surface layers
                </button>
              )}
              <details>
                <summary>More layers</summary>
                {(
                  [
                    ["trajectory", "Trajectory"],
                    ["labels", "Rational labels"],
                    ["convergents", "Convergents"],
                  ] as const
                ).map(([key, name]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={overlays[key]}
                      onChange={(e) =>
                        setOverlays((v) => ({ ...v, [key]: e.target.checked }))
                      }
                    />
                    {name}
                  </label>
                ))}
                {pane.kind === "h2" &&
                  (["triangulation", "farey"].includes(other.kind) ? (
                    <span className="pane-note">
                      Current triangulation is shown automatically beside a flip
                      view.
                    </span>
                  ) : (
                    <label>
                      <input
                        type="checkbox"
                        checked={triangleVisible}
                        onChange={(e) => setShowTriangulation(e.target.checked)}
                      />
                      Marked triangulation
                    </label>
                  ))}
              </details>
            </div>
            {pane.kind === "farey" ? (
              flipPartner ? (
                <MarkedTriangulation
                  {...p.triangulation}
                  compact
                  view="farey"
                  diskOptions={diskOptions}
                />
              ) : (
                <FareyDisk
                  {...diskOptions}
                  spec={p.scene.spec}
                  time={p.scene.time}
                  tri={currentTriangulation(triState)}
                  path={triangulationPath(triState)}
                  state={triState}
                  term={p.selected}
                  edgeAction={() => undefined}
                  selectEdge={() => {}}
                />
              )
            ) : infinite ? (
              <p className="view-unavailable">
                H² has no finite vertical-ray display at ∞. The shared number is
                unchanged.
              </p>
            ) : (
              <HalfPlane
                domainFocus={surfacePartner ? focus : undefined}
                scene={localScene}
                flipPath={flipPartner ? triState : undefined}
                torusLift={other.kind === "torus" ? other.lift : undefined}
                colorFarey={other.kind !== "torus" && triangleVisible}
                triangulation={
                  triangleVisible ? currentTriangulation(triState) : undefined
                }
                crossings={p.math.farey.crossings}
                selectedTerm={p.selected}
                inspection={p.inspection}
                selectedRun={selectedRun}
                selectedEdge={p.triangulation.selectedEdge}
                onInspect={p.onInspect!}
                onEndpointStart={p.rectangle.onStart}
                onEndpointMove={p.rectangle.onMove}
                onEndpointEnd={p.rectangle.onEnd}
              />
            )}
            {overlays.modular && <DomainEdgeLegend />}
          </>
        )}
        {(pane.kind === "orbifold" || pane.kind === "torus") &&
          (infinite ? (
            <p className="view-unavailable">
              No finite vertical-ray trajectory at ∞. The shared number is
              unchanged.
            </p>
          ) : pane.kind === "orbifold" ? (
            <Quotient
              domainFocus={focus}
              selectedRun={selectedRun}
              alpha={approximate(p.scene.spec)}
              time={p.scene.time}
              segments={p.math.quotient.segments}
              limited={p.math.quotient.limited}
              onSeek={p.onSeek}
            />
          ) : (
            <>
              <ModularTorus
                domainFocus={focus}
                selectedRun={selectedRun}
                lift={pane.lift}
                onLiftChange={onLift}
                alpha={approximate(p.scene.spec)}
                time={p.scene.time}
                segments={p.math.quotient.segments}
                limited={p.math.quotient.limited}
                onSeek={p.onSeek}
              />
            </>
          ))}
        {pane.kind === "triangulation" && (
          <MarkedTriangulation
            {...p.triangulation}
            time={p.scene.time}
            externalPlaying={p.triangulation.externalPlaying}
            view="square"
          />
        )}
        {pane.kind === "tangle" && (
          <TanglePanel
            key={pane.kind}
            linkCoefficients
            sharedControls
            approximationIndex={p.approximationIndex}
            coefficients={p.coefficients}
            showClosure={other.kind === "braid"}
            spec={p.scene.spec}
            expression={p.scene.tangle}
            convergents={p.convergents}
            selected={p.selected}
            onSelect={p.onSelect}
            onChange={p.onTangle}
            onError={p.onError}
          />
        )}
      </div>
    </section>
  );
}

function RectangleControls({ shared: p }: { shared: WorkspaceProps }) {
  const stage = p.rectangle.stages[p.selected];
  return (
    <div className="pane-transport">
      <div className="workspace-actions">
        <button
          aria-label="Restart dissection"
          title="Restart dissection"
          onClick={() => p.onSelect(0)}
        >
          <RotateCcw size={22} aria-hidden="true" />
        </button>
        <button
          disabled={!p.selected}
          aria-label="Previous stage"
          title="Previous Euclidean stage"
          onClick={() => p.rectangle.onStep(-1)}
        >
          Previous
        </button>
        <button
          className="primary-action"
          aria-label={
            p.rectangle.playing ? "Pause dissection" : "Play dissection"
          }
          onClick={p.rectangle.onToggle}
        >
          {p.rectangle.playing ? "Pause" : "Play"}
        </button>
        <button
          disabled={
            stage?.terminal ||
            (p.scene.spec.kind === "periodic" && p.selected >= 95)
          }
          aria-label="Next stage"
          title="Next Euclidean stage"
          onClick={() => p.rectangle.onStep(1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
