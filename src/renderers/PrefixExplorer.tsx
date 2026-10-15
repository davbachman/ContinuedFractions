import { useEffect, useMemo, useRef } from "react";
import { specLabel, toCF, type NumberSpec } from "../math/continuedFraction";
import { label, type Rational } from "../math/rational";
import { determinant, type Matrix } from "../math/modular";
import {
  coefficientMatrix,
  prefixData,
  type Prefix,
} from "../math/approximations";
import { stageColor } from "./dissectionColors";

type Props = {
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
  onSelect: Props["onSelect"];
};
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export function PrefixExplorer(props: Props) {
  const { spec, coefficients, selected, onSelect, onExtend, onNumber } = props;
  const data = useMemo(() => prefixData(coefficients), [coefficients]);
  if (!data.length)
    return (
      <p className="view-unavailable" role="status">
        ∞ has no finite regular continued-fraction prefix. This view needs a
        finite number; the exact shared value is unchanged.
      </p>
    );
  const index = clamp(selected, 0, data.length - 1),
    prefix = data[index];
  const diagram = { data, selected: index, onSelect };
  return (
    <div
      className="prefix-explorer prefix-matrices"
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
      <Matrices {...diagram} />
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
  const factors = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parent = factors.current,
      active = parent?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (parent && active) {
      const left = active.offsetLeft;
      if (
        left < parent.scrollLeft ||
        left + active.offsetWidth > parent.scrollLeft + parent.clientWidth
      )
        parent.scrollTo({
          left: Math.max(
            0,
            left - parent.clientWidth / 2 + active.offsetWidth / 2,
          ),
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
    }
  }, [selected]);
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
      <div
        ref={factors}
        className="matrix-factors"
        aria-label="Coefficient matrix factors"
      >
        {data.map((row) => (
          <button
            key={row.index}
            aria-label={`Select matrix factor a${row.index}`}
            aria-pressed={selected === row.index}
            data-prefix-state={
              row.index < selected
                ? "included"
                : row.index === selected
                  ? "current"
                  : "future"
            }
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
          <span
            key={`factor-${selected}`}
            className="matrix-new-factor"
            style={{ borderColor: stageColor(selected) }}
          >
            <small>Append A(a{selected})</small>
            <MatrixDisplay
              m={coefficientMatrix(p.coefficient)}
              name="Selected factor"
            />
          </span>
          <span>=</span>
          <span key={`product-${selected}`} className="matrix-new-product">
            <small>Exact product M{selected}</small>
            <MatrixDisplay m={p.matrix} name="Product" />
          </span>
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
