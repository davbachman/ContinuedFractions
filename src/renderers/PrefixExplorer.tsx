import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { specLabel, toCF, type NumberSpec } from "../math/continuedFraction";
import { abs, label, rational, type Rational } from "../math/rational";
import { determinant, type Matrix } from "../math/modular";
import {
  basisCoordinates,
  coefficientMatrix,
  convergentError,
  latticeVector,
  logRational,
  scientificRational,
  prefixData,
  ratioNumber,
  relativePosition,
  targetBounds,
  vectorDet,
  type LatticeVector,
  type Prefix,
} from "../math/approximations";
import { stageColor } from "./dissectionColors";

export type PrefixView = "intervals" | "lattice" | "matrices" | "errors";
type Props = {
  kind: PrefixView;
  spec: NumberSpec;
  coefficients: bigint[];
  selected: number;
  onSelect: (index: number) => void;
  onExtend: () => void;
  onNumber: (r: Rational) => void;
};
type DiagramProps = {
  data: Prefix[];
  selected: number;
  bounds: readonly [Rational, Rational];
  onSelect: Props["onSelect"];
};
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const short = (s: string, max = 24) =>
  s.length <= max ? s : `${s.slice(0, 10)}…${s.slice(-8)}`;
const vectorLabel = (v: LatticeVector) => `(${v[0]}, ${v[1]})`;
const activate = (event: KeyboardEvent, action: () => void) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.stopPropagation();
    action();
  }
};

export function PrefixExplorer(props: Props) {
  const { kind, spec, coefficients, selected, onSelect, onExtend, onNumber } =
    props;
  const data = useMemo(() => prefixData(coefficients), [coefficients]);
  const bounds = useMemo(
    () => (data.length ? targetBounds(spec, data.length) : null),
    [spec, data],
  );
  if (!bounds || !data.length)
    return (
      <p className="view-unavailable" role="status">
        ∞ has no finite regular continued-fraction prefix. This view needs a
        finite number; the exact shared value is unchanged.
      </p>
    );
  const index = clamp(selected, 0, data.length - 1),
    prefix = data[index];
  const diagram = { data, selected: index, bounds, onSelect };
  return (
    <div
      className={`prefix-explorer prefix-${kind}`}
      data-selected-prefix={index}
    >
      <div className="prefix-navigation">
        <div className="workspace-actions">
          <button disabled={!index} onClick={() => onSelect(index - 1)}>
            Previous prefix
          </button>
          <button
            disabled={index === data.length - 1}
            onClick={() => onSelect(index + 1)}
          >
            Next prefix
          </button>
          {spec.kind === "periodic" && (
            <button disabled={data.length >= 96} onClick={onExtend}>
              Extend prefixes
            </button>
          )}
        </div>
        <label>
          Prefix through a{index}{" "}
          <input
            key={data.length}
            aria-label="Selected prefix"
            type="range"
            min={0}
            max={data.length - 1}
            value={index}
            onChange={(e) => onSelect(Number(e.target.value))}
          />
        </label>
        <p>
          α = <strong>{specLabel(spec)}</strong> ·{" "}
          {spec.kind === "periodic"
            ? `${data.length} prefixes displayed; infinite expansion continues.`
            : `${data.length} terms; exact rational expansion.`}
        </p>
      </div>
      {kind === "intervals" && <Intervals {...diagram} spec={spec} />}
      {kind === "lattice" && <Lattice {...diagram} />}
      {kind === "matrices" && <Matrices {...diagram} />}
      {kind === "errors" && <Errors {...diagram} spec={spec} />}
      <div className="prefix-selection" aria-live="polite">
        <span className="eyebrow">
          Selected convergent · a{index} = {String(prefix.coefficient)}
        </span>
        <strong>{label(prefix.convergent)}</strong>
        <button
          onClick={() => {
            onNumber(prefix.convergent);
            onSelect(toCF(prefix.convergent).length - 1);
          }}
          disabled={
            spec.kind === "rational" &&
            spec.value.p === prefix.convergent.p &&
            spec.value.q === prefix.convergent.q
          }
        >
          Use convergent as target
        </button>
        <p>
          Selecting a prefix changes the highlight. Only this explicit action
          changes α; undo restores the prior number.
        </p>
      </div>
    </div>
  );
}

