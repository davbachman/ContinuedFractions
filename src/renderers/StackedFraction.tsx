import type { ReactNode } from "react";
import { stageColor } from "./dissectionColors";

/** Each denominator contains the next complete quotient, at a fixed font size. */
export function StackedFraction({
  coefficients,
  periodic,
  selectedTerm,
  disabled,
  colored = false,
  onSelect,
}: {
  coefficients: bigint[];
  periodic: boolean;
  selectedTerm: number;
  disabled: boolean;
  colored?: boolean;
  onSelect: (index: number) => void;
}) {
  let tail: ReactNode = periodic ? (
    <span className="stacked-continuation" aria-label="continues indefinitely">
      …
    </span>
  ) : null;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    const index = i;
    tail = (
      <span className="stacked-quotient">
        <button
          className={`stacked-coefficient${selectedTerm === i ? " active" : ""}${colored ? " colored-coefficient" : ""}`}
          style={colored ? { borderBottomColor: stageColor(i) } : undefined}
          disabled={disabled}
          aria-label={`Select coefficient a${i} = ${coefficients[i]}`}
          aria-pressed={selectedTerm === i}
          onClick={() => onSelect(index)}
        >
          {String(coefficients[i])}
        </button>
        {tail !== null && (
          <>
            <span className="stacked-plus">+</span>
            <span
              className="stacked-reciprocal"
              role="group"
              aria-label="one divided by"
            >
              <span className="stacked-numerator" aria-hidden="true">
                1
              </span>
              <span className="stacked-denominator">{tail}</span>
            </span>
          </>
        )}
      </span>
    );
  }
  return tail;
}
