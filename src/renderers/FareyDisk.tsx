import type { DomainFocus } from "./domainFocus";
import type { SelectedRun } from "./selectedRun";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  fromCF,
  convergents,
  terms,
  specLabel,
  type NumberSpec,
} from "../math/continuedFraction";
import { label, value } from "../math/rational";
import { heightAt } from "../math/trajectory";
import { fareyCrossings, type Crossing } from "../math/farey";
import {
  INITIAL_TRIANGLE,
  triangleKey,
  flip,
  type Triangulation,
  type TriangulationState,
} from "../math/triangulation";
import {
  diskProjection,
  diskFordCircle,
  diskWorldPoint,
  diskCameraTriangle,
  diskTrianglePath,
  diskNeighborhood,
  diskGeodesic,
  triangleCenter,
  type DiskCamera,
} from "./fareyDisk";
import { flipColors } from "./triangulationGeometry";
import {
  fareyTriangleColor,
  fareyTriangleId,
  FAREY_FILL_OPACITY,
  fareyEdgeStyle,
  fareyEdgeId,
} from "./fareyColors";
import { stageColor } from "./dissectionColors";
import { rational } from "../math/rational";
import { endpointAtPointer, zoomFromVerticalDrag } from "./camera";
import type { Overlays } from "../state";
import { diskDomains } from "./diskDomains";
import { domainEdgeColor } from "./domainEdges";
import { torusDomainColor } from "./torusDomains";
import type { Rational } from "../math/rational";
export type DiskOptions = {
  crossings?: readonly Crossing[];
  domainFocus?: DomainFocus;
  inspection?: { rational: Rational; label: string; color: string };
  selectedRun?: SelectedRun;
  selectedEdge?: number;
  overlays?: Overlays;
  showFlipPath?: boolean;
  showCurrentTriangle?: boolean;
  torusLift?: number;
  onInspect?: (r: Rational) => void;
  onEndpointStart?: () => void;
  onEndpointMove?: (r: Rational) => void;
  onEndpointEnd?: (cancelled: boolean) => void;
};
const defaultOverlays: Overlays = {
  farey: true,
  ford: true,
  modular: false,
  labels: true,
  trajectory: true,
  convergents: true,
  dual: true,
};
const transform = "translate(190 185) scale(145)";
const short = (s: string) =>
  s.length > 20 ? s.slice(0, 8) + "…" + s.slice(-7) : s;