function Intervals({
  data,
  selected,
  bounds,
  onSelect,
  spec,
}: DiagramProps & { spec: NumberSpec }) {
  const [magnify, setMagnify] = useState(true);
  const p = data[selected],
    start = Math.max(0, selected - 5),
    rows = data.slice(start, Math.min(data.length, Math.max(6, selected + 2)));
  return (
    <>
      <div className="prefix-intro">
        <h3>A number held between two rationals</h3>
        <p>
          Each additional coefficient narrows the interval containing α. The
          colored segment is the child interval; the dashed marker is α.
        </p>
        <label>
          <input
            type="checkbox"
            checked={magnify}
            onChange={(e) => setMagnify(e.target.checked)}
          />{" "}
          Magnify each parent interval
        </label>
        <p className="prefix-note">
          {magnify
            ? "Each row uses its own parent’s scale. Exact endpoints below identify the selected interval."
            : "All rows share the first interval’s scale. Deep intervals may be narrower than a pixel."}
        </p>
      </div>
      <svg
        className="prefix-chart interval-chart"
        viewBox={`0 0 580 ${rows.length * 64 + 24}`}
        role="group"
        aria-label="Nested prefix intervals"
      >
        {rows.map((row, k) => {
          const frame = magnify
            ? data[Math.max(0, row.index - 1)].interval
            : data[0].interval;
          const x = (r: Rational) =>
            102 + 440 * clamp(relativePosition(r, ...frame));
          const y = 34 + k * 64,
            l = x(row.interval[0]),
            r = x(row.interval[1]);
          return (
            <g
              key={row.index}
              role="button"
              tabIndex={0}
              aria-label={`Select interval a${row.index}`}
              aria-pressed={selected === row.index}
              onClick={() => onSelect(row.index)}
              onKeyDown={(e) => activate(e, () => onSelect(row.index))}
              data-interval={row.index}
            >
              <title>{`a${row.index}: [${row.interval.map(label).join(", ")}]; width ${label(row.width)}`}</title>
              <rect
                x="6"
                y={y - 24}
                width="566"
                height="58"
                rx="6"
                fill={selected === row.index ? "#e9efdf" : "transparent"}
              />
              <text x="20" y={y + 4} className="prefix-svg-label">
                a{row.index}
              </text>
              <line
                x1="102"
                x2="542"
                y1={y}
                y2={y}
                stroke="#c8d1bf"
                strokeWidth="2"
              />
              <line
                x1={l}
                x2={r}
                y1={y}
                y2={y}
                stroke={stageColor(row.index)}
                strokeWidth="12"
              />
              <circle cx={l} cy={y} r="4" fill={stageColor(row.index)} />
              <circle cx={r} cy={y} r="4" fill={stageColor(row.index)} />
              <line
                x1={x(bounds[0])}
                x2={x(bounds[0])}
                y1={y - 18}
                y2={y + 18}
                stroke="#243b30"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
              <text x="102" y={y + 26} fontSize="10">
                {short(label(frame[0]))}
              </text>
              <text x="542" y={y + 26} textAnchor="end" fontSize="10">
                {short(label(frame[1]))}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="prefix-facts" data-testid="interval-details">
        <p>
          <b>Closed prefix enclosure I{selected}</b>
        </p>
        <p className="exact-expression">
          [{label(p.interval[0])}, {label(p.interval[1])}]
        </p>
        <p>
          Exact width: <strong>{label(p.width)}</strong>
        </p>
        <p className="prefix-note">
          The endpoints are pₙ/qₙ and (pₙ + pₙ₋₁)/(qₙ + qₙ₋₁). Width = 1 /
          (qₙ(qₙ + qₙ₋₁)). These are closed enclosures: rational boundary points
          may also have the alternate finite ending.
        </p>
        {spec.kind === "rational" && selected === data.length - 1 && (
          <p>
            The expansion terminates at α = {label(p.convergent)}, an endpoint.
            The set of numbers sharing this prefix still has positive width.
          </p>
        )}
      </div>
    </>
  );
}

function Lattice({ data, selected, bounds, onSelect }: DiagramProps) {
  const [affine, setAffine] = useState(false),
    [grid, setGrid] = useState(true);
  const id = useId(),
    p = data[selected],
    u = latticeVector(p.previous),
    v = latticeVector(p.convergent);
  const convert = (w: LatticeVector) =>
    affine ? basisCoordinates(w, u, v) : w;
  const sum: LatticeVector = [u[0] + v[0], u[1] + v[1]];
  const frame = [[0n, 0n] as LatticeVector, u, v, sum].map(convert);
  const unit = frame.flat().reduce((a, n) => (abs(n) > a ? abs(n) : a), 1n);
  const norm = (w: LatticeVector) =>
    convert(w).map((n) => ratioNumber(n, unit)) as [number, number];
  const coordinates = frame.map((w) => w.map((n) => ratioNumber(n, unit)));
  const minX = Math.min(...coordinates.map((w) => w[0])),
    maxX = Math.max(...coordinates.map((w) => w[0]));
  const minY = Math.min(...coordinates.map((w) => w[1])),
    maxY = Math.max(...coordinates.map((w) => w[1]));
  const scale = 260 / Math.max(maxX - minX, maxY - minY, 1);
  const centerX = (minX + maxX) / 2,
    centerY = (minY + maxY) / 2;
  const xy = ([x, y]: readonly number[]) => [
    290 + (x - centerX) * scale,
    184 - (y - centerY) * scale,
  ];
  const point = (w: LatticeVector) => xy(norm(w));
  const origin = point([0n, 0n]);
  const path = (points: number[][]) => points.map((w) => w.join(",")).join(" ");
  // Only the display direction uses a rational inside the certified enclosure.
  const ray = convert(latticeVector(bounds[0]));
  const rayUnit = abs(ray[0]) > abs(ray[1]) ? abs(ray[0]) : abs(ray[1]);
  const rayEnd = [
    origin[0] + 1500 * ratioNumber(ray[0], rayUnit),
    origin[1] - 1500 * ratioNumber(ray[1], rayUnit),
  ];
  const step = unit <= 16n ? 1n : (unit + 7n) / 8n;
  const tick = ratioNumber(step, unit);
  const xs = Array.from({ length: 49 }, (_, i) => i - 24).filter((i) => {
    const x = xy([i * tick, 0])[0];
    return x >= 35 && x <= 545;
  });
  const ys = Array.from({ length: 49 }, (_, i) => i - 24).filter((i) => {
    const y = xy([0, i * tick])[1];
    return y >= 20 && y <= 350;
  });
  const recent = data.slice(Math.max(0, selected - 7), selected + 1);
  return (
    <>
      <div className="prefix-intro">
        <h3>Convergents make an integer basis</h3>
        <p>
          The vector vₙ = (qₙ, pₙ) approaches the line p = αq. Consecutive
          vectors span a parallelogram of exact area 1.
        </p>
        <div className="workspace-actions">
          <button aria-pressed={!affine} onClick={() => setAffine(false)}>
            Fixed integer axes
          </button>
          <button aria-pressed={affine} onClick={() => setAffine(true)}>
            Convergent basis close-up
          </button>
        </div>
        <label>
          <input
            type="checkbox"
            checked={grid}
            onChange={(e) => setGrid(e.target.checked)}
          />{" "}
          Integer grid
        </label>
      </div>
      <svg
        className="prefix-chart lattice-chart"
        viewBox="0 0 580 385"
        role="group"
        aria-label="Convergent integer lattice"
        data-camera={affine ? "basis" : "fixed"}
      >
        <defs>
          <clipPath id={`${id}-clip`}>
            <rect x="28" y="16" width="524" height="340" />
          </clipPath>
          <marker
            id={`${id}-arrow`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0 0 L6 3 L0 6" fill="context-stroke" />
          </marker>
        </defs>
        <g clipPath={`url(#${id}-clip)`}>
          {grid && (
            <g stroke="#dfe4d6" strokeWidth="1">
              {xs.map((i) => (
                <line
                  key={`x${i}`}
                  x1={xy([i * tick, 0])[0]}
                  x2={xy([i * tick, 0])[0]}
                  y1="16"
                  y2="356"
                />
              ))}
              {ys.map((i) => (
                <line
                  key={`y${i}`}
                  y1={xy([0, i * tick])[1]}
                  y2={xy([0, i * tick])[1]}
                  x1="28"
                  x2="552"
                />
              ))}
            </g>
          )}
          {grid &&
            unit <= 16n &&
            xs.flatMap((i) =>
              ys.map((j) => (
                <circle
                  key={`${i},${j}`}
                  cx={xy([i * tick, j * tick])[0]}
                  cy={xy([i * tick, j * tick])[1]}
                  r="1.6"
                  fill="#aebea7"
                />
              )),
            )}
          <line
            x1="28"
            x2="552"
            y1={origin[1]}
            y2={origin[1]}
            stroke="#83917b"
          />
          <line
            x1={origin[0]}
            x2={origin[0]}
            y1="16"
            y2="356"
            stroke="#83917b"
          />
          <polygon
            points={path([[0n, 0n] as LatticeVector, u, sum, v].map(point))}
            fill={stageColor(selected)}
            fillOpacity=".18"
            stroke={stageColor(selected)}
            strokeDasharray="4 3"
          />
          <line
            x1={origin[0]}
            y1={origin[1]}
            x2={rayEnd[0]}
            y2={rayEnd[1]}
            stroke="#324e3c"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <line
            x1={origin[0]}
            y1={origin[1]}
            x2={point(u)[0]}
            y2={point(u)[1]}
            stroke={selected ? stageColor(selected - 1) : "#8b9290"}
            strokeWidth="3"
            markerEnd={`url(#${id}-arrow)`}
          />
          <line
            x1={origin[0]}
            y1={origin[1]}
            x2={point(v)[0]}
            y2={point(v)[1]}
            stroke={stageColor(selected)}
            strokeWidth="3"
            markerEnd={`url(#${id}-arrow)`}
          />
          {recent.map((row) => {
            const pos = point(latticeVector(row.convergent));
            if (
              !pos.every(Number.isFinite) ||
              pos[0] < 28 ||
              pos[0] > 552 ||
              pos[1] < 16 ||
              pos[1] > 356
            )
              return null;
            return (
              <g
                key={row.index}
                role="button"
                tabIndex={0}
                aria-label={`Select lattice vector a${row.index}`}
                aria-pressed={selected === row.index}
                onClick={() => onSelect(row.index)}
                onKeyDown={(e) => activate(e, () => onSelect(row.index))}
              >
                <title>{`v${row.index} = ${vectorLabel(latticeVector(row.convergent))}`}</title>
                <circle cx={pos[0]} cy={pos[1]} r="22" fill="transparent" />
                <circle
                  cx={pos[0]}
                  cy={pos[1]}
                  r={row.index === selected ? 7 : 4}
                  fill={stageColor(row.index)}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
                {row.index === selected && (
                  <text x={pos[0] + 12} y={pos[1] - 12} fontSize="13">
                    v{row.index}
                  </text>
                )}
              </g>
            );
          })}
          <circle cx={origin[0]} cy={origin[1]} r="3" fill="#2f4837" />
          <text x={origin[0] - 14} y={origin[1] + 18} fontSize="12">
            0
          </text>
        </g>
        <text x="36" y="375" fontSize="12">
          {affine
            ? "Horizontal: vₙ₋₁ · vertical: vₙ (affine coordinates)"
            : "Horizontal: q · vertical: p · equal axis scale"}
        </text>
      </svg>
      <p className="prefix-note chart-note">
        Dashed line: p = αq.{" "}
        {affine
          ? "This unimodular change of coordinates enlarges the thin cell; angles and lengths change, area stays 1. The marking is unchanged."
          : "The frame fits the selected pair. At deep prefixes, the cell can be thinner than a pixel; use the basis close-up."}{" "}
        Grid spacing: {String(step)}. Up to eight recent vectors are drawn;
        off-frame vectors are omitted.
      </p>
      <div className="prefix-facts" data-testid="lattice-details">
        <p>
          v{selected - 1} = {vectorLabel(u)}
        </p>
        <p>
          v{selected} = {vectorLabel(v)}
        </p>
        <p>
          <b>
            det(v{selected - 1}, v{selected}) = {String(vectorDet(u, v))} · area
            = 1
          </b>
        </p>
        <p>
          v{selected} = {String(p.coefficient)} v{selected - 1} + v
          {selected - 2}
        </p>
        <p className="prefix-note">
          Initial vectors: v₋₂ = (1, 0), v₋₁ = (0, 1). This is the fixed integer
          lattice of convergent vectors, not a homology marking on the six-sheet
          modular torus.
        </p>
      </div>
      <div
        className="prefix-point-list"
        aria-label="Select a convergent vector"
      >
        {recent.map((row) => (
          <button
            key={row.index}
            aria-pressed={selected === row.index}
            onClick={() => onSelect(row.index)}
            style={{ borderBottomColor: stageColor(row.index) }}
          >
            v{row.index}: {short(label(row.convergent))}
          </button>
        ))}
      </div>
    </>
  );
}

function MatrixDisplay({ m, name }: { m: Matrix; name: string }) {
  return (
    <span
      className="exact-matrix"
      role="math"
      aria-label={`${name}: ${m[0]}, ${m[1]}; ${m[2]}, ${m[3]}`}
    >
      <span>{String(m[0])}</span>
      <span>{String(m[1])}</span>
      <span>{String(m[2])}</span>
      <span>{String(m[3])}</span>
    </span>
  );
}
function Matrices({ data, selected, onSelect }: DiagramProps) {
  const p = data[selected],
    previous: Matrix = selected ? data[selected - 1].matrix : [1n, 0n, 0n, 1n];
  return (
    <>
      <div className="prefix-intro">
        <h3>One coefficient, one matrix</h3>
        <p>
          Append A(aₙ) on the right. The product records the current and
          previous convergents in its two columns.
        </p>
      </div>
      <div className="matrix-factors" aria-label="Coefficient matrix factors">
        {data.map((row) => (
          <button
            key={row.index}
            aria-label={`Select matrix factor a${row.index}`}
            aria-pressed={selected === row.index}
            onClick={() => onSelect(row.index)}
            style={{ borderBottomColor: stageColor(row.index) }}
          >
            <small>A(a{row.index})</small>
            <MatrixDisplay
              m={coefficientMatrix(row.coefficient)}
              name={`Factor a${row.index}`}
            />
          </button>
        ))}
      </div>
      <div className="prefix-facts">
        <p>
          Product through a{selected}: M{selected} = A(a₀) ⋯ A(a{selected})
        </p>
        <div
          className="matrix-equation"
          tabIndex={0}
          role="region"
          aria-label="Selected matrix multiplication"
        >
          <MatrixDisplay m={previous} name="Previous product" />
          <span>×</span>
          <MatrixDisplay
            m={coefficientMatrix(p.coefficient)}
            name="Selected factor"
          />
          <span>=</span>
          <MatrixDisplay m={p.matrix} name="Product" />
        </div>
        <div data-testid="matrix-details">
          <p>
            First column (pₙ, qₙ) = ({String(p.matrix[0])},{" "}
            {String(p.matrix[2])})
          </p>
          <p>
            Second column (pₙ₋₁, qₙ₋₁) = ({String(p.matrix[1])},{" "}
            {String(p.matrix[3])})
          </p>
          <p>
            <b>
              det M{selected} = (−1)^{selected + 1} ={" "}
              {String(determinant(p.matrix))}
            </b>
          </p>
        </div>
        <p className="prefix-note">
          A(a) = [[a, 1], [1, 0]] has determinant −1. These GL(2, ℤ) products
          encode x ↦ a + 1/x on real tails; they are not all
          orientation-preserving PSL(2, ℤ) actions on H².
        </p>
        <details>
          <summary>Tail action and the interval endpoints</summary>
          <p>
            For a complete tail t ≥ 1, [a₀; …, aₙ, t] = (pₙt + pₙ₋₁)/(qₙt +
            qₙ₋₁). The values at t = 1 and t → ∞ are the two prefix-enclosure
            endpoints.
          </p>
          <p>
            Matrix columns use (p, q); the lattice view uses (q, p). Swapping
            those coordinates accounts for the convention.
          </p>
        </details>
      </div>
    </>
  );
}

function Errors({
  data,
  selected,
  bounds,
  onSelect,
  spec,
}: DiagramProps & { spec: NumberSpec }) {
  const [scaled, setScaled] = useState(false);
  const rows = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        error: convergentError(spec, p.convergent, bounds),
      })),
    [data, spec, bounds],
  );
  const current = rows[selected],
    nonzero = rows.filter((p) => !p.error.zero);
  const ordinate = (p: typeof current) =>
    logRational((scaled ? p.error.scaled : p.error.absolute)[0]);
  const ys = nonzero.map(ordinate),
    minY = Math.floor(Math.min(0, ...ys)),
    maxY = Math.ceil(Math.max(0, ...ys));
  const maxX = Math.max(
    1,
    ...rows.map((p) => logRational(rational(p.convergent.q))),
  );
  const x = (p: typeof current) =>
    70 + (460 * logRational(rational(p.convergent.q))) / maxX;
  const y = (p: typeof current) =>
    40 + (240 * (maxY - ordinate(p))) / Math.max(1, maxY - minY);
  const ticks = Array.from(
    { length: 5 },
    (_, i) => maxY - (i * Math.max(1, maxY - minY)) / 4,
  );
  const range = scaled ? current.error.scaled : current.error.absolute;
  return (
    <>
      <div className="prefix-intro">
        <h3>How much accuracy does a denominator buy?</h3>
        <p>
          Each point is a convergent pₙ/qₙ. Select a point to inspect its prefix
          in both panes.
        </p>
        <div className="workspace-actions">
          <button aria-pressed={!scaled} onClick={() => setScaled(false)}>
            Absolute error
          </button>
          <button aria-pressed={scaled} onClick={() => setScaled(true)}>
            q² × error
          </button>
        </div>
      </div>
      <svg
        className="prefix-chart error-chart"
        viewBox="0 0 580 365"
        role="group"
        aria-label="Convergent approximation errors"
        data-metric={scaled ? "scaled" : "absolute"}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1="70"
              x2="530"
              y1={40 + i * 60}
              y2={40 + i * 60}
              stroke="#dfe4d6"
            />
            <text x="60" y={44 + i * 60} textAnchor="end" fontSize="11">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        <text x="70" y="20" fontSize="12">
          log₁₀ {scaled ? "(q² |α − p/q|)" : "|α − p/q|"}
        </text>
        <line x1="70" x2="530" y1="280" y2="280" stroke="#8d9b82" />
        {[0, 1, 2, 3, 4].map((i) => (
          <text
            key={i}
            x={70 + i * 115}
            y="300"
            textAnchor="middle"
            fontSize="11"
          >
            {((maxX * i) / 4).toFixed(1)}
          </text>
        ))}
        <text x="300" y="323" textAnchor="middle" fontSize="12">
          log₁₀ denominator q
        </text>
        <polyline
          points={nonzero.map((p) => `${x(p)},${y(p)}`).join(" ")}
          fill="none"
          stroke="#b6c4ac"
          strokeWidth="1.5"
        />
        {rows.map((p) => (
          <g
            key={p.index}
            role="button"
            tabIndex={0}
            aria-label={`Select error a${p.index}`}
            aria-pressed={p.index === selected}
            onClick={() => onSelect(p.index)}
            onKeyDown={(e) => activate(e, () => onSelect(p.index))}
            data-exact-zero={p.error.zero}
          >
            <title>{`a${p.index}: ${label(p.convergent)}; ${p.error.zero ? "exact zero error" : scientificRational((scaled ? p.error.scaled : p.error.absolute)[0])}`}</title>
            <circle
              cx={x(p)}
              cy={p.error.zero ? 346 : y(p)}
              r="22"
              fill="transparent"
            />
            <circle
              cx={x(p)}
              cy={p.error.zero ? 346 : y(p)}
              r={p.index === selected ? 7 : 4.5}
              fill={stageColor(p.index)}
              stroke={p.index === selected ? "#253c30" : "#fff"}
              strokeWidth="1.5"
            />
          </g>
        ))}
        {rows.some((p) => p.error.zero) && (
          <text x="70" y="350" fontSize="11">
            Exact zero (outside log axis)
          </text>
        )}
      </svg>
      <div className="prefix-facts" data-testid="error-details">
        <p>
          <b>
            {scaled ? "q² × absolute error" : "Absolute error"} at a{selected}
          </b>
        </p>
        <p className="exact-expression">
          {current.error.zero
            ? "0 — exact rational endpoint"
            : `≈ ${scientificRational(range[0])}`}
        </p>
        <p>
          {current.error.zero
            ? "The rational expansion terminates here."
            : current.error.signed[0].p > 0n
              ? "The convergent is below α."
              : "The convergent is above α."}
        </p>
        <p className="prefix-note">
          {spec.kind === "periodic"
            ? "The irrational error is nonzero. Plotted decimals use a deeper exact prefix enclosure; they are approximations, not a termination test."
            : "Errors are computed by exact rational subtraction. Zero is shown separately because it has no finite logarithm."}{" "}
          Both axes use base-10 logarithms. Lines connect successive prefixes,
          not a continuous error function.
        </p>
        <details>
          <summary>
            {current.error.exact
              ? "Exact error fraction"
              : "Certified rational error bounds"}
          </summary>
          <p className="exact-expression">
            {current.error.exact
              ? label(range[0])
              : `${label(range[0])} < ${scaled ? "q² |α − p/q|" : "|α − p/q|"} < ${label(range[1])}`}
          </p>
          {!current.error.exact && (
            <p>
              Bounds come from a strictly deeper prefix of the exact periodic
              expansion. No floating-point subtraction determines their sign.
            </p>
          )}
        </details>
      </div>
      <div className="prefix-point-list" aria-label="Select a convergent error">
        {rows.map((p) => (
          <button
            key={p.index}
            aria-pressed={p.index === selected}
            onClick={() => onSelect(p.index)}
            style={{ borderBottomColor: stageColor(p.index) }}
          >
            a{p.index}: {short(label(p.convergent))}
            {p.error.zero ? " · exact" : ""}
          </button>
        ))}
      </div>
    </>
  );
}
