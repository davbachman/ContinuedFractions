import { useEffect, useRef } from "react";
import type { TriangulationState } from "./math/triangulation";
import { coefficientAtTime } from "./math/coefficientTimeline";

/** Advance at constant hyperbolic speed, retaining elapsed time across flips.
 * Explicit Previous/Next seek; playback frames never add undo entries. */
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
    const end = state.steps.at(-1)?.time;
    if (end === undefined || latest.current.time >= end) {
      latest.current.onStop();
      return;
    }
    const crossings = state.steps.map((s) => ({
      time: s.time!,
      term: s.term!,
    }));
    let frame = 0,
      last = performance.now(),
      current = latest.current.time;
    const tick = (now: number) => {
      current = Math.min(
        end,
        current + (Math.min(100, now - last) * speed) / 1000,
      );
      last = now;
      latest.current.onFrame(current, coefficientAtTime(crossings, current));
      if (current < end) frame = requestAnimationFrame(tick);
      else latest.current.onStop();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, state.steps, speed]);
}
