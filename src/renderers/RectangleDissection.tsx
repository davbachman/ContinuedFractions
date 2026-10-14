import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { NumberSpec } from "../math/continuedFraction";
import { approximate, specLabel } from "../math/continuedFraction";
import { label, rational, type Rational } from "../math/rational";
import {
  type DissectionStage,
  type ExactRectangle,
  type Length,
  ONE,
  originalRectangle,
  lengthLabel,
  dimensionsLabel,
  lengthRatio,
  minus,
  projectionAlpha,
  squareAt,
  squareGroup,
} from "../math/dissection";
import { endpointAtPointer } from "./camera";
import { stageColor } from "./dissectionColors";

type Props = {
  spec: NumberSpec;
  stages: DissectionStage[];
  selected: number;
  camera: "full" | "remainder";
  onCamera: (mode: "full" | "remainder") => void;
  onSelect: (index: number) => void;
  onStart: () => void;
  onMove: (r: Rational) => void;
  onEnd: (cancelled: boolean) => void;
};
type Camera = { x: number; y: number; scale: number; angle: number };
type Frame = {
  box: ExactRectangle;
  unit: Length;
  width: number;
  height: number;
  target: Camera;
  spec: NumberSpec;
};

export function RectangleDissection({
  spec,
  stages,
  selected,
  camera,
  onCamera,
  onSelect,
  onStart,
  onMove,
  onEnd,
}: Props) {
  const stage = stages[selected];
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(760);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    pointer: number;
    x: number;
    alpha: number;
    scale: number;
    displayScale: number;
  } | null>(null);
  const alpha = useMemo(() => projectionAlpha(spec), [spec]);
  const numericAlpha = approximate(spec);
  const box = camera === "full" ? originalRectangle : stage.before;
  const frame = useMemo<Frame>(() => {
    const unit =
      lengthRatio(box.width, box.height, alpha) >= 1 ? box.width : box.height;
    const w = lengthRatio(box.width, unit, alpha),
      h = lengthRatio(box.height, unit, alpha);
    const rotate = camera === "remainder" && stage.axis === "y";
    return {
      box,
      unit,
      width: w,
      height: h,
      spec,
      target: {
        x: w / 2,
        y: h / 2,
        scale: Math.min(
          (width - 64) / (rotate ? h : w),
          300 / (rotate ? w : h),
        ),
        angle: rotate ? -90 : 0,
      },
    };
  }, [box, alpha, width, camera, stage.axis, spec]);
  const [position, setPosition] = useState<Camera>(frame.target);
  const previous = useRef<Frame | null>(null);
  const positionRef = useRef(position);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  useEffect(
    () => () => {
      if (drag.current) onEndRef.current(true);
    },
    [],
  );
  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    function apply(next: Camera) {
      positionRef.current = next;
      setPosition(next);
    }
    const old = previous.current;
    const lastPosition = positionRef.current;
    previous.current = frame;
    if (
      !old ||
      old.spec !== spec ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      apply(frame.target);
      return;
    }
    const ratio = lengthRatio(old.unit, frame.unit, alpha);
    const start: Camera = {
      x:
        lengthRatio(minus(old.box.x, frame.box.x), frame.unit, alpha) +
        lastPosition.x * ratio,
      y:
        lengthRatio(minus(old.box.y, frame.box.y), frame.unit, alpha) +
        lastPosition.y * ratio,
      scale: lastPosition.scale / ratio,
      angle: lastPosition.angle,
    };
    // Extreme jumps do not have a useful intermediate view; avoid numerical overflow.
    if (!Number.isFinite(ratio) || ratio > 1e8 || ratio < 1e-8) {
      apply(frame.target);
      return;
    }
    apply(start);
    let id = 0;
    const started = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - started) / 650),
        e = t * t * (3 - 2 * t);
      apply({
        x: start.x + (frame.target.x - start.x) * e,
        y: start.y + (frame.target.y - start.y) * e,
        scale: start.scale * (frame.target.scale / start.scale) ** e,
        angle: start.angle + (frame.target.angle - start.angle) * e,
      });
      if (t < 1) id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [frame, alpha, spec]);
  const project = (r: ExactRectangle) => ({
    x: lengthRatio(minus(r.x, box.x), frame.unit, alpha),
    y: lengthRatio(minus(r.y, box.y), frame.unit, alpha),
    width: lengthRatio(r.width, frame.unit, alpha),
    height: lengthRatio(r.height, frame.unit, alpha),
  });
  function finish(cancelled: boolean) {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    onEnd(cancelled);
  }
  const overviewScale =
    dragging && drag.current
      ? drag.current.displayScale
      : Math.min(260 / numericAlpha, 100);
  const overview = (r: ExactRectangle) => ({
    x: 20 + lengthRatio(r.x, ONE, alpha) * overviewScale,
    y: 20 + lengthRatio(r.y, ONE, alpha) * overviewScale,
    width: lengthRatio(r.width, ONE, alpha) * overviewScale,
    height: lengthRatio(r.height, ONE, alpha) * overviewScale,
  });
  const remainder = project(stage.remainder);
  return (
    <>
      <div
        className="rectangle-camera"
        role="group"
        aria-label="Rectangle camera"
      >
        <button
          aria-pressed={camera === "full"}
          onClick={() => onCamera("full")}
        >
          Full dissection
        </button>
        <button
          aria-pressed={camera === "remainder"}
          onClick={() => onCamera("remainder")}
        >
          Follow remainder
        </button>
      </div>
      <svg
        ref={svg}
        className="rectangle-canvas"
        viewBox={`0 0 ${width} 380`}
        role="group"
        aria-label="Rectangle dissection diagram"
        data-stage={selected}
        data-camera={camera}
      >
        <title>
          Rectangle of width {specLabel(spec)} and height 1. Stage a{selected}{" "}
          removes {String(stage.count)} squares.
        </title>
        <g
          transform={`translate(${width / 2} 190) rotate(${position.angle}) scale(${position.scale}) translate(${-position.x} ${-position.y})`}
        >
          <rect
            {...project(box)}
            fill="#f4f1e5"
            stroke="#607463"
            vectorEffect="non-scaling-stroke"
          />
          {stages
            .slice(0, selected + 1)
            .filter((s) => camera === "full" || s.index === selected)
            .map((s) => {
              if (!s.count) return null;
              const group = project(squareGroup(s));
              if (
                ![group.x, group.y, group.width, group.height].every(
                  Number.isFinite,
                ) ||
                Math.max(
                  Math.abs(group.x),
                  Math.abs(group.y),
                  group.width,
                  group.height,
                ) > 1e7
              )
                return null;
              // At most 24 detailed squares in the active stage, 4 in each earlier stage.
              const detailed =
                s.count <= BigInt(s.index === selected ? 24 : 4) &&
                lengthRatio(s.side, frame.unit, alpha) * frame.target.scale >=
                  4;
              const rectangles = detailed
                ? Array.from({ length: Number(s.count) }, (_, j) =>
                    squareAt(s, BigInt(j)),
                  )
                : [squareGroup(s)];
              return (
                <g
                  key={s.index}
                  className={
                    s.index === selected
                      ? "rectangle-stage current"
                      : "rectangle-stage"
                  }
                  role="button"
                  tabIndex={0}
                  aria-label={`Select square group a${s.index}: ${s.count} squares`}
                  aria-pressed={s.index === selected}
                  onClick={() => onSelect(s.index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(s.index);
                    }
                  }}
                >
                  <title>
                    a{s.index} = {String(s.count)} · side{" "}
                    {lengthLabel(s.side, spec)}
                    {!detailed ? " · aggregated group" : ""}
                  </title>
                  {rectangles.map((r, j) => (
                    <rect
                      key={j}
                      {...project(r)}
                      fill={stageColor(s.index)}
                      fillOpacity={s.index === selected ? 0.85 : 0.45}
                      stroke={s.index === selected ? "#243f37" : "#fbfbf6"}
                      strokeWidth={s.index === selected ? 2 : 1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {!detailed &&
                    group.width * frame.target.scale > 55 &&
                    group.height * frame.target.scale > 28 && (
                      <text
                        x={group.x + group.width / 2}
                        y={group.y + group.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={13 / frame.target.scale}
                        fill="#20352d"
                      >
                        {String(s.count).length < 14
                          ? `${s.count} squares`
                          : `a${s.index} squares`}
                      </text>
                    )}
                </g>
              );
            })}
          {!stage.terminal && (
            <rect
              {...remainder}
              fill="none"
              stroke="#263f35"
              strokeWidth={2}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
      <div className="rectangle-caption">
        <strong>
          Stage a<sub>{selected}</sub> = {String(stage.count)}
        </strong>
        <span>
          {camera === "full"
            ? "Original rectangle stays in view."
            : "Working remainder, rotated to place the cutting direction horizontally."}
        </span>
        <span>Working dimensions: {dimensionsLabel(stage.before, spec)}</span>
      </div>
      <div className="rectangle-overview">
        <svg
          viewBox="0 0 320 145"
          role="group"
          aria-label="Original rectangle overview"
        >
          <rect
            {...overview(originalRectangle)}
            fill="#f4f1e5"
            stroke="#607463"
          />
          {stages
            .slice(0, selected + 1)
            .filter((s) => s.count > 0n)
            .map((s) => (
              <rect
                key={s.index}
                {...overview(squareGroup(s))}
                fill={stageColor(s.index)}
                fillOpacity={s.index === selected ? 0.95 : 0.5}
                stroke="#fbfbf6"
                strokeWidth={0.7}
                role="button"
                tabIndex={0}
                aria-label={`Overview group a${s.index}`}
                aria-pressed={s.index === selected}
                onClick={() => onSelect(s.index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.index);
                  }
                }}
              />
            ))}
          <rect
            {...overview(stage.before)}
            fill="none"
            stroke="#263f35"
            strokeWidth={2}
            pointerEvents="none"
          />
          <rect
            x={20 + numericAlpha * overviewScale - 10}
            y={Math.max(10, 20 + overviewScale / 2 - 22)}
            width={20}
            height={44}
            rx={5}
            fill="#274d42"
            fillOpacity={0.8}
            className="rectangle-resize-handle"
            role="slider"
            tabIndex={0}
            aria-label="Resize outer rectangle aspect ratio"
            aria-valuemin={0.0001}
            aria-valuemax={10000}
            aria-valuenow={numericAlpha}
            aria-valuetext={specLabel(spec)}
            onPointerDown={(e) => {
              if (e.button !== 0 || drag.current) return;
              const pixelScale =
                (overviewScale *
                  e.currentTarget.ownerSVGElement!.getBoundingClientRect()
                    .width) /
                320;
              drag.current = {
                pointer: e.pointerId,
                x: e.clientX,
                alpha: numericAlpha,
                scale: pixelScale,
                displayScale: overviewScale,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              onStart();
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.pointer !== e.pointerId) return;
              const candidate = endpointAtPointer(
                Math.max(0.0001, d.alpha + (e.clientX - d.x) / d.scale),
                d.scale,
              );
              onMove(candidate.p > 0n ? candidate : rational(1n, 10000n));
            }}
            onPointerUp={(e) => {
              if (drag.current?.pointer === e.pointerId) finish(false);
            }}
            onPointerCancel={() => finish(true)}
            onLostPointerCapture={() => finish(true)}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Escape"].includes(e.key))
                return;
              e.preventDefault();
              e.stopPropagation();
              if (e.key === "Escape") {
                finish(true);
                return;
              }
              onStart();
              const candidate = endpointAtPointer(
                Math.max(
                  0.0001,
                  numericAlpha +
                    (e.key === "ArrowRight" ? 1 : -1) *
                      (e.shiftKey ? 0.1 : 0.01),
                ),
                1000,
              );
              onMove(candidate.p > 0n ? candidate : rational(1n, 10000n));
              onEnd(false);
            }}
          />
        </svg>
        <div>
          <strong>Original rectangle · α × 1</strong>
          <output aria-live="polite">
            {dragging ? "Selected value: " : "α = "}
            {specLabel(spec)}
          </output>
          <p>
            Drag its right edge to edit α. Arrow keys adjust the focused handle.
            Simple rationals snap within 6 pixels; otherwise the value is a
            rounded decimal. Dragging supports 0.0001 ≤ α ≤ 10,000.
          </p>
        </div>
      </div>
    </>
  );
}

export function DissectionExplanation({
  spec,
  stage,
  unavailable,
}: {
  spec: NumberSpec;
  stage?: DissectionStage;
  unavailable?: string;
}) {
  if (!stage || unavailable)
    return (
      <div className="dissection-explanation">
        <p>{unavailable}</p>
      </div>
    );
  const long = stage.axis === "x" ? stage.before.width : stage.before.height;
  const rest =
    stage.axis === "x" ? stage.remainder.width : stage.remainder.height;
  return (
    <div className="dissection-explanation" aria-live="polite">
      <span className="data-label">EUCLIDEAN DIVISION · a{stage.index}</span>
      <p className="division-equation">
        ({lengthLabel(long, spec)}) = {String(stage.count)} × (
        {lengthLabel(stage.side, spec)}) + ({lengthLabel(rest, spec)})
      </p>
      {stage.count === 0n ? (
        <p>
          <strong>Orientation change · no squares removed.</strong> Since 0 &lt;
          α &lt; 1, a₀ = 0. Keep the original width α and height 1; next divide
          the height by the width.
        </p>
      ) : (
        <p>
          Remove{" "}
          <strong>
            {String(stage.count)} {stage.count === 1n ? "square" : "squares"}
          </strong>
          , each with side <strong>{lengthLabel(stage.side, spec)}</strong>,
          along the {stage.axis === "x" ? "width" : "height"}.
        </p>
      )}
      <dl>
        <dt>Before this stage · width × height</dt>
        <dd>{dimensionsLabel(stage.before, spec)}</dd>
        <dt>Remaining rectangle · width × height</dt>
        <dd data-testid="remainder-dimensions">
          {dimensionsLabel(stage.remainder, spec)}
        </dd>
      </dl>
      <p className="dissection-status">
        {stage.terminal
          ? "Exact termination: the remainder is zero."
          : spec.kind === "periodic"
            ? "Infinite expansion: the remainder is never zero. Display limits do not mean mathematical termination."
            : "The remainder is nonzero. Continue with the other orientation."}
      </p>
      {spec.kind === "periodic" && (
        <p>
          Dimensions are exact expressions in α = {specLabel(spec)}. Only screen
          coordinates are approximated.
        </p>
      )}
      <p className="cf-help">
        Removed groups stay colored so you can select them. Stage colors match
        the canonical coefficients. Large or subpixel square groups are
        aggregated; the exact square count is unchanged. A rectangle stage is a
        Euclidean division, not a Ford-circle encounter.
      </p>
    </div>
  );
}
