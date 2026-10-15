import { useEffect, useState, type ComponentProps } from "react";
import {
  comparisonPresets,
  correspondence,
  isRepresentation,
  isTrajectory,
  representations,
  type Representation,
} from "./workspace";
import type { Scene } from "./state";
import { approximate, specLabel } from "./math/continuedFraction";
import { label, type Rational } from "./math/rational";
import { heightAt, type derive } from "./math/trajectory";
import {
  currentTriangulation,
  initialTriangulation,
  appendFlip,
} from "./math/triangulation";
import type { TangleExpression } from "./math/tangles";
import { HalfPlane } from "./renderers/HalfPlane";
import { Quotient } from "./renderers/Quotient";
import { ModularTorus } from "./renderers/ModularTorus";
import {
  RectangleDissection,
  DissectionExplanation,
} from "./renderers/RectangleDissection";
import { SymbolicView } from "./renderers/SymbolicView";
import { MarkedTriangulation } from "./renderers/MarkedTriangulation";
import { TanglePanel } from "./renderers/TanglePanel";
import { stageColor } from "./renderers/dissectionColors";
import { DomainEdgeLegend } from "./renderers/domainEdges";
import { coefficientTrace } from "./renderers/selectedRun";

export type WorkspaceProps = {
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
      kind: isRepresentation(raw) ? raw : fallback,
      lift: Number.isInteger(lift) && lift >= 0 && lift < 6 ? lift : 0,
    };
  });
}
export function Workspace(props: WorkspaceProps) {
  const [panes, setPanes] = useState(initialPanes);
  const [activePane, setActivePane] = useState<string | null>(null);
  const [coefficientDraft, setCoefficientDraft] = useState("");
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
    props.onPause();
    setPanes((p) => p.map((v) => (v.id === id ? { ...v, kind } : v)));
  };
  const connection = correspondence(panes[0].kind, panes[1].kind);
  const infinite =
    props.scene.spec.kind === "rational" && !props.scene.spec.value.q;
  return (
    <section
      className="comparison-workspace"
      aria-label="Compare representations"
    >
      <div className="comparison-presets">
        <label>
          Start with a connection{" "}
          <select
            aria-label="Comparison preset"
            value=""
            onChange={(e) => {
              const preset = comparisonPresets[Number(e.target.value)];
              if (!preset) return;
              props.onPause();
              setActivePane(null);
              setPanes((p) =>
                p.map((v, i) => ({ ...v, kind: preset.pair[i] })),
              );
            }}
          >
            <option value="" disabled>
              Choose a comparison…
            </option>
            {comparisonPresets.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setPanes((p) => [p[1], p[0]])}>
          Swap sides ⇄
        </button>
      </div>
      <div
        className="connection-caption"
        role="status"
        aria-label="Connection between views"
      >
        <strong>{connection.kind}</strong>
        <p>{connection.text}</p>
      </div>
      <div
        className="comparison-strip"
        aria-label="Shared coefficient selection"
      >
        <strong>α = {specLabel(props.scene.spec)}</strong>
        <div className="comparison-coefficients">
          {props.coefficients.map((a, i) => (
            <button
              key={i}
              aria-pressed={props.selected === i}
              aria-label={`Highlight coefficient a${i} = ${a}`}
              style={{ borderBottomColor: stageColor(i) }}
              onClick={() => props.onSelect(i)}
            >
              <small>a{i}</small> {String(a)}
            </button>
          ))}
          {props.scene.spec.kind === "periodic" && (
            <button
              onClick={props.onExtendTerms}
              aria-label="Generate more coefficients"
            >
              …
            </button>
          )}
          {infinite && <span>No finite regular expansion</span>}
        </div>
        {!infinite && (
          <details className="strip-edit">
            <summary>Edit a{props.selected}</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                props.onEditCoefficient(coefficientDraft);
              }}
            >
              <label>
                Coefficient a{props.selected}
                <input
                  aria-label="Shared coefficient value"
                  inputMode="numeric"
                  value={coefficientDraft}
                  onChange={(e) => setCoefficientDraft(e.target.value)}
                />
              </label>
              <button>Apply coefficient</button>
            </form>
          </details>
        )}
      </div>
      <div className="comparison-grid">
        {panes.map((pane, i) => (
          <ComparisonPane
            key={pane.id}
            pane={pane}
            side={i ? "Right" : "Left"}
            other={panes[1 - i]}
            active={activePane === pane.id}
            onActivate={() => setActivePane(pane.id)}
            shared={props}
            onKind={(kind) => setKind(pane.id, kind)}
            onLift={(lift) =>
              setPanes((p) =>
                p.map((v) => (v.id === pane.id ? { ...v, lift } : v)),
              )
            }
          />
        ))}
      </div>
      <p className="comparison-footnote">
        Select a coefficient to highlight a relationship. Playback controls name
        the process they advance. Camera changes never edit the shared number.
      </p>
    </section>
  );
}

