/** Reflect elapsed distance at the displayed endpoints, carrying overshoot.
 * Direction is retained by the caller across pause/resume and speed changes.
 * `boundary` lets renderers show the endpoint for the turning frame. */
export function advanceBounce(
  position: number,
  direction: 1 | -1,
  distance: number,
  end: number,
): { position: number; direction: 1 | -1; boundary?: number } {
  if (!(end > 0)) return { position: 0, direction: 1 };
  const start = Math.max(0, Math.min(end, position));
  const phase = direction === 1 ? start : 2 * end - start;
  const next = phase + Math.max(0, distance);
  const wrapped = ((next % (2 * end)) + 2 * end) % (2 * end);
  const crossed = Math.floor(next / end) > Math.floor(phase / end);
  return {
    position: wrapped <= end ? wrapped : 2 * end - wrapped,
    direction: wrapped < end ? 1 : -1,
    ...(crossed ? { boundary: Math.floor(next / end) % 2 ? end : 0 } : {}),
  };
}
