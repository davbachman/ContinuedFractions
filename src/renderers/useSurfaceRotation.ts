import { useRef, useState, type SVGProps } from "react";

export const rotationHint =
  "Drag left/right to turn and up/down to roll. Arrow keys do the same; Home resets.";

/** Camera-only gesture, shared by all schematic 3D displays. */
export function useSurfaceRotation(
  rotation: number,
  setRotation: (angle: number) => void,
  enabled: boolean,
  initial: number,
  roll: number,
  setRoll: (angle: number) => void,
): SVGProps<SVGSVGElement> & {
  "data-rotation"?: number;
  "data-roll"?: number;
} {
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    roll: number;
    height: number;
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
    "aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown Home Escape",
    "data-rotation": rotation,
    "data-roll": roll,
    style: {
      cursor: dragging ? "grabbing" : "grab",
      touchAction: "none",
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitTapHighlightColor: "transparent",
    },
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0 || gesture.current) return;
      // Stop Safari starting a native SVG/text selection before pointer capture.
      // Focus explicitly below, preserving keyboard navigation and click-to-seek.
      event.preventDefault();
      dragged.current = false;
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        roll,
        height: event.currentTarget.getBoundingClientRect().height,
        angle: rotation,
        width: event.currentTarget.getBoundingClientRect().width,
      };
      event.currentTarget.focus({ preventScroll: true });
    },
    onDragStart(event) {
      event.preventDefault();
    },
    onPointerMove(event) {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x,
        dy = event.clientY - start.y;
      if (!dragged.current && Math.hypot(dx, dy) < 4) return;
      // Capture only after a drag starts, so ordinary trail clicks still seek.
      event.currentTarget.setPointerCapture(event.pointerId);
      dragged.current = true;
      setDragging(true);
      event.preventDefault();
      setRotation(
        normalize(start.angle - (dx * 2 * Math.PI) / Math.max(1, start.width)),
      );
      setRoll(
        normalize(start.roll - (dy * 2 * Math.PI) / Math.max(1, start.height)),
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
      setRoll(gesture.current.roll);
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
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "Escape",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        if (gesture.current) {
          setRotation(gesture.current.angle);
          setRoll(gesture.current.roll);
          const id = gesture.current.id;
          gesture.current = null;
          setDragging(false);
          if (event.currentTarget.hasPointerCapture(id))
            event.currentTarget.releasePointerCapture(id);
        }
      } else if (event.key === "Home") {
        setRotation(initial);
        setRoll(0);
      } else {
        const step = event.shiftKey ? 0.3 : 0.1;
        if (event.key === "ArrowUp" || event.key === "ArrowDown")
          setRoll(normalize(roll + (event.key === "ArrowUp" ? 1 : -1) * step));
        else
          setRotation(
            normalize(rotation + (event.key === "ArrowRight" ? -1 : 1) * step),
          );
      }
    },
  };
}
