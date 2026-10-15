import { useMemo, useState, type KeyboardEvent } from "react";
import { specLabel, toCF, type NumberSpec } from "../math/continuedFraction";
import { label, rational, type Rational } from "../math/rational";
import { determinant, type Matrix } from "../math/modular";
import {
  coefficientMatrix,
  convergentError,
  logRational,
  scientificRational,
  prefixData,
  targetBounds,
  type Prefix,
} from "../math/approximations";
import { stageColor } from "./dissectionColors";

export type PrefixView = "matrices" | "errors";
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
