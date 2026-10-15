import { useEffect, useId, useMemo, useState } from "react";
import {
  alternate,
  convergents,
  cylinder,
  specLabel,
  type NumberSpec,
} from "../math/continuedFraction";
import {
  convergentError,
  targetBounds,
  scientificRational,
} from "../math/approximations";
import { label } from "../math/rational";
import { StackedFraction } from "./StackedFraction";
import { stageColor } from "./dissectionColors";
import type { Crossing } from "../math/farey";

export function SymbolicView({
  sharedControls = false,
  spec,
  coefficients,
  selected,
  onSelect,
  onEdit,
  crossings,
  onExtend,
}: {
  sharedControls?: boolean;
  spec: NumberSpec;
  coefficients: bigint[];
  selected: number;
  onSelect: (index: number) => void;
  onEdit: (value: string) => void;
  crossings: readonly Crossing[];
  onExtend: () => void;
}) {
  const id = useId();
  const [view, setView] = useState<"stacked" | "coefficients">("stacked"),
    [alternative, setAlternative] = useState(false),
    [draft, setDraft] = useState("");
  useEffect(() => {
    setDraft(String(coefficients[selected] ?? 0n));
  }, [coefficients, selected]);
  useEffect(() => setAlternative(false), [spec]);
  const displayed =
    alternative && coefficients.length ? alternate(coefficients) : coefficients;
  const cs = useMemo(
    () => (coefficients.length ? convergents(coefficients) : []),
    [coefficients],
  );
  const error = useMemo(
    () =>
      cs[selected]
        ? convergentError(spec, cs[selected], targetBounds(spec, cs.length))
        : null,
    [spec, cs, selected],
  );
  if (spec.kind === "rational" && !spec.value.q)
    return (
      <p className="view-unavailable">
        ∞ has no finite regular continued fraction. The exact value is retained;
        choose a finite number or rotate the infinity tangle.
      </p>
    );
  const r = cs[selected],
    [lower, upper] = cylinder(coefficients.slice(0, selected + 1));
  const run = crossings.filter(
    (e) => e.term === selected && e.direction !== "initial",
  );
  return (
    <div className="symbolic-view">
      <div
        className="fraction-tabs"
        role="tablist"
        aria-label="Continued fraction view"
      >
        {(["stacked", "coefficients"] as const).map((v, i) => (
          <button
            key={v}
            id={`${id}-${v}-tab`}
            role="tab"
            aria-selected={view === v}
            aria-controls={`${id}-${v}`}
            tabIndex={view === v ? 0 : -1}
            onClick={() => setView(v)}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? "stacked"
                  : e.key === "End"
                    ? "coefficients"
                    : i
                      ? "stacked"
                      : "coefficients";
              setView(next);
              document.getElementById(`${id}-${next}-tab`)?.focus();
            }}
          >
            {v === "stacked" ? "Stacked fraction" : "Coefficients"}
          </button>
        ))}
      </div>
      <p className="symbolic-value">
        α = <strong>{specLabel(spec)}</strong>{" "}
        <span className="small-tag">
          {spec.kind === "periodic" ? "Exact periodic" : "Exact rational"}
        </span>
      </p>
      <div
        id={`${id}-stacked`}
        role="tabpanel"
        aria-labelledby={`${id}-stacked-tab`}
        hidden={view !== "stacked"}
      >
        <div
          className="stacked-scroll"
          tabIndex={0}
          role="region"
          aria-label="Nested continued fraction"
        >
          <StackedFraction
            coefficients={displayed}
            periodic={spec.kind === "periodic"}
            selectedTerm={selected}
            disabled={alternative}
            colored
            onSelect={onSelect}
          />
        </div>
      </div>
      <div
        id={`${id}-coefficients`}
        role="tabpanel"
        aria-labelledby={`${id}-coefficients-tab`}
        hidden={view !== "coefficients"}
      >
        <div className="workspace-terms">
          {displayed.map((a, i) => (
            <button
              key={i}
              disabled={alternative}
              aria-label={`Select coefficient a${i} = ${a}`}
              aria-pressed={selected === i}
              style={{ borderBottomColor: stageColor(i) }}
              onClick={() => onSelect(i)}
            >
              <small>a{i}</small>
              <strong>{String(a)}</strong>
            </button>
          ))}
          {spec.kind === "periodic" && <span>…</span>}
        </div>
      </div>
      <p className="cf-help">
        {alternative
          ? "Alternate ending has the same value. Return to canonical form to select and edit."
          : "Select a coefficient to highlight its corresponding stage or Farey run."}
      </p>
      <div className="symbolic-selection">
        <div>
          <span className="data-label">Selected coefficient</span>
          <strong>
            a{selected} = {String(coefficients[selected])}
          </strong>
        </div>
        <div>
          <span className="data-label">Convergent</span>
          <strong>{r ? label(r) : "—"}</strong>
        </div>
        {!sharedControls && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onEdit(draft);
            }}
          >
            <label htmlFor={`${id}-coefficient`}>Edit a{selected}</label>
            <div className="input-group">
              <input
                id={`${id}-coefficient`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                inputMode="numeric"
                disabled={alternative}
              />
              <button type="submit" disabled={alternative}>
                Apply coefficient
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="workspace-actions">
        <button
          disabled={selected === 0}
          onClick={() => onSelect(selected - 1)}
        >
          Previous coefficient
        </button>
        <button
          disabled={selected >= coefficients.length - 1}
          onClick={() => onSelect(selected + 1)}
        >
          Next coefficient
        </button>
        {spec.kind === "periodic" && (
          <button onClick={onExtend} disabled={coefficients.length >= 96}>
            Generate more terms
          </button>
        )}
      </div>
      <details className="workspace-details">
        <summary>Approximation and Farey coding</summary>
        <p>
          α − p/q{" "}
          {error?.zero
            ? "= 0"
            : error
              ? `≈ ${scientificRational(error.signed[0])}`
              : "—"}
          . Consecutive determinant:{" "}
          {selected && r
            ? String(r.p * cs[selected - 1].q - r.q * cs[selected - 1].p)
            : "—"}
          .
        </p>
        <p>
          Farey run:{" "}
          {selected === 0
            ? "translation"
            : run.map((e) => e.direction).join("") || "∅"}{" "}
          · {run.length} crossings in the display window. Initial and terminal
          offsets apply.
        </p>
        <p>
          Prefix cylinder: [{label(lower)}, {label(upper)}].
        </p>
        {spec.kind === "rational" && (
          <label>
            <input
              type="checkbox"
              checked={alternative}
              onChange={(e) => setAlternative(e.target.checked)}
            />{" "}
            Alternate ending (same value)
          </label>
        )}
      </details>
    </div>
  );
}
