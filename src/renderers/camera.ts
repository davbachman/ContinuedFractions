import { parseRational, snap, value } from "../math/rational";

// y(t) = 2 exp(-t), so y(t) * zoom(t) = 2 exp(-0.08t).
// A fixed camera would lose the point to the boundary much faster.
export const AUTO_ZOOM_RATE = 0.92;
export const automaticZoom = (time: number) => Math.exp(AUTO_ZOOM_RATE * time);
export function cameraScale(
  height: number,
  zoom: number,
  time: number,
  automatic: boolean,
  center: number,
) {
  const requested =
    ((height - 52) / 2.25) * zoom * (automatic ? automaticZoom(time) : 1);
  // Keep adjacent screen pixels distinguishable even at large endpoint values.
  const precisionLimit =
    1 / (64 * Number.EPSILON * Math.max(1, Math.abs(center)));
  return Math.min(requested, precisionLimit);
}
export function endpointAtPointer(x: number, scale: number) {
  const bounded = Math.max(-10000, Math.min(10000, x));
  const simple = snap(bounded, 64);
  if (Math.abs(value(simple) - bounded) * scale <= 6) return simple;
  // An explicitly rounded decimal rational, never an inferred exact irrational.
  const digits = Math.min(15, Math.max(0, Math.ceil(Math.log10(scale)) + 1));
  return parseRational(bounded.toFixed(digits));
}

// 200 vertical pixels change scale by e. Shared by touch and trackpad input.
export function zoomFromVerticalDrag(zoom: number, deltaY: number) {
  return Math.max(0.4, Math.min(10000, zoom * Math.exp(-deltaY / 200)));
}
