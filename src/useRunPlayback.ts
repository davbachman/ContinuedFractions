import { advanceBounce } from "./math/playback";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkspaceProps } from "./Workspace";
import { targetItinerary } from "./math/triangulation";
import {
  coefficientStages,
  stageDuration,
  stageFrame,
  sequenceProgress,
  sequencePosition,
} from "./math/runPlayback";

export function useRunPlayback(props: WorkspaceProps, available: boolean) {
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
  const enabled = available && stages.length > 0;
  const emitted = useRef<{ time: number; term: number } | null>(null);
  const pending = useRef<{ time: number; term: number }[]>([]);
  const latest = useRef(props);
  latest.current = props;
  const current = useRef(position);
  const direction = useRef<1 | -1>(1);
  const stage = stages[position.term];
  const pause = () => setPlaying(false);
  const publish = (time: number, term: number) => {
    emitted.current = { time, term };
    pending.current.push(emitted.current);
    latest.current.onRunFrame(time, term);
  };
  const context = useRef({ enabled, stages });
  // Keep synchronization active after edits and view changes, preserving time
  // and undo history. Own frames retain progress in zero-crossing stages.
  useEffect(() => {
    const changed =
      context.current.enabled !== enabled || context.current.stages !== stages;
    context.current = { enabled, stages };
    if (!enabled) {
      setPlaying(false);
      return;
    }
    const last = emitted.current;
    const acknowledgement = pending.current.findIndex(
      (frame) =>
        frame.time === props.scene.time && frame.term === props.selected,
    );
    if (!changed) {
      // React may commit an earlier frame after the next RAF has emitted one.
      // Acknowledge that frame without treating it as an external seek.
      if (acknowledgement >= 0) {
        pending.current.splice(0, acknowledgement + 1);
        return;
      }
      if (last?.time === props.scene.time && last.term === props.selected)
        return;
    }
    pending.current = [];
    direction.current = 1;
    setPlaying(false);
    const time = props.scene.time;
    const contains = (s: (typeof stages)[number]) =>
      time >= s.start - 1e-8 && time <= s.end + 1e-8;
    const selected = stages[props.selected];
    // Inspection can extend beyond the generated trajectory. Keep that exact
    // coefficient selected rather than substituting an earlier playable group.
    if (!selected) {
      current.current = { term: props.selected, progress: 0 };
      setPosition(current.current);
      return;
    }
    let term =
      selected && contains(selected)
        ? props.selected
        : stages.findIndex(contains);
    if (term < 0) term = time < stages[0].start ? 0 : stages.length - 1;
    const s = stages[term];
    current.current = {
      term,
      progress: Math.max(0, Math.min(1, (time - s.start) / (s.end - s.start))),
    };
    setPosition(current.current);
    if (term !== props.selected) publish(time, term);
  }, [enabled, stages, props.scene.time, props.selected]);
  useEffect(() => {
    if (props.playing || props.rectangle.playing) setPlaying(false);
  }, [props.playing, props.rectangle.playing]);
  const seek = (term: number, progress = 0) => {
    direction.current = 1;
    setPlaying(false);
    props.onPause();
    if (term >= stages.length) {
      props.onSelect(term);
      return;
    }
    const index = Math.max(0, term);
    if (!stages[index]) return;
    current.current = { term: index, progress };
    setPosition(current.current);
    publish(stageFrame(stages[index], progress).time, index);
  };
  useEffect(() => {
    if (!playing || !enabled) return;
    let frame = 0,
      last = performance.now(),
      drawn = last;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = stages.reduce((total, s) => total + stageDuration(s), 0);
    const tick = (now: number) => {
      const elapsed = Math.min(100, now - last);
      last = now;
      const at = current.current;
      const nextFrame = advanceBounce(
        sequenceProgress(stages, at),
        direction.current,
        (elapsed * latest.current.scene.speed) / duration,
        1,
      );
      direction.current = nextFrame.direction;
      current.current = sequencePosition(stages, nextFrame.position);
      const boundary = nextFrame.boundary !== undefined;
      if (now - drawn >= 45 || boundary || current.current.term !== at.term) {
        drawn = now;
        const next = boundary
          ? sequencePosition(stages, nextFrame.boundary!)
          : current.current;
        setPosition(next);
        publish(
          stageFrame(stages[next.term], next.progress, reduced).time,
          next.term,
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, enabled, stages]);
  const toggle = () => {
    if (!stage) return;
    props.onPause();
    setPlaying(!playing);
  };
  return {
    enabled,
    playing,
    position,
    stage,
    stages,
    pause,
    seek,
    progress: stage
      ? sequenceProgress(stages, position)
      : Math.max(0, Math.min(1, props.scene.time / (stages.at(-1)?.end || 1))),
    seekProgress: (progress: number) => {
      const next = sequencePosition(stages, progress);
      seek(next.term, next.progress);
    },
    toggle,
    frame: stage ? stageFrame(stage, position.progress) : undefined,
  };
}
