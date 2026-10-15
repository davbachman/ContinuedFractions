import { useMemo, useState } from "react";
import {
  fromCF,
  terms,
  specLabel,
  type NumberSpec,
} from "../math/continuedFraction";
import { label } from "../math/rational";
import { heightAt } from "../math/trajectory";
import {
  INITIAL_TRIANGLE,
  triangleKey,
  flip,
  type Triangulation,
  type TriangulationState,
} from "../math/triangulation";
import {
  diskProjection,
  diskTrianglePath,
  diskDomainSectors,
  diskNeighborhood,
  diskGeodesic,
  triangleCenter,
  type DiskCamera,
} from "./fareyDisk";
import { flipColors } from "./triangulationGeometry";
import { torusDomainColor } from "./torusDomains";
import { stageColor } from "./dissectionColors";
import { rational } from "../math/rational";
const transform = "translate(190 185) scale(145)";
const short = (s: string) =>
  s.length > 20 ? s.slice(0, 8) + "…" + s.slice(-7) : s;
type Props = {
  spec: NumberSpec;
  time: number;
  lift?: number;
  tri: Triangulation;
  path: Triangulation[];
  state: TriangulationState;
  term: number;
  edgeAction: (edge: number) => string | undefined;
  selectEdge: (edge: number) => void;
};
export function FareyDisk({
  spec,
  time,
  lift = 0,
  tri,
  path,
  state,
  term,
  edgeAction,
  selectEdge,
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
    () => diskNeighborhood([follow ? tri : seed, tri], camera),
    [tri, seed, follow, camera],
  );
  const domains = useMemo(
    () =>
      neighborhood.triangles.flatMap((t) => diskDomainSectors(t, camera, lift)),
    [neighborhood, camera, lift],
  );
  const neighbors = tri.map((_, i) => flip(tri, i));
  const endpoint = projection.vertex(target);
  const point = moving ? projection.point(moving) : null;
  const freeze = () => {
    setFixed(camera);
    setSeed(tri);
    setFollow(false);
  };
  return (
    <>
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
      <svg
        viewBox="0 0 380 370"
        role="group"
        aria-label="Interactive Farey triangles"
        data-slopes={triangleKey(tri)}
        data-time={time}
        data-follow-point={follow}
        data-domain-lift={lift}
      >
        <circle cx={190} cy={185} r={145} fill="#fbfbf6" stroke="#b5c3aa" />
        <g
          transform={transform}
          pointerEvents="none"
          fillOpacity={0.26}
          data-disk-domains="true"
        >
          {domains.map((s, i) => (
            <path
              key={i}
              d={s.d}
              fill={torusDomainColor(s.sheet)}
              data-domain-sheet={s.sheet}
            />
          ))}
        </g>
        <g
          transform={transform}
          fill="none"
          stroke="#82927a"
          strokeWidth={0.6}
          pointerEvents="none"
        >
          {neighborhood.triangles.map((t) => (
            <path
              key={triangleKey(t)}
              d={diskTrianglePath(t, camera)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        {neighbors.map((t, i) => (
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
            stroke={flipColors[i]}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          data-current-farey-triangle="true"
          d={diskTrianglePath(tri, camera)}
          transform={transform}
          fill="none"
          stroke="#425b48"
          strokeWidth={2.2}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
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
        {moving && (
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
        {tri.map((r, i) => {
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
        {neighbors.map((t, i) => {
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
        {point && (
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
      <p className="flip-diagram-caption">
        Poincaré disk · the orange point is the moving H² point. Domain fills
        match H² (cover lift {lift}); the current Farey triangle is outlined.
        Colored path segments group flips by coefficient; dashed segments are
        ahead.
      </p>
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