type Props = DiskOptions & {
  spec: NumberSpec;
  time: number;
  tri: Triangulation;
  path: Triangulation[];
  state: TriangulationState;
  term: number;
  edgeAction: (edge: number) => string | undefined;
  selectEdge: (edge: number) => void;
};
export function FareyDisk({
  crossings,
  domainFocus,
  inspection,
  selectedRun,
  selectedEdge,
  spec,
  time,
  tri,
  path,
  state,
  term,
  edgeAction,
  selectEdge,
  overlays = defaultOverlays,
  showFlipPath = false,
  showCurrentTriangle = false,
  torusLift,
  onInspect,
  onEndpointStart,
  onEndpointMove,
  onEndpointEnd,
}: Props) {
  const target = useMemo(
    () => (spec.kind === "rational" ? spec.value : fromCF(terms(spec, 128))),
    [spec],
  );
  const [follow, setFollow] = useState(true);
  const [fixed, setFixed] = useState<DiskCamera>({ x: rational(0n), y: 1 });
  const [seed, setSeed] = useState<Triangulation>(INITIAL_TRIANGLE);
  const moving = useMemo(
    () => (target.q ? { x: target, y: heightAt(time) } : null),
    [target, time],
  );
  const camera = follow && moving ? moving : fixed;
  const projection = useMemo(() => diskProjection(camera), [camera]);
  const neighborhood = useMemo(
    () =>
      diskNeighborhood(
        [follow ? tri : diskCameraTriangle(camera), seed, tri],
        camera,
      ),
    [tri, seed, follow, camera],
  );
  const neighbors = tri.map((_, i) => flip(tri, i));
  const fareyEdges = useMemo(() => {
    const edges = new Map<string, [Rational, Rational]>();
    for (const triangle of neighborhood.triangles)
      triangle.forEach((a, i) => {
        const b = triangle[(i + 1) % 3];
        edges.set(fareyEdgeId(a, b), [a, b]);
      });
    return [...edges];
  }, [neighborhood]);
  const selectedCrossings = useMemo(
    () =>
      (crossings ?? fareyCrossings(spec, state.horizon).crossings).filter(
        (crossing) => crossing.term === term,
      ),
    [crossings, spec, state.horizon, term],
  );
  const edgePath = (a: Rational, b: Rational) => {
    const from = projection.vertex(a),
      to = projection.vertex(b);
    return `M${from.x} ${from.y}` + diskGeodesic(from, to);
  };
  const circles = useMemo(() => {
    const vertices = new Map<string, Rational>();
    neighborhood.triangles.flat().forEach((r) => vertices.set(label(r), r));
    (spec.kind === "rational" && !spec.value.q
      ? []
      : convergents(terms(spec, 30))
    ).forEach((r) => vertices.set(label(r), r));
    return [...vertices.values()]
      .map((r) => ({ r, ...diskFordCircle(r, camera) }))
      .filter((c) => c.radius > 0.006);
  }, [neighborhood, spec, camera]);
  const domains = useMemo(
    () =>
      overlays.modular || torusLift !== undefined || domainFocus !== undefined
        ? neighborhood.triangles.flatMap((t) =>
            diskDomains(t, camera, torusLift),
          )
        : [],
    [neighborhood, camera, overlays.modular, torusLift, domainFocus],
  );
  const endpoint = projection.vertex(target);
  const point = moving ? projection.point(moving) : null;
  const trailStart = moving
    ? projection.point({ x: target, y: heightAt(0) })
    : null;
  const freeze = () => {
    setFixed(camera);
    setSeed(tri);
    setFollow(false);
  };
  const svg = useRef<SVGSVGElement>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const drag = useRef<{
    x: number;
    y: number;
    camera: DiskCamera;
    endpoint: boolean;
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const zooming = useRef(false);
  const moveCamera = (next: DiskCamera) => {
    setFixed(next);
    setSeed(tri);
    setFollow(false);
  };
  const zoomCamera = (factor: number) => {
    const c = cameraRef.current;
    moveCamera({ ...c, y: Math.max(1e-12, Math.min(1e6, c.y / factor)) });
  };
  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomCamera(Math.exp(-e.deltaY / 200));
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [tri]);
  const pointerPosition = (
    node: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) => {
    const p = node.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    return p.matrixTransform(node.getScreenCTM()!.inverse());
  };
  const release = (id: number, cancelled: boolean) => {
    pointers.current.delete(id);
    if (drag.current?.endpoint) onEndpointEnd?.(cancelled);
    drag.current = null;
    if (!pointers.current.size) zooming.current = false;
  };
  return (
    <>
      <svg
        ref={svg}
        className="interactive-disk"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const { x, y } = pointerPosition(
            e.currentTarget,
            e.clientX,
            e.clientY,
          );
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          // Preserve a stationary click on a Ford circle / neighboring triangle.
          // A real drag captures the pointer below, so it pans instead of selecting.
          if (!(e.target as Element).closest('[role="button"]'))
            e.currentTarget.setPointerCapture(e.pointerId);
          if (pointers.current.size > 1) {
            if (drag.current?.endpoint) onEndpointEnd?.(false);
            drag.current = null;
            zooming.current = true;
            return;
          }
          const editing =
            !!onEndpointMove &&
            Math.hypot(x - 190 - 145 * endpoint.x, y - 185 - 145 * endpoint.y) <
              18;
          drag.current = { x, y, camera, endpoint: editing };
          if (editing) {
            freeze();
            onEndpointStart?.();
          }
        }}
        onPointerMove={(e) => {
          const old = pointers.current.get(e.pointerId);
          if (!old) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (zooming.current) {
            e.currentTarget.setPointerCapture(e.pointerId);
            if (pointers.current.size > 1)
              zoomCamera(zoomFromVerticalDrag(1, (e.clientY - old.y) / 2));
            return;
          }
          const d = drag.current;
          if (!d) return;
          const { x, y } = pointerPosition(
            e.currentTarget,
            e.clientX,
            e.clientY,
          );
          if (Math.hypot(x - d.x, y - d.y) < 3) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (d.endpoint) {
            const angle = Math.atan2(y - 185, x - 190),
              a = { x: Math.cos(angle), y: Math.sin(angle) };
            if (Math.abs(1 - a.x) < 1e-7) return;
            const r = diskWorldPoint(d.camera, a).x;
            const dx = value(r) - value(d.camera.x);
            const pixelsPerUnit =
              (e.currentTarget.getScreenCTM()!.a * 290 * d.camera.y) /
              (dx * dx + d.camera.y * d.camera.y);
            onEndpointMove?.(
              endpointAtPointer(value(r), Math.max(1e-9, pixelsPerUnit)),
            );
          } else {
            const dx = (d.x - x) / 145,
              dy = (d.y - y) / 145,
              size = Math.hypot(dx, dy),
              k = size > 0.8 ? 0.8 / size : 1;
            moveCamera(diskWorldPoint(d.camera, { x: dx * k, y: dy * k }));
          }
        }}
        onPointerUp={(e) => release(e.pointerId, false)}
        onPointerCancel={(e) => release(e.pointerId, true)}
        onLostPointerCapture={(e) => release(e.pointerId, true)}
        viewBox="0 0 380 370"
        role="group"
        aria-label="Poincare Disk"
        data-slopes={triangleKey(tri)}
        data-time={time}
        data-flip-cursor={state.cursor}
        data-follow-point={follow}
        data-camera-height={camera.y}
        data-triangle-color={fareyTriangleColor(tri)}
      >
        <circle cx={190} cy={185} r={145} fill="#fbfbf6" stroke="#b5c3aa" />
        {overlays.farey && torusLift === undefined && (
          <g
            transform={transform}
            pointerEvents="none"
            fillOpacity={FAREY_FILL_OPACITY}
            data-farey-fills="true"
          >
            {neighborhood.triangles.map((t) => (
              <path
                key={fareyTriangleId(t)}
                d={diskTrianglePath(t, camera)}
                fill={fareyTriangleColor(t)}
                data-farey-triangle={fareyTriangleId(t)}
              />
            ))}
          </g>
        )}
        {overlays.farey && (
          <g
            data-disk-farey="true"
            transform={transform}
            fill="none"
            stroke={fareyEdgeStyle.color}
            strokeWidth={fareyEdgeStyle.width}
            pointerEvents="none"
          >
            {fareyEdges.map(([id, [a, b]]) => (
              <path
                key={id}
                data-farey-edge={id}
                d={edgePath(a, b)}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )}
        {torusLift !== undefined && (
          <g
            transform={transform}
            pointerEvents="none"
            data-disk-domains="true"
          >
            {domains.map((d, i) => (
              <path
                key={i}
                d={d.fill}
                fill={torusDomainColor(d.sheet)}
                fillOpacity="0.22"
              />
            ))}
          </g>
        )}
        {domainFocus && (
          <g
            data-current-domain={domainFocus.key}
            data-seam={domainFocus.seam}
            transform={transform}
            fill="none"
            pointerEvents="none"
          >
            {domains
              .filter((d) => d.key === domainFocus.key)
              .map((d, i) => (
                <g key={i}>
                  {(
                    [
                      ["S", d.s],
                      ["T", d.t],
                    ] as const
                  ).map(
                    ([side, path]) =>
                      path && (
                        <path
                          key={side}
                          d={path}
                          stroke={
                            domainFocus.seam === side
                              ? domainEdgeColor[side]
                              : "#344d43"
                          }
                          strokeWidth={domainFocus.seam === side ? 5 : 2.5}
                          vectorEffect="non-scaling-stroke"
                        />
                      ),
                  )}
                </g>
              ))}
          </g>
        )}
        {overlays.modular && (
          <g
            transform={transform}
            pointerEvents="none"
            fill="none"
            data-disk-modular="true"
          >
            {domains.flatMap((d, i) =>
              (
                [
                  ["S", d.s],
                  ["T", d.t],
                ] as const
              ).map(
                ([side, path]) =>
                  path && (
                    <path
                      key={`${i}${side}`}
                      d={path}
                      stroke={domainEdgeColor[side]}
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                    />
                  ),
              ),
            )}
          </g>
        )}
        {overlays.ford && (
          <g data-disk-ford="true">
            {circles.map((c) => (
              <g key={label(c.r)}>
                <circle
                  cx={190 + 145 * c.x}
                  cy={185 + 145 * c.y}
                  r={145 * c.radius}
                  fill="#b7caba24"
                  stroke="#7b9b8270"
                  role="button"
                  tabIndex={c.radius > 0.025 ? 0 : undefined}
                  aria-label={`Inspect Ford circle ${label(c.r)}`}
                  onClick={() => onInspect?.(c.r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onInspect?.(c.r);
                    }
                  }}
                />
                {overlays.labels && c.radius > 0.09 && (
                  <text
                    x={190 + 145 * c.x}
                    y={189 + 145 * c.y}
                    fontSize="10"
                    textAnchor="middle"
                    fill="#56785f"
                    pointerEvents="none"
                  >
                    {short(label(c.r))}
                  </text>
                )}
              </g>
            ))}
          </g>
        )}
        {showFlipPath &&
          neighbors.map((t, i) => (
            <path
              key={i}
              role={edgeAction(i) ? "button" : "img"}
              tabIndex={edgeAction(i) ? 0 : undefined}
              aria-label={
                edgeAction(i)
                  ? `${edgeAction(i)} path step via Farey triangle replacing ${label(tri[i])} with ${label(t[i])}`
                  : `Neighboring Farey triangle ${triangleKey(t)}`
              }
              onClick={() => selectEdge(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectEdge(i);
                }
              }}
              d={diskTrianglePath(t, camera)}
              transform={transform}
              fill="transparent"
              stroke={flipColors[i] + "80"}
              strokeWidth={fareyEdgeStyle.neighborWidth}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        <path
          data-current-farey-triangle="true"
          d={diskTrianglePath(tri, camera)}
          transform={transform}
          fill="none"
          stroke={
            showFlipPath || (showCurrentTriangle && overlays.farey)
              ? fareyEdgeStyle.currentColor
              : "none"
          }
          strokeWidth={showFlipPath ? 0.5 : fareyEdgeStyle.currentWidth}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
        {overlays.farey && !showFlipPath && (
          <g
            data-farey-run={term}
            transform={transform}
            fill="none"
            stroke={stageColor(term)}
            strokeWidth={fareyEdgeStyle.selectedWidth}
            pointerEvents="none"
          >
            {selectedCrossings.map((crossing) => (
              <path
                key={crossing.id}
                data-highlighted-farey-edge={fareyEdgeId(
                  crossing.left,
                  crossing.right,
                )}
                d={edgePath(crossing.left, crossing.right)}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )}
        {showFlipPath &&
          tri.map((r, i) => {
            const a = projection.vertex(tri[(i + 1) % 3]),
              b = projection.vertex(tri[(i + 2) % 3]);
            return (
              <path
                key={i}
                data-disk-edge={i}
                d={`M${a.x} ${a.y}` + diskGeodesic(a, b)}
                transform={transform}
                fill="none"
                stroke={flipColors[i]}
                strokeWidth={selectedEdge === i ? 4 : 2}
                vectorEffect="non-scaling-stroke"
              >
                <title>Cross this side to replace slope {label(r)}</title>
              </path>
            );
          })}
        {showFlipPath && overlays.dual && (
          <g
            data-dual-flip-path="true"
            pointerEvents="none"
            transform={transform}
          >
            {state.steps.map((step, i) => {
              const a = projection.center(path[i]),
                b = projection.center(path[i + 1]);
              return (
                <path
                  key={i}
                  data-run-term={step.term}
                  data-selected-run={step.term === term ? term : undefined}
                  d={`M${a.x} ${a.y}` + diskGeodesic(a, b)}
                  fill="none"
                  stroke={stageColor(step.term ?? 0)}
                  strokeWidth={step.term === term ? 4 : 1.6}
                  opacity={i < state.cursor ? 1 : 0.35}
                  strokeDasharray={i < state.cursor ? undefined : "3 3"}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
        )}
        {moving && overlays.trajectory && (
          <path
            data-disk-trajectory="true"
            d={
              `M${endpoint.x} ${endpoint.y}` +
              diskGeodesic(endpoint, { x: 1, y: 0 })
            }
            transform={transform}
            fill="none"
            stroke="#c7744d"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.65}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
        {trailStart && point && time > 0 && overlays.trajectory && (
          <path
            data-disk-trail="true"
            d={
              `M${trailStart.x} ${trailStart.y}` +
              diskGeodesic(trailStart, point)
            }
            transform={transform}
            fill="none"
            stroke="#c7744d"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
        {selectedRun?.segments.length && moving && overlays.trajectory
          ? (() => {
              const a = projection.point({
                x: target,
                y: heightAt(selectedRun.segments[0].start),
              });
              const b = projection.point({
                x: target,
                y: heightAt(selectedRun.segments.at(-1)!.end),
              });
              return (
                <g data-trajectory-run={selectedRun.term}>
                  <path
                    d={`M${a.x} ${a.y}` + diskGeodesic(a, b)}
                    transform={transform}
                    fill="none"
                    stroke="#fffdf7"
                    strokeWidth={8}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                  <path
                    d={`M${a.x} ${a.y}` + diskGeodesic(a, b)}
                    transform={transform}
                    fill="none"
                    stroke={selectedRun.color}
                    strokeWidth={5}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  >
                    <title>Selected run a{selectedRun.term}</title>
                  </path>
                  {[a, b].map((p, i) => (
                    <circle
                      key={i}
                      cx={190 + 145 * p.x}
                      cy={185 + 145 * p.y}
                      r={3}
                      fill="#fffdf7"
                      stroke={selectedRun.color}
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  ))}
                  <text
                    x={190 + 145 * a.x + 6}
                    y={185 + 145 * a.y - 5}
                    fill={selectedRun.color}
                    fontSize={10}
                    stroke="#fbfbf6"
                    strokeWidth={2}
                    paintOrder="stroke"
                  >
                    a{selectedRun.term}
                  </text>
                </g>
              );
            })()
          : null}
        {inspection &&
          (overlays.convergents || overlays.ford) &&
          (() => {
            const r = inspection.rational,
              p = projection.vertex(r),
              c = diskFordCircle(r, camera);
            return (
              <g
                data-inspected-rational={label(r)}
                stroke={inspection.color}
                pointerEvents="none"
              >
                {overlays.ford && (
                  <circle
                    cx={190 + 145 * c.x}
                    cy={185 + 145 * c.y}
                    r={145 * c.radius}
                    fill="none"
                    strokeWidth={3}
                  />
                )}
                <circle
                  cx={190 + 145 * p.x}
                  cy={185 + 145 * p.y}
                  r={6}
                  fill="#fbfbf6"
                  strokeWidth={3}
                />
                <text
                  x={190 + 116 * p.x}
                  y={185 + 116 * p.y}
                  fill={inspection.color}
                  stroke="none"
                  textAnchor="middle"
                  fontSize={10}
                >
                  {inspection.label} = {short(label(r))}
                </text>
              </g>
            );
          })()}
        <g data-target-marker="true" pointerEvents="none">
          <circle
            cx={190 + 145 * endpoint.x}
            cy={185 + 145 * endpoint.y}
            r={7}
            fill="#fbfbf6"
            stroke="#385c43"
            strokeWidth={2}
          />
          <text
            x={190 + 126 * endpoint.x}
            y={185 + 126 * endpoint.y}
            textAnchor="middle"
            fontSize={11}
            fill="#385c43"
          >
            α
          </text>
          <title>
            Target α = {specLabel(spec)}
            {spec.kind === "periodic"
              ? " (boundary position approximated)"
              : ""}
          </title>
        </g>
        {showFlipPath &&
          tri.map((r, i) => {
            const a = projection.vertex(r);
            return (
              <g key={i} pointerEvents="none">
                <circle
                  cx={190 + 145 * a.x}
                  cy={185 + 145 * a.y}
                  r={5}
                  fill={flipColors[i]}
                />
                <text
                  x={190 + 164 * a.x}
                  y={190 + 164 * a.y}
                  textAnchor="middle"
                  fill={flipColors[i]}
                  fontSize={13}
                >
                  {short(label(r))}
                  <title>{label(r)}</title>
                </text>
              </g>
            );
          })}
        {showFlipPath &&
          neighbors.map((t, i) => {
            const a = projection.vertex(t[i]);
            return (
              <text
                key={i}
                x={190 + 163 * a.x}
                y={190 + 163 * a.y}
                textAnchor="middle"
                fill={flipColors[i]}
                fontSize={11}
              >
                {short(label(t[i]))}
                <title>{label(t[i])}</title>
              </text>
            );
          })}
        {overlays.convergents && (
          <g data-disk-convergents="true">
            {(spec.kind === "rational" && !spec.value.q
              ? []
              : convergents(terms(spec, 12))
            ).map((r, i) => {
              const a = projection.vertex(r);
              return (
                <circle
                  key={i}
                  cx={190 + 145 * a.x}
                  cy={185 + 145 * a.y}
                  r="2.5"
                  fill="#285d51"
                >
                  <title>Convergent {label(r)}</title>
                </circle>
              );
            })}
          </g>
        )}
        {point && overlays.trajectory && (
          <circle
            data-moving-disk-point="true"
            cx={190 + 145 * point.x}
            cy={185 + 145 * point.y}
            r={5}
            fill="#c57548"
            stroke="#fffaf0"
            strokeWidth={2}
            pointerEvents="none"
          >
            <title>Same moving H² point · t = {time.toFixed(3)}</title>
          </circle>
        )}
      </svg>
      <div className="tangle-controls farey-camera-controls">
        <label>
          <input
            type="checkbox"
            checked={follow}
            disabled={!moving}
            onChange={(e) => (e.target.checked ? setFollow(true) : freeze())}
          />
          Keep moving point centered
        </label>
        <button aria-label="Zoom in" onClick={() => zoomCamera(1.5)}>
          +
        </button>
        <button aria-label="Zoom out" onClick={() => zoomCamera(1 / 1.5)}>
          −
        </button>
        <button
          aria-label="Pan left"
          onClick={() => moveCamera(diskWorldPoint(camera, { x: -0.2, y: 0 }))}
        >
          ←
        </button>
        <button
          aria-label="Pan right"
          onClick={() => moveCamera(diskWorldPoint(camera, { x: 0.2, y: 0 }))}
        >
          →
        </button>
        <button
          onClick={() => {
            setFixed(triangleCenter(tri));
            setSeed(tri);
            setFollow(false);
          }}
        >
          Center Farey triangle
        </button>
        <button
          onClick={() => {
            setFixed({ x: rational(0n), y: 1 });
            setSeed(INITIAL_TRIANGLE);
            setFollow(false);
          }}
        >
          Reset Farey camera
        </button>
      </div>

      <details className="workspace-details">
        <summary>Camera & diagram guide</summary>
        <p>
          Drag to pan; drag α to edit. Wheel or two-finger vertical drag zooms.
          The orange point shares H² time.
        </p>
        {showFlipPath && (
          <p>
            Crossing a colored side replaces the slope of that color. Dashed
            path segments are future flips.
          </p>
        )}
      </details>
      {!moving && (
        <p className="topology-note">
          ∞ has no finite vertical H² ray. The disk shows the triangulation
          without a moving point.
        </p>
      )}
      {neighborhood.limited && (
        <p className="topology-note">
          Boundary detail is capped at 180 triangles; the exact itinerary is
          unchanged.
        </p>
      )}
    </>
  );
}
