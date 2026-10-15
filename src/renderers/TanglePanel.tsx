import { useSurfaceRotation, rotationHint } from "./useSurfaceRotation";
import { useEffect, useMemo, useState } from "react";
import { type NumberSpec, specLabel } from "../math/continuedFraction";
import { label, type Rational } from "../math/rational";
import {
  type TangleExpression,
  expressionFor,
  tangleFraction,
  mirrorExpression,
  endpointNames,
  closureComponents,
  closureName,
  canonicalTwistCoefficients,
} from "../math/tangles";
import { tangleDiagram } from "../math/tangleDiagram";
import { Pillowcase } from "./Pillowcase";
import { svgPath } from "./ModularTorus";
type Props = {
  view?: "tangle" | "closure" | "pillowcase";
  linkCoefficients?: boolean;
  spec: NumberSpec;
  expression?: TangleExpression;
  convergents: readonly Rational[];
  selected: number;
  onSelect: (i: number) => void;
  onChange: (expression: TangleExpression) => void;
  onError: (message: string) => void;
};
export function TanglePanel({
  spec,
  expression,
  convergents,
  selected,
  onSelect,
  onChange,
  onError,
  view,
  linkCoefficients = false,
}: Props) {
  const target = spec.kind === "rational" ? spec.value : convergents[selected];
  const ops = useMemo(
    () =>
      spec.kind === "rational" && expression
        ? expression
        : expressionFor(target),
    [spec, expression, target],
  );
  const diagram = useMemo(() => tangleDiagram(ops), [ops]);
  const fraction = useMemo(() => tangleFraction(ops), [ops]);
  const [localMode, setMode] = useState<"tangle" | "pillowcase">("tangle"),
    [localClosed, setClosed] = useState(false),
    [three, setThree] = useState(false),
    [rotation, setRotation] = useState(0.45),
    [zoom, setZoom] = useState(1),
    [region, setRegion] = useState(-1),
    [draft, setDraft] = useState("1");
  const mode = view
    ? view === "pillowcase"
      ? "pillowcase"
      : "tangle"
    : localMode;
  const closed = view ? view === "closure" : localClosed;
  const coefficientMap = useMemo(
    () =>
      linkCoefficients && spec.kind === "rational"
        ? canonicalTwistCoefficients(ops, target)
        : null,
    [linkCoefficients, spec, ops, target],
  );
  const linkedRegion = coefficientMap
    ? [...coefficientMap].find(([, index]) => index === selected)?.[0]
    : undefined;
  const chooseRegion = (index: number) => {
    setRegion(index);
    const coefficient = coefficientMap?.get(index);
    if (coefficient !== undefined) onSelect(coefficient);
  };
  const twistRegions = ops.flatMap((op, i) => (op.kind === "twist" ? [i] : [])),
    activeRegion =
      linkedRegion ??
      (twistRegions.includes(region) ? region : (twistRegions.at(-1) ?? -1)),
    active = ops[activeRegion];
  useEffect(() => {
    setDraft(active?.kind === "twist" ? String(active.count) : "0");
  }, [active]);
  const commit = (next: TangleExpression) => {
    onChange(next);
  };
  const twist = (count: bigint) => {
    setRegion(ops.length);
    commit([...ops, { kind: "twist", count }]);
  };
  const rotate = (turns: 1 | -1) => commit([...ops, { kind: "rotate", turns }]);
  const color = (edge: number) =>
    diagram.component[diagram.edges[edge].from] === 0 ? "#2b7274" : "#b16e38";
  const point = (id: number) => diagram.nodes[id];
  const canThree = diagram.boxes.length === 0 && diagram.edges.length <= 180;
  const lifted = three && canThree;
  const rotationControls = useSurfaceRotation(
    rotation,
    setRotation,
    lifted,
    0.45,
  );
  const project = (p: { x: number; y: number }, z = 0) => {
    const x = p.x - diagram.width / 2,
      y = p.y - diagram.height / 2,
      xx = x * Math.cos(rotation) + z * Math.sin(rotation),
      depth = -x * Math.sin(rotation) + z * Math.cos(rotation);
    return {
      x: diagram.width / 2 + xx,
      y: diagram.height / 2 + y * 0.88 - depth * 0.4,
      depth: y * 0.4 + depth * 0.88,
    };
  };
  const over = new Set(diagram.crossings.map((c) => c.over)),
    under = new Set(diagram.crossings.map((c) => c.under));
  const pieces = lifted
    ? diagram.edges
        .flatMap((edge, id) =>
          Array.from({ length: 12 }, (_, i) => {
            const a = point(edge.from),
              b = point(edge.to),
              height = over.has(id) ? 18 : under.has(id) ? -18 : 0;
            const at = (t: number) =>
              project(
                { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
                height * Math.sin(Math.PI * t),
              );
            const p = at(i / 12),
              q = at((i + 1) / 12);
            return { points: [p, q], depth: (p.depth + q.depth) / 2, id };
          }),
        )
        .sort((a, b) => a.depth - b.depth)
    : [];
  // Include the closure in the same depth sort as the lifted strands.
  const closures = [0, 1].map((i) =>
    Array.from({ length: 61 }, (_, k) => {
      const t = k / 60,
        y = i ? diagram.height : 0,
        offset = i ? 50 : -50;
      return {
        x: diagram.width * (3 * t * t - 2 * t * t * t),
        y: y + 3 * offset * t * (1 - t),
      };
    }),
  );
  const liftedPieces = [
    ...pieces,
    ...(lifted && closed
      ? closures.flatMap((points) =>
          points.slice(1).flatMap((p, i) => {
            if (i % 4 === 3) return []; // A dashed closure, with depth-tested segments.
            const a = project(points[i]),
              b = project(p);
            return [{ points: [a, b], depth: (a.depth + b.depth) / 2, id: -1 }];
          }),
        )
      : []),
  ].sort((a, b) => a.depth - b.depth);
  const projectedBounds = lifted
    ? [
        ...pieces.flatMap((piece) => piece.points),
        ...diagram.nodes.map((p) => project(p)),
        ...[0, diagram.width].flatMap((x) =>
          [-50, diagram.height + 50].map((y) => project({ x, y })),
        ),
      ]
    : [];
  const bounds = projectedBounds.length
    ? {
        left: Math.min(...projectedBounds.map((p) => p.x)) - 45,
        top: Math.min(...projectedBounds.map((p) => p.y)) - 35,
        right: Math.max(...projectedBounds.map((p) => p.x)) + 45,
        bottom: Math.max(...projectedBounds.map((p) => p.y)) + 35,
      }
    : null;
  return (
    <section className="panel tangle-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-number">04</span>
          <h2>
            {view === "closure"
              ? "2-bridge knot / link"
              : view === "pillowcase"
                ? "Marked torus / pillowcase"
                : "Marked rational tangle"}
          </h2>
        </div>
        <strong className="tangle-fraction" data-testid="tangle-fraction">
          {label(fraction)}
        </strong>
      </div>
      {!view && (
        <div
          className="topology-options"
          role="group"
          aria-label="Tangle and branched cover"
        >
          <button
            aria-pressed={mode === "tangle"}
            onClick={() => setMode("tangle")}
          >
            Rational tangle
          </button>
          <button
            aria-pressed={mode === "pillowcase"}
            onClick={() => setMode("pillowcase")}
          >
            Branched-cover torus / pillowcase
          </button>
        </div>
      )}
      {linkCoefficients && spec.kind === "rational" && (
        <p className="pane-note">
          {coefficientMap
            ? `Canonical construction · selected coefficient a${selected} highlights its signed twist region.`
            : "Custom signed construction · the rational value is linked; its operation regions are independent of the regular continued-fraction coefficients."}
        </p>
      )}
      {spec.kind === "periodic" && (
        <div className="tangle-approximation" role="status">
          Approximation: convergent <strong>{label(target)}</strong> of{" "}
          {specLabel(spec)}. A finite tangle does not represent the exact
          irrational. Editing switches the shared number to a rational.
          <label>
            Selected convergent
            <select
              aria-label="Tangle convergent"
              value={selected}
              onChange={(e) => onSelect(Number(e.target.value))}
            >
              {convergents.map((r, i) => (
                <option key={i} value={i}>
                  a{i}: {label(r)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {mode === "pillowcase" ? (
        <Pillowcase
          fraction={fraction}
          onSlope={(r) => commit(expressionFor(r))}
          onTwist={twist}
          onRotate={() => rotate(1)}
          onError={onError}
        />
      ) : (
        <>
          <div className="tangle-controls">
            <button onClick={() => twist(1n)}>Add +1 endpoint twist</button>
            <button onClick={() => twist(-1n)}>Add −1 endpoint twist</button>
            <button onClick={() => rotate(1)}>Quarter-turn ↺</button>
            <button onClick={() => rotate(-1)}>Quarter-turn ↻</button>
            <button onClick={() => commit(mirrorExpression(ops))}>
              Mirror crossings
            </button>
          </div>
          <div className="topology-options">
            {!view && (
              <label>
                <input
                  type="checkbox"
                  checked={closed}
                  onChange={(e) => setClosed(e.target.checked)}
                />
                Numerator closure
              </label>
            )}
            <button aria-pressed={!three} onClick={() => setThree(false)}>
              2D diagram
            </button>
            <button
              aria-pressed={three}
              disabled={!canThree}
              onClick={() => setThree(true)}
            >
              Lifted tangle 3D
            </button>
            <label>
              Diagram zoom
              <input
                aria-label="Tangle diagram zoom"
                type="range"
                min={1}
                max={4}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
          </div>
          <div
            className="tangle-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable marked tangle diagram"
          >
            <svg
              {...rotationControls}
              viewBox={
                bounds
                  ? `${bounds.left} ${bounds.top} ${bounds.right - bounds.left} ${bounds.bottom - bounds.top}`
                  : `-55 -65 ${diagram.width + 110} ${diagram.height + 130}`
              }
              style={{
                ...rotationControls.style,
                width: `${100 * zoom}%`,
                minWidth: 400 * zoom,
                height: 360 * zoom,
              }}
              role="img"
              aria-label={
                lifted
                  ? "Lifted 3D rational tangle"
                  : "Over-under rational tangle diagram"
              }
              data-crossings={diagram.crossings.length}
              data-boxes={diagram.boxes.length}
              data-operations={ops.length}
            >
              {!lifted && (
                <rect
                  x={-8}
                  y={-8}
                  width={diagram.width + 16}
                  height={diagram.height + 16}
                  fill="none"
                  stroke="#b5c1ad"
                  strokeDasharray="5 5"
                />
              )}
              {closed &&
                !lifted &&
                closures.map((points, i) => (
                  <path
                    key={i}
                    className="closure-arc"
                    d={svgPath(points)}
                    fill="none"
                    stroke="#8b6291"
                    strokeWidth={3}
                    strokeDasharray="8 3"
                  />
                ))}
              {lifted ? (
                liftedPieces.map((piece, i) => (
                  <path
                    key={i}
                    d={svgPath(piece.points)}
                    fill="none"
                    stroke={piece.id < 0 ? "#8b6291" : color(piece.id)}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                ))
              ) : (
                <>
                  {diagram.edges.map((edge, i) => (
                    <path
                      key={i}
                      d={svgPath([point(edge.from), point(edge.to)])}
                      fill="none"
                      stroke={color(i)}
                      strokeWidth={edge.region === activeRegion ? 4.5 : 3.2}
                      strokeLinecap="round"
                      onClick={() => chooseRegion(edge.region)}
                    />
                  ))}
                  {diagram.crossings.map((c, i) => {
                    const edge = diagram.edges[c.over],
                      a = point(edge.from),
                      b = point(edge.to),
                      d = Math.hypot(b.x - a.x, b.y - a.y),
                      gap = Math.min(0.22, 9 / d);
                    const points = [0.5 - gap, 0.5 + gap].map((t) => ({
                      x: a.x + (b.x - a.x) * t,
                      y: a.y + (b.y - a.y) * t,
                    }));
                    return (
                      <g
                        key={i}
                        data-region={c.region}
                        onClick={() => chooseRegion(c.region)}
                      >
                        <path
                          d={svgPath(points)}
                          fill="none"
                          stroke="#fbfbf6"
                          strokeWidth={10}
                        />
                        <path
                          d={svgPath(points)}
                          fill="none"
                          stroke={color(c.over)}
                          strokeWidth={c.region === activeRegion ? 4.5 : 3.2}
                        />
                      </g>
                    );
                  })}
                  {diagram.boxes.map((box, i) => {
                    const points = box.corners.map(point),
                      xs = points.map((p) => p.x),
                      ys = points.map((p) => p.y),
                      x = (Math.min(...xs) + Math.max(...xs)) / 2,
                      y = (Math.min(...ys) + Math.max(...ys)) / 2;
                    return (
                      <g key={i} onClick={() => chooseRegion(box.region)}>
                        <path
                          d={svgPath(points) + "Z"}
                          fill="#e6eada"
                          stroke="#6d8064"
                        />
                        <text x={x} y={y} fontSize={12} textAnchor="middle">
                          H(
                          {String(box.count).length < 15
                            ? String(box.count)
                            : "large"}
                          )
                        </text>
                        <title>
                          {String(box.count)} signed half-twists; connectivity
                          and fraction are exact
                        </title>
                      </g>
                    );
                  })}
                </>
              )}
              {diagram.ends.map((id, i) => {
                const p = lifted ? project(point(id)) : point(id);
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={4} fill="#264a3f" />
                    <text
                      x={p.x + (i % 2 ? 12 : -12)}
                      y={p.y + (i < 2 ? -14 : 22)}
                      textAnchor={i % 2 ? "start" : "end"}
                      fontSize={13}
                    >
                      {endpointNames[i]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {lifted && <p className="rotation-hint">{rotationHint}</p>}
          <p className="topology-note" data-testid="closure-classification">
            {closed
              ? `${closureName(fraction)} · ${closureComponents(fraction) === 1 ? "knot (one component)" : "two-component link"}. Purple dashed arcs are the numerator closure.`
              : "Open marked tangle · endpoints NW, NE, SW, SE are fixed."}{" "}
            {closed &&
              "A closed knot/link does not determine a unique fraction."}
          </p>
          <p className="topology-note">
            +1 twists the right endpoint pair; its NW→SE branch passes over.
            Quarter-turn is active and sends x to −1/x. Mirror switches
            crossings.{" "}
            {lifted
              ? "3D lifts overpasses above and underpasses below the diagram plane."
              : "Gaps mark underpasses."}
          </p>
          {!canThree && (
            <p className="topology-limit">
              Detailed 3D is limited to 180 diagram edges with no aggregate
              twist boxes. The 2D diagram retains exact counts and endpoint
              connectivity.
            </p>
          )}
        </>
      )}
      <details className="tangle-expression" open>
        <summary>
          Signed twist expression · chronological operations from 0
        </summary>
        <div className="twist-word">
          {ops.length ? (
            ops.map((op, i) =>
              op.kind === "twist" ? (
                <button
                  key={i}
                  aria-label={`Select twist region ${i + 1}`}
                  aria-pressed={activeRegion === i}
                  onClick={() => chooseRegion(i)}
                >
                  H({String(op.count)})
                </button>
              ) : (
                <span key={i}>{op.turns === 1 ? "R↺" : "R⁻¹↻"}</span>
              ),
            )
          ) : (
            <span>0 · no operations</span>
          )}
        </div>
        {activeRegion >= 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^-?\d{1,1024}$/.test(draft)) {
                onError(
                  "Enter a signed integer twist count (up to 1,024 digits).",
                );
                return;
              }
              commit(
                ops.map((op, i) =>
                  i === activeRegion
                    ? { kind: "twist", count: BigInt(draft) }
                    : op,
                ),
              );
            }}
          >
            <label>
              Region {activeRegion + 1}
              <input
                aria-label="Selected twist region count"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <button type="submit">Apply twist count</button>
          </form>
        )}
        <div className="tangle-controls">
          <button
            disabled={!ops.length}
            onClick={() => commit(ops.slice(0, -1))}
          >
            Remove last operation
          </button>
          <button onClick={() => commit([])}>Zero tangle</button>
          <button onClick={() => commit([{ kind: "rotate", turns: 1 }])}>
            Infinity tangle
          </button>
        </div>
        <p>
          The operation word is retained even when twists cancel. The regular
          continued fraction above is a separate canonical representation. Both
          editors share number history and undo.
        </p>
      </details>
    </section>
  );
}
