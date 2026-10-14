import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, LocateFixed, Move } from "lucide-react";
import { type Scene } from "../state";
import { approximate, convergents, terms } from "../math/continuedFraction";
import { visibleFarey, type Crossing } from "../math/farey";
import { rational, label, value, type Rational, snap } from "../math/rational";
import { apply, modularTiles } from "../math/modular";
import { cameraScale, endpointAtPointer } from "./camera";
import { heightAt } from "../math/trajectory";
type Props = {
  scene: Scene;
  crossings: readonly Crossing[];
  selectedTerm: number;
  onInspect: (r: Rational) => void;
  onEndpointStart: () => void;
  onEndpointMove: (r: Rational) => void;
  onEndpointEnd: (cancelled: boolean) => void;
};
const tiles = modularTiles(4);
export function HalfPlane({
  scene,
  crossings,
  selectedTerm,
  onInspect,
  onEndpointStart,
  onEndpointMove,
  onEndpointEnd,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [size, setSize] = useState({ width: 800, height: 430 }),
    [zoom, setZoom] = useState(1),
    [baseCenter, setBaseCenter] = useState(() => approximate(scene.spec)),
    [anchorTime, setAnchorTime] = useState(scene.time);
  const targets = useRef<
      { x: number; y: number; radius: number; r: Rational }[]
    >([]),
    drag = useRef<{
      x: number;
      y: number;
      center: number;
      scale: number;
      endpoint: boolean;
      lastX: number;
    } | null>(null);
  const alpha = approximate(scene.spec),
    y = heightAt(scene.time),
    scale = cameraScale(size.height, zoom, scene.time, scene.follow, alpha),
    anchorScale = cameraScale(
      size.height,
      zoom,
      anchorTime,
      scene.follow,
      alpha,
    ),
    center = alpha + ((baseCenter - alpha) * anchorScale) / scale,
    bottom = size.height - 32;
  const toWorld = (x: number) => center + (x - size.width / 2) / scale;
  useEffect(() => {
    if (drag.current?.endpoint) return;
    setBaseCenter(approximate(scene.spec));
    setAnchorTime(scene.time);
    setZoom(1);
  }, [scene.spec]);
  useEffect(() => {
    const parent = canvas.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(
      ([entry]) =>
        entry.contentRect.width > 0 &&
        entry.contentRect.height > 60 &&
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        }),
    );
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = canvas.current;
    if (!node || size.width < 1 || size.height < 60) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    node.width = size.width * dpr;
    node.height = size.height * dpr;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.width, size.height);
    targets.current = [];
    const X = (x: number) => size.width / 2 + (x - center) * scale,
      Y = (y: number) => bottom - y * scale,
      min = toWorld(0),
      max = toWorld(size.width);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e7e9e1";
    const gridStep = Math.pow(10, Math.floor(Math.log10(80 / scale)));
    for (let x = Math.ceil(min / gridStep) * gridStep; x < max; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(X(x), 0);
      ctx.lineTo(X(x), bottom);
      ctx.stroke();
    }
    for (let h = gridStep; h < bottom / scale; h += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, Y(h));
      ctx.lineTo(size.width, Y(h));
      ctx.stroke();
    }
    const edge = (l: number, r: number, color: string, width = 1) => {
      const radius = ((r - l) * scale) / 2,
        cx = X((l + r) / 2);
      ctx.beginPath();
      ctx.arc(cx, bottom, radius, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    const geometry = visibleFarey(min, max, scale);
    if (scene.overlays.ford) {
      const rationals = new Map<string, Rational>();
      geometry.forEach((e) => {
        rationals.set(label(e.left), e.left);
        rationals.set(label(e.right), e.right);
      });
      convergents(terms(scene.spec, 30)).forEach((r) =>
        rationals.set(label(r), r),
      );
      for (const r of rationals.values()) {
        const v = value(r),
          radius = scale / (2 * Number(r.q) ** 2);
        if (radius < 2 || v < min - 1 || v > max + 1) continue;
        const cx = X(v),
          cy = Y(radius / scale);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#b7caba24";
        ctx.fill();
        ctx.strokeStyle = "#7b9b8270";
        ctx.lineWidth = 1;
        ctx.stroke();
        targets.current.push({ x: cx, y: cy, radius, r });
        if (scene.overlays.labels && radius > 15) {
          ctx.fillStyle = "#56785f";
          ctx.font = "11px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(label(r), cx, cy + 4);
        }
      }
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#7b9b8280";
      ctx.beginPath();
      ctx.moveTo(0, Y(1));
      ctx.lineTo(size.width, Y(1));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (scene.overlays.farey) {
      for (const e of geometry)
        edge(value(e.left), value(e.right), "#879a9165");
      ctx.strokeStyle = "#879a9165";
      for (let n = Math.ceil(min); n <= max; n++) {
        ctx.beginPath();
        ctx.moveTo(X(n), 0);
        ctx.lineTo(X(n), bottom);
        ctx.stroke();
      }
    }
    if (scene.overlays.modular) {
      ctx.strokeStyle = "#a597b77a";
      ctx.lineWidth = 1;
      for (const m of tiles) {
        for (let side = 0; side < 3; side++) {
          ctx.beginPath();
          let active = false;
          for (let i = 0; i <= 90; i++) {
            const t = i / 90;
            const z =
              side < 2
                ? {
                    x: side ? 0.5 : -0.5,
                    y: (Math.sqrt(3) / 2) * Math.exp(t * 6),
                  }
                : {
                    x: Math.cos(Math.PI / 3 + (t * Math.PI) / 3),
                    y: Math.sin(Math.PI / 3 + (t * Math.PI) / 3),
                  };
            const p = apply(m, z),
              px = X(p.x),
              py = Y(p.y);
            if (
              Math.abs(px) > size.width * 5 ||
              Math.abs(py) > size.height * 5
            ) {
              active = false;
              continue;
            }
            if (active) ctx.lineTo(px, py);
            else {
              ctx.moveTo(px, py);
              active = true;
            }
          }
          ctx.stroke();
        }
      }
    }
    for (const e of crossings.filter((e) => e.term === selectedTerm))
      edge(value(e.left), value(e.right), "#cf7448", 2.5);
    if (scene.overlays.dual) {
      ctx.beginPath();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "#b88845";
      for (let i = 0; i < crossings.length; i++) {
        const e = crossings[i],
          cx = X((value(e.left) + value(e.right)) / 2),
          cy = Y((value(e.right) - value(e.left)) / 3);
        if (i) ctx.lineTo(cx, cy);
        else ctx.moveTo(cx, cy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (scene.overlays.trajectory) {
      const x = X(alpha);
      ctx.strokeStyle = "#ce734957";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#c7744d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, Y(2));
      ctx.lineTo(x, Y(y));
      ctx.stroke();
      for (const e of crossings) {
        if (e.time > scene.time) continue;
        ctx.beginPath();
        ctx.arc(x, Y(e.height), 3, 0, Math.PI * 2);
        ctx.fillStyle = "#c7744d";
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, Y(y), 12, 0, Math.PI * 2);
      ctx.fillStyle = "#d27c4a20";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, Y(y), 5, 0, Math.PI * 2);
      ctx.fillStyle = "#c57548";
      ctx.fill();
      ctx.strokeStyle = "#fffdf7";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const endpointX = X(alpha);
    ctx.beginPath();
    ctx.arc(endpointX, bottom, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#fbfbf6";
    ctx.fill();
    ctx.strokeStyle = "#bc6944";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "bold 16px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#a34f2c";
    ctx.fillText("α", endpointX, bottom - 14);
    ctx.strokeStyle = "#c7cdc2";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, bottom);
    ctx.lineTo(size.width, bottom);
    ctx.stroke();
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = "#788077";
    ctx.textAlign = "center";
    const tickStep = Math.max(
      gridStep,
      Math.pow(10, Math.ceil(Math.log10(55 / scale))) / 2,
    );
    for (
      let x = Math.ceil(min / tickStep) * tickStep;
      x <= max;
      x += tickStep
    ) {
      ctx.fillText(
        x.toFixed(Math.max(0, -Math.floor(Math.log10(tickStep)))),
        X(x),
        bottom + 19,
      );
    }
    if (scene.overlays.convergents) {
      for (const r of convergents(terms(scene.spec, 12))) {
        const x = X(value(r));
        if (x < 0 || x > size.width) continue;
        ctx.beginPath();
        ctx.arc(x, bottom, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#285d51";
        ctx.fill();
      }
    }
  }, [
    scene,
    size,
    zoom,
    crossings,
    selectedTerm,
    scale,
    center,
    bottom,
    alpha,
    y,
  ]);
  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvas}
        data-scale={scale}
        data-point-y={bottom - y * scale}
        data-alpha-x={size.width / 2 + (alpha - center) * scale}
        aria-label={`Upper half-plane. Vertical geodesic at ${label(scene.spec.kind === "rational" ? scene.spec.value : snap(alpha, 100))}; height ${y.toPrecision(4)}. Use the labeled controls and rational inspector for keyboard access.`}
        role="img"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left,
            py = e.clientY - rect.top;
          setBaseCenter(center);
          setAnchorTime(scene.time);
          drag.current = {
            x,
            y: py,
            center,
            scale,
            endpoint:
              Math.abs(x - (size.width / 2 + (alpha - center) * scale)) < 18 &&
              Math.abs(py - bottom) < 25,
            lastX: x,
          };
          if (drag.current.endpoint) onEndpointStart();
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
          drag.current.lastX = x;
          const d = drag.current;
          if (d.endpoint) {
            const world =
              d.center +
              (Math.max(0, Math.min(size.width, x)) - size.width / 2) / d.scale;
            onEndpointMove(endpointAtPointer(world, d.scale));
          } else setBaseCenter(d.center - (x - d.x) / d.scale);
        }}
        onPointerCancel={() => {
          if (drag.current?.endpoint) onEndpointEnd(true);
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          if (drag.current?.endpoint) onEndpointEnd(true);
          drag.current = null;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (!d) return;
          if (d.endpoint) onEndpointEnd(false);
          else if (Math.abs(d.lastX - d.x) < 4) {
            const target = targets.current
              .filter(
                (t) =>
                  Math.hypot(t.x - d.x, t.y - d.y) <= Math.max(t.radius, 8),
              )
              .sort((a, b) => a.radius - b.radius)[0];
            if (target) onInspect(target.r);
          }
          drag.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      />
      <div className="plot-coordinate">
        ℍ² <span>z = α + iy</span>
      </div>
      <div className="plot-tools">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(z * 1.5, 10000))}
        >
          <ZoomIn size={16} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(z / 1.5, 0.4))}
        >
          <ZoomOut size={16} />
        </button>
        <button
          aria-label="Reset camera"
          onClick={() => {
            setZoom(1);
            setBaseCenter(alpha);
            setAnchorTime(scene.time);
          }}
        >
          <LocateFixed size={16} />
        </button>
        <button
          aria-label="Pan left"
          onClick={() => {
            setBaseCenter(center - 100 / scale);
            setAnchorTime(scene.time);
          }}
        >
          ←
        </button>
        <button
          aria-label="Pan right"
          onClick={() => {
            setBaseCenter(center + 100 / scale);
            setAnchorTime(scene.time);
          }}
        >
          →
        </button>
      </div>
      <div className="plot-hint">
        <Move size={12} /> Drag to pan · drag α to move (snap q ≤ 64 within 6
        px)
      </div>
      <span className="boundary-label">ideal boundary · y = 0</span>
    </div>
  );
}
