import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Layers,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Share2,
  SkipBack,
  SkipForward,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { HalfPlane } from "./renderers/HalfPlane";
import { Quotient } from "./renderers/Quotient";
import {
  RectangleDissection,
  DissectionExplanation,
} from "./renderers/RectangleDissection";
import {
  dissect,
  dissectionUnavailable,
  MAX_DISSECTION_STAGES,
} from "./math/dissection";
import { stageColor } from "./renderers/dissectionColors";
import { StackedFraction } from "./renderers/StackedFraction";
import {
  type NumberSpec,
  approximate,
  terms,
  convergents,
  specLabel,
  parseInput,
  fromCF,
  alternate,
  cylinder,
  validateSpec,
  difference,
} from "./math/continuedFraction";
import { label, type Rational, rational, value } from "./math/rational";
import { derive, heightAt } from "./math/trajectory";
import {
  type Scene,
  type History,
  type Overlays,
  execute,
  undo,
  redo,
  serialize,
  deserialize,
  sceneFromLocation,
} from "./state";
const presets = [
  ["5/13", "5/13"],
  ["7/19", "7/19"],
  ["355/113", "355/113"],
  ["φ", "phi"],
  ["√2", "sqrt2"],
] as const;
const overlayNames: Record<keyof Overlays, string> = {
  farey: "Farey edges",
  ford: "Ford circles",
  modular: "Modular domains",
  trajectory: "Trajectory",
  labels: "Rational labels",
  convergents: "Convergents",
  dual: "Dual-tree path",
};
export default function App() {
  const [boot] = useState(sceneFromLocation),
    [history, setHistory] = useState<History>({
      past: [],
      present: boot.scene,
      future: [],
    }),
    scene = history.present;
  const [viewer, setViewer] = useState<"hyperbolic" | "rectangle">(
    "hyperbolic",
  );
  const [rectanglePlaying, setRectanglePlaying] = useState(false);
  const [rectangleDepth, setRectangleDepth] = useState(8);
  const [rectangleCamera, setRectangleCamera] = useState<"full" | "remainder">(
    "full",
  );
  const [input, setInput] = useState(specLabel(scene.spec)),
    [completion, setCompletion] = useState<"finite" | "ones">("finite"),
    [error, setError] = useState(boot.error ?? ""),
    [playing, setPlaying] = useState(false),
    [reverse, setReverse] = useState(false),
    [notice, setNotice] = useState(""),
    [termSelection, setSelectedTerm] = useState(1),
    [coefficient, setCoefficient] = useState("2"),
    [inspect, setInspect] = useState<Rational | null>(null),
    [mobilePanel, setMobilePanel] = useState<"plane" | "quotient">("plane"),
    [showGuide, setShowGuide] = useState(false),
    [eventFilter, setEventFilter] = useState<"farey" | "ford" | "seam">(
      "farey",
    ),
    [alternateEnding, setAlternateEnding] = useState(false),
    [fractionView, setFractionView] = useState<"coefficients" | "stacked">(
      "coefficients",
    );
  const file = useRef<HTMLInputElement>(null),
    guide = useRef<HTMLDialogElement>(null),
    endpointDragStart = useRef<Scene | null>(null);
  const math = useMemo(
      () => derive(scene.spec, scene.end),
      [scene.spec, scene.end],
    ),
    cf = useMemo(
      () =>
        terms(
          scene.spec,
          Math.max(
            rectangleDepth,
            Math.min(64, Math.max(12, Math.ceil(scene.end * 2))),
          ),
        ),
      [scene.spec, scene.end, rectangleDepth],
    ),
    cs = useMemo(() => convergents(cf), [cf]),
    selectedTerm = Math.min(termSelection, cf.length - 1),
    alpha = approximate(scene.spec),
    current = cs[Math.min(selectedTerm, cs.length - 1)],
    rationalInput = scene.spec.kind === "rational";
  const rectangleUnavailable = useMemo(
    () => dissectionUnavailable(scene.spec),
    [scene.spec],
  );
  const rectangleStages = useMemo(
    () => dissect(scene.spec, Math.max(rectangleDepth, selectedTerm + 1)),
    [scene.spec, rectangleDepth, selectedTerm],
  );
  const rectangleStage = rectangleStages[selectedTerm];
  function switchViewer(next: "hyperbolic" | "rectangle") {
    setPlaying(false);
    setRectanglePlaying(false);
    setViewer(next);
    setMobilePanel("plane");
    setAlternateEnding(false);
  }
  function advanceRectangle(direction: number) {
    const limit =
      scene.spec.kind === "rational"
        ? cf.length - 1
        : MAX_DISSECTION_STAGES - 1;
    const next = Math.max(0, Math.min(limit, selectedTerm + direction));
    if (next >= rectangleDepth)
      setRectangleDepth(Math.min(MAX_DISSECTION_STAGES, next + 8));
    setSelectedTerm(next);
  }
  useEffect(() => {
    setRectanglePlaying(false);
  }, [scene.spec]);
  useEffect(() => {
    if (!rectanglePlaying || viewer !== "rectangle" || !rectangleStage) return;
    if (
      rectangleStage.terminal ||
      (selectedTerm >= MAX_DISSECTION_STAGES - 1 &&
        scene.spec.kind === "periodic")
    ) {
      setRectanglePlaying(false);
      return;
    }
    const timer = setTimeout(() => advanceRectangle(1), 1400 / scene.speed);
    return () => clearTimeout(timer);
  }, [rectanglePlaying, viewer, rectangleStage, selectedTerm, scene.speed]);
  const patch = (changes: Partial<Scene>) =>
    setHistory((h) => ({ ...h, present: { ...h.present, ...changes } }));
  function changeNumber(spec: NumberSpec) {
    try {
      validateSpec(spec);
      setHistory((h) => execute(h, { type: "number", spec }));
      setPlaying(false);
      setError("");
      setInspect(null);
      setSelectedTerm(1);
      setAlternateEnding(false);
    } catch (e) {
      setError(
        viewer === "rectangle" && spec.kind === "rational" && !spec.value.q
          ? `${dissectionUnavailable(spec)} The shared number has not been changed.`
          : (e as Error).message,
      );
    }
  }
  function startEndpointDrag() {
    setPlaying(false);
    setRectanglePlaying(false);
    endpointDragStart.current = scene;
    setInspect(null);
    setError("");
    setAlternateEnding(false);
  }
  function moveEndpoint(r: Rational) {
    if (!endpointDragStart.current) return;
    setHistory((h) => {
      if (
        h.present.spec.kind === "rational" &&
        h.present.spec.value.p === r.p &&
        h.present.spec.value.q === r.q
      )
        return h;
      return {
        ...h,
        present: { ...h.present, spec: { kind: "rational", value: r } },
      };
    });
  }
  function endEndpointDrag(cancelled: boolean) {
    const original = endpointDragStart.current;
    if (!original) return;
    endpointDragStart.current = null;
    setHistory((h) => {
      if (cancelled) return { ...h, present: original };
      if (serialize(original) === serialize(h.present)) return h;
      return { ...h, past: [...h.past.slice(-49), original], future: [] };
    });
  }
  function submitInput() {
    try {
      changeNumber(parseInput(input, completion));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function seek(time: number) {
    setPlaying(false);
    const active = [...math.farey.crossings]
      .reverse()
      .find((e) => e.time <= time + 1e-8);
    if (active) setSelectedTerm(active.term);
    patch({ time: Math.max(0, Math.min(scene.end, time)) });
  }
  function step(direction: number, kind: "farey" | "term" = "farey") {
    if (kind === "term") {
      selectTerm(
        Math.max(0, Math.min(cf.length - 1, selectedTerm + direction)),
      );
      return;
    }
    const events = math.farey.crossings;
    const event =
      direction > 0
        ? events.find((e) => e.time > scene.time + 1e-7)
        : [...events].reverse().find((e) => e.time < scene.time - 1e-7);
    if (event) {
      seek(event.time);
      setSelectedTerm(event.term);
    }
  }
  useEffect(() => {
    setInput(specLabel(scene.spec));
  }, [scene.spec]);
  useEffect(() => {
    setCoefficient(String(cf[Math.min(selectedTerm, cf.length - 1)]));
  }, [cf, selectedTerm]);
  useEffect(() => {
    const active = [...math.farey.crossings]
      .reverse()
      .find((e) => e.time <= scene.time + 1e-8);
    if (playing && active) setSelectedTerm(active.term);
  }, [scene.time, playing, math]);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem("cf-atlas-scene", serialize(scene));
      } catch {
        /* Storage may be disabled; downloads and URL sharing remain available. */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [scene]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = 0;
    const animate = (now: number) => {
      if (last) {
        const dt =
          Math.min((now - last) / 1000, 0.1) * scene.speed * (reverse ? -1 : 1);
        setHistory((h) => {
          const s = h.present,
            t = s.time + dt;
          if (t > s.end && s.spec.kind === "periodic" && s.end < 24)
            return {
              ...h,
              present: { ...s, time: t, end: Math.min(24, s.end + 4) },
            };
          if ((!reverse && t >= s.end) || (reverse && t <= 0)) {
            setPlaying(false);
            return {
              ...h,
              present: { ...s, time: Math.max(0, Math.min(s.end, t)) },
            };
          }
          return { ...h, present: { ...s, time: t } };
        });
      }
      last = now;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [playing, scene.speed, reverse]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        (e.target as HTMLElement).closest(
          'input,select,textarea,button,dialog,.stacked-scroll,[role="button"],[role="slider"]',
        )
      )
        return;
      if (viewer === "rectangle") {
        if (e.code === "Space" && rectangleStage) {
          e.preventDefault();
          setRectanglePlaying((p) => !p);
        }
        if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
          e.preventDefault();
          setRectanglePlaying(false);
          advanceRectangle(e.code === "ArrowRight" ? 1 : -1);
        }
      }
      if (e.code === "Space" && viewer === "hyperbolic") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.code === "ArrowRight" && viewer === "hyperbolic") {
        e.preventDefault();
        step(1, e.shiftKey ? "term" : "farey");
      }
      if (e.code === "ArrowLeft" && viewer === "hyperbolic") {
        e.preventDefault();
        step(-1, e.shiftKey ? "term" : "farey");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        setPlaying(false);
        setHistory(e.shiftKey ? redo : undo);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    if (showGuide) guide.current?.showModal();
    else guide.current?.close();
  }, [showGuide]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  function selectTerm(i: number) {
    setRectanglePlaying(false);
    if (viewer === "rectangle") {
      setSelectedTerm(i);
      return;
    }
    const first = math.farey.crossings.find((e) => e.term === i);
    if (first) seek(first.time);
    else setPlaying(false);
    setSelectedTerm(i);
  }
  function editCoefficient() {
    try {
      if (!/^-?\d{1,100}$/.test(coefficient))
        throw new Error("Enter an integer coefficient.");
      const a = [...cf];
      a[selectedTerm] = BigInt(coefficient);
      if (scene.spec.kind === "rational")
        changeNumber({ kind: "rational", value: fromCF(a) });
      else {
        const prefix = a.slice(
            0,
            Math.max(scene.spec.prefix.length, selectedTerm + 1),
          ),
          offset =
            (prefix.length - scene.spec.prefix.length) %
            scene.spec.period.length,
          period = [
            ...scene.spec.period.slice(offset),
            ...scene.spec.period.slice(0, offset),
          ];
        changeNumber({ kind: "periodic", prefix, period });
      }
      setSelectedTerm(selectedTerm);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function save() {
    const url = URL.createObjectURL(
        new Blob([serialize(scene)], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "continued-fractions-scene.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setNotice("Scene downloaded. Exact integers are preserved.");
  }
  async function share() {
    const url = new URL(location.href);
    url.hash = `scene=${encodeURIComponent(serialize(scene))}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Scene link copied.");
    } catch {
      setNotice("Scene saved in the address bar. Copy the URL to share it.");
    }
  }
  const events = math.events.filter((e) =>
      eventFilter === "ford"
        ? e.kind.startsWith("ford")
        : e.kind === eventFilter,
    ),
    crossingsForTerm = math.farey.crossings.filter(
      (e) => e.term === selectedTerm && e.direction !== "initial",
    ),
    selectedError = difference(scene.spec, current),
    [lower, upper] = cylinder(
      cf.slice(0, Math.min(cf.length, selectedTerm + 1)),
    ),
    lastCrossing = [...math.farey.crossings]
      .reverse()
      .find((e) => e.time <= scene.time),
    displayCF = alternateEnding && rationalInput ? alternate(cf) : cf,
    displayConvergents = convergents(displayCF);
  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            changeNumber(parseInput("5/13"));
          }}
          aria-label="Continued Fractions Atlas home"
        >
          <svg width="38" height="34" viewBox="0 0 38 34" aria-hidden="true">
            <path
              d="M3 29a16 16 0 0 1 32 0M3 29a8 8 0 0 1 16 0 8 8 0 0 1 16 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path d="M16 3v26" stroke="#c7744d" strokeWidth="1.6" />
            <circle cx="16" cy="14" r="3" fill="#c7744d" />
          </svg>
          <span>
            Continued Fractions <em>Atlas</em>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button className="text-button" onClick={() => setShowGuide(true)}>
            <BookOpen size={15} /> Field guide
          </button>
          <a
            href="https://github.com/davbachman/ContinuedFractions"
            target="_blank"
            rel="noreferrer"
          >
            Source <ArrowUpRight size={15} />
          </a>
        </nav>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">
              <span /> AN INTERACTIVE MATHEMATICAL INSTRUMENT
            </p>
            <h1>
              One number. <em>Many geometries.</em>
            </h1>
            <p>
              Explore a continued fraction through geometry.
              <br className="desktop-break" /> One exact number connects the
              hyperbolic plane and Euclidean dissection.
            </p>
          </div>
          <div className="intro-note">
            <span className="note-symbol">∞</span>
            <span>
              A small atlas of
              <br />
              an infinite landscape.
            </span>
          </div>
        </section>
        <section className="number-bar" aria-label="Choose an endpoint">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitInput();
            }}
          >
            <label htmlFor="number-input">
              ENDPOINT <span>α</span>
            </label>
            <div className="input-group">
              <input
                id="number-input"
                aria-describedby="number-help"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
              />
              <button type="submit" aria-label="Apply endpoint">
                <ArrowUpRight size={18} />
              </button>
            </div>
          </form>
          <div className="preset-group">
            <span>EXPLORE</span>
            {presets.map(([text, v]) => (
              <button
                key={text}
                className={specLabel(scene.spec) === text ? "selected" : ""}
                onClick={() => changeNumber(parseInput(v))}
              >
                {text}
              </button>
            ))}
          </div>
          <div className="history-tools">
            <button
              aria-label="Undo number edit"
              disabled={!history.past.length}
              onClick={() => {
                setPlaying(false);
                setHistory(undo);
              }}
            >
              <Undo2 size={17} />
            </button>
            <button
              aria-label="Redo number edit"
              disabled={!history.future.length}
              onClick={() => {
                setPlaying(false);
                setHistory(redo);
              }}
            >
              <Redo2 size={17} />
            </button>
            <span className="tool-divider" />
            <button aria-label="Download scene" onClick={save}>
              <Download size={17} />
            </button>
            <button
              aria-label="Load scene"
              onClick={() => file.current?.click()}
            >
              <Upload size={17} />
            </button>
            <button className="share-button" onClick={share}>
              <Share2 size={15} />
              <span>Share scene</span>
            </button>
            <input
              ref={file}
              hidden
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (f.size > 32000)
                    throw new Error("Scene file exceeds 32 KB.");
                  const s = deserialize(await f.text());
                  setPlaying(false);
                  setHistory((h) => execute(h, { type: "load", scene: s }));
                  setError("");
                  setNotice("Scene loaded.");
                } catch (err) {
                  setError((err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </div>
        </section>
        <div className="input-options">
          <span id="number-help">
            Rational, decimal, or [a₀; a₁, …]. Decimals are exact rationals.
          </span>
          <label>
            CF prefix completion{" "}
            <select
              aria-label="Continued-fraction prefix completion"
              value={completion}
              onChange={(e) =>
                setCompletion(e.target.value as "finite" | "ones")
              }
            >
              <option value="finite">Terminate (rational)</option>
              <option value="ones">Infinite tail of 1s</option>
            </select>
          </label>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className="viewer-selector" role="group" aria-label="Main viewer">
          <button
            aria-pressed={viewer === "hyperbolic"}
            onClick={() => switchViewer("hyperbolic")}
          >
            Hyperbolic plane
          </button>
          <button
            aria-pressed={viewer === "rectangle"}
            onClick={() => switchViewer("rectangle")}
          >
            Rectangle dissection
          </button>
        </div>
        <div className="mobile-tabs" role="group" aria-label="Visual panel">
          <button
            className={mobilePanel === "plane" ? "active" : ""}
            onClick={() => setMobilePanel("plane")}
          >
            {viewer === "hyperbolic"
              ? "01 Upper half-plane"
              : "01 Rectangle dissection"}
          </button>
          <button
            className={mobilePanel === "quotient" ? "active" : ""}
            onClick={() => setMobilePanel("quotient")}
          >
            {viewer === "hyperbolic"
              ? "02 Modular quotient"
              : "02 Euclidean division"}
          </button>
        </div>
        {viewer === "rectangle" ? (
          <div className={`view-grid rectangle-grid mobile-${mobilePanel}`}>
            <section className="panel half-plane">
              <div className="panel-heading">
                <div>
                  <span className="panel-number">01</span>
                  <h2>Rectangle dissection</h2>
                </div>
                <span className="small-tag">α × 1</span>
              </div>
              {rectangleUnavailable ? (
                <div className="rectangle-unavailable" role="status">
                  {rectangleUnavailable}
                </div>
              ) : (
                <RectangleDissection
                  spec={scene.spec}
                  stages={rectangleStages}
                  selected={selectedTerm}
                  camera={rectangleCamera}
                  onCamera={setRectangleCamera}
                  onSelect={selectTerm}
                  onStart={startEndpointDrag}
                  onMove={moveEndpoint}
                  onEnd={endEndpointDrag}
                />
              )}
            </section>
            <section className="panel quotient">
              <div className="panel-heading">
                <div>
                  <span className="panel-number">02</span>
                  <h2>Euclidean division</h2>
                </div>
              </div>
              <DissectionExplanation
                spec={scene.spec}
                stage={rectangleStage}
                unavailable={rectangleUnavailable}
              />
            </section>
          </div>
        ) : (
          <div className={`view-grid mobile-${mobilePanel}`}>
            <section className="panel half-plane">
              <div className="panel-heading">
                <div>
                  <span className="panel-number">01</span>
                  <h2>The upper half-plane</h2>
                </div>
                <label className="follow-toggle">
                  <input
                    type="checkbox"
                    checked={scene.follow}
                    onChange={(e) => patch({ follow: e.target.checked })}
                  />{" "}
                  Auto zoom
                </label>
              </div>
              <div className="overlay-bar">
                <Layers size={14} />
                {(["farey", "ford", "modular"] as const).map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={scene.overlays[key]}
                      onChange={(e) =>
                        patch({
                          overlays: {
                            ...scene.overlays,
                            [key]: e.target.checked,
                          },
                        })
                      }
                    />
                    {overlayNames[key]}
                  </label>
                ))}
                <details className="more-overlays">
                  <summary>More</summary>
                  <div>
                    {(
                      ["trajectory", "labels", "convergents", "dual"] as const
                    ).map((key) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={scene.overlays[key]}
                          onChange={(e) =>
                            patch({
                              overlays: {
                                ...scene.overlays,
                                [key]: e.target.checked,
                              },
                            })
                          }
                        />
                        {overlayNames[key]}
                      </label>
                    ))}
                  </div>
                </details>
              </div>
              <HalfPlane
                scene={scene}
                crossings={math.farey.crossings}
                selectedTerm={selectedTerm}
                onInspect={setInspect}
                onEndpointStart={startEndpointDrag}
                onEndpointMove={moveEndpoint}
                onEndpointEnd={endEndpointDrag}
              />
              <div className="plot-footer">
                <span>
                  <i className="legend-line" /> α = {specLabel(scene.spec)}
                </span>
                <span>y ≈ {heightAt(scene.time).toPrecision(4)}</span>
                <span>
                  {math.farey.onEdge
                    ? "On a Farey edge"
                    : lastCrossing
                      ? `Crossed ${label(lastCrossing.left)} ↔ ${label(lastCrossing.right)}`
                      : "Descending from y₀ = 2"}
                </span>
              </div>
            </section>
            <section className="panel quotient">
              <div className="panel-heading">
                <div>
                  <span className="panel-number">02</span>
                  <h2>The modular quotient</h2>
                </div>
                <span className="small-tag">PSL(2, ℤ)</span>
              </div>
              <Quotient
                alpha={alpha}
                time={scene.time}
                segments={math.quotient.segments}
                limited={math.quotient.limited}
                onSeek={seek}
              />
            </section>
          </div>
        )}
        {viewer === "hyperbolic" && inspect && (
          <div className="inspection">
            <span>
              <strong>Ford circle {label(inspect)}</strong> · radius = 1/
              {String(2n * inspect.q * inspect.q)} · inspecting only
            </span>
            <button
              onClick={() => changeNumber({ kind: "rational", value: inspect })}
            >
              Use this endpoint
            </button>
            <button
              aria-label="Close inspection"
              onClick={() => setInspect(null)}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {viewer === "rectangle" ? (
          <section
            className="transport panel rectangle-transport"
            aria-label="Rectangle stage transport"
          >
            <div className="play-controls">
              <button
                aria-label="Restart dissection"
                disabled={!rectangleStage}
                onClick={() => {
                  setRectanglePlaying(false);
                  setSelectedTerm(0);
                }}
              >
                <RotateCcw size={17} />
              </button>
              <button
                aria-label="Previous rectangle stage"
                disabled={!rectangleStage || selectedTerm === 0}
                onClick={() => {
                  setRectanglePlaying(false);
                  advanceRectangle(-1);
                }}
              >
                <SkipBack size={17} />
              </button>
              <button
                className="play-button"
                aria-label={
                  rectanglePlaying ? "Pause dissection" : "Play dissection"
                }
                disabled={!rectangleStage}
                onClick={() => {
                  if (
                    !rectanglePlaying &&
                    (rectangleStage?.terminal ||
                      (scene.spec.kind === "periodic" &&
                        selectedTerm >= MAX_DISSECTION_STAGES - 1))
                  )
                    setSelectedTerm(0);
                  setRectanglePlaying((p) => !p);
                }}
              >
                {rectanglePlaying ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button
                aria-label="Next rectangle stage"
                disabled={
                  !rectangleStage ||
                  rectangleStage.terminal ||
                  (scene.spec.kind === "periodic" &&
                    selectedTerm >= MAX_DISSECTION_STAGES - 1)
                }
                onClick={() => {
                  setRectanglePlaying(false);
                  advanceRectangle(1);
                }}
              >
                <SkipForward size={17} />
              </button>
            </div>
            <div className="rectangle-progress" aria-live="polite">
              <strong>
                {rectangleStage
                  ? `Stage a${selectedTerm} = ${rectangleStage.count}`
                  : "Dissection unavailable"}
              </strong>
              <span>
                {scene.spec.kind === "periodic"
                  ? `Infinite expansion · ${rectangleStages.length} stages generated · display cap ${MAX_DISSECTION_STAGES}`
                  : rectangleStage?.terminal
                    ? "Exact zero remainder · complete"
                    : `${rectangleStages.length} Euclidean stages`}
              </span>
            </div>
            <span className="cf-help">
              One square group per step. Rectangle playback is independent of
              hyperbolic time.
            </span>
          </section>
        ) : (
          <>
            <section
              className="transport panel"
              aria-label="Animation transport"
            >
              <div className="play-controls">
                <button aria-label="Restart trajectory" onClick={() => seek(0)}>
                  <RotateCcw size={17} />
                </button>
                <button
                  aria-label="Previous Farey crossing"
                  onClick={() => step(-1)}
                >
                  <SkipBack size={17} />
                </button>
                <button
                  className="play-button"
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={() => {
                    if (
                      !playing &&
                      ((!reverse && scene.time >= scene.end) ||
                        (reverse && scene.time <= 0))
                    )
                      patch({ time: reverse ? scene.end : 0 });
                    setPlaying((p) => !p);
                  }}
                >
                  {playing ? (
                    <Pause size={17} fill="currentColor" />
                  ) : (
                    <Play size={17} fill="currentColor" />
                  )}
                </button>
                <button
                  aria-label="Next Farey crossing"
                  onClick={() => step(1)}
                >
                  <SkipForward size={17} />
                </button>
              </div>
              <div className="timeline">
                <div className="timeline-label">
                  <span>
                    HYPERBOLIC TIME <strong>t = {scene.time.toFixed(2)}</strong>
                  </span>
                  <span>{scene.end.toFixed(0)}</span>
                </div>
                <div className="timeline-track">
                  <input
                    aria-label="Scrub trajectory"
                    type="range"
                    min="0"
                    max={scene.end}
                    step="0.001"
                    value={scene.time}
                    onChange={(e) => seek(Number(e.target.value))}
                  />
                  <div className="event-ticks" aria-hidden="true">
                    {math.farey.crossings.map((e) => (
                      <i
                        key={e.id}
                        className={e.time <= scene.time ? "passed" : ""}
                        style={{ left: `${(e.time / scene.end) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="speed-controls">
                <label className="reverse-control">
                  <input
                    type="checkbox"
                    checked={reverse}
                    onChange={(e) => setReverse(e.target.checked)}
                  />
                  Reverse
                </label>
                <select
                  aria-label="Playback speed"
                  value={scene.speed}
                  onChange={(e) => patch({ speed: Number(e.target.value) })}
                >
                  <option value="0.25">0.25×</option>
                  <option value="0.5">0.5×</option>
                  <option value="1">1× speed</option>
                  <option value="2">2× speed</option>
                  <option value="4">4× speed</option>
                </select>
              </div>
            </section>
            <div className="motion-note">
              <span>
                z(t) = α + 2i e<sup>−t</sup> · equal time, equal hyperbolic
                distance
              </span>
              <span>
                {rationalInput
                  ? `Display cutoff y = ${heightAt(scene.end).toExponential(1)}; the ideal endpoint is never reached.`
                  : "Periodic prefix extends on demand · numerical display limit t = 24."}
              </span>
              {scene.end < 24 && (
                <button
                  className="inline-link"
                  onClick={() => patch({ end: Math.min(24, scene.end + 4) })}
                >
                  Extend depth +4
                </button>
              )}
            </div>
          </>
        )}
        <section className="panel fraction-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-number">03</span>
              <h2>The continued fraction</h2>
              <span className="exact-badge">
                <span /> {rationalInput ? "EXACT RATIONAL" : "EXACT PERIODIC"}
              </span>
            </div>
            <div className="term-step">
              <button
                aria-label="Previous coefficient"
                onClick={() => step(-1, "term")}
              >
                <ChevronLeft size={15} />
              </button>
              <span>coefficient</span>
              <button
                aria-label="Next coefficient"
                onClick={() => step(1, "term")}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div
            className="fraction-tabs"
            role="tablist"
            aria-label="Continued fraction view"
          >
            {(["coefficients", "stacked"] as const).map((view, index) => (
              <button
                key={view}
                id={`fraction-tab-${view}`}
                role="tab"
                aria-selected={fractionView === view}
                aria-controls={`fraction-panel-${view}`}
                tabIndex={fractionView === view ? 0 : -1}
                onClick={() => setFractionView(view)}
                onKeyDown={(event) => {
                  let next: number;
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight")
                    next = 1 - index;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = 1;
                  else return;
                  event.preventDefault();
                  const nextView = next === 0 ? "coefficients" : "stacked";
                  setFractionView(nextView);
                  document.getElementById(`fraction-tab-${nextView}`)?.focus();
                }}
              >
                {view === "coefficients" ? "Coefficients" : "Stacked fraction"}
              </button>
            ))}
          </div>
          <div className="fraction-body">
            <div
              id="fraction-panel-coefficients"
              role="tabpanel"
              aria-labelledby="fraction-tab-coefficients"
              hidden={fractionView !== "coefficients"}
            >
              <div className="cf-expression">
                <span className="cf-value">
                  {specLabel(scene.spec).length < 18
                    ? specLabel(scene.spec)
                    : "α"}{" "}
                  <span>=</span>
                </span>
                <span className="bracket">[</span>
                <div className="terms">
                  {displayCF.map((a, i) => (
                    <div className="term-wrap" key={i}>
                      <button
                        disabled={alternateEnding}
                        aria-label={`Select coefficient a${i} = ${a}`}
                        className={`${selectedTerm === i ? "active" : ""}${viewer === "rectangle" ? " colored-coefficient" : ""}`}
                        style={
                          viewer === "rectangle"
                            ? { borderBottomColor: stageColor(i) }
                            : undefined
                        }
                        onClick={() => selectTerm(Math.min(i, cf.length - 1))}
                      >
                        <span className="term-index">
                          a<sub>{i}</sub>
                        </span>
                        <strong>{String(a)}</strong>
                        <span className="term-convergent">
                          {label(displayConvergents[i])}
                        </span>
                      </button>
                      <span className="punctuation">
                        {i === 0 ? ";" : i < displayCF.length - 1 ? "," : ""}
                      </span>
                    </div>
                  ))}
                  {!rationalInput && <span className="ellipsis">…</span>}
                </div>
                <span className="bracket">]</span>
              </div>
            </div>
            <div
              id="fraction-panel-stacked"
              role="tabpanel"
              aria-labelledby="fraction-tab-stacked"
              hidden={fractionView !== "stacked"}
            >
              <div
                className="stacked-scroll"
                role="region"
                aria-label="Nested continued fraction"
                tabIndex={0}
              >
                <div className="stacked-expression">
                  <span className="cf-value">
                    {specLabel(scene.spec).length < 18
                      ? specLabel(scene.spec)
                      : "α"}{" "}
                    <span>=</span>
                  </span>
                  <StackedFraction
                    coefficients={displayCF}
                    periodic={!rationalInput}
                    selectedTerm={selectedTerm}
                    disabled={alternateEnding}
                    colored={viewer === "rectangle"}
                    onSelect={(i) => selectTerm(Math.min(i, cf.length - 1))}
                  />
                </div>
              </div>
              <p className="cf-help">
                {rationalInput
                  ? "Full finite expansion."
                  : "The periodic expansion continues indefinitely (…)."}{" "}
                Long fractions scroll within this view.
              </p>
            </div>
            <p className="cf-help">
              {alternateEnding
                ? "Alternate expression: same value. Switch back to the canonical expression to edit or select runs."
                : viewer === "rectangle"
                  ? "Select a coefficient or square group to inspect its Euclidean division. Colors identify the same stages in both displays."
                  : "Select a term to inspect its convergent and Farey run. Ford contacts have their own timeline."}
            </p>
          </div>
          <div className="coefficient-detail">
            <div>
              <span className="data-label">SELECTED CONVERGENT</span>
              <strong>{label(current)}</strong>
              <small>
                α − p/q{" "}
                {rationalInput && selectedTerm === cf.length - 1
                  ? "= 0"
                  : `≈ ${selectedError.toExponential(4)}`}
              </small>
            </div>
            <div>
              <span className="data-label">
                FAREY RUN · a<sub>{selectedTerm}</sub>
              </span>
              <strong className="run-word">
                {selectedTerm === 0
                  ? "translation"
                  : crossingsForTerm.map((e) => e.direction).join("") || "∅"}
              </strong>
              <small>
                {selectedTerm === 0
                  ? "a₀ shifts the bracket"
                  : `${crossingsForTerm.length} crossings in this display window`}
              </small>
            </div>
            <div className="determinant">
              <span className="data-label">CONSECUTIVE DETERMINANT</span>
              <strong>
                {selectedTerm > 0
                  ? String(
                      current.p * cs[selectedTerm - 1].q -
                        cs[selectedTerm - 1].p * current.q,
                    )
                  : "—"}
              </strong>
              <small>pₙqₙ₋₁ − pₙ₋₁qₙ</small>
            </div>
            <form
              className="coefficient-edit"
              onSubmit={(e) => {
                e.preventDefault();
                editCoefficient();
              }}
            >
              <label htmlFor="coefficient-input">
                EDIT a<sub>{selectedTerm}</sub>
              </label>
              <div className="input-group">
                <input
                  id="coefficient-input"
                  value={coefficient}
                  onChange={(e) => setCoefficient(e.target.value)}
                  inputMode="numeric"
                />
                <button type="submit" aria-label="Apply coefficient">
                  <Check size={16} />
                </button>
              </div>
            </form>
          </div>
          <div className="fraction-foot">
            <span>
              Prefix cylinder: [{label(lower)}, {label(upper)}]{" "}
              <span className="muted">
                · endpoints bound possible completions
              </span>
            </span>
            {rationalInput && viewer === "hyperbolic" && (
              <label>
                <input
                  type="checkbox"
                  checked={alternateEnding}
                  onChange={(e) => setAlternateEnding(e.target.checked)}
                />{" "}
                Alternate ending <span className="muted">(same value)</span>
              </label>
            )}
          </div>
        </section>
        <section className="details-grid">
          <div className="panel events-panel">
            <div className="panel-heading">
              <div>
                <h2>Along the trajectory</h2>
              </div>
              <div
                className="event-filters"
                role="group"
                aria-label="Event type"
              >
                {(["farey", "ford", "seam"] as const).map((f) => (
                  <button
                    key={f}
                    className={eventFilter === f ? "active" : ""}
                    onClick={() => setEventFilter(f)}
                  >
                    {f === "farey" ? "Farey" : f === "ford" ? "Ford" : "Seams"}
                  </button>
                ))}
              </div>
            </div>
            <div className="events-list">
              {events.length ? (
                events.map((e) => (
                  <button
                    key={e.id}
                    className={
                      Math.abs(scene.time - e.time) < 0.002 ? "current" : ""
                    }
                    onClick={() => {
                      seek(e.time);
                      if (e.kind === "farey") setSelectedTerm(e.term);
                    }}
                  >
                    <span className={`event-dot ${e.kind}`}>
                      {e.kind === "farey" ? "◇" : e.kind === "seam" ? "⇄" : "○"}
                    </span>
                    <span>
                      {e.kind === "farey"
                        ? e.direction === "initial"
                          ? "Initial Farey-edge crossing"
                          : `${e.direction} crossing · coefficient a${e.term}`
                        : e.kind === "seam"
                          ? "Modular seam transition"
                          : e.kind.replace("ford-", "Ford ")}
                      <small>
                        {e.kind === "farey"
                          ? `${label(e.left)} ↔ ${label(e.right)}`
                          : "rational" in e
                            ? label(e.rational)
                            : "Paired points in the quotient"}
                      </small>
                    </span>
                    <code>t {e.time.toFixed(4)}</code>
                    <ChevronRight size={13} />
                  </button>
                ))
              ) : (
                <p className="empty-state">
                  {math.farey.onEdge && eventFilter === "farey"
                    ? "This integer ray lies on a Farey edge. No transverse crossings."
                    : "No events of this type in the current time window."}
                </p>
              )}
            </div>
            <div className="events-note">
              {eventFilter === "ford"
                ? "Ford window: q ≤ 32 plus computed convergents. Entry, exit, and tangency are separate events."
                : eventFilter === "farey"
                  ? `Cutting word: ${math.farey.word || "∅"}${math.farey.limited ? " … (800-event limit)" : ""}. Initial crossing is separate.`
                  : "Seam transitions use S and T; they are not continued-fraction terms."}
            </div>
          </div>
          <aside className="field-note">
            <p className="eyebrow">A NOTE FROM THE ATLAS</p>
            <h3>
              Different pictures.
              <br />
              The same mathematics.
            </h3>
            <p>
              Farey edges are geodesics. Ford circles are horocycles. The
              modular domain folds the plane into an orbifold with one cusp and
              two cone points.
            </p>
            <p>
              They illuminate the same number, but their events need not
              coincide.
            </p>
            <button className="inline-link" onClick={() => setShowGuide(true)}>
              Read the conventions <ArrowUpRight size={15} />
            </button>
            <div className="rational-inspector">
              <label htmlFor="inspect-rational">
                Inspect a convergent’s Ford circle
              </label>
              <select
                id="inspect-rational"
                value={inspect ? label(inspect) : ""}
                onChange={(e) => {
                  const r = cs.find((r) => label(r) === e.target.value);
                  if (r) setInspect(r);
                }}
              >
                <option value="">Choose a rational…</option>
                {cs.slice(0, 24).map((r, i) => (
                  <option key={i} value={label(r)}>
                    {label(r)}
                  </option>
                ))}
              </select>
            </div>
          </aside>
        </section>
        <footer>
          <span>
            Conceived by{" "}
            <a
              href="https://github.com/davbachman"
              target="_blank"
              rel="noreferrer"
            >
              David Bachman
            </a>{" "}
            · Built with OpenAI Codex
          </span>
          <span>
            Open source ·{" "}
            <a href="https://github.com/davbachman/ContinuedFractions/blob/main/LICENSE">
              MIT license
            </a>
            <span className="footer-separator">/</span>Atlas 1.0
          </span>
        </footer>
      </main>
      <div
        className="mobile-cf-strip"
        aria-label="Persistent continued fraction"
      >
        <strong>
          α = {specLabel(scene.spec).length < 15 ? specLabel(scene.spec) : "α"}
        </strong>
        <span>
          [
          {cf
            .slice(0, 7)
            .map((a, i) => `${i === 1 ? "; " : i > 1 ? ", " : ""}${a}`)
            .join("")}
          {cf.length > 7 || !rationalInput ? ", …" : ""}]
        </span>
        <button
          aria-label="Jump to continued fraction"
          onClick={() =>
            document
              .querySelector(".fraction-panel")
              ?.scrollIntoView({ block: "start" })
          }
        >
          a{selectedTerm} ↗
        </button>
      </div>
      <div className={`toast ${notice ? "visible" : ""}`} role="status">
        {notice}
      </div>
      <dialog
        ref={guide}
        onClose={() => setShowGuide(false)}
        className="guide-dialog"
      >
        <div className="guide-header">
          <p className="eyebrow">THE FIELD GUIDE</p>
          <button
            aria-label="Close field guide"
            onClick={() => setShowGuide(false)}
          >
            <X size={20} />
          </button>
        </div>
        <h2>A number, seen three ways.</h2>
        <p>
          Choose an endpoint α, then press Play or step between crossings. The
          orange point follows z(t) = α + 2i e<sup>−t</sup>. Playback starts at
          finite height 2; the real axis is an ideal boundary.
        </p>
        <h3>Reading the layers</h3>
        <p>
          <strong>Farey edges</strong> connect p/q and r/s exactly when |ps −
          qr| = 1. <strong>Ford circles</strong> have radius 1/(2q²).{" "}
          <strong>Modular domains</strong> are copies of ℱ ={" "}
          {"{ |x| ≤ ½, |z| ≥ 1 }"}. A Farey triangle has area π; a modular
          domain has area π/3.
        </p>
        <h3>Reading a coefficient</h3>
        <p>
          Subtract a₀ and bracket α by 0 and 1. Compare with the mediant: L
          replaces the upper bound; R replaces the lower bound. Equality ends a
          rational word. The initial edge crossing is separate. The first run
          loses one move; the final rational run loses one more. Thus 5/13 gives
          LRLR, 2/5 gives LR, and 1/2 gives the empty word. A zero-length run is
          meaningful.
        </p>
        <p>
          Coefficient selection follows these runs. Ford contacts are calculated
          independently: even a convergent may be missed by the vertical line.
          The golden-ratio ray misses the Ford circle at 1/1.
        </p>
        <h3>Exact data, finite pictures</h3>
        <p>
          Integers use BigInt; φ and √2 retain exact periodic definitions.
          Finite prefixes either terminate or explicitly continue with ones.
          Rendering uses floating point, |α| ≤ 10,000 and t ≤ 24. Detail stops
          at pixel, depth, and event budgets. The Ford timeline covers q ≤ 32
          plus computed convergents. Very deep points can leave the fixed
          camera; use Auto zoom for a slow descent while the view magnifies.
        </p>
        <h3>The quotient</h3>
        <p>
          Paired seams identify the same point. The curve is split at every
          chart change. The folded reference view uses a logarithmic height
          scale. The rotatable 3D view is a schematic punctured sphere with cone
          orders 2 and 3. It is neither a torus nor an isometric embedding. The
          vertical trajectory of a quadratic irrational is not closed.
        </p>
        <h3>Controls and persistence</h3>
        <p>
          Space plays or pauses; ←/→ step Farey crossings; Shift+←/→ step
          coefficient runs. Ctrl/Cmd+Z undoes a number edit. All actions also
          have labeled buttons. Drag the canvas to pan or use its arrow buttons.
          Drag two fingers upward to zoom in, or downward to zoom out, on a
          touchscreen or trackpad over the hyperbolic view. Drag the α marker
          along the real axis to update the number and all views immediately.
          Playback pauses while dragging; release finishes one undoable edit.
          Nearby rationals with denominator ≤64 snap within 6 pixels; otherwise
          the displayed value is a rounded decimal rational. Inspecting a Ford
          circle does not change α.
        </p>
        <p>
          Scenes save automatically in this browser. Download and Load preserve
          exact data in versioned JSON. Share scene copies a link containing the
          current number and playback settings. No account or server is needed.
        </p>
        <a
          className="inline-link"
          href="https://github.com/davbachman/ContinuedFractions/blob/main/docs/MATHEMATICS.md"
          target="_blank"
          rel="noreferrer"
        >
          Full derivations, references, and verification{" "}
          <ExternalLink size={14} />
        </a>
      </dialog>
    </div>
  );
}