function TrajectoryControls({ shared: p }: { shared: WorkspaceProps }) {
  const [filter, setFilter] = useState("farey");
  const events = p.math.events.filter((e) =>
    filter === "ford" ? e.kind.startsWith("ford") : e.kind === filter,
  );
  const run = p.math.farey.crossings.find((e) => e.term === p.selected);
  return (
    <div className="pane-transport">
      <div className="workspace-actions">
        <button onClick={() => p.onSeek(0)} aria-label="Restart trajectory">
          ↺
        </button>
        <button onClick={() => p.onStepTrajectory(-1)}>
          Previous crossing
        </button>
        <button className="primary-action" onClick={p.onToggleTrajectory}>
          {p.playing ? "Pause trajectory" : "Play trajectory"}
        </button>
        <button onClick={() => p.onStepTrajectory(1)}>Next crossing</button>
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
        <button disabled={!run} onClick={() => run && p.onSeek(run.time)}>
          Seek selected run
        </button>
      </div>
      <details className="workspace-details">
        <summary>Trajectory events and depth</summary>
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
}: {
  pane: Pane;
  other: Pane;
  side: string;
  shared: WorkspaceProps;
  onKind: (k: Representation) => void;
  onLift: (n: number) => void;
  active: boolean;
  onActivate: () => void;
}) {
  const [overlays, setOverlays] = useState(p.scene.overlays),
    [follow, setFollow] = useState(p.scene.follow);
  const [camera, setCamera] = useState<"full" | "remainder">("full");
  const [inspect, setInspect] = useState<Rational | null>(null);
  const [showTriangulation, setShowTriangulation] = useState(false);
  const infinite = p.scene.spec.kind === "rational" && !p.scene.spec.value.q;
  const triangleVisible = showTriangulation || other.kind === "triangulation";
  const triState = p.scene.triangulation ?? initialTriangulation;
  const stage = p.rectangle.stages[p.selected];
  const linkRun = other.kind === "symbolic" || other.kind === "rectangle";
  const selectedRun =
    linkRun && !infinite
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
  useEffect(() => setInspect(null), [p.scene.spec]);
  const localScene = { ...p.scene, overlays, follow };
  const onKey = (e: React.KeyboardEvent) => {
    if (
      (e.target as Element).closest(
        'button,input,select,textarea,[role="button"],.stacked-scroll,.tangle-scroll',
      )
    )
      return;
    if (!["Space", "ArrowLeft", "ArrowRight"].includes(e.code)) return;
    if (isTrajectory(pane.kind) && !infinite) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Space") p.onToggleTrajectory();
      else p.onStepTrajectory(e.code === "ArrowRight" ? 1 : -1);
    } else if (pane.kind === "rectangle" && !p.rectangle.unavailable) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Space") p.rectangle.onToggle();
      else p.rectangle.onStep(e.code === "ArrowRight" ? 1 : -1);
    }
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
            onEdit={p.onEditCoefficient}
            crossings={p.math.farey.crossings}
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
                <div className="pane-transport">
                  <div className="workspace-actions">
                    <button
                      disabled={!p.selected}
                      onClick={() => p.rectangle.onStep(-1)}
                    >
                      Previous stage
                    </button>
                    <button
                      className="primary-action"
                      onClick={p.rectangle.onToggle}
                    >
                      {p.rectangle.playing
                        ? "Pause dissection"
                        : "Play dissection"}
                    </button>
                    <button
                      disabled={
                        stage?.terminal ||
                        (p.scene.spec.kind === "periodic" && p.selected >= 95)
                      }
                      onClick={() => p.rectangle.onStep(1)}
                    >
                      Next stage
                    </button>
                    <button onClick={() => p.onSelect(0)}>
                      Restart dissection
                    </button>
                  </div>
                  <p>
                    Euclidean stage a{p.selected} · one square group per step.
                    Hyperbolic time is unchanged.
                  </p>
                </div>
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
        {pane.kind === "h2" && (
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
              <label>
                <input
                  type="checkbox"
                  checked={follow}
                  onChange={(e) => setFollow(e.target.checked)}
                />
                Auto zoom
              </label>
              <details>
                <summary>More layers</summary>
                {(
                  [
                    ["trajectory", "Trajectory"],
                    ["labels", "Rational labels"],
                    ["convergents", "Convergents"],
                    ["dual", "Dual-tree path"],
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
                <label>
                  <input
                    type="checkbox"
                    checked={triangleVisible}
                    disabled={other.kind === "triangulation"}
                    onChange={(e) => setShowTriangulation(e.target.checked)}
                  />
                  Marked triangulation
                </label>
              </details>
            </div>
            {infinite ? (
              <p className="view-unavailable">
                H² has no finite vertical-ray display at ∞. The shared number is
                unchanged.
              </p>
            ) : (
              <HalfPlane
                scene={localScene}
                torusLift={other.kind === "torus" ? other.lift : undefined}
                triangulation={
                  triangleVisible ? currentTriangulation(triState) : undefined
                }
                onFlipTriangle={
                  triState.mode === "manual"
                    ? (edge) => {
                        try {
                          p.triangulation.onChange(
                            appendFlip(triState, edge, "farey"),
                          );
                        } catch (e) {
                          p.onError((e as Error).message);
                        }
                      }
                    : undefined
                }
                crossings={p.math.farey.crossings}
                selectedTerm={p.selected}
                onInspect={setInspect}
                onEndpointStart={p.rectangle.onStart}
                onEndpointMove={p.rectangle.onMove}
                onEndpointEnd={p.rectangle.onEnd}
              />
            )}
            {overlays.modular && <DomainEdgeLegend />}
            {other.kind === "torus" && (
              <p className="pane-note">
                Light fills match the punctured modular torus · lift{" "}
                {other.lift}.
              </p>
            )}
            {inspect && (
              <div className="pane-inspection">
                Ford circle {label(inspect)} · radius 1/
                {String(2n * inspect.q * inspect.q)}
                <button onClick={() => p.onNumber(inspect)}>
                  Use this endpoint
                </button>
                <button onClick={() => setInspect(null)}>
                  Close inspection
                </button>
              </div>
            )}
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
                selectedRun={selectedRun}
                lift={pane.lift}
                onLiftChange={onLift}
                alpha={approximate(p.scene.spec)}
                time={p.scene.time}
                segments={p.math.quotient.segments}
                limited={p.math.quotient.limited}
                onSeek={p.onSeek}
              />
              <p className="pane-note">
                Six-sheet commutator cover. Its lifted ray has no automatically
                assigned homology slope.
              </p>
            </>
          ))}
        {isTrajectory(pane.kind) && !infinite && (
          <>
            {selectedRun && pane.kind !== "h2" && (
              <p className="pane-note">
                {selectedRun.segments.length
                  ? `Thick colored overlay: the displayed Farey run for a${p.selected}, including its future portion. The moving point keeps its own time.`
                  : p.selected === 0
                    ? "a₀ translates the initial Farey bracket; it is not a crossing run."
                    : "This coefficient has no crossings in the current display window (run offsets apply)."}
              </p>
            )}
            <TrajectoryControls shared={p} />
          </>
        )}
        {pane.kind === "triangulation" && (
          <MarkedTriangulation
            {...p.triangulation}
            externalPlaying={p.triangulation.externalPlaying || !active}
            showPlane={triangleVisible}
            onShowPlane={setShowTriangulation}
          />
        )}
        {(["tangle", "closure", "pillowcase"] as string[]).includes(
          pane.kind,
        ) && (
          <TanglePanel
            key={pane.kind}
            view={pane.kind as "tangle" | "closure" | "pillowcase"}
            linkCoefficients
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
