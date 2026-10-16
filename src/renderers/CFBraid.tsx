import { useEffect, useMemo, useState, useRef } from "react";
import { fromCF, specLabel, type NumberSpec } from "../math/continuedFraction";
import { label, type Rational } from "../math/rational";
import { cfBraidDiagram, BRAID_X } from "../math/cfBraid";
import { diagramClosure } from "../math/tangleDiagram";
import { closureName } from "../math/tangles";
import { stageColor } from "./dissectionColors";

type Props = {
  sharedControls?: boolean;
  approximationIndex?: number;
  spec: NumberSpec;
  coefficients: readonly bigint[];
  selected: number;
  onSelect: (index: number) => void;
  onEdit: (value: string) => void;
  onNumber: (value: Rational) => void;
  onExtend: () => void;
};
const short = (n: bigint) =>
  String(n).length > 12 ? String(n).slice(0, 7) + "…" : String(n);
export function CFBraid({
  sharedControls = false,
  approximationIndex,
  spec,
  coefficients,
  selected,
  onSelect,
  onEdit,
  onNumber,
  onExtend,
}: Props) {
  const infinite = spec.kind === "rational" && !spec.value.q;
  const irrational = spec.kind === "periodic";
  const approximation = approximationIndex ?? selected;
  const scrollRef = useRef<HTMLDivElement>(null);
  const shownCoefficients = useMemo(
    () =>
      irrational ? coefficients.slice(0, approximation + 1) : coefficients,
    [irrational, coefficients, approximation],
  );
  const diagram = useMemo(
    () => cfBraidDiagram(shownCoefficients, infinite),
    [shownCoefficients, infinite],
  );
  const closure = useMemo(() => diagramClosure(diagram), [diagram]);
  const [draft, setDraft] = useState(String(coefficients[selected] ?? 0n));
  const [fitWhole, setFitWhole] = useState(true);
  useEffect(
    () => setDraft(String(coefficients[selected] ?? 0n)),
    [coefficients, selected],
  );
  useEffect(() => {
    const viewport =
      scrollRef.current?.closest(".pane-body") ?? scrollRef.current;
    const group = scrollRef.current?.querySelector(
      '[data-braid-coefficient="' + selected + '"]',
    );
    if (!fitWhole && viewport && group) {
      const box = group.getBoundingClientRect(),
        frame = viewport.getBoundingClientRect();
      if (box.top < frame.top || box.bottom > frame.bottom)
        viewport.scrollTop += box.top - frame.top - 18;
    }
  }, [selected, fitWhole]);
  const curve = (index: number) => {
    const e = diagram.edges[index],
      a = diagram.nodes[e.from],
      b = diagram.nodes[e.to];
    const d = b.y - a.y;
    return `M${a.x} ${a.y} C${a.x} ${a.y + d * 0.45} ${b.x} ${b.y - d * 0.45} ${b.x} ${b.y}`;
  };
  const cap = (a: number, b: number, y: number, depth: number) =>
    `M${a} ${y} C${a} ${y + depth} ${b} ${y + depth} ${b} ${y}`;
  const groupColor = (region: number) =>
    region >= 0 ? stageColor(diagram.blocks[region].coefficient) : "#657b70";
  const edgeColor = (index: number) => {
    const e = diagram.edges[index],
      a = diagram.nodes[e.from];
    return a.x === BRAID_X[0] ? "#85938a" : groupColor(e.region);
  };
  const split = diagram.blocks.some((b) => b.ending !== "whole");
  return (
    <section
      className="panel cf-braid-panel"
      tabIndex={0}
      aria-label="CF braid explorer"
      onKeyDown={(e) => {
        if (
          (e.target as Element).closest(
            'button,input,select,[role="button"]',
          ) ||
          infinite
        )
          return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          onSelect(
            Math.max(
              0,
              Math.min(
                coefficients.length - 1,
                selected + (e.key === "ArrowRight" ? 1 : -1),
              ),
            ),
          );
        }
      }}
    >
      <div className="panel-heading">
        <h2>CF braid · 4-plat</h2>
        <span className="small-tag">THREE ACTIVE STRANDS</span>
      </div>
      <p className="braid-value">
        α = <strong>{specLabel(spec)}</strong>
        {irrational && (
          <>
            {" "}
            · convergent <strong>{label(diagram.fraction)}</strong>
          </>
        )}
      </p>
      {irrational && !sharedControls && (
        <div className="tangle-approximation" role="status">
          Finite rational approximation: C{selected} = {label(diagram.fraction)}
          . This braid does not represent the exact irrational α.
          <label>
            Convergent{" "}
            <select
              aria-label="Braid convergent"
              value={selected}
              onChange={(e) => onSelect(Number(e.target.value))}
            >
              {coefficients.map((_, i) => (
                <option key={i} value={i}>
                  C{i} = {label(fromCF(coefficients.slice(0, i + 1)))}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => onNumber(diagram.fraction)}>
            Use braid convergent as α
          </button>
          <button disabled={coefficients.length >= 96} onClick={onExtend}>
            More braid convergents
          </button>
        </div>
      )}

      {infinite && (
        <p className="topology-note" role="status">
          ∞ has no finite CF twist sequence. The crossing-free diagram uses
          nested bottom caps and closes to an unknot.
        </p>
      )}
      <div className="braid-controls" role="group" aria-label="Braid framing">
        <button aria-pressed={fitWhole} onClick={() => setFitWhole(true)}>
          Fit whole knot
        </button>
        <button aria-pressed={!fitWhole} onClick={() => setFitWhole(false)}>
          Inspect twists
        </button>
      </div>

      <div ref={scrollRef} className="braid-scroll" data-fit={fitWhole}>
        <svg
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          style={{ aspectRatio: `${diagram.width} / ${diagram.height}` }}
          role="group"
          aria-label="Continued-fraction four-plat diagram"
          data-fraction={label(diagram.fraction)}
          data-components={closure.components}
        >
          {BRAID_X.map((x, i) => (
            <text
              key={i}
              x={x}
              y={17}
              textAnchor="middle"
              className="braid-strand-label"
            >
              {i === 0 ? "R" : i}
            </text>
          ))}
          {diagram.regions.map((r) => (
            <g
              key={r.index}
              data-braid-coefficient={r.block.coefficient}
              data-selected={r.block.coefficient === selected}
              role="button"
              tabIndex={0}
              aria-label={`Select braid coefficient a${r.block.coefficient} = ${coefficients[r.block.coefficient]}${r.block.ending === "whole" ? "" : " (split ending)"}`}
              aria-pressed={r.block.coefficient === selected}
              onClick={() => onSelect(r.block.coefficient)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(r.block.coefficient);
                }
              }}
            >
              <rect
                x={112}
                y={r.top}
                width={302}
                height={r.bottom - r.top}
                fill="transparent"
              />
              <rect
                data-twist-pair={r.block.pair === 1 ? "1–2" : "2–3"}
                x={BRAID_X[r.block.pair] - 16}
                y={r.top + 3}
                width={106}
                height={r.bottom - r.top - 6}
                rx={7}
                fill={
                  groupColor(r.index) +
                  (r.block.coefficient === selected ? "20" : "08")
                }
                stroke={groupColor(r.index)}
                strokeWidth={r.block.coefficient === selected ? 2 : 0.7}
              />
              <text
                x={331}
                y={(r.top + r.bottom) / 2 - 6}
                className="braid-box-label"
                fill={groupColor(r.index)}
              >
                a{r.block.coefficient}
                {r.block.ending === "minus-one"
                  ? " − 1"
                  : r.block.ending === "one"
                    ? " · final 1"
                    : ""}
              </text>
              <text
                x={331}
                y={(r.top + r.bottom) / 2 + 12}
                className="braid-box-label"
              >
                {short(r.block.count)}{" "}
                {r.block.count === 1n || r.block.count === -1n
                  ? "twist"
                  : "twists"}
                <title>{String(r.block.count)} twists</title>
              </text>
              {!r.block.count && (
                <text
                  x={(BRAID_X[r.block.pair] + BRAID_X[r.block.pair + 1]) / 2}
                  y={(r.top + r.bottom) / 2 - 7}
                  textAnchor="middle"
                  className="braid-box-label"
                >
                  no twists
                </text>
              )}
            </g>
          ))}
          <g fill="none" strokeLinecap="round" pointerEvents="none">
            {diagram.edges.slice(2).map((_, k) => {
              const i = k + 2;
              return (
                <path
                  key={i}
                  data-braid-strand="true"
                  d={curve(i)}
                  stroke={edgeColor(i)}
                  strokeWidth={3}
                />
              );
            })}
            {diagram.crossings.map((c, i) => (
              <g key={i} data-braid-crossing="true">
                <path
                  d={curve(c.over)}
                  stroke="#fbfbf6"
                  strokeWidth={9}
                  pathLength={1}
                  strokeDasharray="0.24 0.76"
                  strokeDashoffset="-0.38"
                />
                <path
                  d={curve(c.over)}
                  stroke={edgeColor(c.over)}
                  strokeWidth={3}
                />
              </g>
            ))}
            {[
              cap(BRAID_X[0], BRAID_X[1], 64, -48),
              cap(BRAID_X[2], BRAID_X[3], 64, -48),
              cap(
                diagram.nodes[diagram.ends[0]].x,
                diagram.nodes[diagram.ends[1]].x,
                diagram.bottom,
                infinite ? 120 : 48,
              ),
              cap(
                diagram.nodes[diagram.ends[2]].x,
                diagram.nodes[diagram.ends[3]].x,
                diagram.bottom,
                48,
              ),
            ].map((d, i) => (
              <path
                key={i}
                data-plat-cap="true"
                strokeDasharray="7 4"
                d={d}
                stroke="#526c5c"
                strokeWidth={3.5}
              />
            ))}
          </g>
          {diagram.regions
            .filter((r) => r.aggregated)
            .map((r) => (
              <g key={r.index} pointerEvents="none" data-braid-aggregate="true">
                <rect
                  x={BRAID_X[r.block.pair] - 13}
                  y={r.top + 7}
                  width={100}
                  height={r.bottom - r.top - 14}
                  rx={5}
                  fill="#f3f0e2"
                  stroke={groupColor(r.index)}
                  strokeDasharray="4 3"
                />
                <text
                  x={(BRAID_X[r.block.pair] + BRAID_X[r.block.pair + 1]) / 2}
                  y={(r.top + r.bottom) / 2 + 4}
                  textAnchor="middle"
                  className="braid-box-label"
                >
                  twist bundle
                </text>
              </g>
            ))}
        </svg>
      </div>
      <p className="braid-closure" role="status">
        {closureName(diagram.fraction)} ·{" "}
        {closure.components === 1 ? "one component" : "two components"}. Plat
        closure of the displayed rational braid.
      </p>
      {diagram.boxes.length > 0 && (
        <p className="topology-limit">
          Large twist groups are drawn as bundles. Counts and connectivity stay
          exact; at most 160 individual crossings are drawn.
        </p>
      )}
      {split && (
        <p className="topology-note" data-testid="braid-ending">
          Odd-length plat ending: […, a] = […, a−1, 1]. Both final boxes belong
          to a{shownCoefficients.length - 1}; α is unchanged.
        </p>
      )}
      {!infinite && (
        <>
          {!sharedControls && (
            <div className="braid-controls">
              <button
                disabled={!selected}
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
            </div>
          )}
          {!sharedControls && (
            <form
              className="braid-edit"
              onSubmit={(e) => {
                e.preventDefault();
                onEdit(draft);
              }}
            >
              <label>
                Edit a{selected}
                <input
                  aria-label={`Braid coefficient a${selected}`}
                  inputMode="numeric"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </label>
              <button type="submit">Apply braid coefficient</button>
            </form>
          )}
        </>
      )}
      <details className="braid-convention">
        <summary>Crossings, closure & the tangle connection</summary>
        <p>
          Positive local crossings pass the top-right strand over the top-left.
          Local exponents alternate a₀, −a₁, a₂, …; labels show CF coefficients.
          Slots 1–2 and 2–3 alternate; R never crosses. Top and bottom caps join
          R–1 and 2–3 for finite α. The regular CF of a negative α can give a
          nonalternating diagram.
        </p>
        <p>
          This is a four-plat presentation of the same unoriented knot or link
          as the numerator closure of the rational tangle. It is not the
          ordinary closure of a three-strand braid. This CF presentation need
          not minimize crossings. Different fractions can give the same closed
          knot. A custom signed tangle expression keeps its own operations; this
          view uses α’s continued fraction.
        </p>
        <p>
          Convention:{" "}
          <a
            href="https://arxiv.org/pdf/math/0212011"
            target="_blank"
            rel="noreferrer"
          >
            Kauffman–Lambropoulou, Figures 9–10
          </a>
          , with coefficients indexed from a₀.
        </p>
      </details>
    </section>
  );
}
