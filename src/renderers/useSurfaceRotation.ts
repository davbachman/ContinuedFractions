import { useRef, useState, type SVGProps } from "react";

export const rotationHint =
  "Drag left or right to rotate. Arrow keys rotate; Home resets.";

/** Camera-only gesture, shared by all schematic 3D displays. */
export function useSurfaceRotation(
  rotation: number,
  setRotation: (angle: number) => void,
  enabled: boolean,
  initial: number,
): SVGProps<SVGSVGElement> & { "data-rotation"?: number } {
  const gesture = useRef<{
    id: number;
    x: number;
    angle: number;
    width: number;
  } | null>(null);
  const dragged = useRef(false);
  const [dragging, setDragging] = useState(false);
  if (!enabled) return {};
  const normalize = (angle: number) =>
    Math.atan2(Math.sin(angle), Math.cos(angle));
  return {
    tabIndex: 0,
    "aria-description": rotationHint,
    "aria-keyshortcuts": "ArrowLeft ArrowRight Home Escape",
    "data-rotation": rotation,
    style: {
      cursor: dragging ? "grabbing" : "grab",
      touchAction: "pan-y",
      userSelect: "none",
    },
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0 || gesture.current) return;
      dragged.current = false;
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        angle: rotation,
        width: event.currentTarget.getBoundingClientRect().width,
      };
      event.currentTarget.focus({ preventScroll: true });
    },
    onPointerMove(event) {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      if (!dragged.current && Math.abs(dx) < 4) return;
      // Capture only after a drag starts, so ordinary trail clicks still seek.
      event.currentTarget.setPointerCapture(event.pointerId);
      dragged.current = true;
      setDragging(true);
      event.preventDefault();
      setRotation(
        normalize(start.angle + (dx * 2 * Math.PI) / Math.max(1, start.width)),
      );
    },
    onPointerUp(event) {
      if (gesture.current?.id !== event.pointerId) return;
      gesture.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel(event) {
      if (gesture.current?.id !== event.pointerId) return;
      setRotation(gesture.current.angle);
      gesture.current = null;
      setDragging(false);
    },
    onLostPointerCapture(event) {
      if (event.target !== event.currentTarget) return;
      gesture.current = null;
      setDragging(false);
    },
    onPointerLeave() {
      if (!dragged.current) gesture.current = null;
    },
    onClickCapture(event) {
      if (dragged.current) {
        event.preventDefault();
        event.stopPropagation();
        dragged.current = false;
      }
    },
    onKeyDown(event) {
      if (!["ArrowLeft", "ArrowRight", "Home", "Escape"].includes(event.key))
        return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        if (gesture.current) {
          setRotation(gesture.current.angle);
          const id = gesture.current.id;
          gesture.current = null;
          setDragging(false);
          if (event.currentTarget.hasPointerCapture(id))
            event.currentTarget.releasePointerCapture(id);
        }
      } else
        setRotation(
          event.key === "Home"
            ? initial
            : normalize(
                rotation +
                  (event.key === "ArrowRight" ? 1 : -1) *
                    (event.shiftKey ? 0.3 : 0.1),
              ),
        );
    },
  };
}
