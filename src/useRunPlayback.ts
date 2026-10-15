import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkspaceProps } from "./Workspace";
import { targetItinerary } from "./math/triangulation";
import {
  coefficientStages,
  stageDuration,
  stageFrame,
} from "./math/runPlayback";

export function useRunPlayback(props: WorkspaceProps, available: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState({ term: 0, progress: 0 });
  const itinerary = useMemo(
    () => targetItinerary(props.scene.spec, props.scene.end),
    [props.scene.spec, props.scene.end],
  );
  const stages = useMemo(
    () => coefficientStages(props.scene.spec, itinerary),
    [props.scene.spec, itinerary],
  );
  const expectedSteps = useRef(itinerary.steps);
  const latest = useRef(props);
  latest.current = props;
  const current = useRef(position);
  current.current = position;
  const stage = stages[position.term];
  const disable = () => {
    setPlaying(false);
    setEnabled(false);
  };
  useEffect(() => {
    setPlaying(false);
    setEnabled(false);
  }, [itinerary]);
  // Editing, undo, a new window, or manual exploration interrupts this clock.
  useEffect(() => {
    if (
      !available ||
      props.scene.triangulation?.steps !== expectedSteps.current
    )
      disable();
  }, [
    available,
    props.scene.spec,
    props.scene.end,
    props.scene.triangulation?.steps,
  ]);
  useEffect(() => {
    if (props.playing || props.rectangle.playing) setPlaying(false);
  }, [props.playing, props.rectangle.playing]);
  const seek = (term: number, progress = 0) => {
    setPlaying(false);
    const index = Math.max(0, Math.min(stages.length - 1, term));
    if (!stages[index]) return;
    setPosition({ term: index, progress });
    props.onRunFrame(stageFrame(stages[index], progress).time, index);
  };
  const enable = () => {
    if (!stages.length) return;
    props.onPause();
    const term = Math.min(props.selected, stages.length - 1);
    expectedSteps.current = itinerary.steps;
    props.onRunFrame(stages[term].start, term, itinerary);
    setPosition({ term, progress: 0 });
    setPlaying(false);
    setEnabled(true);
  };
  useEffect(() => {
    if (!playing || !enabled) return;
    let frame = 0,
      last = performance.now(),
      drawn = last;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const elapsed = Math.min(100, now - last);
      last = now;
      const at = current.current;
      const s = stages[at.term];
      if (!s) {
        setPlaying(false);
        return;
      }
      const reverse = latest.current.reverse;
      const progress = Math.max(
        0,
        Math.min(
          1,
          at.progress +
            ((reverse ? -1 : 1) * elapsed * latest.current.scene.speed) /
              stageDuration(s),
        ),
      );
      current.current = { term: at.term, progress };
      const boundary = reverse ? progress === 0 : progress === 1;
      if (now - drawn >= 45 || boundary) {
        drawn = now;
        const next = current.current;
        setPosition(next);
        latest.current.onRunFrame(
          stageFrame(s, progress, reduced).time,
          at.term,
        );
      }
      if (boundary) {
        if (
          reverse ? at.term === 0 : !s.complete || at.term === stages.length - 1
        ) {
          setPlaying(false);
          return;
        }
        const term = at.term + (reverse ? -1 : 1),
          nextProgress = reverse ? 1 : 0;
        current.current = { term, progress: nextProgress };
        setPosition(current.current);
        latest.current.onRunFrame(
          stageFrame(stages[term], nextProgress, reduced).time,
          term,
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, enabled, stages]);
  const toggle = () => {
    props.onPause();
    if (!playing) {
      if (props.reverse && position.progress === 0 && position.term === 0)
        seek(stages.length - 1, 1);
      else if (
        !props.reverse &&
        position.progress === 1 &&
        position.term === stages.length - 1
      )
        seek(0);
    }
    setPlaying(!playing);
  };
  return {
    enabled,
    playing,
    position,
    stage,
    stages,
    enable,
    disable,
    seek,
    toggle,
    frame: stage ? stageFrame(stage, position.progress) : undefined,
  };
}
