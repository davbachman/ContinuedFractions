import { useEffect, useRef } from "react";
import type { TriangulationState } from "./math/triangulation";

/** Interpolate the shared H² clock between successive Farey crossings.
 * A full flip interval takes 1.4s at 1×; pause/resume retains partial progress.
 * Frames navigate without adding undo entries. Explicit Previous/Next still seek.
 */
export function useFlipPlayback(
  playing: boolean,
  state: TriangulationState,
  time: number,
  speed: number,
  onFrame: (time: number, term: number) => void,
  onStop: () => void,
) {
  const latest = useRef({ time, onFrame, onStop });
  latest.current = { time, onFrame, onStop };
  useEffect(() => {
    if (!playing) return;
    const next = state.steps[state.cursor],
      end = next?.time;
    if (end === undefined) {
      latest.current.onStop();
      return;
    }
    const start = state.steps[state.cursor - 1]?.time ?? 0;
    const from = Math.max(start, Math.min(end, latest.current.time));
    const duration =
      ((1400 / speed) * (end - from)) / Math.max(1e-9, end - start);
    let frame = 0,
      begun: number | undefined;
    const tick = (now: number) => {
      begun ??= now;
      const progress =
        duration <= 0 ? 1 : Math.min(1, (now - begun) / duration);
      const t = from + (end - from) * progress;
      // Avoid rounding into the next combinatorial step before its exact endpoint.
      latest.current.onFrame(
        progress === 1 ? end : Math.min(t, end - 2e-8),
        progress === 1
          ? (next.term ?? 0)
          : (state.steps[state.cursor - 1]?.term ?? 0),
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, state.steps, state.cursor, speed]);
}
